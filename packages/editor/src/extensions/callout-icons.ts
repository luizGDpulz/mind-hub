import { markRaw, type Component } from 'vue';
import { icons as LUCIDE_ALL_ICONS } from 'lucide-vue-next';
import unicodeEmojiGroups from 'unicode-emoji-json/data-by-group.json';

export interface EmojiCatalogItem {
  char: string;
  name: string;
  keywords: string[];
  skinToneSupport?: boolean;
}

export interface EmojiCategory {
  id: string;
  label: string;
  items: EmojiCatalogItem[];
}

export interface LucideIconColorOption {
  id: string;
  label: string;
  hex: string;
}

export interface LucideIconItem {
  id: string;
  label: string;
  keywords: string[];
  component: Component;
}

export interface ParsedLucideIcon {
  id: string;
  colorId: string | null;
  colorHex: string | null;
  component: Component | null;
}

export const LUCIDE_ICON_PREFIX = 'lucide:';
export const NO_CALLOUT_ICON_VALUE = 'none';
export const RECENT_EMOJI_STORAGE_KEY = 'mind-hub:recent-emojis';

export const SKIN_TONE_OPTIONS = [
  { id: 'default', modifier: '', label: 'Padrão', preview: '✋' },
  { id: 'light', modifier: '\u{1F3FB}', label: 'Claro', preview: '✋🏻' },
  { id: 'medium-light', modifier: '\u{1F3FC}', label: 'Médio-claro', preview: '✋🏼' },
  { id: 'medium', modifier: '\u{1F3FD}', label: 'Médio', preview: '✋🏽' },
  { id: 'medium-dark', modifier: '\u{1F3FE}', label: 'Médio-escuro', preview: '✋🏾' },
  { id: 'dark', modifier: '\u{1F3FF}', label: 'Escuro', preview: '✋🏿' },
] as const;

export const LUCIDE_ICON_COLORS: LucideIconColorOption[] = [
  { id: 'default', label: 'Padrão', hex: '#495057' },
  { id: 'gray', label: 'Cinza', hex: '#868e96' },
  { id: 'brown', label: 'Marrom', hex: '#8d5524' },
  { id: 'orange', label: 'Laranja', hex: '#d9480f' },
  { id: 'yellow', label: 'Amarelo', hex: '#e67700' },
  { id: 'green', label: 'Verde', hex: '#2b8a3e' },
  { id: 'blue', label: 'Azul', hex: '#1971c2' },
  { id: 'purple', label: 'Roxo', hex: '#6741d9' },
  { id: 'pink', label: 'Rosa', hex: '#c2255c' },
  { id: 'red', label: 'Vermelho', hex: '#c92a2a' },
];

const LUCIDE_COLOR_MAP = new Map<string, LucideIconColorOption>(
  LUCIDE_ICON_COLORS.map((c) => [c.id, c])
);

/**
 * Portuguese keyword aliases merged into full Unicode emoji entries so
 * users can search in both Portuguese and English.
 */
