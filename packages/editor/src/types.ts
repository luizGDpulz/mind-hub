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

export type SlashMenuCategory = 'basic' | 'media' | 'highlight' | 'advanced';

export type CalloutType = 'note' | 'tip' | 'important' | 'warning' | 'caution';

export interface CalloutAttributes {
  type: CalloutType;
  icon?: string | null;
}

export interface SlashMenuItem {
  id: string;
  title: string;
  description: string;
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
  (e: 'save'): void;
}
