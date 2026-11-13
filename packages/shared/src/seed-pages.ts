import { markdownToTiptap } from './markdown-ast.js';
import { generateDeterministicEmbedding, slugifyTitle } from './tree-and-search.js';
import type {
  DatabaseTaskRow,
  DiagramBlockItem,
  MindPage,
  PageCommentThread,
} from './types.js';

function createSeedPage(params: {
  id: string;
  title: string;
  icon: string;
  parentId: string | null;
  sortOrder: number;
  isFavorite?: boolean;
  isInbox?: boolean;
  tags: string[];
  markdown: string;
}): MindPage {
  const now = '2026-11-10T18:00:00.000Z';
  // Strip leading H1 title if it repeats or matches title (Notion standard)
  let cleanMarkdown = params.markdown.trim();
  const leadingH1Regex = /^#\s+(.+)$/m;
  const match = leadingH1Regex.exec(cleanMarkdown);
  if (match && match[1]) {
    const headingText = match[1].trim();
    if (
      headingText.toLowerCase() === params.title.toLowerCase() ||
      headingText.toLowerCase().replace(/^[^\w\s]+/, '').trim() ===
        params.title.toLowerCase().replace(/^[^\w\s]+/, '').trim()
    ) {
      cleanMarkdown = cleanMarkdown.replace(/^#\s+[^\n]+(?:\n+|$)/, '').trim();
    }
  }
  const contentJson = markdownToTiptap(cleanMarkdown);
  const embedding = generateDeterministicEmbedding(
    `${params.title} ${params.tags.join(' ')} ${cleanMarkdown}`,
  );
  return {
    id: params.id,
    slug: slugifyTitle(params.title),
    title: params.title,
    icon: params.icon,
    parentId: params.parentId,
    sortOrder: params.sortOrder,
    contentMarkdown: cleanMarkdown,
    contentJson,
    isFavorite: params.isFavorite ?? false,
    isInbox: params.isInbox ?? false,
    tags: params.tags,
    embedding,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

export function createInitialSeedPages(): MindPage[] {
  const testMarkdown = [
    '# Título 1',
    '',
    '## Título 2',
    '',
    '### Título 3',
    '',
    '#### Título 4',
    '',
    'Parágrafo de texto com **negrito**, *itálico*, `código inline`, ~~tachado~~ e [link](https://pulz.dev.br).',
    '',
    '- Item com marcador 1',
    '- Item com marcador 2',
    '',
    '1. Primeiro item numerado',
    '2. Segundo item numerado',
    '',
    '- [x] Tarefa concluída',
    '- [ ] Tarefa pendente',
    '',
    '> Bloco de citação de exemplo.',
    '',
    '```typescript',
    "const exemplo = 'Bloco de código';",
    '```',
    '',
    '---',
    '',
    '| Coluna A | Coluna B |',
    '| --- | --- |',
    '| Valor 1 | Valor 2 |',
  ].join('\n');

  const parentPage = createSeedPage({
    id: 'page-teste',
    title: 'Nota de Testes',
    icon: '',
    parentId: null,
    sortOrder: 1,
    isFavorite: false,
    tags: [],
    markdown: testMarkdown,
  });

  // Insert native Callout block (Frase de destaque) cleanly right after blockquote
  const blockquoteIdx = parentPage.contentJson.content.findIndex((n) => n.type === 'blockquote');
  const calloutNode = {
    type: 'callout',
    attrs: { type: 'note', icon: '💡' },
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Frase de destaque de exemplo.' }],
      },
    ],
  };
  if (blockquoteIdx >= 0) {
    parentPage.contentJson.content.splice(blockquoteIdx + 1, 0, calloutNode);
  } else {
    parentPage.contentJson.content.push(calloutNode);
  }

  const childPage = createSeedPage({
    id: 'page-teste-interno',
    title: 'Nota de Teste Interna',
    icon: '',
    parentId: 'page-teste',
    sortOrder: 1,
    isFavorite: false,
    tags: [],
    markdown: 'Parágrafo de exemplo dentro da nota interna.',
  });

  return [parentPage, childPage];
}

export function createInitialSeedDatabaseTasks(): DatabaseTaskRow[] {
  return [
    {
      id: 'task-1',
      rowNumber: 1,
      task: 'Audit the expense workflow',
      team: { label: 'Operations', tone: 'gray' },
      tags: [
        { label: 'Documentation', tone: 'gray' },
        { label: 'Infra', tone: 'orange' },
      ],
      assignees: ['Philip Okugbe'],
      dueDate: 'Sep 26, 2026',
      dueDateIso: '2026-09-26',
      budget: 5600,
      effort: 3,
      status: 'Backlog',
      priority: 'High',
      deletedAt: null,
    },
    {
      id: 'task-2',
      rowNumber: 2,
      task: 'Wireframe the dashboard',
      team: { label: 'Design', tone: 'pink' },
      tags: [{ label: 'Polish', tone: 'yellow' }],
      assignees: ['Philip', 'Barbara'],
      dueDate: 'Jul 4, 2026',
      dueDateIso: '2026-07-04',
      budget: 13000,
      effort: 1,
      status: 'In Progress',
      priority: 'High',
      deletedAt: null,
    },
    {
      id: 'task-3',
      rowNumber: 3,
      task: 'Prioritize SSO support',
      team: { label: 'Product', tone: 'gray' },
      tags: [{ label: 'Improvement', tone: 'green' }],
      assignees: ['Philip'],
      dueDate: 'Sep 28, 2026',
      dueDateIso: '2026-09-28',
      budget: 9100,
      effort: 1,
      status: 'Backlog',
      priority: 'Medium',
      deletedAt: null,
    },
    {
      id: 'task-4',
      rowNumber: 4,
      task: 'Review the engineering offsite',
      team: { label: 'People', tone: 'pink' },
      tags: [{ label: 'Improvement', tone: 'green' }],
      assignees: ['Barbara'],
      dueDate: 'Jun 22, 2026',
      dueDateIso: '2026-06-22',
      budget: 11900,
      effort: 5,
      status: 'In Review',
      priority: 'Low',
      deletedAt: null,
    },
    {
      id: 'task-5',
      rowNumber: 5,
      task: 'Restyle the dashboard',
      team: { label: 'Design', tone: 'pink' },
      tags: [{ label: 'Polish', tone: 'yellow' }],
      assignees: ['John'],
      dueDate: 'Jun 19, 2026',
      dueDateIso: '2026-06-19',
      budget: 2800,
      effort: 5,
      status: 'Blocked',
      priority: 'Urgent',
      deletedAt: null,
    },
    {
      id: 'task-6',
      rowNumber: 6,
      task: 'Review the exit interviews',
      team: { label: 'People', tone: 'pink' },
      tags: [{ label: 'Documentation', tone: 'gray' }],
      assignees: ['John'],
      dueDate: 'Apr 16, 2026',
      dueDateIso: '2026-04-16',
      budget: 35700,
      effort: 3,
      status: 'Done',
      priority: 'Urgent',
      deletedAt: null,
    },
    {
      id: 'task-7',
      rowNumber: 7,
      task: 'Plan the permissions model',
      team: { label: 'Product', tone: 'gray' },
      tags: [{ label: 'Feature', tone: 'blue' }],
      assignees: ['Barbara'],
      dueDate: 'Jun 19, 2026',
      dueDateIso: '2026-06-19',
      budget: 30400,
      effort: 13,
      status: 'In Review',
      priority: 'Low',
      deletedAt: null,
    },
    {
      id: 'task-8',
      rowNumber: 8,
      task: 'Follow up with Acme Corp',
      team: { label: 'Sales', tone: 'green' },
      tags: [
        { label: 'Research', tone: 'gray' },
        { label: 'Growth', tone: 'pink' },
      ],
      assignees: ['John'],
      dueDate: 'Jun 25, 2026',
      dueDateIso: '2026-06-25',
      budget: 10800,
      effort: 1,
      status: 'In Progress',
      priority: 'Urgent',
      deletedAt: null,
    },
  ];
}

export function createInitialSeedComments(): PageCommentThread[] {
  return [];
}

export function createInitialSeedDiagrams(): DiagramBlockItem[] {
  return [];
}