const PT_EMOJI_KEYWORDS: Record<string, string[]> = {
  '💡': ['ideia', 'lampada', 'dica', 'insight'],
  '👉': ['apontar', 'atencao', 'seta'],
  '☝️': ['nota', 'importante', 'dedo'],
  '👌': ['ok', 'certo', 'bom'],
  '🔑': ['chave', 'acesso', 'segredo', 'senha'],
  '🚧': ['obra', 'construcao', 'pendente', 'wip'],
  '⚠️': ['alerta', 'aviso', 'atencao'],
  '🔥': ['fogo', 'urgente', 'destaque', 'prioridade'],
  '📌': ['pin', 'fixar', 'alfinete', 'lembrete'],
  '✂️': ['tesoura', 'cortar', 'recorte'],
  '❓': ['duvida', 'pergunta', 'interrogacao'],
  '🚫': ['proibido', 'bloqueado', 'nao'],
  '⛔': ['pare', 'erro', 'cuidado'],
  '⏰': ['relogio', 'prazo', 'alarme', 'tempo'],
  '☎️': ['telefone', 'contato', 'ligar'],
  '🚨': ['sirene', 'emergencia', 'critico'],
  '♻️': ['reciclar', 'ciclo', 'revisar', 'sync'],
  '✅': ['check', 'concluido', 'sucesso', 'feito'],
  '🔒': ['cadeado', 'privado', 'seguro'],
  '📎': ['clipe', 'anexo', 'arquivo'],
  '📖': ['livro', 'leitura', 'documentacao', 'guia'],
  '🗣️': ['fala', 'comunicado', 'anuncio'],
  '➡️': ['proximo', 'seta', 'direcao'],
  '📣': ['megafone', 'novidade', 'aviso'],
  '🛠️': ['ferramentas', 'config', 'manutencao', 'build'],
  '⚙️': ['engrenagem', 'sistema', 'configuracao'],
  '😀': ['feliz', 'sorriso'],
  '😂': ['rindo', 'engracado'],
  '🤔': ['pensando', 'reflexao', 'analise'],
  '🙌': ['comemoracao', 'sucesso', 'maos'],
  '👏': ['palmas', 'aplausos', 'parabens'],
  '👀': ['olhos', 'revisao', 'observar'],
  '🧠': ['cerebro', 'mind', 'conhecimento', 'mente'],
  '✍️': ['escrevendo', 'anotacao', 'rascunho'],
  '💻': ['computador', 'codigo', 'dev', 'tech'],
  '📱': ['celular', 'mobile', 'app'],
  '📁': ['pasta', 'projeto', 'diretorio'],
  '📝': ['nota', 'memo', 'texto', 'caderno'],
  '📅': ['calendario', 'data', 'agenda'],
  '📊': ['grafico', 'metrica', 'dados'],
  '📋': ['prancheta', 'checklist', 'tarefa'],
  '🔗': ['link', 'url', 'conexao'],
  '📚': ['estudos', 'livros', 'biblioteca', 'documentacao'],
  '🔍': ['busca', 'pesquisa', 'lupa'],
  '⭐': ['estrela', 'favorito', 'destaque'],
  '🏆': ['trofeu', 'meta', 'conquista'],
  '🎯': ['alvo', 'objetivo', 'foco'],
  '🚀': ['foguete', 'lancamento', 'deploy', 'rocket'],
  '🛡️': ['escudo', 'seguranca', 'protecao'],
  '✨': ['brilho', 'ia', 'novo', 'magica'],
  '⚡': ['raio', 'rapido', 'energia', 'performance'],
  '💎': ['diamante', 'valor', 'qualidade'],
  '❤️': ['coracao', 'amor', 'favorito'],
  '📦': ['pacote', 'docker', 'container'],
  '☕': ['cafe', 'pausa', 'descanso'],
  '🗄️': ['banco', 'database', 'sql'],
  '🌐': ['web', 'internet', 'rede', 'api'],
};

const HIGHLIGHT_QUICK_ITEMS: EmojiCatalogItem[] = [
  '💡', '👉', '☝️', '👌', '🔑', '🚧', '⚠️', '🔥', '📌', '✂️', '❓', '🚫', '⛔',
  '⏰', '☎️', '🚨', '♻️', '✅', '🔒', '📎', '📖', '🗣️', '➡️', '📣', '🛠️', '⚙️',
].map((char) => ({
  char,
  name: PT_EMOJI_KEYWORDS[char]?.[0] ?? char,
  keywords: PT_EMOJI_KEYWORDS[char] ?? [char],
}));

const GROUP_LABELS_PT: Record<string, string> = {
  smileys_emotion: 'Rostos e emoções',
  people_body: 'Pessoas',
  animals_nature: 'Animais e natureza',
  food_drink: 'Comida e bebida',
  travel_places: 'Viagens e lugares',
  activities: 'Atividades',
  objects: 'Objetos',
  symbols: 'Símbolos',
  flags: 'Bandeiras',
};

interface RawUnicodeGroup {
  name: string;
  slug: string;
  emojis: Array<{
    emoji: string;
    name: string;
    slug: string;
    skin_tone_support?: boolean;
  }>;
}

const UNICODE_CATEGORIES: EmojiCategory[] = (unicodeEmojiGroups as RawUnicodeGroup[]).map((group) => ({
  id: group.slug,
  label: GROUP_LABELS_PT[group.slug] ?? group.name,
  items: group.emojis.map((entry) => {
    const ptWords = PT_EMOJI_KEYWORDS[entry.emoji] ?? [];
    const nameTokens = entry.name.toLowerCase().split(/[\s\-_,]+/).filter(Boolean);
    const slugTokens = entry.slug.toLowerCase().split('_').filter(Boolean);
    return {
      char: entry.emoji,
      name: entry.name,
      keywords: Array.from(new Set([...ptWords, entry.name.toLowerCase(), ...nameTokens, ...slugTokens])),
      skinToneSupport: Boolean(entry.skin_tone_support),
    };
  }),
}));

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'highlight',
    label: 'Frase de destaque',
    items: HIGHLIGHT_QUICK_ITEMS,
  },
  ...UNICODE_CATEGORIES,
];

