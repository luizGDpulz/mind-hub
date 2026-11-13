import { markdownToTiptap } from './markdown-ast.js';
import { generateDeterministicEmbedding, slugifyTitle } from './tree-and-search.js';
import type {
  BulkImportOptions,
  BulkImportPlanResult,
  MindPage,
  ParsedFrontmatterMetadata,
  ParsedMarkdownNote,
  RawMarkdownFileEntry,
} from './types.js';

export function computeMarkdownHash(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `fnv64-${hex1}${hex2}`;
}

export function extractFrontmatterAndBody(rawMarkdown: string): {
  frontmatter: ParsedFrontmatterMetadata;
  bodyMarkdown: string;
} {
  const normalized = rawMarkdown.replace(/\r\n/g, '\n');
  const rawAttributes: Record<string, string | string[]> = {};
  const tags: string[] = [];

  if (!normalized.startsWith('---\n')) {
    return {
      frontmatter: { tags: [], rawAttributes },
      bodyMarkdown: normalized,
    };
  }

  const endFenceIdx = normalized.indexOf('\n---\n', 4);
  const endFenceEofIdx = normalized.endsWith('\n---') ? normalized.length - 4 : -1;
  const closeIdx = endFenceIdx !== -1 ? endFenceIdx : endFenceEofIdx;

  if (closeIdx === -1) {
    return {
      frontmatter: { tags: [], rawAttributes },
      bodyMarkdown: normalized,
    };
  }

  const yamlBlock = normalized.slice(4, closeIdx);
  const bodyMarkdown = normalized.slice(closeIdx + 5).replace(/^\n+/, '');

  const lines = yamlBlock.split('\n');
  let activeListKey: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }

    const listMatch = /^\s*-\s+(.+)$/.exec(line);
    if (listMatch && activeListKey) {
      const itemVal = (listMatch[1] ?? '').trim().replace(/^["']|["']$/g, '');
      const existing = rawAttributes[activeListKey];
      if (Array.isArray(existing)) {
        existing.push(itemVal);
      } else {
        rawAttributes[activeListKey] = [itemVal];
      }
      if (activeListKey === 'tags' && itemVal) {
        tags.push(itemVal);
      }
      continue;
    }

    const kvMatch = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (!kvMatch) {
      activeListKey = null;
      continue;
    }

    const key = (kvMatch[1] ?? '').trim().toLowerCase();
    const rawVal = (kvMatch[2] ?? '').trim();

    if (!rawVal) {
      activeListKey = key;
      rawAttributes[key] = [];
      continue;
    }

    activeListKey = null;

    if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
      const inner = rawVal.slice(1, -1).trim();
      const items = inner
        ? inner
            .split(',')
            .map((part) => part.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean)
        : [];
      rawAttributes[key] = items;
      if (key === 'tags') {
        tags.push(...items);
      }
    } else {
      const cleanScalar = rawVal.replace(/^["']|["']$/g, '');
      rawAttributes[key] = cleanScalar;
      if (key === 'tags' && cleanScalar) {
        tags.push(
          ...cleanScalar
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        );
      }
    }
  }

  // Extract inline #hashtags from status/project if present
  const status = typeof rawAttributes.status === 'string' ? rawAttributes.status : undefined;
  const project = typeof rawAttributes.project === 'string' ? rawAttributes.project : undefined;
  if (status) tags.push(slugifyTitle(status));
  if (project) tags.push(slugifyTitle(project));

  const uniqueTags = Array.from(new Set(tags.map((t) => t.replace(/^#/, '').trim()).filter(Boolean)));

  const coverYRaw = rawAttributes.cover_y ?? rawAttributes.covery;
  const parsedCoverY = typeof coverYRaw === 'string' ? Number(coverYRaw) : undefined;

  return {
    frontmatter: {
      id: typeof rawAttributes.id === 'string' ? rawAttributes.id : undefined,
      title: typeof rawAttributes.title === 'string' ? rawAttributes.title : undefined,
      slug: typeof rawAttributes.slug === 'string' ? rawAttributes.slug : undefined,
      icon: typeof rawAttributes.icon === 'string' ? rawAttributes.icon : undefined,
      type: typeof rawAttributes.type === 'string' ? rawAttributes.type : undefined,
      description: typeof rawAttributes.description === 'string' ? rawAttributes.description : undefined,
      coverUrl:
        typeof rawAttributes.cover_url === 'string'
          ? rawAttributes.cover_url
          : typeof rawAttributes.coverurl === 'string'
            ? rawAttributes.coverurl
            : undefined,
      coverY: Number.isFinite(parsedCoverY) ? parsedCoverY : undefined,
      tags: uniqueTags,
      created:
        typeof rawAttributes.created_at === 'string'
          ? rawAttributes.created_at
          : typeof rawAttributes.created === 'string'
            ? rawAttributes.created
            : undefined,
      updated:
        typeof rawAttributes.updated_at === 'string'
          ? rawAttributes.updated_at
          : typeof rawAttributes.updated === 'string'
            ? rawAttributes.updated
            : undefined,
      status,
      project,
      isFavorite: rawAttributes.favorite === 'true' || rawAttributes.isfavorite === 'true',
      isInbox: rawAttributes.inbox === 'true' || rawAttributes.isinbox === 'true',
      rawAttributes,
    },
    bodyMarkdown,
  };
}

export function normalizeObsidianMarkdown(bodyMarkdown: string): {
  normalizedMarkdown: string;
  wikiLinks: string[];
} {
  const wikiLinks: string[] = [];

  // 1. Convert Obsidian / GitHub callouts `> [!NOTE] Title` -> `> ℹ️ **[NOTE]** Title`
  const CALLOUT_ICONS: Record<string, string> = {
    NOTE: 'ℹ️',
    TIP: '💡',
    IMPORTANT: '📌',
    WARNING: '⚠️',
    CAUTION: '🛑',
    INFO: 'ℹ️',
    TODO: '📝',
    SUMMARY: '📋',
    ABSTRACT: '📋',
    EXAMPLE: '🧪',
    QUESTION: '❓',
    QUOTE: '💬',
    SUCCESS: '✅',
    BUG: '🐛',
    DANGER: '🚨',
  };

  const calloutTransformed = bodyMarkdown
    .split('\n')
    .map((line) => {
      const calloutMatch = /^>\s*\[!([A-Za-z]+)\][-+]?\s*(.*)$/.exec(line);
      if (calloutMatch) {
        const kind = (calloutMatch[1] ?? 'NOTE').toUpperCase();
        const icon = CALLOUT_ICONS[kind] ?? 'ℹ️';
        const rest = (calloutMatch[2] ?? '').trim();
        return rest ? `> ${icon} **[${kind}]** ${rest}` : `> ${icon} **[${kind}]**`;
      }
      return line;
    })
    .join('\n');

  // 2. Convert [[Target|Alias]] and [[Target]] into standard Markdown links
  const wikiTransformed = calloutTransformed.replace(
    /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g,
    (_full, rawTarget: string, rawAlias?: string) => {
      const cleanTarget = rawTarget.trim().split('/').pop()?.trim() ?? rawTarget.trim();
      const displayLabel = (rawAlias ?? cleanTarget).trim();
      const targetSlug = slugifyTitle(cleanTarget);
      if (cleanTarget) {
        wikiLinks.push(cleanTarget);
      }
      return `[${displayLabel}](#/page/${targetSlug})`;
    },
  );

  return {
    normalizedMarkdown: wikiTransformed,
    wikiLinks: Array.from(new Set(wikiLinks)),
  };
}

export function inferIconForPath(
  folderSegments: ReadonlyArray<string>,
  title: string,
  tags: ReadonlyArray<string>,
  explicitIcon?: string,
): string {
  if (explicitIcon && explicitIcon.trim()) {
    return explicitIcon.trim();
  }
  const joinedPath = [...folderSegments, title, ...tags].join(' ').toLowerCase();
  if (joinedPath.includes('padr') || joinedPath.includes('style') || joinedPath.includes('design')) {
    return '📐';
  }
  if (joinedPath.includes('adr') || joinedPath.includes('arquitetura')) {
    return '⚡';
  }
  if (joinedPath.includes('inbox') || joinedPath.includes('captura')) {
    return '📥';
  }
  if (joinedPath.includes('project') || joinedPath.includes('projeto') || joinedPath.includes('mind hub')) {
    return '🚀';
  }
  if (joinedPath.includes('stud') || joinedPath.includes('estudo') || joinedPath.includes('rfc')) {
    return '📚';
  }
  if (joinedPath.includes('work') || joinedPath.includes('secullum') || joinedPath.includes('infra')) {
    return '🛠️';
  }
  if (joinedPath.includes('invest') || joinedPath.includes('auvp') || joinedPath.includes('finan')) {
    return '📈';
  }
  return '📄';
}

export function inferFolderIcon(folderName: string): string {
  const lower = folderName.toLowerCase();
  if (lower.includes('padr')) return '📐';
  if (lower.includes('project')) return '🚀';
  if (lower.includes('inbox')) return '📥';
  if (lower.includes('stud')) return '📚';
  if (lower.includes('work')) return '💼';
  if (lower.includes('personal')) return '🌱';
  return '📁';
}

export function parseMarkdownNoteFile(entry: RawMarkdownFileEntry): ParsedMarkdownNote {
  const cleanRelPath = entry.path
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .trim();

  const segments = cleanRelPath.split('/').filter(Boolean);
  const rawFileName = segments.pop() ?? 'Untitled.md';
  const fileNameWithoutExt = rawFileName.replace(/\.(md|markdown)$/i, '').trim() || 'Untitled';
  const folderSegments = segments;

  const { frontmatter, bodyMarkdown } = extractFrontmatterAndBody(entry.content);
  const { normalizedMarkdown, wikiLinks } = normalizeObsidianMarkdown(bodyMarkdown);

  // Determine title: Frontmatter title -> First # H1 heading -> File basename
  let resolvedTitle = frontmatter.title?.trim();
  if (!resolvedTitle) {
    const h1Match = /^#\s+(.+)$/m.exec(normalizedMarkdown);
    if (h1Match && h1Match[1]) {
      resolvedTitle = h1Match[1].trim();
    } else {
      resolvedTitle = fileNameWithoutExt;
    }
  }

  // Merge folder names as lowercase tags
  const folderTags = folderSegments.map((seg) => slugifyTitle(seg.replace(/^_+/, ''))).filter(Boolean);
  const mergedTags = Array.from(new Set([...frontmatter.tags, ...folderTags]));

  // Strip leading H1 title if present in body, because page.title is the authoritative single title (Notion standard)
  let cleanBodyMarkdown = normalizedMarkdown.trim();
  const leadingH1Regex = /^#\s+(.+)$/m;
  const match = leadingH1Regex.exec(cleanBodyMarkdown);
  if (match && match[1]) {
    const headingText = match[1].trim();
    if (
      headingText.toLowerCase() === resolvedTitle.toLowerCase() ||
      headingText.toLowerCase().replace(/^[^\w\s]+/, '').trim() ===
        resolvedTitle.toLowerCase().replace(/^[^\w\s]+/, '').trim()
    ) {
      cleanBodyMarkdown = cleanBodyMarkdown.replace(/^#\s+[^\n]+(?:\n+|$)/, '').trim();
    }
  }

  const tiptapDoc = markdownToTiptap(cleanBodyMarkdown);
  const slug = frontmatter.slug ? slugifyTitle(frontmatter.slug) : slugifyTitle(resolvedTitle);
  const icon = inferIconForPath(folderSegments, resolvedTitle, mergedTags, frontmatter.icon);
  const sourceHash = computeMarkdownHash(`${cleanRelPath}::${entry.content}`);

  return {
    relativePath: cleanRelPath,
    folderSegments,
    fileName: fileNameWithoutExt,
    title: resolvedTitle,
    slug,
    icon,
    frontmatter: {
      ...frontmatter,
      tags: mergedTags,
    },
    normalizedMarkdown: cleanBodyMarkdown,
    tiptapDoc,
    wikiLinks,
    sourceHash,
  };
}

export function planBulkVaultImport(
  files: ReadonlyArray<RawMarkdownFileEntry>,
  existingPages: ReadonlyArray<MindPage> = [],
  options: BulkImportOptions = {},
): BulkImportPlanResult {
  const now = new Date().toISOString();
  const parsedNotes = files
    .filter((f) => {
      const normalized = f.path.trim().replace(/\\/g, '/').replace(/^\/+/, '');
      if (!normalized || f.content.trim().length === 0) return false;
      // Skip synthetic OKF root log/index manifests on root path
      if (normalized === 'log.md' || normalized === 'index.md') return false;
      return true;
    })
    .map((f) => parseMarkdownNoteFile(f));

  const folderMap = new Map<string, MindPage>();
  const pagesToUpsert: MindPage[] = [];
  let folderPagesCreated = 0;
  let wikiLinksResolved = 0;
  const allTags = new Set<string>(options.defaultTags ?? []);

  // Pre-index existing pages by sourcePath and slug for hierarchy lookup
  const existingByTitleLower = new Map<string, MindPage>();
  for (const existing of existingPages) {
    if (existing.deletedAt === null) {
      existingByTitleLower.set(existing.title.toLowerCase(), existing);
      if (existing.sourcePath && existing.sourcePath.endsWith('/index.md')) {
        const folderKey = existing.sourcePath.replace(/\/index\.md$/, '');
        folderMap.set(folderKey, existing);
      }
    }
  }

  // 1. Ensure folder hierarchy pages exist for nested paths
  for (const note of parsedNotes) {
    let parentId: string | null = options.rootParentId ?? null;
    let currentFolderPath = '';

    for (const segment of note.folderSegments) {
      currentFolderPath = currentFolderPath ? `${currentFolderPath}/${segment}` : segment;
      const existingFolder = folderMap.get(currentFolderPath);

      if (existingFolder) {
        parentId = existingFolder.id;
        continue;
      }

      const folderSlug = slugifyTitle(currentFolderPath.replace(/\//g, '-'));
      const folderId = `folder-${folderSlug}`;
      const folderTitle = segment.replace(/^_+/, '');
      const folderMarkdown = `# ${folderTitle}\n\nDiretório sincronizado automaticamente do **Second Brain** (\`${currentFolderPath}/\`).`;

      const folderPage: MindPage = {
        id: folderId,
        slug: folderSlug,
        title: segment,
        icon: inferFolderIcon(segment),
        parentId,
        sortOrder: pagesToUpsert.length + 1,
        contentMarkdown: folderMarkdown,
        contentJson: markdownToTiptap(folderMarkdown),
        isFavorite: segment.startsWith('_') || segment === 'Projects',
        isInbox: segment.toLowerCase() === 'inbox',
        tags: ['second-brain', 'folder', slugifyTitle(folderTitle)],
        embedding: generateDeterministicEmbedding(`${segment} ${folderMarkdown}`),
        sourcePath: `${currentFolderPath}/index.md`,
        sourceHash: computeMarkdownHash(`folder::${currentFolderPath}`),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };

      folderMap.set(currentFolderPath, folderPage);
      pagesToUpsert.push(folderPage);
      folderPagesCreated += 1;
      parentId = folderPage.id;
    }
  }

  // 2. Transform each parsed Markdown note into a MindPage linked to its folder parent
  for (const note of parsedNotes) {
    wikiLinksResolved += note.wikiLinks.length;
    for (const tag of note.frontmatter.tags) {
      allTags.add(tag);
    }

    const folderKey = note.folderSegments.join('/');
    const parentFolder = folderKey ? folderMap.get(folderKey) : undefined;
    const lastSegment = note.folderSegments[note.folderSegments.length - 1];

    // Folder note convention: e.g., `Projects/Mind Hub/Mind Hub.md` or `Projects/index.md`
    if (
      parentFolder &&
      lastSegment &&
      (note.fileName.toLowerCase() === lastSegment.toLowerCase() ||
        note.fileName.toLowerCase() === 'index' ||
        note.fileName.toLowerCase() === 'readme')
    ) {
      if (note.frontmatter.id) {
        parentFolder.id = note.frontmatter.id;
      }
      parentFolder.title = note.title;
      parentFolder.icon = note.icon;
      parentFolder.pageType = 'index';
      parentFolder.description = note.frontmatter.description ?? parentFolder.description;
      parentFolder.coverUrl = note.frontmatter.coverUrl ?? parentFolder.coverUrl;
      parentFolder.coverYPosition = note.frontmatter.coverY ?? parentFolder.coverYPosition;
      parentFolder.contentMarkdown = note.normalizedMarkdown;
      parentFolder.contentJson = note.tiptapDoc;
      parentFolder.tags = Array.from(
        new Set([...parentFolder.tags, ...note.frontmatter.tags, ...(options.defaultTags ?? [])]),
      );
      parentFolder.embedding = generateDeterministicEmbedding(
        `${note.title} ${parentFolder.tags.join(' ')} ${note.normalizedMarkdown}`,
      );
      parentFolder.sourcePath = note.relativePath;
      parentFolder.sourceHash = note.sourceHash;
      continue;
    }

    const parentId = parentFolder ? parentFolder.id : (options.rootParentId ?? null);
    const mergedTags = Array.from(
      new Set(['second-brain', ...note.frontmatter.tags, ...(options.defaultTags ?? [])]),
    );

    const pathSlug = slugifyTitle(note.relativePath.replace(/\.(md|markdown)$/i, '').replace(/\//g, '-'));
    const pageId = note.frontmatter.id?.trim() || `sb-${pathSlug.slice(0, 48)}`;
    const rawType = note.frontmatter.type;
    const validType =
      rawType === 'concept' ||
      rawType === 'index' ||
      rawType === 'project' ||
      rawType === 'runbook' ||
      rawType === 'standard'
        ? rawType
        : 'concept';

    const page: MindPage = {
      id: pageId,
      slug: note.slug,
      title: note.title,
      icon: note.icon,
      pageType: validType,
      description: note.frontmatter.description ?? '',
      coverUrl: note.frontmatter.coverUrl ?? null,
      coverYPosition: note.frontmatter.coverY ?? 50,
      parentId,
      sortOrder: pagesToUpsert.length + 1,
      contentMarkdown: note.normalizedMarkdown,
      contentJson: note.tiptapDoc,
      isFavorite: note.frontmatter.isFavorite ?? false,
      isInbox: note.frontmatter.isInbox ?? folderKey.toLowerCase() === 'inbox',
      tags: mergedTags,
      embedding: generateDeterministicEmbedding(
        `${note.title} ${mergedTags.join(' ')} ${note.normalizedMarkdown}`,
      ),
      sourcePath: note.relativePath,
      sourceHash: note.sourceHash,
      createdAt: note.frontmatter.created ?? now,
      updatedAt: note.frontmatter.updated ?? now,
      deletedAt: null,
    };

    pagesToUpsert.push(page);
  }

  return {
    pagesToUpsert,
    folderPagesCreated,
    notesProcessed: parsedNotes.length,
    wikiLinksResolved,
    discoveredTags: Array.from(allTags),
  };
}

export function createSampleSecondBrainBatch(): RawMarkdownFileEntry[] {
  return [
    {
      path: '_Padrões/Soft Delete.md',
      content: [
        '---',
        'created: 2026-11-10',
        'tags: [padroes, database, soft-delete, arquitetura]',
        'status: ativo',
        'icon: 🛡️',
        '---',
        '# Padrão de Soft Delete Universal',
        '',
        '> [!IMPORTANT] Regra Inegociável de Dados',
        '> Jamais execute `DELETE FROM` físico em entidades de negócio. Utilize a coluna `deleted_at` (`TIMESTAMPTZ`) para preservar histórico e integridade referencial.',
        '',
        '## Benefícios Diretos',
        '',
        '- Recuperação instantânea via lixeira sem restauração de backup',
        '- Auditoria completa de exclusões em [[Mind Hub]] e [[Secullum Database Manager]]',
        '- Compatibilidade total com índices parciais no PostgreSQL (`WHERE deleted_at IS NULL`)',
      ].join('\n'),
    },
    {
      path: '_Padrões/Padrões de UI e Design System (Mind Style).md',
      content: [
        '---',
        'created: 2026-11-10',
        'tags: [padroes, ui, ux, design-system, mind-light-style]',
        'status: ativo',
        'icon: 📐',
        '---',
        '# Padrões de UI e Design System (Mind Style)',
        '',
        '> [!NOTE] Sobriedade Cirúrgica',
        '> Inspirado na limpeza extrema do Notion e Docmost: canvas branco puro `#ffffff`, sidebar `#f8f9fa` e divisórias `#e9ecef`.',
        '',
        '- [x] Veto absoluto ao Azul Escuro IA e gradientes neon',
        '- [x] Pílulas pastéis semânticas nas visões Table e Kanban Board',
        '- [x] Blocos nativos open-source: **Mermaid**, **Excalidraw** e **Draw.io**',
      ].join('\n'),
    },
    {
      path: 'Projects/Mind Hub/ADR 002 Motor de Importação Second Brain.md',
      content: [
        '---',
        'created: 2026-11-11',
        'tags: [adr, mind-hub, importer, markdown, pgvector]',
        'project: Mind Hub',
        'status: aprovado',
        'icon: ⚡',
        '---',
        '# ADR 002: Ingestão em Massa de Markdown e Second Brain',
        '',
        '## Contexto',
        '',
        'Usuários de **Obsidian** e cofres Git possuem centenas de arquivos `.md` organizados em pastas com Frontmatter YAML e `[[WikiLinks]]`.',
        '',
        '## Decisão',
        '',
        '1. Parser nativo de Frontmatter YAML (`tags`, `created`, `status`, `project`)',
        '2. Reconstrução automática da árvore de páginas (`parentId`) a partir dos diretórios',
        '3. Hash determinístico `FNV-1a 64-bit` (`sourceHash`) para upserts idempotentes em lote',
        '4. Indexação vetorial imediata (`vector(64)`) para busca híbrida e RAG via [[Guia do Servidor MCP Nativo (/mcp)]]',
      ].join('\n'),
    },
    {
      path: 'Studies/Arquitetura Local First & pgvector.md',
      content: [
        '---',
        'created: 2026-11-11',
        'tags: [studies, pgvector, rag, local-first]',
        'icon: 📚',
        '---',
        '# Estudos de Busca Híbrida (Lexical + Semântica)',
        '',
        'A combinação de **BM25 / Lexical Match** com distância de cosseno em `pgvector` garante precisão tanto para siglas exatas (`ADR 001`, `GHCR`) quanto para perguntas conceituais.',
        '',
        '| Estratégia | Latência Média | Recall Semântico |',
        '| --- | --- | --- |',
        '| Full-Text Puro | 0.8ms | Médio |',
        '| Híbrido (Lexical + Vetorial) | 1.4ms | Alto |',
      ].join('\n'),
    },
  ];
}
