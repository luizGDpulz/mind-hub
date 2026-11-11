import type {
  MindPage,
  PageTreeNode,
  SearchPagesQuery,
  SearchResultItem,
  SlashCommandDefinition,
} from './types.js';

const ACCENTS_MAP: ReadonlyMap<string, string> = new Map([
  ['à', 'a'], ['á', 'a'], ['â', 'a'], ['ã', 'a'], ['ä', 'a'], ['å', 'a'],
  ['è', 'e'], ['é', 'e'], ['ê', 'e'], ['ë', 'e'],
  ['ì', 'i'], ['í', 'i'], ['î', 'i'], ['ï', 'i'],
  ['ò', 'o'], ['ó', 'o'], ['ô', 'o'], ['õ', 'o'], ['ö', 'o'],
  ['ù', 'u'], ['ú', 'u'], ['û', 'u'], ['ü', 'u'],
  ['ç', 'c'], ['ñ', 'n'],
  ['À', 'A'], ['Á', 'A'], ['Â', 'A'], ['Ã', 'A'], ['Ä', 'A'], ['Å', 'A'],
  ['È', 'E'], ['É', 'E'], ['Ê', 'E'], ['Ë', 'E'],
  ['Ì', 'I'], ['Í', 'I'], ['Î', 'I'], ['Ï', 'I'],
  ['Ò', 'O'], ['Ó', 'O'], ['Ô', 'O'], ['Õ', 'O'], ['Ö', 'O'],
  ['Ù', 'U'], ['Ú', 'U'], ['Û', 'U'], ['Ü', 'U'],
  ['Ç', 'C'], ['Ñ', 'N'],
]);

function removeAccents(input: string): string {
  return [...input].map((char) => ACCENTS_MAP.get(char) ?? char).join('');
}

export function slugifyTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return 'sem-titulo';
  }
  const slug = removeAccents(trimmed)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug.length > 0 ? slug : 'sem-titulo';
}

function comparePages(a: MindPage, b: MindPage): number {
  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }
  return a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' });
}

export function buildPageTree(pages: ReadonlyArray<MindPage>): PageTreeNode[] {
  const activePages = pages.filter((p) => p.deletedAt === null);
  const sorted = [...activePages].sort(comparePages);

  const nodeMap = new Map<string, PageTreeNode>();
  const roots: PageTreeNode[] = [];

  for (const page of sorted) {
    nodeMap.set(page.id, { ...page, children: [] });
  }

  for (const page of sorted) {
    const node = nodeMap.get(page.id);
    if (!node) continue;
    if (page.parentId && page.parentId !== page.id) {
      const parent = nodeMap.get(page.parentId);
      if (parent) {
        parent.children.push(node);
        continue;
      }
    }
    roots.push(node);
  }

  return roots;
}

export function flattenPageTree(
  tree: ReadonlyArray<PageTreeNode>,
  depth = 0,
): Array<{ page: MindPage; depth: number }> {
  const result: Array<{ page: MindPage; depth: number }> = [];

  function walk(nodes: ReadonlyArray<PageTreeNode>, currentDepth: number): void {
    for (const node of nodes) {
      const { children, ...pageData } = node;
      result.push({ page: pageData, depth: currentDepth });
      if (children.length > 0) {
        walk(children, currentDepth + 1);
      }
    }
  }

  walk(tree, depth);
  return result;
}

export function getPageBreadcrumbs(
  pages: ReadonlyArray<MindPage>,
  pageId: string,
): MindPage[] {
  const pageMap = new Map(pages.map((p) => [p.id, p] as const));
  const chain: MindPage[] = [];
  const visited = new Set<string>();
  let currentId: string | null = pageId;

  while (currentId !== null) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const found = pageMap.get(currentId);
    if (!found) break;
    chain.unshift(found);
    currentId = found.parentId;
  }

  return chain;
}

function generateTrigrams(text: string): string[] {
  const cleaned = removeAccents(text.toLowerCase()).replace(/\s+/g, ' ').trim();
  if (cleaned.length === 0) return [];
  if (cleaned.length < 3) return [cleaned];
  const trigrams: string[] = [];
  for (let i = 0; i <= cleaned.length - 3; i += 1) {
    trigrams.push(cleaned.slice(i, i + 3));
  }
  return trigrams;
}

