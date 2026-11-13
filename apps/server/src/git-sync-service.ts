import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import {
  computeMarkdownHash,
  computeOkfPagePath,
  exportPageAsOkfMarkdown,
  generateOkfLogMarkdown,
  generateOkfRootIndex,
  planBulkVaultImport,
  resolveAssetStoragePath,
  type GitHubSyncConfigInput,
  type GitHubSyncHistoryEntry,
  type GitHubSyncResult,
  type GitHubSyncState,
  type GitHubSyncStatus,
  type GitHubTestConnectionInput,
  type GitHubTestConnectionResult,
  type RawMarkdownFileEntry,
} from '@mind-hub/shared';
import type { PageRepository, StoredSyncConfig } from './repository.js';

const execFileAsync = promisify(execFile);

const IGNORED_DIRS = new Set(['.git', '.obsidian', 'assets', 'node_modules']);

function scrubSecret(message: string, secret?: string | null): string {
  if (!secret || secret.length < 4) return message;
  return message.split(secret).join('***');
}

export function normalizeGitHubRepository(rawRepo: string): {
  displayRepo: string;
  isLocalRemote: boolean;
} {
  const trimmed = rawRepo.trim();
  if (trimmed.startsWith('file://') || trimmed.startsWith('/')) {
    return { displayRepo: trimmed, isLocalRemote: true };
  }

  const httpsMatch = /^https?:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?\/?$/i.exec(trimmed);
  if (httpsMatch?.[1]) {
    return { displayRepo: httpsMatch[1], isLocalRemote: false };
  }

  const slugMatch = /^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?$/.exec(trimmed);
  if (slugMatch?.[1]) {
    return { displayRepo: slugMatch[1], isLocalRemote: false };
  }

  throw new Error('Formato de repositório inválido. Use "usuario/repositorio" ou URL do GitHub.');
}

export function buildRemoteUrl(repository: string, token: string): string {
  const { displayRepo, isLocalRemote } = normalizeGitHubRepository(repository);
  if (isLocalRemote) {
    return displayRepo;
  }
  const cleanToken = encodeURIComponent(token.trim());
  return `https://x-access-token:${cleanToken}@github.com/${displayRepo}.git`;
}

function scanVaultMarkdownFiles(rootDir: string): RawMarkdownFileEntry[] {
  const entries: RawMarkdownFileEntry[] = [];
  if (!fs.existsSync(rootDir)) return entries;

  function walk(dir: string): void {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.name.startsWith('.') || IGNORED_DIRS.has(item.name)) continue;
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        walk(fullPath);
      } else if (item.isFile() && /\.(md|markdown)$/i.test(item.name)) {
        const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
        if (relPath === 'index.md' || relPath === 'log.md') continue;
        entries.push({
          path: relPath,
          content: fs.readFileSync(fullPath, 'utf-8'),
        });
      }
    }
  }

  walk(rootDir);
  return entries;
}

export interface GitSyncServiceOptions {
  repository: PageRepository;
  gitVaultDir: string;
}

