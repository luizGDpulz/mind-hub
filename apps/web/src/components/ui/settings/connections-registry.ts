export type ConnectionCategory = 'all' | 'sync' | 'storage' | 'ai';

export interface ConnectionModeDescriptor {
  id: 'vault_okf' | 'dev_sync' | 'ai_mcp';
  label: string;
  subtitle: string;
  available: boolean;
  tokenScopeSummary: string;
  description: string;
  useCases: readonly string[];
}

export interface ConnectionCatalogItem {
  id: 'github' | 'markdown-export' | 'fastify-local' | 'obsidian-bridge' | 'google-drive' | 'ai-mcp-hub';
  name: string;
  authorLabel: string;
  category: Exclude<ConnectionCategory, 'all'>;
  tagline: string;
  description: string;
  isPrimary?: boolean;
  comingSoon?: boolean;
  modes?: readonly ConnectionModeDescriptor[];
}

export const GITHUB_CONNECTION_MODES: readonly ConnectionModeDescriptor[] = [
  {
    id: 'vault_okf',
    label: 'Sincronização do Vault (OKF)',
    subtitle: 'Backup em Markdown aberto (index.md, ./assets)',
    available: true,
    tokenScopeSummary: '1 repo privado • Contents: Read and write',
    description:
      'Sincroniza suas notas, subpáginas, propriedades e imagens em formato aberto Google OKF v0.2 com Delta Sync por hash SHA-256.',
    useCases: [
      'Backup soberano e versionado de todo o Second Brain em repositório privado',
      'Edição bidirecional compatível com Obsidian e Git sem lock-in',
      'Token isolado com acesso apenas de conteúdo (Contents) ao repositório do Vault',
    ],
  },
  {
    id: 'dev_sync',
    label: 'Sincronização Dev (Issues & PRs)',
    subtitle: 'Espelhe Issues e PRs em Databases',
    available: false,
    tokenScopeSummary: 'Repos de projeto • Issues & Pull requests: Read and write',
    description:
      'Conecte repositórios de código para sincronizar Pull Requests e Issues diretamente com as tabelas e quadros Kanban do Mind Hub.',
    useCases: [
      'Espelhar Issues e PRs de múltiplos repositórios em Databases do Mind Hub',
      'Abrir novas Issues do GitHub a partir de notas ou tarefas do espaço',
      'Chave separada da chave do Vault para isolar permissões de código e gestão',
    ],
  },
  {
    id: 'ai_mcp',
    label: 'Conector IA & Servidor MCP',
    subtitle: 'Consulte código, PRs e histórico no Copiloto',
    available: false,
    tokenScopeSummary: 'Repos de projeto • Contents & Pull requests: Read-only',
    description:
      'Habilite o Copiloto IA e agentes MCP a lerem diffs, revisões de código, alertas e histórico recente dos seus repositórios.',
    useCases: [
      'Responder perguntas como "O que mudou na última implantação?"',
      'Analisar Pull Requests e gerar resumos semanais de progresso técnico',
      'Acesso somente leitura separado das chaves de escrita do Vault',
    ],
  },
] as const;

export const CONNECTIONS_CATALOG: readonly ConnectionCatalogItem[] = [
  {
    id: 'github',
    name: 'GitHub',
    authorLabel: 'Nativo • Gratuito',
    category: 'sync',
    tagline: 'Backup OKF & Delta Sync bidirecional',
    description:
      'Sincronize seu Vault em Markdown aberto com repositórios privados no GitHub usando token exclusivo.',
    isPrimary: true,
    modes: GITHUB_CONNECTION_MODES,
  },
  {
    id: 'markdown-export',
    name: 'Exportação Markdown',
    authorLabel: 'Nativo • OKF / Obsidian',
    category: 'storage',
    tagline: 'Pacote portátil sem lock-in',
    description:
      'Exporte todas as notas ativas com frontmatter YAML e hierarquia de pastas para backup offline imediato.',
  },
  {
    id: 'fastify-local',
    name: 'Backend Fastify',
    authorLabel: 'Sistema • Camada Quente',
    category: 'storage',
    tagline: 'Persistência durável de baixa latência',
    description:
      'Armazenamento local rápido para edição, busca híbrida e anexos antes do envio assíncrono ao Git.',
  },
  {
    id: 'obsidian-bridge',
    name: 'Obsidian Local Bridge',
    authorLabel: 'Em breve',
    category: 'sync',
    tagline: 'Espelhamento direto de pasta local',
    description:
      'Sincronize um diretório local do Obsidian diretamente com a camada quente do Mind Hub.',
    comingSoon: true,
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    authorLabel: 'Em breve',
    category: 'storage',
    tagline: 'Snapshots e anexos em nuvem',
    description:
      'Visualize e anexe documentos do Google Drive em páginas e backups periódicos.',
    comingSoon: true,
  },
  {
    id: 'ai-mcp-hub',
    name: 'Servidor MCP Externo',
    authorLabel: 'Em breve',
    category: 'ai',
    tagline: 'Ferramentas para agentes e copiloto',
    description:
      'Conecte servidores MCP externos para expandir ações de automação e pesquisa no Copiloto IA.',
    comingSoon: true,
  },
] as const;
