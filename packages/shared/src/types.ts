export type MindMarkType = 'bold' | 'italic' | 'code' | 'strike' | 'link';
export type TiptapMarkType = MindMarkType;

export interface MindMark {
  type: MindMarkType;
  attrs?: Record<string, string | number | boolean>;
}
export type TiptapMark = MindMark;

export interface MindNode {
  type: string;
  attrs?: Record<string, string | number | boolean | null>;
  content?: MindNode[];
  marks?: MindMark[];
  text?: string;
}
export type TiptapNode = MindNode;

export interface MindDoc {
  type: 'doc';
  content: MindNode[];
}
export type TiptapDoc = MindDoc;

export interface MindPage {
  id: string;
  slug: string;
  title: string;
  icon: string;
  parentId: string | null;
  sortOrder: number;
  contentMarkdown: string;
  contentJson: MindDoc;
  isFavorite: boolean;
  isInbox: boolean;
  tags: string[];
  embedding: number[] | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  sourcePath?: string | null;
  sourceHash?: string | null;
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
  contentJson?: MindDoc;
  isFavorite?: boolean;
  isInbox?: boolean;
  tags?: string[];
  sourcePath?: string | null;
  sourceHash?: string | null;
}

export interface UpdatePageInput {
  title?: string;
  icon?: string;
  parentId?: string | null;
  sortOrder?: number;
  contentMarkdown?: string;
  contentJson?: MindDoc;
  isFavorite?: boolean;
  isInbox?: boolean;
  tags?: string[];
  sourcePath?: string | null;
  sourceHash?: string | null;
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
  deletedAt?: string | null;
}

export interface CreatePageCommentInput {
  pageId: string;
  authorName?: string;
  authorInitials?: string;
  quotedText: string;
  body: string;
}

export interface AddCommentReplyInput {
  authorName?: string;
  authorInitials?: string;
  body: string;
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
  deletedAt?: string | null;
}

export interface CreateDatabaseTaskInput {
  id?: string;
  task: string;
  team?: DatabaseTagBadge;
  tags?: DatabaseTagBadge[];
  assignees?: string[];
  dueDate?: string;
  dueDateIso?: string;
  budget?: number;
  effort?: number;
  status?: DatabaseStatus;
  priority?: DatabasePriority;
}

export interface UpdateDatabaseTaskInput {
  task?: string;
  team?: DatabaseTagBadge;
  tags?: DatabaseTagBadge[];
  assignees?: string[];
  dueDate?: string;
  dueDateIso?: string;
  budget?: number;
  effort?: number;
  status?: DatabaseStatus;
  priority?: DatabasePriority;
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
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface UpsertDiagramInput {
  id?: string;
  pageId: string;
  kind: DiagramKind;
  title: string;
  mermaidCode?: string;
  excalidrawZoom?: number;
  excalidrawShapes?: ExcalidrawShapeItem[];
  drawioNodes?: DrawioLayerNode[];
  drawioXml?: string;
}

export type AiProviderKind = 'gemini-byok' | 'nvidia-nim' | 'local-rag';

export interface AiChatRequest {
  question: string;
  pageId?: string | null;
  apiKey?: string;
  nvidiaApiKey?: string;
  preferredProvider?: AiProviderKind;
}

export interface AiChatResponse {
  answer: string;
  referencedPages: Array<{ id: string; title: string; score: number }>;
  provider: AiProviderKind;
}

export interface AuthLoginInput {
  email?: string;
  password?: string;
  ssoProvider?: 'Okta' | 'Azure Entra' | 'Google SSOX' | 'OneLogin';
}

export interface AuthSessionResponse {
  authenticated: boolean;
  user: {
    id: string;
    name: string;
    initials: string;
    email: string;
    workspace: string;
    authMethod: string;
  };
  token: string;
  issuedAt: string;
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

export interface RawMarkdownFileEntry {
  path: string;
  content: string;
}

export interface ParsedFrontmatterMetadata {
  title?: string;
  slug?: string;
  icon?: string;
  tags: string[];
  created?: string;
  updated?: string;
  status?: string;
  project?: string;
  isFavorite?: boolean;
  isInbox?: boolean;
  rawAttributes: Record<string, string | string[]>;
}

export interface ParsedMarkdownNote {
  relativePath: string;
  folderSegments: string[];
  fileName: string;
  title: string;
  slug: string;
  icon: string;
  frontmatter: ParsedFrontmatterMetadata;
  normalizedMarkdown: string;
  tiptapDoc: TiptapDoc;
  wikiLinks: string[];
  sourceHash: string;
}

export interface BulkImportOptions {
  conflictStrategy?: 'upsert' | 'skip';
  rootParentId?: string | null;
  defaultTags?: string[];
}

export interface BulkImportPlanResult {
  pagesToUpsert: MindPage[];
  folderPagesCreated: number;
  notesProcessed: number;
  wikiLinksResolved: number;
  discoveredTags: string[];
}

export interface BulkImportApiResponse {
  importedAt: string;
  notesProcessed: number;
  folderPagesCreated: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  wikiLinksResolved: number;
  discoveredTags: string[];
  pages: MindPage[];
}