export class GitSyncService {
  private readonly repo: PageRepository;
  private readonly gitVaultDir: string;
  private activeSync: Promise<GitHubSyncResult> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: GitSyncServiceOptions) {
    this.repo = options.repository;
    this.gitVaultDir = path.resolve(options.gitVaultDir);
  }

  private async runGit(
    args: string[],
    cwd: string,
    secretToScrub?: string,
  ): Promise<{ stdout: string; stderr: string }> {
    try {
      const result = await execFileAsync('git', args, {
        cwd,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0',
          GIT_AUTHOR_NAME: 'Mind Hub Sync',
          GIT_AUTHOR_EMAIL: 'sync@mind-hub.local',
          GIT_COMMITTER_NAME: 'Mind Hub Sync',
          GIT_COMMITTER_EMAIL: 'sync@mind-hub.local',
        },
        maxBuffer: 10 * 1024 * 1024,
      });
      return {
        stdout: result.stdout?.toString() ?? '',
        stderr: result.stderr?.toString() ?? '',
      };
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : String(error);
      const stderr = (error as { stderr?: string })?.stderr ?? '';
      throw new Error(scrubSecret(`${rawMessage} ${stderr}`.trim(), secretToScrub));
    }
  }

  async getStatus(): Promise<GitHubSyncStatus> {
    const cfg = await this.repo.getSyncConfig();
    const pendingChangesCount = await this.repo.getPendingSyncCount();

    if (!cfg) {
      return {
        state: 'disconnected',
        configured: false,
        repository: null,
        branch: 'main',
        autoSyncEnabled: true,
        debounceSeconds: 120,
        pendingChangesCount,
        lastSyncAt: null,
        lastCommitSha: null,
        lastError: null,
        history: [],
      };
    }

    let state: GitHubSyncState = 'connected';
    if (this.activeSync) {
      state = 'syncing';
    } else if (cfg.lastError) {
      state = 'error';
    }

    return {
      state,
      configured: true,
      repository: cfg.repository,
      branch: cfg.branch,
      autoSyncEnabled: cfg.autoSyncEnabled,
      debounceSeconds: cfg.debounceSeconds,
      pendingChangesCount,
      lastSyncAt: cfg.lastSyncAt,
      lastCommitSha: cfg.lastCommitSha,
      lastError: cfg.lastError,
      history: cfg.history.slice(0, 10),
    };
  }

  async testConnection(input: GitHubTestConnectionInput): Promise<GitHubTestConnectionResult> {
    const branch = (input.branch ?? 'main').trim() || 'main';
    const token = input.token.trim();

    let displayRepo = input.repository;
    let isLocalRemote = false;
    try {
      const parsed = normalizeGitHubRepository(input.repository);
      displayRepo = parsed.displayRepo;
      isLocalRemote = parsed.isLocalRemote;
    } catch (err) {
      return {
        ok: false,
        repository: input.repository,
        branch,
        message: err instanceof Error ? err.message : 'Repositório inválido.',
      };
    }

    if (!isLocalRemote && !token) {
      return {
        ok: false,
        repository: displayRepo,
        branch,
        message: 'Informe um Personal Access Token (PAT) válido do GitHub.',
      };
    }

    const remoteUrl = buildRemoteUrl(displayRepo, token);
    try {
      const { stdout } = await this.runGit(
        ['ls-remote', '--heads', remoteUrl],
        process.cwd(),
        token,
      );
      const lines = stdout.trim().split('\n').filter(Boolean);
      const isEmpty = lines.length === 0;
      const hasTargetBranch = lines.some((l) => l.endsWith(`refs/heads/${branch}`));
      return {
        ok: true,
        repository: displayRepo,
        branch,
        isEmpty,
        defaultBranch: hasTargetBranch ? branch : undefined,
        message: isEmpty
          ? `Conexão confirmada com "${displayRepo}" (repositório vazio pronto para receber seu Vault).`
          : `Conexão confirmada com "${displayRepo}" (${lines.length} branch(es) detectada(s)).`,
      };
    } catch (err) {
      return {
        ok: false,
        repository: displayRepo,
        branch,
        message: `Falha ao conectar no GitHub: ${scrubSecret(err instanceof Error ? err.message : String(err), token)}`,
      };
    }
  }

  async configure(input: GitHubSyncConfigInput): Promise<{
    status: GitHubSyncStatus;
    initialSync: GitHubSyncResult;
  }> {
    const branch = (input.branch ?? 'main').trim() || 'main';
    const token = input.token.trim();
    const testRes = await this.testConnection({
      repository: input.repository,
      branch,
      token,
    });

    if (!testRes.ok) {
      throw new Error(testRes.message);
    }

    const config: StoredSyncConfig = {
      id: 'github-primary',
      provider: 'github',
      repository: testRes.repository,
      branch,
      token,
      autoSyncEnabled: input.autoSyncEnabled ?? true,
      debounceSeconds: Math.max(10, input.debounceSeconds ?? 120),
      lastSyncAt: null,
      lastCommitSha: null,
      lastError: null,
      history: [],
      updatedAt: new Date().toISOString(),
    };

    await this.repo.saveSyncConfig(config);

    // Prepare local working git repository
    fs.mkdirSync(this.gitVaultDir, { recursive: true });
    const remoteUrl = buildRemoteUrl(config.repository, config.token);

    if (!fs.existsSync(path.join(this.gitVaultDir, '.git'))) {
      await this.runGit(['init', '-b', branch], this.gitVaultDir, token);
      await this.runGit(['remote', 'add', 'origin', remoteUrl], this.gitVaultDir, token);
    } else {
      await this.runGit(['remote', 'set-url', 'origin', remoteUrl], this.gitVaultDir, token);
    }

    const strategy = input.strategy ?? 'merge';
    const initialSync = await this.syncNow(strategy === 'pull_initial' ? 'pull_only' : 'bidirectional');
    const status = await this.getStatus();
    return { status, initialSync };
  }

  async disconnect(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    await this.repo.deleteSyncConfig();
  }

  scheduleDebouncedSync(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    void this.repo.getSyncConfig().then((cfg) => {
      if (!cfg || !cfg.autoSyncEnabled) return;
      const delayMs = Math.max(5000, cfg.debounceSeconds * 1000);
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        void this.syncNow('bidirectional').catch(() => {
          // Recorded inside syncConfig.lastError
        });
      }, delayMs);
    });
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  async syncNow(mode: 'bidirectional' | 'pull_only' = 'bidirectional'): Promise<GitHubSyncResult> {
    if (this.activeSync) {
      return this.activeSync;
    }
    this.activeSync = this.executeSync(mode).finally(() => {
      this.activeSync = null;
    });
    return this.activeSync;
  }

  private async executeSync(mode: 'bidirectional' | 'pull_only'): Promise<GitHubSyncResult> {
    const cfg = await this.repo.getSyncConfig();
    if (!cfg) {
      throw new Error('Integração GitHub não configurada.');
    }

    const remoteUrl = buildRemoteUrl(cfg.repository, cfg.token);
    const syncedAt = new Date().toISOString();
    const pushedFiles: string[] = [];
    const pulledFiles: string[] = [];
    const conflictPages: string[] = [];

    try {
      fs.mkdirSync(this.gitVaultDir, { recursive: true });
      if (!fs.existsSync(path.join(this.gitVaultDir, '.git'))) {
        await this.runGit(['init', '-b', cfg.branch], this.gitVaultDir, cfg.token);
        await this.runGit(['remote', 'add', 'origin', remoteUrl], this.gitVaultDir, cfg.token);
      } else {
        await this.runGit(['remote', 'set-url', 'origin', remoteUrl], this.gitVaultDir, cfg.token);
      }

      // 1. Check remote heads and fetch/pull if remote branch exists
      const lsRes = await this.runGit(['ls-remote', '--heads', 'origin', cfg.branch], this.gitVaultDir, cfg.token);
      const remoteExists = lsRes.stdout.trim().length > 0;

      if (remoteExists) {
        await this.runGit(['fetch', 'origin', cfg.branch], this.gitVaultDir, cfg.token);
        const hasLocalHead = await this.runGit(['rev-parse', '--verify', 'HEAD'], this.gitVaultDir)
          .then(() => true)
          .catch(() => false);
        if (hasLocalHead) {
          await this.runGit(['pull', '--rebase', 'origin', cfg.branch], this.gitVaultDir, cfg.token);
        } else {
          await this.runGit(['checkout', '-B', cfg.branch, `origin/${cfg.branch}`], this.gitVaultDir, cfg.token);
        }

        // 2. Pull phase: inspect disk markdown files against DB hashes
        const diskEntries = scanVaultMarkdownFiles(this.gitVaultDir);
        if (diskEntries.length > 0) {
          const existingPages = await this.repo.listPages(false);
          const plan = planBulkVaultImport(diskEntries, existingPages, { conflictStrategy: 'upsert' });
          const existingById = new Map(existingPages.map((p) => [p.id, p]));
          const existingByPath = new Map(
            existingPages.filter((p) => p.sourcePath).map((p) => [p.sourcePath!, p]),
          );

          for (const candidate of plan.pagesToUpsert) {
            const existing = existingById.get(candidate.id) ?? (candidate.sourcePath ? existingByPath.get(candidate.sourcePath) : undefined);

            if (!existing) {
              const created = await this.repo.createPage({
                ...candidate,
                lastSyncedHash: candidate.sourceHash ?? null,
              });
              pulledFiles.push(created.sourcePath ?? `${created.slug}.md`);
              continue;
            }

            if (existing.sourceHash === candidate.sourceHash) {
              continue;
            }

            const locallyModified =
              Boolean(existing.lastSyncedHash) && existing.sourceHash !== existing.lastSyncedHash;

            if (locallyModified) {
              // OCC conflict protection: preserve local page, save conflict copy
              const conflictTitle = `${candidate.title} (Conflito Git ${syncedAt.slice(0, 10)})`;
              await this.repo.createPage({
                title: conflictTitle,
                icon: '⚠️',
                parentId: existing.parentId,
                contentMarkdown: candidate.contentMarkdown,
                tags: [...candidate.tags, 'git-conflict'],
              });
              conflictPages.push(existing.title);
            } else {
              await this.repo.updatePage(existing.id, {
                title: candidate.title,
                icon: candidate.icon,
                pageType: candidate.pageType,
                description: candidate.description,
                coverUrl: candidate.coverUrl,
                coverYPosition: candidate.coverYPosition,
                contentMarkdown: candidate.contentMarkdown,
                tags: candidate.tags,
                sourcePath: candidate.sourcePath,
                sourceHash: candidate.sourceHash,
                lastSyncedHash: candidate.sourceHash,
              });
              pulledFiles.push(candidate.sourcePath ?? `${candidate.slug}.md`);
            }
          }
        }
      }

      // 3. Push phase (Delta Sync)
      let commitSha = cfg.lastCommitSha;

      if (mode === 'bidirectional') {
        const activePages = await this.repo.listPages(false);
        const allAssets = await this.repo.listAssets();
        const syncedHashMap = new Map<string, string>();

        for (const asset of allAssets) {
          const storageRel = resolveAssetStoragePath(asset);
          const fullAssetPath = path.join(this.gitVaultDir, storageRel);
          if (!fs.existsSync(fullAssetPath)) {
            fs.mkdirSync(path.dirname(fullAssetPath), { recursive: true });
            fs.writeFileSync(fullAssetPath, Buffer.from(asset.dataBase64, 'base64'));
            pushedFiles.push(storageRel);
          }
        }

        for (const page of activePages) {
          const targetRelPath = computeOkfPagePath(page, activePages);
          const fullPath = path.join(this.gitVaultDir, targetRelPath);
          const isDirty = !page.lastSyncedHash || page.sourceHash !== page.lastSyncedHash;
          const fileMissing = !fs.existsSync(fullPath);

          if (isDirty || fileMissing || page.sourcePath !== targetRelPath) {
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            const okfContent = exportPageAsOkfMarkdown(page, activePages, allAssets);
            const currentOnDisk = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf-8') : null;
            if (currentOnDisk !== okfContent) {
              fs.writeFileSync(fullPath, okfContent, 'utf-8');
              pushedFiles.push(targetRelPath);
            }
            const diskHash = computeMarkdownHash(`${targetRelPath}::${okfContent}`);
            await this.repo.updatePage(page.id, {
              sourcePath: targetRelPath,
              sourceHash: diskHash,
              lastSyncedHash: diskHash,
            });
            syncedHashMap.set(page.id, diskHash);
          }
        }

        const rootIndexPath = path.join(this.gitVaultDir, 'index.md');
        const rootIndexContent = generateOkfRootIndex(activePages);
        if (!fs.existsSync(rootIndexPath) || pushedFiles.length > 0) {
          fs.writeFileSync(rootIndexPath, rootIndexContent, 'utf-8');
        }

        const statusRes = await this.runGit(['status', '--porcelain'], this.gitVaultDir, cfg.token);
        if (statusRes.stdout.trim().length > 0) {
          const prelimHistoryEntry: GitHubSyncHistoryEntry = {
            id: `sync-${randomUUID().slice(0, 8)}`,
            timestamp: syncedAt,
            direction: pulledFiles.length > 0 ? 'bidirectional' : 'push',
            commitSha: null,
            filesChanged: pushedFiles.length + pulledFiles.length,
            summary: `Sincronizado ${pushedFiles.length} arquivo(s) para OKF bundle`,
            status: conflictPages.length > 0 ? 'conflict' : 'success',
          };

          const logPath = path.join(this.gitVaultDir, 'log.md');
          fs.writeFileSync(
            logPath,
            generateOkfLogMarkdown([prelimHistoryEntry, ...cfg.history].slice(0, 30)),
            'utf-8',
          );

          await this.runGit(['add', '-A'], this.gitVaultDir, cfg.token);
          await this.runGit(
            ['commit', '-m', `sync(mind-hub): update ${Math.max(1, pushedFiles.length)} OKF note(s) [skip ci]`],
            this.gitVaultDir,
            cfg.token,
          );
          await this.runGit(['push', '-u', 'origin', cfg.branch], this.gitVaultDir, cfg.token);

          const shaRes = await this.runGit(['rev-parse', 'HEAD'], this.gitVaultDir);
          commitSha = shaRes.stdout.trim() || commitSha;
        }

        if (syncedHashMap.size > 0) {
          await this.repo.markPagesSynced(syncedHashMap);
        }
      }

      const historyEntry: GitHubSyncHistoryEntry = {
        id: `sync-${randomUUID().slice(0, 8)}`,
        timestamp: syncedAt,
        direction:
          pushedFiles.length > 0 && pulledFiles.length > 0
            ? 'bidirectional'
            : pulledFiles.length > 0
              ? 'pull'
              : 'push',
        commitSha,
        filesChanged: pushedFiles.length + pulledFiles.length,
        summary:
          pushedFiles.length === 0 && pulledFiles.length === 0
            ? 'Nenhuma alteração pendente (hashes em dia)'
            : `Enviados: ${pushedFiles.length} | Recebidos: ${pulledFiles.length}`,
        status: conflictPages.length > 0 ? 'conflict' : 'success',
      };

      await this.repo.saveSyncConfig({
        ...cfg,
        lastSyncAt: syncedAt,
        lastCommitSha: commitSha,
        lastError: null,
        history: [historyEntry, ...cfg.history].slice(0, 20),
        updatedAt: syncedAt,
      });

      return {
        ok: true,
        pushedFiles,
        pulledFiles,
        conflictPages,
        commitSha,
        syncedAt,
        message: historyEntry.summary,
      };
    } catch (error) {
      const safeErr = scrubSecret(error instanceof Error ? error.message : String(error), cfg.token);
      const errEntry: GitHubSyncHistoryEntry = {
        id: `sync-${randomUUID().slice(0, 8)}`,
        timestamp: syncedAt,
        direction: 'bidirectional',
        commitSha: cfg.lastCommitSha,
        filesChanged: 0,
        summary: safeErr,
        status: 'error',
      };
      await this.repo.saveSyncConfig({
        ...cfg,
        lastError: safeErr,
        history: [errEntry, ...cfg.history].slice(0, 20),
        updatedAt: syncedAt,
      });
      throw new Error(safeErr);
    }
  }
}
