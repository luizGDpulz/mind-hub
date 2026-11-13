import type { Component } from 'vue';
import {
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  AlertCircle,
  GitFork,
} from 'lucide-vue-next';
import {
  BLOCK_COLOR_PALETTE,
  normalizeBlockColorValue,
} from '../../extensions/block-color.js';
import type { BlockColorId, BlockColorUpdate } from '../../types.js';

export const LAST_TEXT_COLOR_STORAGE_KEY = 'mind-editor:last-text-color';
export const LAST_BG_COLOR_STORAGE_KEY = 'mind-editor:last-bg-color';

export type GutterActionType = 'moveUp' | 'moveDown' | 'duplicate' | 'delete';
export type GutterSubmenuName = 'turnInto' | 'color' | null;
export type ColorSubgroupName = 'text' | 'bg' | null;

export interface TurnIntoOption {
  type: string;
  label: string;
  icon: Component;
}

export interface FilteredActionEntry {
  key: string;
  kind: 'action' | 'turnInto' | 'textColor' | 'bgColor';
  label: string;
  searchTokens: string;
  testId: string;
  icon?: Component;
  swatchText?: string;
  swatchBg?: string;
  shortcut?: string;
  danger?: boolean;
  active?: boolean;
  run: () => void;
}

export const BLOCK_TURN_INTO_OPTIONS: TurnIntoOption[] = [
  { type: 'paragraph', label: 'Texto', icon: Type },
  { type: 'h1', label: 'Título 1', icon: Heading1 },
  { type: 'h2', label: 'Título 2', icon: Heading2 },
  { type: 'h3', label: 'Título 3', icon: Heading3 },
  { type: 'h4', label: 'Título 4', icon: Heading4 },
  { type: 'bulletList', label: 'Lista com marcadores', icon: List },
  { type: 'orderedList', label: 'Lista numerada', icon: ListOrdered },
  { type: 'taskList', label: 'Lista de tarefas', icon: CheckSquare },
  { type: 'blockquote', label: 'Citação', icon: Quote },
  { type: 'codeBlock', label: 'Bloco de código', icon: Code },
  { type: 'callout', label: 'Frase de destaque', icon: AlertCircle },
  { type: 'mermaid', label: 'Diagrama Mermaid', icon: GitFork },
];

/** Read persisted block color preference safely from localStorage. */
export function readStoredColor(key: string): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return normalizeBlockColorValue(window.localStorage.getItem(key));
  } catch {
    return null;
  }
}

/** Persist block color preference safely to localStorage. */
export function writeStoredColor(key: string, value: string | null): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (value) {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage quota errors
  }
}

/** Check whether a block node type matches a Turn Into option. */
export function isGutterCurrentBlockType(nodeType: string, targetType: string): boolean {
  if (nodeType === 'listItem' && targetType === 'bulletList') return true;
  if (nodeType === 'taskItem' && targetType === 'taskList') return true;
  return nodeType === targetType;
}

/** Build searchable flat list of block menu actions, transforms, and color presets. */
export function buildFilteredActionEntries(params: {
  visibleTurnIntoOptions: TurnIntoOption[];
  isCurrentBlockType: (type: string) => boolean;
  isTextColorActive: (id: BlockColorId) => boolean;
  isBgColorActive: (id: BlockColorId) => boolean;
  deleteActionLabel: string;
  onTurnInto: (type: string) => void;
  onSetColor: (payload: BlockColorUpdate) => void;
  onAction: (action: GutterActionType) => void;
}): FilteredActionEntry[] {
  return [
    ...params.visibleTurnIntoOptions.map((opt) => ({
      key: `turn-${opt.type}`,
      kind: 'turnInto' as const,
      label: `Transformar em ${opt.label}`,
      searchTokens: `transformar em ${opt.label} ${opt.type}`.toLowerCase(),
      testId: `turn-into-${opt.type}`,
      icon: opt.icon,
      active: params.isCurrentBlockType(opt.type),
      run: () => params.onTurnInto(opt.type),
    })),
    ...BLOCK_COLOR_PALETTE.map((c) => ({
      key: `text-color-${c.id}`,
      kind: 'textColor' as const,
      label: `Cor do texto: ${c.label}`,
      searchTokens: `cor texto escrita letra ${c.label} ${c.id}`.toLowerCase(),
      testId: `text-color-${c.id}`,
      swatchText: c.textColor,
      active: params.isTextColorActive(c.id),
      run: () => params.onSetColor({ textColor: c.id }),
    })),
    ...BLOCK_COLOR_PALETTE.map((c) => ({
      key: `bg-color-${c.id}`,
      kind: 'bgColor' as const,
      label: `Cor de fundo: ${c.label}`,
      searchTokens: `cor fundo background destaque linha ${c.label} ${c.id}`.toLowerCase(),
      testId: `bg-color-${c.id}`,
      swatchBg: c.backgroundColor,
      active: params.isBgColorActive(c.id),
      run: () => params.onSetColor({ backgroundColor: c.id }),
    })),
    {
      key: 'act-duplicate',
      kind: 'action',
      label: 'Duplicar',
      searchTokens: 'duplicar copiar bloco',
      testId: 'action-duplicate',
      icon: Copy,
      shortcut: 'Ctrl+D',
      run: () => params.onAction('duplicate'),
    },
    {
      key: 'act-move-up',
      kind: 'action',
      label: 'Mover para cima',
      searchTokens: 'mover para cima subir',
      testId: 'action-move-up',
      icon: ArrowUp,
      shortcut: 'Alt+↑',
      run: () => params.onAction('moveUp'),
    },
    {
      key: 'act-move-down',
      kind: 'action',
      label: 'Mover para baixo',
      searchTokens: 'mover para baixo descer',
      testId: 'action-move-down',
      icon: ArrowDown,
      shortcut: 'Alt+↓',
      run: () => params.onAction('moveDown'),
    },
    {
      key: 'act-delete',
      kind: 'action',
      label: params.deleteActionLabel,
      searchTokens: 'excluir apagar remover deletar bloco grupo',
      testId: 'action-delete',
      icon: Trash2,
      shortcut: 'Del',
      danger: true,
      run: () => params.onAction('delete'),
    },
  ];
}
