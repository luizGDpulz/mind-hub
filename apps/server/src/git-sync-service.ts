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
  type MindAsset,
  type MindPage,
  type RawMarkdownFileEntry,
} from '@mind-hub/shared';
import type { PageRepository, StoredSyncConfig } from './repository.js';

const execFileAsync = promisify(execFile);

const IGNORED_DIRS = new Set(['.git', '.obsidian', 'assets', 'node_modules']);
const GITHUB_API_BASE = 'https://api.github.com';

interface SyncRunOptions {
  skipPullImport?: boolean;
  forceFullExport?: boolean;
}

interface PendingPageSyncUpdate {
  pageId: string;
  targetRelPath: string;
  diskHash: string;
}

interface GitHubRepoApiResponse {
  private?: boolean;
  default_branch?: string;
  permissions?: {
    push?: boolean;
    pull?: boolean;
  };
  message?: string;
}

interface GitHubBranchApiItem {
  name: string;
}

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree' | 'commit';
  sha: string;
}

function scrubSecret(message: string, secret?: string | null): string {
  if (!secret || secret.length < 4) return message;
  return message.split(secret).join('***');
}

function detectTokenType(
  token: string,
  isLocalRemote: boolean,
): 'fine-grained' | 'classic' | 'local' | undefined {
  if (isLocalRemote) return 'local';
  if (token.startsWith('github_pat_')) return 'fine-grained';
  if (token.startsWith('ghp_') || token.startsWith('gho_')) return 'classic';
  return undefined;
}

function isGitBinaryMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const errObj = error as { code?: string; message?: string; cause?: unknown };
  if (errObj.code === 'ENOENT') return true;
  if (typeof errObj.message === 'string' && errObj.message.includes('spawn git ENOENT')) {
    return true;
  }
  if (errObj.cause && typeof errObj.cause === 'object') {
    const causeObj = errObj.cause as { code?: string; message?: string };
    if (causeObj.code === 'ENOENT') return true;
    if (typeof causeObj.message === 'string' && causeObj.message.includes('spawn git ENOENT')) {
      return true;
    }
  }
  return false;
}

function buildGitHubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Mind-Hub-OKF-Sync',
    'Content-Type': 'application/json',
  };
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
      throw new Error(scrubSecret(`${rawMessage} ${stderr}`.trim(), secretToScrub), {
        cause: error,
      });
    }
  }

  private getRepoMarkerPath(): string {
    return `${this.gitVaultDir}.repo`;
  }

  private async prepareWorkspaceDir(
    displayRepo: string,
    branch: string,
    remoteUrl: string,
    token: string,
    initGit: boolean,
  ): Promise<void> {
    const markerPath = this.getRepoMarkerPath();
    let repoChanged = false;

    if (fs.existsSync(markerPath)) {
      const prevRepo = fs.readFileSync(markerPath, 'utf-8').trim();
      if (prevRepo && prevRepo !== displayRepo) {
        repoChanged = true;
      }
    } else if (fs.existsSync(path.join(this.gitVaultDir, '.git'))) {
      try {
        const originRes = await this.runGit(['remote', 'get-url', 'origin'], this.gitVaultDir, token);
        const currentOrigin = originRes.stdout.trim();
        if (
          currentOrigin &&
          currentOrigin !== remoteUrl &&
          !currentOrigin.includes(displayRepo)
        ) {
          repoChanged = true;
        }
      } catch {
        // Ignore if origin is not yet set
      }
    }

    if (repoChanged && fs.existsSync(this.gitVaultDir)) {
      fs.rmSync(this.gitVaultDir, { recursive: true, force: true });
    }

    fs.mkdirSync(this.gitVaultDir, { recursive: true });
    fs.mkdirSync(path.dirname(markerPath), { recursive: true });
    fs.writeFileSync(markerPath, displayRepo, 'utf-8');

    if (!initGit) return;

    if (!fs.existsSync(path.join(this.gitVaultDir, '.git'))) {
      await this.runGit(['init', '-b', branch], this.gitVaultDir, token);
      await this.runGit(['remote', 'add', 'origin', remoteUrl], this.gitVaultDir, token);
    } else {
      const hasOrigin = await this.runGit(['remote', 'get-url', 'origin'], this.gitVaultDir, token)
        .then(() => true)
        .catch(() => false);
      if (hasOrigin) {
        await this.runGit(['remote', 'set-url', 'origin', remoteUrl], this.gitVaultDir, token);
      } else {
        await this.runGit(['remote', 'add', 'origin', remoteUrl], this.gitVaultDir, token);
      }
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
      isPrivate: cfg.isPrivate,
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

    let displayRepo: string;
    let isLocalRemote: boolean;
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

    const tokenType = detectTokenType(token, isLocalRemote);

    if (!isLocalRemote && !token) {
      return {
        ok: false,
        repository: displayRepo,
        branch,
        tokenType,
        message: 'Informe um Personal Access Token (PAT) válido do GitHub.',
      };
    }

    if (!isLocalRemote) {
      try {
        const headers = buildGitHubHeaders(token);
        const repoRes = await fetch(`${GITHUB_API_BASE}/repos/${displayRepo}`, { headers });

        if (repoRes.status === 401) {
          return {
            ok: false,
            repository: displayRepo,
            branch,
            tokenType,
            message: 'Token PAT inválido ou expirado. Verifique o token gerado no GitHub.',
          };
        }

        if (repoRes.status === 403 || repoRes.status === 404) {
          return {
            ok: false,
            repository: displayRepo,
            branch,
            tokenType,
            message: `Repositório "${displayRepo}" não encontrado ou o Token não tem acesso a este repositório privado. Verifique se concedeu acesso ao repositório e a permissão Contents: Read and write.`,
          };
        }

        if (repoRes.ok) {
          const repoData = (await repoRes.json()) as GitHubRepoApiResponse;
          const isPrivate = Boolean(repoData.private);

          if (repoData.permissions && repoData.permissions.push === false) {
            return {
              ok: false,
              repository: displayRepo,
              branch,
              isPrivate,
              canPush: false,
              tokenType,
              message: `Conectado ao repositório "${displayRepo}", porém o Token possui apenas leitura. Habilite 'Contents: Read and write' (Fine-Grained) ou o escopo 'repo' (Classic).`,
            };
          }

          let branches: GitHubBranchApiItem[] = [];
          try {
            const branchesRes = await fetch(
              `${GITHUB_API_BASE}/repos/${displayRepo}/branches?per_page=100`,
              { headers },
            );
            if (branchesRes.ok) {
              const parsedBranches = (await branchesRes.json()) as unknown;
              if (Array.isArray(parsedBranches)) {
                branches = parsedBranches as GitHubBranchApiItem[];
              }
            }
          } catch {
            // Non-fatal: fallback below treats branches as unknown/empty
          }

          const isEmpty = branches.length === 0;
          const hasTargetBranch = branches.some((b) => b.name === branch);
          const visibilityLabel = isPrivate ? 'privado' : 'público';

          return {
            ok: true,
            repository: displayRepo,
            branch,
            isEmpty,
            isPrivate,
            canPush: true,
            defaultBranch: hasTargetBranch ? branch : repoData.default_branch || branch,
            tokenType,
            message: isEmpty
              ? `Conexão confirmada com repositório ${visibilityLabel} "${displayRepo}" (repositório vazio pronto para receber seu Vault OKF).`
              : `Conexão confirmada com repositório ${visibilityLabel} "${displayRepo}" (${branches.length} branch(es) detectada(s)).`,
          };
        }
      } catch {
        // Network error or isolated test environment -> fall back to git CLI
      }
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
        isPrivate: isLocalRemote ? true : undefined,
        canPush: true,
        defaultBranch: hasTargetBranch ? branch : undefined,
        tokenType,
        message: isEmpty
          ? `Conexão confirmada com "${displayRepo}" (repositório vazio pronto para receber seu Vault).`
          : `Conexão confirmada com "${displayRepo}" (${lines.length} branch(es) detectada(s)).`,
      };
    } catch (err) {
      return {
        ok: false,
        repository: displayRepo,
        branch,
        tokenType,
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
      isPrivate: testRes.isPrivate,
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

    const remoteUrl = buildRemoteUrl(config.repository, config.token);
    try {
      await this.prepareWorkspaceDir(config.repository, branch, remoteUrl, token, true);
    } catch (err) {
      if (!isGitBinaryMissing(err)) {
        throw err;
      }
      await this.prepareWorkspaceDir(config.repository, branch, remoteUrl, token, false);
    }

    const strategy = input.strategy ?? 'merge';
    const mode = strategy === 'pull_initial' ? 'pull_only' : 'bidirectional';
    const initialSync = await this.syncNow(mode, {
      skipPullImport: strategy === 'push_initial',
      forceFullExport: strategy === 'push_initial',
    });
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

  async syncNow(
    mode: 'bidirectional' | 'pull_only' = 'bidirectional',
    options: SyncRunOptions = {},
  ): Promise<GitHubSyncResult> {
    if (this.activeSync) {
      return this.activeSync;
    }
    this.activeSync = this.executeSync(mode, options).finally(() => {
      this.activeSync = null;
    });
    return this.activeSync;
  }

  private async importDiskEntriesToRepo(
    diskEntries: RawMarkdownFileEntry[],
    syncedAt: string,
    pulledFiles: string[],
    conflictPages: string[],
  ): Promise<void> {
    if (diskEntries.length === 0) return;

    const existingPages = await this.repo.listPages(false);
    const plan = planBulkVaultImport(diskEntries, existingPages, { conflictStrategy: 'upsert' });
    const existingById = new Map(existingPages.map((p) => [p.id, p]));
    const existingByPath = new Map(
      existingPages.filter((p) => p.sourcePath).map((p) => [p.sourcePath!, p]),
    );

    for (const candidate of plan.pagesToUpsert) {
      const existing =
        existingById.get(candidate.id) ??
        (candidate.sourcePath ? existingByPath.get(candidate.sourcePath) : undefined);

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

  private stageExportToVaultDir(
    activePages: MindPage[],
    allAssets: MindAsset[],
    forceFullExport: boolean,
  ): {
    pushedFiles: string[];
    pendingUpdates: PendingPageSyncUpdate[];
    syncedHashMap: Map<string, string>;
    textFilesToUpload: Array<{ path: string; content: string }>;
    binaryFilesToUpload: Array<{ path: string; base64: string }>;
  } {
    const pushedFiles: string[] = [];
    const pendingUpdates: PendingPageSyncUpdate[] = [];
    const syncedHashMap = new Map<string, string>();
    const textFilesToUpload: Array<{ path: string; content: string }> = [];
    const binaryFilesToUpload: Array<{ path: string; base64: string }> = [];

    for (const asset of allAssets) {
      const storageRel = resolveAssetStoragePath(asset);
      const fullAssetPath = path.join(this.gitVaultDir, storageRel);
      if (forceFullExport || !fs.existsSync(fullAssetPath)) {
        fs.mkdirSync(path.dirname(fullAssetPath), { recursive: true });
        fs.writeFileSync(fullAssetPath, Buffer.from(asset.dataBase64, 'base64'));
        pushedFiles.push(storageRel);
        binaryFilesToUpload.push({ path: storageRel, base64: asset.dataBase64 });
      }
    }

    for (const page of activePages) {
      const targetRelPath = computeOkfPagePath(page, activePages);
      const fullPath = path.join(this.gitVaultDir, targetRelPath);
      const isDirty = !page.lastSyncedHash || page.sourceHash !== page.lastSyncedHash;
      const fileMissing = !fs.existsSync(fullPath);

      if (forceFullExport || isDirty || fileMissing || page.sourcePath !== targetRelPath) {
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        const okfContent = exportPageAsOkfMarkdown(page, activePages, allAssets);
        const currentOnDisk = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf-8') : null;
        if (forceFullExport || currentOnDisk !== okfContent) {
          fs.writeFileSync(fullPath, okfContent, 'utf-8');
          pushedFiles.push(targetRelPath);
          textFilesToUpload.push({ path: targetRelPath, content: okfContent });
        }
        const diskHash = computeMarkdownHash(`${targetRelPath}::${okfContent}`);
        pendingUpdates.push({ pageId: page.id, targetRelPath, diskHash });
        syncedHashMap.set(page.id, diskHash);
      }
    }

    const rootIndexPath = path.join(this.gitVaultDir, 'index.md');
    if (forceFullExport || !fs.existsSync(rootIndexPath) || pushedFiles.length > 0) {
      const rootIndexContent = generateOkfRootIndex(activePages);
      fs.writeFileSync(rootIndexPath, rootIndexContent, 'utf-8');
      textFilesToUpload.push({ path: 'index.md', content: rootIndexContent });
    }

    return {
      pushedFiles,
      pendingUpdates,
      syncedHashMap,
      textFilesToUpload,
      binaryFilesToUpload,
    };
  }

  private async commitConfirmedSyncHashes(
    pendingUpdates: PendingPageSyncUpdate[],
    syncedHashMap: Map<string, string>,
  ): Promise<void> {
    for (const upd of pendingUpdates) {
      await this.repo.updatePage(upd.pageId, {
        sourcePath: upd.targetRelPath,
        sourceHash: upd.diskHash,
        lastSyncedHash: upd.diskHash,
      });
    }
    if (syncedHashMap.size > 0) {
      await this.repo.markPagesSynced(syncedHashMap);
    }
  }

  private async persistSyncSuccess(
    cfg: StoredSyncConfig,
    syncedAt: string,
    pushedFiles: string[],
    pulledFiles: string[],
    conflictPages: string[],
    commitSha: string | null,
  ): Promise<GitHubSyncResult> {
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
  }

  private async syncViaGitHubApi(
    cfg: StoredSyncConfig,
    mode: 'bidirectional' | 'pull_only',
    options: SyncRunOptions,
    syncedAt: string,
    pulledFiles: string[],
    conflictPages: string[],
  ): Promise<GitHubSyncResult> {
    const { displayRepo, isLocalRemote } = normalizeGitHubRepository(cfg.repository);
    if (isLocalRemote) {
      throw new Error('Binário git ausente no ambiente para sincronizar repositório local.');
    }

    const headers = buildGitHubHeaders(cfg.token);
    await this.prepareWorkspaceDir(displayRepo, cfg.branch, '', cfg.token, false);

    // 1. Check remote branch ref
    let remoteExists = false;
    let parentCommitSha: string | null = null;
    let baseTreeSha: string | null = null;

    const refRes = await fetch(
      `${GITHUB_API_BASE}/repos/${displayRepo}/git/ref/heads/${encodeURIComponent(cfg.branch)}`,
      { headers },
    );

    if (refRes.ok) {
      remoteExists = true;
      const refData = (await refRes.json()) as { object?: { sha?: string } };
      parentCommitSha = refData.object?.sha ?? null;

      if (parentCommitSha) {
        const commitRes = await fetch(
          `${GITHUB_API_BASE}/repos/${displayRepo}/git/commits/${parentCommitSha}`,
          { headers },
        );
        if (commitRes.ok) {
          const commitData = (await commitRes.json()) as { tree?: { sha?: string } };
          baseTreeSha = commitData.tree?.sha ?? null;
        }
      }
    }

    // 2. Pull phase via GitHub Tree/Blob API
    if (remoteExists && baseTreeSha && !options.skipPullImport) {
      const treeRes = await fetch(
        `${GITHUB_API_BASE}/repos/${displayRepo}/git/trees/${baseTreeSha}?recursive=1`,
        { headers },
      );
      if (treeRes.ok) {
        const treeData = (await treeRes.json()) as { tree?: GitHubTreeItem[] };
        const diskEntries: RawMarkdownFileEntry[] = [];
        for (const item of treeData.tree ?? []) {
          if (item.type !== 'blob') continue;
          if (!/\.(md|markdown)$/i.test(item.path)) continue;
          if (item.path === 'index.md' || item.path === 'log.md') continue;
          const firstSeg = item.path.split('/')[0] ?? '';
          if (item.path.startsWith('.') || IGNORED_DIRS.has(firstSeg)) continue;

          const blobRes = await fetch(
            `${GITHUB_API_BASE}/repos/${displayRepo}/git/blobs/${item.sha}`,
            { headers },
          );
          if (!blobRes.ok) continue;
          const blobData = (await blobRes.json()) as { content?: string; encoding?: string };
          const decoded =
            blobData.encoding === 'base64'
              ? Buffer.from(blobData.content ?? '', 'base64').toString('utf-8')
              : (blobData.content ?? '');

          const fullPath = path.join(this.gitVaultDir, item.path);
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, decoded, 'utf-8');
          diskEntries.push({ path: item.path, content: decoded });
        }

        await this.importDiskEntriesToRepo(diskEntries, syncedAt, pulledFiles, conflictPages);
      }
    }

    // 3. Push phase via GitHub Git Data API
    let pushedFiles: string[] = [];
    let commitSha = parentCommitSha ?? cfg.lastCommitSha;

    if (mode === 'bidirectional') {
      const activePages = await this.repo.listPages(false);
      const allAssets = await this.repo.listAssets();
      const forceFull = Boolean(options.forceFullExport || !remoteExists);
      const staged = this.stageExportToVaultDir(activePages, allAssets, forceFull);
      pushedFiles = staged.pushedFiles;

      if (staged.textFilesToUpload.length > 0 || staged.binaryFilesToUpload.length > 0) {
        const prelimHistoryEntry: GitHubSyncHistoryEntry = {
          id: `sync-${randomUUID().slice(0, 8)}`,
          timestamp: syncedAt,
          direction: pulledFiles.length > 0 ? 'bidirectional' : 'push',
          commitSha: null,
          filesChanged: pushedFiles.length + pulledFiles.length,
          summary: `Sincronizado ${pushedFiles.length} arquivo(s) para OKF bundle`,
          status: conflictPages.length > 0 ? 'conflict' : 'success',
        };
        const logContent = generateOkfLogMarkdown(
          [prelimHistoryEntry, ...cfg.history].slice(0, 30),
        );
        fs.writeFileSync(path.join(this.gitVaultDir, 'log.md'), logContent, 'utf-8');
        staged.textFilesToUpload.push({ path: 'log.md', content: logContent });

        // Bootstrap empty repository via Contents API so Git Data API accepts blobs/trees
        if (!remoteExists) {
          const rootIndexEntry =
            staged.textFilesToUpload.find((f) => f.path === 'index.md') ?? {
              path: 'index.md',
              content: generateOkfRootIndex(activePages),
            };
          const initRes = await fetch(
            `${GITHUB_API_BASE}/repos/${displayRepo}/contents/index.md`,
            {
              method: 'PUT',
              headers,
              body: JSON.stringify({
                message: 'chore(okf): initialize Mind Hub OKF bundle [skip ci]',
                content: Buffer.from(rootIndexEntry.content, 'utf-8').toString('base64'),
                branch: cfg.branch,
              }),
            },
          );
          if (!initRes.ok) {
            const errBody = (await initRes.text().catch(() => '')) || initRes.statusText;
            throw new Error(`Falha ao inicializar repositório GitHub (${initRes.status}): ${errBody}`);
          }
          const initData = (await initRes.json()) as {
            commit?: { sha?: string; tree?: { sha?: string } };
          };
          parentCommitSha = initData.commit?.sha ?? null;
          baseTreeSha = initData.commit?.tree?.sha ?? null;
        }

        const treeItems: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string }> = [];

        const uploadBlob = async (base64Content: string, filePath: string): Promise<void> => {
          const blobRes = await fetch(`${GITHUB_API_BASE}/repos/${displayRepo}/git/blobs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ content: base64Content, encoding: 'base64' }),
          });
          if (!blobRes.ok) {
            throw new Error(`Falha ao enviar blob "${filePath}" (${blobRes.status})`);
          }
          const blobData = (await blobRes.json()) as { sha: string };
          treeItems.push({ path: filePath, mode: '100644', type: 'blob', sha: blobData.sha });
        };

        for (const binFile of staged.binaryFilesToUpload) {
          await uploadBlob(binFile.base64, binFile.path);
        }
        for (const txtFile of staged.textFilesToUpload) {
          await uploadBlob(Buffer.from(txtFile.content, 'utf-8').toString('base64'), txtFile.path);
        }

        const createTreeRes = await fetch(`${GITHUB_API_BASE}/repos/${displayRepo}/git/trees`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ...(baseTreeSha ? { base_tree: baseTreeSha } : {}),
            tree: treeItems,
          }),
        });
        if (!createTreeRes.ok) {
          throw new Error(`Falha ao criar árvore Git (${createTreeRes.status})`);
        }
        const treeCreated = (await createTreeRes.json()) as { sha: string };

        const commitRes = await fetch(`${GITHUB_API_BASE}/repos/${displayRepo}/git/commits`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message: `sync(mind-hub): update ${Math.max(1, pushedFiles.length)} OKF note(s) [skip ci]`,
            tree: treeCreated.sha,
            parents: parentCommitSha ? [parentCommitSha] : [],
          }),
        });
        if (!commitRes.ok) {
          throw new Error(`Falha ao criar commit Git (${commitRes.status})`);
        }
        const commitCreated = (await commitRes.json()) as { sha: string };

        const updateRefRes = await fetch(
          `${GITHUB_API_BASE}/repos/${displayRepo}/git/refs/heads/${encodeURIComponent(cfg.branch)}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ sha: commitCreated.sha }),
          },
        );
        if (!updateRefRes.ok) {
          throw new Error(`Falha ao atualizar branch "${cfg.branch}" (${updateRefRes.status})`);
        }

        commitSha = commitCreated.sha;
        await this.commitConfirmedSyncHashes(staged.pendingUpdates, staged.syncedHashMap);
      } else if (staged.pendingUpdates.length > 0) {
        await this.commitConfirmedSyncHashes(staged.pendingUpdates, staged.syncedHashMap);
      }
    }

    return this.persistSyncSuccess(
      cfg,
      syncedAt,
      pushedFiles,
      pulledFiles,
      conflictPages,
      commitSha,
    );
  }

  private async executeSync(
    mode: 'bidirectional' | 'pull_only',
    options: SyncRunOptions = {},
  ): Promise<GitHubSyncResult> {
    const cfg = await this.repo.getSyncConfig();
    if (!cfg) {
      throw new Error('Integração GitHub não configurada.');
    }

    const remoteUrl = buildRemoteUrl(cfg.repository, cfg.token);
    const syncedAt = new Date().toISOString();
    let pushedFiles: string[] = [];
    const pulledFiles: string[] = [];
    const conflictPages: string[] = [];

    try {
      try {
        await this.prepareWorkspaceDir(cfg.repository, cfg.branch, remoteUrl, cfg.token, true);
      } catch (initErr) {
        if (isGitBinaryMissing(initErr)) {
          return await this.syncViaGitHubApi(cfg, mode, options, syncedAt, pulledFiles, conflictPages);
        }
        throw initErr;
      }

      // 1. Check remote heads and fetch/pull if remote branch exists
      let lsRes: { stdout: string; stderr: string };
      try {
        lsRes = await this.runGit(
          ['ls-remote', '--heads', 'origin', cfg.branch],
          this.gitVaultDir,
          cfg.token,
        );
      } catch (lsErr) {
        if (isGitBinaryMissing(lsErr)) {
          return await this.syncViaGitHubApi(cfg, mode, options, syncedAt, pulledFiles, conflictPages);
        }
        throw lsErr;
      }

      const remoteHeadLine = lsRes.stdout.trim().split('\n').filter(Boolean)[0] ?? '';
      const remoteExists = remoteHeadLine.length > 0;
      const remoteHeadSha = remoteHeadLine.split(/\s+/)[0] || null;

      if (remoteExists) {
        await this.runGit(['fetch', 'origin', cfg.branch], this.gitVaultDir, cfg.token);
        const hasLocalHead = await this.runGit(['rev-parse', '--verify', 'HEAD'], this.gitVaultDir)
          .then(() => true)
          .catch(() => false);
        if (hasLocalHead) {
          await this.runGit(['checkout', '-B', cfg.branch], this.gitVaultDir, cfg.token);
          await this.runGit(['pull', '--rebase', 'origin', cfg.branch], this.gitVaultDir, cfg.token);
        } else {
          await this.runGit(
            ['checkout', '-B', cfg.branch, `origin/${cfg.branch}`],
            this.gitVaultDir,
            cfg.token,
          );
        }

        // 2. Pull phase: inspect disk markdown files against DB hashes
        if (!options.skipPullImport) {
          const diskEntries = scanVaultMarkdownFiles(this.gitVaultDir);
          await this.importDiskEntriesToRepo(diskEntries, syncedAt, pulledFiles, conflictPages);
        }
      }

      // 3. Push phase (Delta Sync)
      let commitSha = cfg.lastCommitSha;

      if (mode === 'bidirectional') {
        const activePages = await this.repo.listPages(false);
        const allAssets = await this.repo.listAssets();
        const forceFull = Boolean(options.forceFullExport || !remoteExists);
        const staged = this.stageExportToVaultDir(activePages, allAssets, forceFull);
        pushedFiles = staged.pushedFiles;

        const statusRes = await this.runGit(['status', '--porcelain'], this.gitVaultDir, cfg.token);
        const hasWorkingChanges = statusRes.stdout.trim().length > 0;

        if (hasWorkingChanges) {
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
            [
              'commit',
              '-m',
              `sync(mind-hub): update ${Math.max(1, pushedFiles.length)} OKF note(s) [skip ci]`,
            ],
            this.gitVaultDir,
            cfg.token,
          );
        }

        const localHeadSha = await this.runGit(['rev-parse', 'HEAD'], this.gitVaultDir)
          .then((r) => r.stdout.trim() || null)
          .catch(() => null);

        const needsPush =
          Boolean(localHeadSha) && (!remoteExists || localHeadSha !== remoteHeadSha);

        if (needsPush) {
          await this.runGit(['push', '-u', 'origin', cfg.branch], this.gitVaultDir, cfg.token);
          commitSha = localHeadSha;
        } else if (localHeadSha) {
          commitSha = localHeadSha;
        }

        // Only update lastSyncedHash AFTER push (or confirmed alignment with remote) succeeds
        await this.commitConfirmedSyncHashes(staged.pendingUpdates, staged.syncedHashMap);
      }

      return await this.persistSyncSuccess(
        cfg,
        syncedAt,
        pushedFiles,
        pulledFiles,
        conflictPages,
        commitSha,
      );
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
      throw new Error(safeErr, { cause: error });
    }
  }
}
