import type { Component } from 'vue';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: Component;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  toggle?: boolean;
  active?: boolean;
  section?: 'actions' | 'tools' | 'danger';
  handler?: () => void;
}

export interface ActionMenuPageMeta {
  lastEditedAuthor?: string;
  lastEditedDate?: string;
  wordCount?: number;
  characterCount?: number;
}