const PT_LUCIDE_KEYWORDS: Record<string, { label: string; keywords: string[] }> = {
  Lightbulb: { label: 'Ideia / Dica', keywords: ['ideia', 'lampada', 'dica', 'lightbulb'] },
  Info: { label: 'Informação', keywords: ['info', 'nota', 'informacao'] },
  TriangleAlert: { label: 'Alerta', keywords: ['alerta', 'aviso', 'warning', 'atencao'] },
  OctagonAlert: { label: 'Cuidado / Erro', keywords: ['cuidado', 'perigo', 'erro', 'critico'] },
  Flame: { label: 'Destaque / Fogo', keywords: ['fogo', 'urgente', 'importante', 'flame'] },
  Pin: { label: 'Fixado', keywords: ['pin', 'fixar', 'marcador'] },
  Bookmark: { label: 'Favorito', keywords: ['favorito', 'salvar', 'bookmark'] },
  CircleCheck: { label: 'Concluído', keywords: ['check', 'ok', 'sucesso', 'feito'] },
  BookOpen: { label: 'Documentação', keywords: ['livro', 'docs', 'estudo', 'manual'] },
  Compass: { label: 'Guia / Direção', keywords: ['guia', 'bussola', 'arquitetura'] },
  Sparkles: { label: 'Destaque / IA', keywords: ['novo', 'brilho', 'ia', 'sparkles'] },
  Target: { label: 'Objetivo', keywords: ['alvo', 'meta', 'foco', 'target'] },
  Rocket: { label: 'Lançamento', keywords: ['foguete', 'deploy', 'release'] },
  CodeXml: { label: 'Código', keywords: ['codigo', 'dev', 'code', 'programacao'] },
  Terminal: { label: 'Terminal / CLI', keywords: ['terminal', 'bash', 'comando', 'cli'] },
  Database: { label: 'Banco de Dados', keywords: ['banco', 'db', 'sql', 'dados'] },
  Folder: { label: 'Pasta', keywords: ['pasta', 'folder', 'projeto'] },
  FileText: { label: 'Nota / Documento', keywords: ['nota', 'arquivo', 'texto', 'doc'] },
  Calendar: { label: 'Data / Agenda', keywords: ['calendario', 'data', 'agenda'] },
  Clock: { label: 'Tempo / Prazo', keywords: ['hora', 'relogio', 'prazo'] },
  Lock: { label: 'Privado / Seguro', keywords: ['cadeado', 'seguranca', 'privado'] },
  Key: { label: 'Chave / Acesso', keywords: ['chave', 'token', 'credencial'] },
  Shield: { label: 'Proteção', keywords: ['escudo', 'seguranca', 'compliance'] },
  Wrench: { label: 'Ferramenta / Fix', keywords: ['ferramenta', 'ajuste', 'manutencao'] },
  Settings: { label: 'Configuração', keywords: ['config', 'sistema', 'engrenagem'] },
  Bell: { label: 'Notificação', keywords: ['sino', 'lembrete', 'notificacao'] },
  MessageSquare: { label: 'Comentário / Fala', keywords: ['mensagem', 'chat', 'comentario'] },
  Link2: { label: 'Referência / Link', keywords: ['link', 'url', 'referencia'] },
  Tag: { label: 'Tag / Rótulo', keywords: ['tag', 'etiqueta', 'categoria'] },
  Flag: { label: 'Marco / Flag', keywords: ['bandeira', 'flag', 'milestone'] },
  Zap: { label: 'Rápido / Raio', keywords: ['raio', 'atalho', 'energia'] },
  Star: { label: 'Estrela', keywords: ['estrela', 'importante', 'top'] },
  Heart: { label: 'Coração', keywords: ['coracao', 'gostar', 'saude'] },
  Layers: { label: 'Camadas / Stack', keywords: ['camadas', 'arquitetura', 'stack'] },
  CircleHelp: { label: 'Dúvida', keywords: ['ajuda', 'duvida', 'pergunta'] },
  Check: { label: 'Check Simples', keywords: ['check', 'confirmar', 'sim'] },
};

/** Backwards-compatible aliases from older Lucide naming. */
const LEGACY_LUCIDE_ID_ALIASES: Record<string, string> = {
  AlertTriangle: 'TriangleAlert',
  AlertOctagon: 'OctagonAlert',
  CheckCircle2: 'CircleCheck',
  Code2: 'CodeXml',
  HelpCircle: 'CircleHelp',
};

function pascalToWords(pascal: string): string[] {
  return pascal
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])([0-9])/g, '$1 $2')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

const rawIconsRecord = LUCIDE_ALL_ICONS as unknown as Record<string, Component>;

const FEATURED_LUCIDE_ORDER = Object.keys(PT_LUCIDE_KEYWORDS);

const fullIconEntries = Object.entries(rawIconsRecord).filter(
  ([, comp]) => Boolean(comp) && (typeof comp === 'object' || typeof comp === 'function')
);

