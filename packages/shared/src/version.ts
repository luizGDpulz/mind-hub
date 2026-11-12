export interface MindVersionEntry {
  version: string;
  releaseDate: string;
  milestoneTitle: string;
  summary: string;
  highlights: string[];
}

export const CURRENT_MIND_VERSION = '0.3.0';
export const MIND_REPO_URL = 'https://github.com/luizGDpulz/mind-hub';

export const MIND_VERSION_HISTORY: MindVersionEntry[] = [
  {
    version: '0.3.0',
    releaseDate: '2026-11-12',
    milestoneTitle: 'M13: Shell, Gestão de Arquivos & Design System Global',
    summary:
      'Primitivos desacoplados sob mind-light-style, menu contextual Notion-grade para árvore e favoritos, movimentação anti-loop, configurações em abas e limpeza da barra lateral.',
    highlights: [
      'Primitivos MindModal, MindConfirmDialog e MindDropdown desacoplados sob mind-light-style',
      'Menu contextual Notion-grade (MindTreeContextMenu) e seção Favoritos com ações (+) e (...)',
      'Modal visual para mover páginas (MindMovePageModal) com filtro de anti-ciclo hierárquico',
      'Painel de configurações em abas (MindSettingsModal) e captura rápida desacoplada',
      'Operações profundas de duplicação, renomeação inline e importação movida para MindWorkspaceMenu',
    ],
  },
  {
    version: '0.2.0',
    releaseDate: '2026-11-12',
    milestoneTitle: 'M9: Notion-like UI, Sidebar Evolution & Trash Purge',
    summary:
      'Novo header Notion-like com workspace switcher, menu grid de utilitários, versionamento atômico, exclusão definitiva na lixeira e editor Tiptap com reordenação de blocos por drag-and-drop.',
    highlights: [
      'Novo cabeçalho Notion-like na barra lateral com Workspace Switcher e indicador de versão.',
      'Menu da direita (Grid) com atalho direto para a Lixeira e utilitários.',
      'Acesso direto a Configurações e Histórico de Evolução pelo menu do usuário/workspace.',
      'Botão de Ajuda (?) direcionando diretamente para o repositório GitHub do projeto.',
      'Exclusão definitiva individual de itens na lixeira e opção de esvaziamento completo.',
      'Reordenação de blocos por drag-and-drop e atalhos de teclado (Alt+Seta Acima / Alt+Seta Abaixo).',
      'Menu flutuante no cursor (Bubble Menu) com tipografia limpa e sem poluição visual.',
      'Calibragem do gutter para telas menores e fechamento automático de menus no clique fora.',
    ],
  },
  {
    version: '0.1.0',
    releaseDate: '2026-11-10',
    milestoneTitle: 'M1-M8: Local-First Core, Fastify & Semantic Search',
    summary:
      'Fundação local-first com sincronização resiliente, busca híbrida vetorial, banco de dados inline com tabelas/kanban, MCP handler e assistente de IA BYOK.',
    highlights: [
      'Arquitetura local-first com backend Fastify e armazenamento durável em disco.',
      'Busca híbrida combinando texto completo e embeddings determinísticos.',
      'Blocos inline de banco de dados estruturado (Tabela e Kanban) com soft delete.',
      'Suporte a diagramas nativos (Mermaid, Excalidraw, Draw.io).',
      'Integração nativa com servidor Model Context Protocol (MCP).',
    ],
  },
];
