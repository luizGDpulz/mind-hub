import type { Component } from 'vue';
import type { Editor, JSONContent } from '@tiptap/core';

export interface EditorFrontmatter {
  title?: string;
  tags?: string[];
  status?: string;
  project?: string;
  created?: string;
  updated?: string;
  [key: string]: unknown;
}

export interface PageReference {
  id: string;
  title: string;
  slug?: string;
  icon?: string;
  summary?: string;
  category?: string;
  updatedAt?: string;
}

export type SlashMenuCategory = 'suggestions' | 'basic' | 'media' | 'highlight' | 'advanced';

export type CalloutType = 'note' | 'tip' | 'important' | 'warning' | 'caution';

export type BlockColorId =
  | 'default'
  | 'gray'
  | 'brown'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red';

export interface BlockColorOption {
  id: BlockColorId;
  label: string;
  textColor: string;
  backgroundColor: string;
}

export interface BlockColorUpdate {
  textColor?: BlockColorId | null;
  backgroundColor?: BlockColorId | null;
}

export interface CalloutAttributes {
  type: CalloutType;
  icon?: string | null;
}

export interface SlashMenuItem {
  id: string;
  title: string;
  description?: string;
  subtitle?: string;
  badge?: string;
  shortcut?: string;
  category: SlashMenuCategory;
  icon: Component;
  keywords?: string[];
  action: (editor: Editor) => void;
}

export interface MindEditorProps {
  modelValue?: string | JSONContent;
  frontmatter?: EditorFrontmatter;
  readOnly?: boolean;
  placeholder?: string;
  pages?: PageReference[];
  enableFrontmatterHeader?: boolean;
  customSlashItems?: SlashMenuItem[];
}

export interface MindEditorEmits {
  (e: 'update:modelValue', value: string): void;
  (e: 'update:json', value: JSONContent): void;
  (e: 'update:frontmatter', value: EditorFrontmatter): void;
  (e: 'selectPage', pageId: string): void;
  (e: 'createSubpage'): void;
  (e: 'insertDatabaseBlock'): void;
  (e: 'insertDiagramBlock', kind: 'mermaid' | 'excalidraw' | 'drawio'): void;
  (e: 'generateAiNotes'): void;
  (e: 'save'): void;
}
