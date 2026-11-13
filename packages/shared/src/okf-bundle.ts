import type { GitHubSyncHistoryEntry, MindAsset, MindPage, OkfPageType } from './types.js';

function countPosixDepth(filePath: string): number {
  const parts = filePath.split('/').filter(Boolean);
  // Last part is the filename; preceding parts are directories
  return Math.max(0, parts.length - 1);
}

export function toRelativeBundlePath(fromFilePath: string, targetFilePath: string): string {
  const fromParts = fromFilePath.split('/').filter(Boolean);
  fromParts.pop(); // drop filename
  const toParts = targetFilePath.split('/').filter(Boolean);

  let common = 0;
  while (common < fromParts.length && common < toParts.length && fromParts[common] === toParts[common]) {
    common += 1;
  }

  const ups = fromParts.length - common;
  const prefix = ups === 0 ? './' : '../'.repeat(ups);
  const tail = toParts.slice(common).join('/');
  return `${prefix}${tail}`;
}

export function computeOkfPagePath(
  page: MindPage,
  allPages: ReadonlyArray<MindPage>,
): string {
  const activePages = allPages.filter((p) => p.deletedAt === null);
  const byId = new Map<string, MindPage>();
  const childrenCount = new Map<string, number>();

  for (const p of activePages) {
    byId.set(p.id, p);
    if (p.parentId) {
      childrenCount.set(p.parentId, (childrenCount.get(p.parentId) ?? 0) + 1);
    }
  }

  const segments: string[] = [];
  const visited = new Set<string>();
  let cursor: MindPage | undefined = page;

  while (cursor && !visited.has(cursor.id)) {
    visited.add(cursor.id);
    segments.unshift(cursor.slug || 'sem-titulo');
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }

  const hasChildren = (childrenCount.get(page.id) ?? 0) > 0;
  if (hasChildren) {
    return `${segments.join('/')}/index.md`;
  }

  const leaf = segments.pop() ?? 'sem-titulo';
  return segments.length > 0 ? `${segments.join('/')}/${leaf}.md` : `${leaf}.md`;
}

export function resolveAssetStoragePath(asset: MindAsset): string {
  if (asset.storagePath && asset.storagePath.trim().length > 0) {
    return asset.storagePath.replace(/^\/+/, '');
  }
  const folder = asset.kind === 'cover' ? 'assets/covers' : 'assets/images';
  const safeName = asset.filename.replace(/[^a-zA-Z0-9._-]/g, '-');
  return `${folder}/${asset.id}-${safeName}`;
}

export function rewriteAssetUrlsForOkf(
  content: string,
  pageFilePath: string,
  assets: ReadonlyArray<MindAsset>,
): string {
  if (!content || assets.length === 0) return content;

  let result = content;
  for (const asset of assets) {
    const storagePath = resolveAssetStoragePath(asset);
    const relPath = toRelativeBundlePath(pageFilePath, storagePath);
    const apiPath = `/api/assets/${asset.id}`;
    const encodedApiPath = `/api/assets/${encodeURIComponent(asset.id)}`;
    result = result.split(encodedApiPath).join(relPath);
    result = result.split(apiPath).join(relPath);
  }
  return result;
}

export function rewriteSubpageLinksForOkf(
  markdown: string,
  currentPagePath: string,
  pagePathById: ReadonlyMap<string, string>,
): string {
  return markdown.replace(
    /\[([^\]]+)\]\((#\/page\/([^)]+))\)(\s*<!--\s*mind:subpage[^>]*-->)/g,
    (_full, label: string, _hashHref: string, pageId: string, comment: string) => {
      const targetPath = pagePathById.get(pageId);
      if (!targetPath) {
        return `[${label}](#/page/${pageId})${comment}`;
      }
      const rel = toRelativeBundlePath(currentPagePath, targetPath);
      const encodedRel = rel
        .split('/')
        .map((seg) => (seg === '.' || seg === '..' ? seg : encodeURIComponent(seg)))
        .join('/');
      return `[${label}](${encodedRel})${comment}`;
    },
  );
}

export function inferOkfDescription(page: MindPage): string {
  if (page.description && page.description.trim().length > 0) {
    return page.description.trim();
  }
  const plain = page.contentMarkdown
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^#+\s+.*$/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_~>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) {
    return `Documento ${page.title} no workspace Mind Hub.`;
  }
  return plain.length > 160 ? `${plain.slice(0, 157)}...` : plain;
}

