export type TiptapMarkType = 'bold' | 'italic' | 'code' | 'strike' | 'link';

export interface TiptapMark {
  type: TiptapMarkType;
  attrs?: Record<string, string | number | boolean>;
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, string | number | boolean | null>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
}

export interface TiptapDoc {
  type: 'doc';
  content: TiptapNode[];
}

export interface MindPage {
  id: string;
  slug: string;
  title: string;
  icon: string;
  parentId: string | null;
  sortOrder: number;
  contentMarkdown: string;
  contentJson: TiptapDoc;
  isFavorite: boolean;
  isInbox: boolean;
  tags: string[];
  embedding: number[] | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PageTreeNode extends MindPage {
  children: PageTreeNode[];
}

export interface CreatePageInput {
  id?: string;
  slug?: string;
  title: string;
  icon?: string;
  parentId?: string | null;
  sortOrder?: number;
  contentMarkdown?: string;
  contentJson?: TiptapDoc;
  isFavorite?: boolean;
  isInbox?: boolean;
  tags?: string[];
}

export interface UpdatePageInput {
  title?: string;
  icon?: string;
  parentId?: string | null;
  sortOrder?: number;
  contentMarkdown?: string;
  contentJson?: TiptapDoc;
  isFavorite?: boolean;
  isInbox?: boolean;
  tags?: string[];
}

export interface QuickInsightInput {
  text: string;
  tags?: string[];
}

export type SearchMode = 'text' | 'semantic' | 'hybrid';

export interface SearchPagesQuery {
  query: string;
  mode?: SearchMode;
  limit?: number;
  includeDeleted?: boolean;
}

export interface SearchResultItem {
  page: MindPage;
  score: number;
  snippet: string;
  matchType: SearchMode;
  matchedTerms: string[];
}

export type SlashCommandCategory = 'basic' | 'list' | 'rich' | 'code';

export interface SlashCommandDefinition {
  id: string;
  command: string;
  label: string;
  description: string;
  icon: string;
  shortcut: string;
  category: SlashCommandCategory;
}

export interface AiChatRequest {
  question: string;
  pageId?: string | null;
  apiKey?: string;
}

export interface AiChatResponse {
  answer: string;
  referencedPages: Array<{ id: string; title: string; score: number }>;
  provider: 'gemini-byok' | 'local-rag';
}

export interface GitSyncSnapshot {
  exportedAt: string;
  totalFiles: number;
  files: Array<{
    path: string;
    pageId: string;
    title: string;
    markdown: string;
  }>;
}
