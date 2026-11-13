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

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: Component;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  section?: string;
  testId?: string;
  handler?: () => void;
}

export type TreeContextMenuActionId =
  | 'rename'
  | 'duplicate'
  | 'create-subpage'
  | 'move'
  | 'toggle-favorite'
  | 'copy-link'
  | 'delete'
  | 'open-new-tab'
  | 'open-side-by-side';

export interface TreeContextMenuAction {
  id: TreeContextMenuActionId;
  label: string;
  icon?: Component;
  shortcut?: string;
  danger?: boolean;
  section?: string;
}

export interface TreeContextMenuTarget {
  id: string;
  title: string;
  icon?: string;
  isFavorite?: boolean;
  updatedAt?: string | number | Date;
  authorName?: string;
}
