import { markRaw } from 'vue';
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Lightbulb,
  Code,
  Workflow,
  Table as TableIcon,
  Minus,
  LayoutGrid,
  FilePlus,
  Sparkles,
  CodeXml,
} from 'lucide-vue-next';
import type { SlashMenuItem } from '../types.js';

export interface SlashItemCallbacks {
  onGenerateAiNotes: () => void;
  onInsertDatabaseBlock: () => void;
  onCreateSubpage: () => void;
}

/**
 * Builds the modular default catalog of `/` Slash Command items,
 * placing basic Markdown blocks + Notion-style Frase de destaque together under `basic`.
 */
export function createDefaultSlashItems(callbacks: SlashItemCallbacks): SlashMenuItem[] {
  return [
    // Sugestões
    {
      id: 'ai-notes',
      title: 'Anotações IA',
      description: 'Gerar notas inteligentes ou transcrição',
      category: 'suggestions',
      icon: markRaw(Sparkles),
      keywords: ['ia', 'ai', 'anotacoes', 'resumo', 'smart'],
      action: () => callbacks.onGenerateAiNotes(),
    },
    {
      id: 'html-embed',
      title: 'HTML',
      subtitle: 'Integrações',
      badge: 'Novo',
      description: 'Inserir widget HTML ou integração externa',
      category: 'suggestions',
      icon: markRaw(CodeXml),
      keywords: ['html', 'embed', 'integracao', 'iframe', 'widget'],
      action: (editor) =>
        editor
          .chain()
          .focus()
          .insertContent({ type: 'codeBlock', attrs: { language: 'html' } })
          .run(),
    },

    // Blocos básicos (incluindo Frase de destaque igual ao Notion)
    {
      id: 'paragraph',
      title: 'Texto',
      description: 'Comece a escrever texto puro',
      category: 'basic',
      icon: markRaw(Type),
      keywords: ['texto', 'p', 'paragraph'],
      action: (editor) => editor.chain().focus().setParagraph().run(),
    },
    {
      id: 'h1',
      title: 'Título 1',
      shortcut: '#',
      description: 'Título de seção principal',
      category: 'basic',
      icon: markRaw(Heading1),
      keywords: ['h1', 'heading', 'titulo'],
      action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: 'h2',
      title: 'Título 2',
      shortcut: '##',
      description: 'Subtítulo de seção',
      category: 'basic',
      icon: markRaw(Heading2),
      keywords: ['h2', 'heading', 'subtitulo'],
      action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: 'h3',
      title: 'Título 3',
      shortcut: '###',
      description: 'Subtítulo menor',
      category: 'basic',
      icon: markRaw(Heading3),
      keywords: ['h3', 'heading'],
      action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      id: 'h4',
      title: 'Título 4',
      shortcut: '####',
      description: 'Subtítulo nível 4',
      category: 'basic',
      icon: markRaw(Heading4),
      keywords: ['h4', 'heading'],
      action: (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run(),
    },
    {
      id: 'bullet-list',
      title: 'Lista com marcadores',
      shortcut: '-',
      description: 'Lista com bullets simples',
      category: 'basic',
      icon: markRaw(List),
      keywords: ['lista', 'bullet', 'ul'],
      action: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'ordered-list',
      title: 'Lista numerada',
      shortcut: '1.',
      description: 'Lista sequencial numerada',
      category: 'basic',
      icon: markRaw(ListOrdered),
      keywords: ['lista', 'numerada', 'ordenada', 'ordered', 'ol', 'numeros'],
      action: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      id: 'task-list',
      title: 'Lista de tarefas',
      shortcut: '[]',
      description: 'Checklist interativo com caixas de seleção',
      category: 'basic',
      icon: markRaw(ListTodo),
      keywords: ['tarefa', 'task', 'todo', 'check'],
      action: (editor) => editor.chain().focus().toggleTaskList().run(),
    },
    {
      id: 'blockquote',
      title: 'Citação',
      shortcut: '>',
      description: 'Destacar uma citação em bloco',
      category: 'basic',
      icon: markRaw(Quote),
      keywords: ['citacao', 'quote'],
      action: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      id: 'callout',
      title: 'Frase de destaque',
      shortcut: ':::',
      description: 'Bloco de destaque estilo Notion com emoji ou ícone',
      category: 'basic',
      icon: markRaw(Lightbulb),
      keywords: ['frase', 'destaque', 'callout', 'nota', 'dica', 'alerta', 'aviso'],
      action: (editor) =>
        editor.chain().focus().setCallout({ type: 'note', icon: '💡' }).run(),
    },
    {
      id: 'code-block',
      title: 'Bloco de código',
      shortcut: '```',
      description: 'Trecho de código com formatação monoespaçada',
      category: 'basic',
      icon: markRaw(Code),
      keywords: ['codigo', 'code', 'snippet'],
      action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: 'divider',
      title: 'Divisor',
      shortcut: '---',
      description: 'Linha horizontal divisória',
      category: 'basic',
      icon: markRaw(Minus),
      keywords: ['divisor', 'linha', 'hr', 'separador'],
      action: (editor) => editor.chain().focus().setHorizontalRule().run(),
    },

    // Mídia e Avançado
    {
      id: 'mermaid',
      title: 'Diagrama Mermaid',
      description: 'Fluxogramas e diagramas interativos SVG',
      category: 'media',
      icon: markRaw(Workflow),
      keywords: ['mermaid', 'diagrama', 'fluxo', 'chart'],
      action: (editor) => editor.chain().focus().insertContent({ type: 'mermaid' }).run(),
    },
    {
      id: 'table',
      title: 'Tabela',
      description: 'Tabela simples com linhas e colunas',
      category: 'advanced',
      icon: markRaw(TableIcon),
      keywords: ['tabela', 'table', 'grid'],
      action: (editor) =>
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      id: 'database',
      title: 'Banco de Dados',
      description: 'Inserir visualização de tarefas em tabela e kanban',
      category: 'advanced',
      icon: markRaw(LayoutGrid),
      keywords: ['banco', 'database', 'tarefas', 'kanban', 'tasks'],
      action: () => callbacks.onInsertDatabaseBlock(),
    },
    {
      id: 'subpage',
      title: 'Subpágina',
      description: 'Criar uma nova subpágina aninhada',
      category: 'advanced',
      icon: markRaw(FilePlus),
      keywords: ['subpagina', 'subpage', 'pagina', 'nota'],
      action: () => callbacks.onCreateSubpage(),
    },
  ];
}
