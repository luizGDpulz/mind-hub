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

export type SlashCommandCategory = 'basic' | 'list' | 'rich' | 'code' | 'database' | 'diagrams';

export interface SlashCommandDefinition {
  id: string;
  command: string;
  label: string;
  description: string;
  icon: string;
  monogram?: string;
  shortcut: string;
  category: SlashCommandCategory;
}

export interface WorkspaceUser {
  id: string;
  name: string;
  initials: string;
  email: string;
  tone: 'blue' | 'pink' | 'green' | 'orange' | 'gray';
}

export interface PageCommentReply {
  id: string;
  authorName: string;
  authorInitials: string;
  createdAtLabel: string;
  body: string;
}

export interface PageCommentThread {
  id: string;
  pageId: string;
  authorName: string;
  authorInitials: string;
  createdAtLabel: string;
  quotedText: string;
  body: string;
  replies: PageCommentReply[];
}

export type DatabaseStatus = 'Backlog' | 'In Progress' | 'In Review' | 'Blocked' | 'Done';
export type DatabasePriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type PastelBadgeTone = 'gray' | 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'pink';

export interface DatabaseTagBadge {
  label: string;
  tone: PastelBadgeTone;
}

export interface DatabaseTaskRow {
  id: string;
  rowNumber: number;
  task: string;
  team: DatabaseTagBadge;
  tags: DatabaseTagBadge[];
  assignees: string[];
  dueDate: string;
  dueDateIso: string;
  budget: number;
  effort: number;
  status: DatabaseStatus;
  priority: DatabasePriority;
}

export type DiagramKind = 'mermaid' | 'excalidraw' | 'drawio';

export interface ExcalidrawShapeItem {
  id: string;
  kind: 'rect' | 'diamond' | 'ellipse' | 'arrow' | 'note';
  label: string;
  subtitle?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  bgColor: string;
}

export interface DrawioLayerNode {
  id: string;
  layer: 'USER LAYER' | 'PROXIMITY NETWORK' | 'PUBLIC NETWORK' | 'PROVIDER CLOUD' | 'ENTERPRISE NETWORK';
  label: string;
  category: 'user' | 'infra' | 'management' | 'datastore' | 'analytics' | 'security';
  colorHex: string;
}

export interface DiagramBlockItem {
  id: string;
  pageId: string;
  kind: DiagramKind;
  title: string;
  mermaidCode?: string;
  excalidrawZoom?: number;
  excalidrawShapes?: ExcalidrawShapeItem[];
  drawioNodes?: DrawioLayerNode[];
  drawioXml?: string;
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