fullIconEntries.sort(([a], [b]) => {
  const idxA = FEATURED_LUCIDE_ORDER.indexOf(a);
  const idxB = FEATURED_LUCIDE_ORDER.indexOf(b);
  if (idxA !== -1 && idxB !== -1) return idxA - idxB;
  if (idxA !== -1) return -1;
  if (idxB !== -1) return 1;
  return a.localeCompare(b);
});

export const LUCIDE_ICON_CATALOG: LucideIconItem[] = fullIconEntries.map(([id, comp]) => {
  const ptMeta = PT_LUCIDE_KEYWORDS[id];
  const words = pascalToWords(id);
  const label = ptMeta?.label ?? words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const keywords = Array.from(
    new Set([id.toLowerCase(), ...words, ...(ptMeta?.keywords ?? [])])
  );
  return {
    id,
    label,
    keywords,
    component: markRaw(comp),
  };
});

const LUCIDE_ICON_MAP = new Map<string, LucideIconItem>();
for (const item of LUCIDE_ICON_CATALOG) {
  LUCIDE_ICON_MAP.set(item.id, item);
  LUCIDE_ICON_MAP.set(item.id.toLowerCase(), item);
}
for (const [legacyId, canonicalId] of Object.entries(LEGACY_LUCIDE_ID_ALIASES)) {
  const canonical = LUCIDE_ICON_MAP.get(canonicalId);
  if (canonical) {
    LUCIDE_ICON_MAP.set(legacyId, canonical);
    LUCIDE_ICON_MAP.set(legacyId.toLowerCase(), canonical);
  }
}

export function isLucideIconValue(value?: string | null): boolean {
  return Boolean(value && value.startsWith(LUCIDE_ICON_PREFIX));
}

export function formatLucideIconValue(id: string, colorId?: string | null): string {
  const canonical = LUCIDE_ICON_MAP.get(id)?.id ?? id;
  if (colorId && colorId !== 'default' && LUCIDE_COLOR_MAP.has(colorId)) {
    return `${LUCIDE_ICON_PREFIX}${canonical}:${colorId}`;
  }
  return `${LUCIDE_ICON_PREFIX}${canonical}`;
}

export function parseLucideIconValue(value?: string | null): ParsedLucideIcon | null {
  if (!isLucideIconValue(value)) return null;
  const raw = value!.slice(LUCIDE_ICON_PREFIX.length);
  const [rawId, rawColor] = raw.split(':');
  if (!rawId) return null;
  const matched = LUCIDE_ICON_MAP.get(rawId) ?? LUCIDE_ICON_MAP.get(rawId.toLowerCase());
  const colorOption = rawColor ? LUCIDE_COLOR_MAP.get(rawColor) ?? null : null;
  return {
    id: matched?.id ?? rawId,
    colorId: colorOption?.id ?? null,
    colorHex: colorOption?.hex ?? null,
    component: matched?.component ?? null,
  };
}

export function resolveLucideIconComponent(value?: string | null): Component | null {
  return parseLucideIconValue(value)?.component ?? null;
}

export function applyEmojiSkinTone(emoji: string, modifier: string): string {
  if (!modifier) return emoji;
  const ZWJ = '\u200D';
  const VS16 = '\uFE0F';
  const cleanModifierRegex = /[\u{1F3FB}-\u{1F3FF}]/gu;
  const base = emoji.replace(cleanModifierRegex, '');
  const parts = base.split(ZWJ);
  const head = (parts[0] ?? '').replace(VS16, '');
  if (!head) return emoji;
  parts[0] = `${head}${modifier}`;
  return parts.join(ZWJ);
}

export function loadRecentEmojis(): string[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(RECENT_EMOJI_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.length > 0).slice(0, 16)
      : [];
  } catch {
    return [];
  }
}

export function saveRecentEmoji(emoji: string): string[] {
  const existing = loadRecentEmojis().filter((item) => item !== emoji);
  const next = [emoji, ...existing].slice(0, 16);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(RECENT_EMOJI_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota/storage restrictions in sandboxed environments
    }
  }
  return next;
}

export function getRandomPickerIcon(mode: 'emoji' | 'icons', colorId?: string | null): string {
  if (mode === 'icons') {
    const idx = Math.floor(Math.random() * LUCIDE_ICON_CATALOG.length);
    return formatLucideIconValue(LUCIDE_ICON_CATALOG[idx]?.id ?? 'Lightbulb', colorId);
  }
  const unicodeItems = UNICODE_CATEGORIES.flatMap((cat) => cat.items);
  const pool = unicodeItems.length > 0 ? unicodeItems : HIGHLIGHT_QUICK_ITEMS;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx]?.char ?? '💡';
}