function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function generateDeterministicEmbedding(text: string, dimensions = 64): number[] {
  const trigrams = generateTrigrams(text);
  const vec = new Array<number>(dimensions).fill(0);
  if (trigrams.length === 0) {
    return vec;
  }

  for (const trigram of trigrams) {
    const h = hashString(trigram);
    const idx = h % dimensions;
    const sign = (h & 1) === 0 ? 1 : -1;
    vec[idx] = (vec[idx] ?? 0) + sign;
  }

  let norm = 0;
  for (const val of vec) {
    norm += val * val;
  }
  norm = Math.sqrt(norm);

  if (norm === 0) {
    return vec;
  }

  return vec.map((v) => Number((v / norm).toFixed(6)));
}

export function cosineSimilarity(
  vecA: ReadonlyArray<number>,
  vecB: ReadonlyArray<number>,
): number {
  if (vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i += 1) {
    const a = vecA[i] ?? 0;
    const b = vecB[i] ?? 0;
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;

  const ratio = dot / denom;
  return Math.max(-1, Math.min(1, ratio));
}

function extractSnippet(content: string, matchedTerms: ReadonlyArray<string>, maxLen = 160): string {
  const clean = content.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;

  const lower = removeAccents(clean.toLowerCase());
  for (const term of matchedTerms) {
    const idx = lower.indexOf(removeAccents(term.toLowerCase()));
    if (idx !== -1) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(clean.length, start + maxLen);
      const prefix = start > 0 ? '…' : '';
      const suffix = end < clean.length ? '…' : '';
      return `${prefix}${clean.slice(start, end)}${suffix}`;
    }
  }

  return `${clean.slice(0, maxLen)}…`;
}

