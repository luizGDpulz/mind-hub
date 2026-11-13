import type { Component } from 'vue';
import {
  AlignLeft,
  Asterisk,
  Binary,
  Calendar,
  CheckSquare,
  Clock,
  List,
} from 'lucide-vue-next';
import {
  DEFAULT_NOTE_PROPERTY_PRESETS,
  type EditorFrontmatter,
  type NotePropertyPreset,
  type ObsidianPropertyType,
} from '../../types.js';

export interface PropertyClipboardItem {
  key: string;
  value: unknown;
  type: ObsidianPropertyType;
}

export const AREA_OPTIONS = ['projetos', 'estudos', 'trabalho', 'pessoal'] as const;

export const PROPERTY_TYPE_OPTIONS: Array<{
  id: ObsidianPropertyType;
  label: string;
  icon: Component;
}> = [
  { id: 'auto', label: 'Automático (Texto)', icon: Asterisk },
  { id: 'checkbox', label: 'Caixa de seleção', icon: CheckSquare },
  { id: 'date', label: 'Data', icon: Calendar },
  { id: 'datetime', label: 'Data & hora', icon: Clock },
  { id: 'list', label: 'Lista', icon: List },
  { id: 'number', label: 'Número', icon: Binary },
  { id: 'text', label: 'Texto', icon: AlignLeft },
];

export function isTagKey(key: string): boolean {
  const lower = key.toLowerCase();
  return lower === 'tags' || lower === 'tag';
}

export function inferPropertyType(
  key: string,
  value: unknown,
  explicitTypes: Record<string, ObsidianPropertyType>,
): Exclude<ObsidianPropertyType, 'auto'> {
  const explicit = explicitTypes[key];
  if (explicit && explicit !== 'auto') {
    return explicit;
  }
  if (typeof value === 'boolean') return 'checkbox';
  if (Array.isArray(value) || isTagKey(key) || key.toLowerCase() === 'aliases') return 'list';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return 'datetime';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
  }
  const lower = key.toLowerCase();
  if (lower === 'created' || lower === 'updated' || lower === 'date' || lower === 'data') {
    return 'date';
  }
  return 'text';
}

export function getPropertyIcon(type: Exclude<ObsidianPropertyType, 'auto'>): Component {
  switch (type) {
    case 'checkbox':
      return CheckSquare;
    case 'date':
      return Calendar;
    case 'datetime':
      return Clock;
    case 'list':
      return List;
    case 'number':
      return Binary;
    default:
      return AlignLeft;
  }
}

export function resolvePresetDefault(preset: NotePropertyPreset): unknown {
  if (preset.type === 'date' && !preset.defaultValue) {
    return new Date().toISOString().slice(0, 10);
  }
  if (Array.isArray(preset.defaultValue)) {
    return [...preset.defaultValue];
  }
  return preset.defaultValue;
}

export function findMatchingPreset(key: string): NotePropertyPreset | undefined {
  return DEFAULT_NOTE_PROPERTY_PRESETS.find(
    (p) => p.key.toLowerCase() === key.toLowerCase(),
  );
}

export function coerceValueToType(value: unknown, targetType: ObsidianPropertyType): unknown {
  if (targetType === 'auto' || targetType === 'text') {
    if (Array.isArray(value)) return value.join(', ');
    if (value === null || value === undefined) return '';
    return String(value);
  }
  if (targetType === 'checkbox') {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return ['true', 'sim', 'yes', '1'].includes(value.toLowerCase());
    return Boolean(value);
  }
  if (targetType === 'number') {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (targetType === 'list') {
    if (Array.isArray(value)) return value.map((item) => String(item));
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    }
    return value ? [String(value)] : [];
  }
  if (targetType === 'date') {
    const str = typeof value === 'string' ? value.trim() : '';
    const match = str.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : new Date().toISOString().slice(0, 10);
  }
  if (targetType === 'datetime') {
    const str = typeof value === 'string' ? value.trim() : '';
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) return str.slice(0, 16);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return `${str}T09:00`;
    return new Date().toISOString().slice(0, 16);
  }
  return value;
}

export function formatDateValue(val: unknown): string {
  if (typeof val !== 'string') return '';
  return val.slice(0, 10);
}

export function formatDatetimeValue(val: unknown): string {
  if (typeof val !== 'string') return '';
  return val.slice(0, 16);
}

export function asStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map((item) => String(item));
  if (typeof val === 'string' && val.trim()) {
    return val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function normalizeListItem(key: string, raw: string): string {
  const cleaned = raw.trim().replace(/,+$/, '').trim();
  if (!cleaned) return '';
  return isTagKey(key) ? cleaned.replace(/^#+/, '').toLowerCase() : cleaned;
}

export function formatYamlValue(val: unknown): string {
  if (Array.isArray(val)) return `[${val.join(', ')}]`;
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (val === null || val === undefined) return '';
  return String(val);
}

export function serializeToYaml(data: EditorFrontmatter): string {
  const lines: string[] = ['---'];
  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) continue;
    lines.push(`${key}: ${formatYamlValue(val)}`);
  }
  lines.push('---');
  return lines.join('\n');
}

function parseScalarYamlValue(rawVal: string): unknown {
  const trimmed = rawVal.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed !== '' && /^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed.replace(/^['"]|['"]$/g, '');
}

export function parseYamlText(text: string): EditorFrontmatter {
  const clean = text.replace(/^---\r?\n?/, '').replace(/\r?\n?---$/, '').trim();
  const result: EditorFrontmatter = {};
  let activeListKey: string | null = null;

  for (const rawLine of clean.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const listMatch = /^\s*-\s+(.+)$/.exec(rawLine);
    if (listMatch && activeListKey) {
      const existing = Array.isArray(result[activeListKey])
        ? (result[activeListKey] as string[])
        : [];
      const itemVal = (listMatch[1] ?? '').trim().replace(/^['"]|['"]$/g, '');
      if (itemVal) {
        existing.push(itemVal);
      }
      result[activeListKey] = existing;
      continue;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) {
      activeListKey = null;
      continue;
    }

    const key = trimmed.slice(0, colonIdx).trim();
    const val = trimmed.slice(colonIdx + 1).trim();
    if (!key) continue;

    if (val === '') {
      activeListKey = key;
      result[key] = key === 'tags' ? [] : '';
      continue;
    }

    activeListKey = null;
    if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1);
      result[key] = inner
        .split(',')
        .map((t) => t.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    } else if (key === 'tags') {
      result.tags = val
        .split(',')
        .map((t) => t.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    } else {
      result[key] = parseScalarYamlValue(val);
    }
  }

  return result;
}
