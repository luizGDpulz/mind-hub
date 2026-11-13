import { markRaw, type Component } from 'vue';
import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  BookOpen,
  Bookmark,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Compass,
  Database,
  FileText,
  Flag,
  Flame,
  Folder,
  Heart,
  HelpCircle,
  Info,
  Key,
  Layers,
  Lightbulb,
  Link2,
  Lock,
  MessageSquare,
  Pin,
  Rocket,
  Settings,
  Shield,
  Sparkles,
  Star,
  Tag,
  Target,
  Terminal,
  Wrench,
  Zap,
} from 'lucide-vue-next';

export interface EmojiCatalogItem {
  char: string;
  keywords: string[];
}

export interface EmojiCategory {
  id: string;
  label: string;
  items: EmojiCatalogItem[];
}

export interface LucideIconItem {
  id: string;
  label: string;
  keywords: string[];
  component: Component;
}

export const LUCIDE_ICON_PREFIX = 'lucide:';
export const NO_CALLOUT_ICON_VALUE = 'none';

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'highlight',
    label: 'Frase de destaque',
    items: [
      { char: '💡', keywords: ['ideia', 'lampada', 'dica', 'lightbulb', 'idea'] },
      { char: '👉', keywords: ['apontar', 'atencao', 'point', 'seta'] },
      { char: '☝️', keywords: ['nota', 'importante', 'dedo', 'up'] },
      { char: '👌', keywords: ['ok', 'certo', 'bom'] },
      { char: '🔑', keywords: ['chave', 'key', 'acesso', 'segredo'] },
      { char: '🚧', keywords: ['obra', 'construcao', 'pendente', 'wip'] },
      { char: '⚠️', keywords: ['alerta', 'aviso', 'warning', 'atencao'] },
      { char: '🔥', keywords: ['fogo', 'urgente', 'fire', 'destaque'] },
      { char: '📌', keywords: ['pin', 'fixar', 'alfinete', 'lembrete'] },
      { char: '✂️', keywords: ['tesoura', 'cortar', 'recorte'] },
      { char: '❓', keywords: ['duvida', 'pergunta', 'question', 'interrogacao'] },
      { char: '🚫', keywords: ['proibido', 'bloqueado', 'nao', 'ban'] },
      { char: '⛔', keywords: ['pare', 'stop', 'erro', 'cuidado'] },
      { char: '⏰', keywords: ['relogio', 'prazo', 'alarme', 'tempo'] },
      { char: '☎️', keywords: ['telefone', 'contato', 'ligar'] },
      { char: '🚨', keywords: ['sirene', 'emergencia', 'critico', 'caution'] },
      { char: '♻️', keywords: ['reciclar', 'ciclo', 'revisar', 'sync'] },
      { char: '✅', keywords: ['check', 'concluido', 'sucesso', 'feito'] },
      { char: '🔒', keywords: ['cadeado', 'privado', 'seguro', 'lock'] },
      { char: '📎', keywords: ['clipe', 'anexo', 'arquivo'] },
      { char: '📖', keywords: ['livro', 'leitura', 'documentacao', 'guia'] },
      { char: '🗣️', keywords: ['fala', 'comunicado', 'anuncio'] },
      { char: '➡️', keywords: ['proximo', 'seta', 'direcao'] },
      { char: '📣', keywords: ['megafone', 'novidade', 'aviso'] },
      { char: '🛠️', keywords: ['ferramentas', 'config', 'manutencao', 'build'] },
      { char: '⚙️', keywords: ['engrenagem', 'sistema', 'configuracao'] },
    ],
  },
  {
    id: 'expressions',
    label: 'Expressões',
    items: [
      { char: '😀', keywords: ['feliz', 'sorriso', 'smile'] },
      { char: '😃', keywords: ['alegre', 'sorridente'] },
      { char: '😄', keywords: ['contente', 'riso'] },
      { char: '😁', keywords: ['animado', 'sorriso'] },
      { char: '😂', keywords: ['rindo', 'engracado'] },
      { char: '😊', keywords: ['gentil', 'amavel'] },
      { char: '😉', keywords: ['piscada', 'dica'] },
      { char: '🤔', keywords: ['pensando', 'reflexao', 'analise'] },
      { char: '🫡', keywords: ['continencia', 'entendido', 'sim'] },
      { char: '🙌', keywords: ['comemoracao', 'sucesso', 'maos'] },
      { char: '👏', keywords: ['palmas', 'aplausos', 'parabens'] },
      { char: '👀', keywords: ['olhos', 'revisao', 'observar', 'olho'] },
      { char: '🧠', keywords: ['cerebro', 'mind', 'conhecimento', 'mente'] },
      { char: '✍️', keywords: ['escrevendo', 'anotacao', 'rascunho'] },
    ],
  },
  {
    id: 'objects',
    label: 'Objetos e Trabalho',
    items: [
      { char: '💻', keywords: ['computador', 'codigo', 'dev', 'tech'] },
      { char: '📱', keywords: ['celular', 'mobile', 'app'] },
      { char: '📁', keywords: ['pasta', 'projeto', 'diretorio'] },
      { char: '📝', keywords: ['nota', 'memo', 'texto'] },
      { char: '📅', keywords: ['calendario', 'data', 'agenda'] },
      { char: '📊', keywords: ['grafico', 'metrica', 'dados'] },
      { char: '📋', keywords: ['prancheta', 'checklist', 'tarefa'] },
      { char: '🔗', keywords: ['link', 'url', 'conexao'] },
      { char: '📚', keywords: ['estudos', 'livros', 'biblioteca'] },
      { char: '🔍', keywords: ['busca', 'pesquisa', 'lupa'] },
      { char: '⭐', keywords: ['estrela', 'favorito', 'destaque'] },
      { char: '🏆', keywords: ['trofeu', 'meta', 'conquista'] },
      { char: '🎯', keywords: ['alvo', 'objetivo', 'foco'] },
      { char: '🚀', keywords: ['foguete', 'lancamento', 'deploy'] },
      { char: '🛡️', keywords: ['escudo', 'seguranca', 'protecao'] },
    ],
  },
  {
    id: 'symbols',
    label: 'Símbolos e Status',
    items: [
      { char: 'ℹ️', keywords: ['info', 'informacao', 'nota'] },
      { char: '✨', keywords: ['brilho', 'ia', 'novo', 'magica'] },
      { char: '⚡', keywords: ['raio', 'rapido', 'energia', 'performance'] },
      { char: '💎', keywords: ['diamante', 'valor', 'qualidade'] },
      { char: '❤️', keywords: ['coracao', 'amor', 'favorito'] },
      { char: '🟢', keywords: ['verde', 'online', 'ativo'] },
      { char: '🟡', keywords: ['amarelo', 'pendente', 'em andamento'] },
      { char: '🟠', keywords: ['laranja', 'atencao'] },
      { char: '🔴', keywords: ['vermelho', 'erro', 'bloqueio'] },
      { char: '🔵', keywords: ['azul', 'info', 'status'] },
      { char: '🟣', keywords: ['roxo', 'especial'] },
      { char: '❌', keywords: ['erro', 'x', 'cancelado'] },
      { char: '☑️', keywords: ['caixa', 'marcado', 'check'] },
    ],
  },
];