export function exportPageAsOkfMarkdown(
  page: MindPage,
  allPages: ReadonlyArray<MindPage>,
  assets: ReadonlyArray<MindAsset> = [],
): string {
  const activePages = allPages.filter((p) => p.deletedAt === null);
  const pagePathById = new Map<string, string>();
  const childrenCount = new Map<string, number>();

  for (const p of activePages) {
    pagePathById.set(p.id, computeOkfPagePath(p, activePages));
    if (p.parentId) {
      childrenCount.set(p.parentId, (childrenCount.get(p.parentId) ?? 0) + 1);
    }
  }

  const pageFilePath = pagePathById.get(page.id) ?? computeOkfPagePath(page, activePages);
  const hasChildren = (childrenCount.get(page.id) ?? 0) > 0;
  const resolvedType: OkfPageType = hasChildren ? 'index' : (page.pageType ?? 'concept');
  const description = inferOkfDescription(page);

  const tagsFormatted =
    page.tags.length > 0 ? `[${page.tags.map((t) => t.trim()).join(', ')}]` : '[]';

  const resolvedCover = page.coverUrl
    ? rewriteAssetUrlsForOkf(page.coverUrl, pageFilePath, assets)
    : null;

  const frontmatterLines = [
    '---',
    `id: ${page.id}`,
    `slug: ${page.slug}`,
    `title: "${page.title.replace(/"/g, '\\"')}"`,
    `type: "${resolvedType}"`,
    `description: "${description.replace(/"/g, '\\"')}"`,
    `icon: "${page.icon}"`,
    `parent: ${page.parentId ?? 'null'}`,
    `tags: ${tagsFormatted}`,
    `created_at: ${page.createdAt}`,
    `updated_at: ${page.updatedAt}`,
  ];

  if (resolvedCover) {
    frontmatterLines.push(`cover_url: "${resolvedCover.replace(/"/g, '\\"')}"`);
    frontmatterLines.push(`cover_y: ${page.coverYPosition ?? 50}`);
  }

  frontmatterLines.push('---', '');

  let body = page.contentMarkdown.trim();
  body = rewriteAssetUrlsForOkf(body, pageFilePath, assets);
  body = rewriteSubpageLinksForOkf(body, pageFilePath, pagePathById);

  const heading = `# ${page.icon ? `${page.icon} ` : ''}${page.title}`;
  const lines = [...frontmatterLines, heading, ''];
  if (body.length > 0) {
    lines.push(body, '');
  }

  // Keep depth helper referenced cleanly if needed for relative paths
  void countPosixDepth;

  return lines.join('\n');
}

export function generateOkfRootIndex(pages: ReadonlyArray<MindPage>): string {
  const active = pages.filter((p) => p.deletedAt === null);
  const roots = active
    .filter((p) => p.parentId === null && !p.isInbox)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'pt-BR'));

  const now = new Date().toISOString();
  const lines = [
    '---',
    'title: "Mind Hub Knowledge Bundle"',
    'type: "index"',
    'description: "Ponto de entrada hierárquico no padrão Google Open Knowledge Format (OKF v0.2)."',
    'tags: [okf, index, mind-hub]',
    `updated_at: ${now}`,
    '---',
    '',
    '# 🧠 Mind Hub Knowledge Bundle',
    '',
    'Este repositório segue o padrão aberto **Google Open Knowledge Format (OKF v0.2)** para navegação determinística por humanos, Obsidian e agentes de IA.',
    '',
    '## Páginas Principais',
    '',
  ];

  for (const root of roots) {
    const targetPath = computeOkfPagePath(root, active);
    const desc = inferOkfDescription(root);
    lines.push(`- [${root.icon} ${root.title}](./${targetPath}) — ${desc}`);
  }

  lines.push('', '---', '', 'Histórico de sincronizações: [log.md](./log.md)', '');
  return lines.join('\n');
}

export function generateOkfLogMarkdown(entries: ReadonlyArray<GitHubSyncHistoryEntry>): string {
  const now = new Date().toISOString();
  const lines = [
    '---',
    'title: "Synchronization & Provenance Log"',
    'type: "standard"',
    'description: "Registro cronológico de alterações e sincronizações do bundle OKF."',
    `updated_at: ${now}`,
    '---',
    '',
    '# 📋 Log de Sincronização (OKF)',
    '',
  ];

  if (entries.length === 0) {
    lines.push('_Nenhuma sincronização registrada até o momento._', '');
    return lines.join('\n');
  }

  for (const entry of entries) {
    const shaPart = entry.commitSha ? ` (\`${entry.commitSha.slice(0, 7)}\`)` : '';
    lines.push(
      `- **${entry.timestamp}** — \`${entry.direction}\` [${entry.status}]${shaPart}: ${entry.summary} (${entry.filesChanged} arquivo(s))`,
    );
  }

  lines.push('');
  return lines.join('\n');
}