export function searchPagesEngine(
  pages: ReadonlyArray<MindPage>,
  queryOpts: SearchPagesQuery,
  queryEmbedding?: ReadonlyArray<number>,
): SearchResultItem[] {
  const mode = queryOpts.mode ?? 'hybrid';
  const limit = queryOpts.limit ?? 20;
  const includeDeleted = queryOpts.includeDeleted ?? false;
  const rawQuery = queryOpts.query.trim();

  const pool = pages.filter((p) => includeDeleted || p.deletedAt === null);
  if (pool.length === 0) return [];

  if (rawQuery.length === 0) {
    return pool.slice(0, limit).map((page) => ({
      page,
      score: 1,
      snippet: extractSnippet(page.contentMarkdown, []),
      matchType: mode,
      matchedTerms: [],
    }));
  }

  const terms = rawQuery
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const effectiveQueryEmbedding =
    queryEmbedding ?? generateDeterministicEmbedding(rawQuery);

  const results: SearchResultItem[] = [];

  for (const page of pool) {
    let textScore = 0;
    const matchedTerms: string[] = [];
    const normTitle = removeAccents(page.title.toLowerCase());
    const normBody = removeAccents(page.contentMarkdown.toLowerCase());
    const normTags = page.tags.map((t) => removeAccents(t.toLowerCase()));

    if (mode === 'text' || mode === 'hybrid') {
      for (const term of terms) {
        const normTerm = removeAccents(term.toLowerCase());
        let matched = false;
        if (normTitle.includes(normTerm)) {
          textScore += 12;
          matched = true;
        }
        if (normTags.some((tag) => tag.includes(normTerm))) {
          textScore += 8;
          matched = true;
        }
        if (normBody.includes(normTerm)) {
          textScore += 5;
          matched = true;
        }
        if (matched) {
          matchedTerms.push(term);
        }
      }
    }

    let semanticScore = 0;
    if (mode === 'semantic' || mode === 'hybrid') {
      const pageVec =
        page.embedding && page.embedding.length === effectiveQueryEmbedding.length
          ? page.embedding
          : generateDeterministicEmbedding(`${page.title} ${page.tags.join(' ')} ${page.contentMarkdown}`);
      const sim = cosineSimilarity(effectiveQueryEmbedding, pageVec);
      if (sim > 0.08) {
        semanticScore = Math.max(0, sim * 20);
      }
    }

    const totalScore =
      mode === 'text'
        ? textScore
        : mode === 'semantic'
          ? semanticScore
          : textScore + semanticScore;

    if (totalScore > 0) {
      results.push({
        page,
        score: Number(totalScore.toFixed(4)),
        snippet: extractSnippet(page.contentMarkdown, matchedTerms.length > 0 ? matchedTerms : [rawQuery]),
        matchType: mode,
        matchedTerms,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

export const DEFAULT_SLASH_COMMANDS: ReadonlyArray<SlashCommandDefinition> = [
  {
    id: 'texto',
    command: '/text',
    label: 'Text',
    description: 'Just start typing with plain text.',
    icon: 'text_fields',
    monogram: 'A',
    shortcut: 'p',
    category: 'basic',
  },
  {
    id: 'tarefa',
    command: '/tarefa',
    label: 'To-do list',
    description: 'Track tasks with a to-do list.',
    icon: 'check_box',
    monogram: '☑',
    shortcut: '[]',
    category: 'basic',
  },
  {
    id: 'h1',
    command: '/h1',
    label: 'Heading 1',
    description: 'Big section heading.',
    icon: 'title',
    monogram: 'H₁',
    shortcut: '#',
    category: 'basic',
  },
  {
    id: 'h2',
    command: '/h2',
    label: 'Heading 2',
    description: 'Medium section heading.',
    icon: 'format_size',
    monogram: 'H₂',
    shortcut: '##',
    category: 'basic',
  },
  {
    id: 'h3',
    command: '/h3',
    label: 'Heading 3',
    description: 'Small section heading.',
    icon: 'text_fields',
    monogram: 'H₃',
    shortcut: '###',
    category: 'basic',
  },
  {
    id: 'lista',
    command: '/lista',
    label: 'Bullet list',
    description: 'Create a simple bullet list.',
    icon: 'format_list_bulleted',
    monogram: '•≡',
    shortcut: '-',
    category: 'basic',
  },
  {
    id: 'numerada',
    command: '/numerada',
    label: 'Numbered list',
    description: 'Create a list with numbering.',
    icon: 'format_list_numbered',
    monogram: '1≡',
    shortcut: '1.',
    category: 'basic',
  },
  {
    id: 'codigo',
    command: '/codigo',
    label: 'Code block',
    description: 'Capture a code snippet with syntax.',
    icon: 'code',
    monogram: '<>',
    shortcut: '```',
    category: 'code',
  },
  {
    id: 'tabela',
    command: '/tabela',
    label: 'Table',
    description: 'Add simple tabular content to page.',
    icon: 'table_chart',
    monogram: '⊞',
    shortcut: '|',
    category: 'rich',
  },
  {
    id: 'citacao',
    command: '/citacao',
    label: 'Callout / Quote',
    description: 'Make writing stand out with a callout.',
    icon: 'format_quote',
    monogram: '❝',
    shortcut: '>',
    category: 'rich',
  },
  {
    id: 'divisor',
    command: '/divisor',
    label: 'Divider',
    description: 'Visually divide blocks with a 1px line.',
    icon: 'horizontal_rule',
    monogram: '—',
    shortcut: '---',
    category: 'basic',
  },
  {
    id: 'database',
    command: '/database',
    label: 'Database (Table & Kanban)',
    description: 'Structured tasks with Table and Kanban Board views.',
    icon: 'view_kanban',
    monogram: '▤',
    shortcut: '/db',
    category: 'database',
  },
  {
    id: 'mermaid',
    command: '/mermaid',
    label: 'Mermaid Diagram',
    description: 'Write Mermaid code and render SVG flowchart below.',
    icon: 'account_tree',
    monogram: 'M',
    shortcut: '/mmd',
    category: 'diagrams',
  },
  {
    id: 'excalidraw',
    command: '/excalidraw',
    label: 'Excalidraw Whiteboard',
    description: 'Sketch hand-drawn system design diagrams.',
    icon: 'draw',
    monogram: '✎',
    shortcut: '/exc',
    category: 'diagrams',
  },
  {
    id: 'drawio',
    command: '/drawio',
    label: 'Draw.io (diagrams.net)',
    description: 'Open-source architecture diagram editor block.',
    icon: 'schema',
    monogram: '◈',
    shortcut: '/dio',
    category: 'diagrams',
  },
];