export const LUCIDE_ICON_CATALOG: LucideIconItem[] = [
  { id: 'Lightbulb', label: 'Ideia / Dica', keywords: ['ideia', 'lampada', 'dica', 'lightbulb'], component: markRaw(Lightbulb) },
  { id: 'Info', label: 'Informação', keywords: ['info', 'nota', 'informacao'], component: markRaw(Info) },
  { id: 'AlertTriangle', label: 'Alerta', keywords: ['alerta', 'aviso', 'warning', 'atencao'], component: markRaw(AlertTriangle) },
  { id: 'AlertOctagon', label: 'Cuidado / Erro', keywords: ['cuidado', 'perigo', 'erro', 'critico'], component: markRaw(AlertOctagon) },
  { id: 'Flame', label: 'Destaque / Fogo', keywords: ['fogo', 'urgente', 'importante', 'flame'], component: markRaw(Flame) },
  { id: 'Pin', label: 'Fixado', keywords: ['pin', 'fixar', 'marcador'], component: markRaw(Pin) },
  { id: 'Bookmark', label: 'Favorito', keywords: ['favorito', 'salvar', 'bookmark'], component: markRaw(Bookmark) },
  { id: 'CheckCircle2', label: 'Concluído', keywords: ['check', 'ok', 'sucesso', 'feito'], component: markRaw(CheckCircle2) },
  { id: 'BookOpen', label: 'Documentação', keywords: ['livro', 'docs', 'estudo', 'manual'], component: markRaw(BookOpen) },
  { id: 'Compass', label: 'Guia / Direção', keywords: ['guia', 'bussola', 'arquitetura'], component: markRaw(Compass) },
  { id: 'Sparkles', label: 'Destaque / IA', keywords: ['novo', 'brilho', 'ia', 'sparkles'], component: markRaw(Sparkles) },
  { id: 'Target', label: 'Objetivo', keywords: ['alvo', 'meta', 'foco', 'target'], component: markRaw(Target) },
  { id: 'Rocket', label: 'Lançamento', keywords: ['foguete', 'deploy', 'release'], component: markRaw(Rocket) },
  { id: 'Code2', label: 'Código', keywords: ['codigo', 'dev', 'code', 'programacao'], component: markRaw(Code2) },
  { id: 'Terminal', label: 'Terminal / CLI', keywords: ['terminal', 'bash', 'comando', 'cli'], component: markRaw(Terminal) },
  { id: 'Database', label: 'Banco de Dados', keywords: ['banco', 'db', 'sql', 'dados'], component: markRaw(Database) },
  { id: 'Folder', label: 'Pasta', keywords: ['pasta', 'folder', 'projeto'], component: markRaw(Folder) },
  { id: 'FileText', label: 'Nota / Documento', keywords: ['nota', 'arquivo', 'texto', 'doc'], component: markRaw(FileText) },
  { id: 'Calendar', label: 'Data / Agenda', keywords: ['calendario', 'data', 'agenda'], component: markRaw(Calendar) },
  { id: 'Clock', label: 'Tempo / Prazo', keywords: ['hora', 'relogio', 'prazo'], component: markRaw(Clock) },
  { id: 'Lock', label: 'Privado / Seguro', keywords: ['cadeado', 'seguranca', 'privado'], component: markRaw(Lock) },
  { id: 'Key', label: 'Chave / Acesso', keywords: ['chave', 'token', 'credencial'], component: markRaw(Key) },
  { id: 'Shield', label: 'Proteção', keywords: ['escudo', 'seguranca', 'compliance'], component: markRaw(Shield) },
  { id: 'Wrench', label: 'Ferramenta / Fix', keywords: ['ferramenta', 'ajuste', 'manutencao'], component: markRaw(Wrench) },
  { id: 'Settings', label: 'Configuração', keywords: ['config', 'sistema', 'engrenagem'], component: markRaw(Settings) },
  { id: 'Bell', label: 'Notificação', keywords: ['sino', 'lembrete', 'notificacao'], component: markRaw(Bell) },
  { id: 'MessageSquare', label: 'Comentário / Fala', keywords: ['mensagem', 'chat', 'comentario'], component: markRaw(MessageSquare) },
  { id: 'Link2', label: 'Referência / Link', keywords: ['link', 'url', 'referencia'], component: markRaw(Link2) },
  { id: 'Tag', label: 'Tag / Rótulo', keywords: ['tag', 'etiqueta', 'categoria'], component: markRaw(Tag) },
  { id: 'Flag', label: 'Marco / Flag', keywords: ['bandeira', 'flag', 'milestone'], component: markRaw(Flag) },
  { id: 'Zap', label: 'Rápido / Raio', keywords: ['raio', 'atalho', 'energia'], component: markRaw(Zap) },
  { id: 'Star', label: 'Estrela', keywords: ['estrela', 'importante', 'top'], component: markRaw(Star) },
  { id: 'Heart', label: 'Coração', keywords: ['coracao', 'gostar', 'saude'], component: markRaw(Heart) },
  { id: 'Layers', label: 'Camadas / Stack', keywords: ['camadas', 'arquitetura', 'stack'], component: markRaw(Layers) },
  { id: 'HelpCircle', label: 'Dúvida', keywords: ['ajuda', 'duvida', 'pergunta'], component: markRaw(HelpCircle) },
  { id: 'Check', label: 'Check Simples', keywords: ['check', 'confirmar', 'sim'], component: markRaw(Check) },
];

const LUCIDE_ICON_MAP = new Map<string, LucideIconItem>(
  LUCIDE_ICON_CATALOG.map((item) => [item.id, item])
);

export function isLucideIconValue(value?: string | null): boolean {
  return Boolean(value && value.startsWith(LUCIDE_ICON_PREFIX));
}

export function formatLucideIconValue(id: string): string {
  return `${LUCIDE_ICON_PREFIX}${id}`;
}

export function resolveLucideIconComponent(value?: string | null): Component | null {
  if (!isLucideIconValue(value)) return null;
  const id = value!.slice(LUCIDE_ICON_PREFIX.length);
  return LUCIDE_ICON_MAP.get(id)?.component ?? null;
}

export function getRandomPickerIcon(mode: 'emoji' | 'icons'): string {
  if (mode === 'icons') {
    const idx = Math.floor(Math.random() * LUCIDE_ICON_CATALOG.length);
    return formatLucideIconValue(LUCIDE_ICON_CATALOG[idx]?.id ?? 'Lightbulb');
  }
  const allEmojis = EMOJI_CATEGORIES.flatMap((cat) => cat.items);
  const idx = Math.floor(Math.random() * allEmojis.length);
  return allEmojis[idx]?.char ?? '💡';
}
