export * from './types.js';
export { default as FrontmatterHeader } from './components/FrontmatterHeader.vue';
export { default as NoteTitleBar } from './components/NoteTitleBar.vue';
export { default as BlockGutter } from './components/BlockGutter.vue';
export { default as MindColorPicker } from './components/MindColorPicker.vue';
export { default as MindIconPicker } from './components/MindIconPicker.vue';
export { default as SlashMenu } from './components/SlashMenu.vue';
export { default as PageMentionPopover } from './components/PageMentionPopover.vue';
export { default as MermaidBlockView } from './components/MermaidBlockView.vue';
export { default as CalloutBlockView } from './components/CalloutBlockView.vue';
export { default as BubbleFormattingMenu } from './components/BubbleFormattingMenu.vue';
export { default as MindEditor } from './components/MindEditor.vue';
export {
  GlobalDragHandle,
  GlobalDragHandleKey,
  GlobalDragVisualPluginKey,
  collectBlockCandidates,
  findBlockDOMAtCoords,
  calculateHandlePosition,
  getNodePosAtDOM,
  resolveDropTarget,
  moveBlockAtPos,
  moveBlocksAtPositions,
  moveBlocksWithResult,
  type DragHandleOptions,
  type DragHandlePositionPayload,
  type DropIndicatorPayload,
  type DragVisualState,
  type ResolvedDropTarget,
  type MoveBlocksResult,
} from './extensions/drag-handle.js';
export {
  useMarqueeSelection,
  type UseMarqueeSelectionOptions,
} from './composables/useMarqueeSelection.js';
export {
  useEditorFrontmatter,
  hasFrontmatterProperties,
  type UseEditorFrontmatterOptions,
} from './composables/useEditorFrontmatter.js';
export {
  useBlockGutterCoordinator,
  type GutterState,
  type UseBlockGutterCoordinatorOptions,
} from './composables/useBlockGutterCoordinator.js';
export {
  BlockSelection,
  BlockSelectionPluginKey,
  getSelectedBlockPositions,
  setBlockSelection,
  clearBlockSelection,
  isPointInsideTextContent,
  shouldStartMarqueeFromPoint,
  findBlocksIntersectingRect,
  deleteBlocksAtPositions,
  duplicateBlocksAtPositions,
  moveSelectedBlocksStep,
  turnIntoBlocksAtPositions,
  type BlockSelectionOptions,
  type BlockSelectionState,
  type ViewportRect,
} from './extensions/block-selection.js';
export {
  SlashCommand,
  SlashCommandKey,
  filterSlashItems,
  executeSlashItem,
  type SlashCommandOptions,
} from './extensions/slash-command.js';
export {
  createDefaultSlashItems,
  type SlashItemCallbacks,
} from './extensions/slash-items.js';
export {
  PageMention,
  PageMentionKey,
  filterPages,
  type PageMentionOptions,
} from './extensions/page-mention.js';
export {
  MermaidNode,
  DEFAULT_MERMAID_CODE,
  type MermaidNodeOptions,
} from './extensions/mermaid-node.js';
export {
  CalloutNode,
  normalizeCalloutType,
  calloutToMarkdown,
  parseMarkdownCallout,
  type CalloutNodeOptions,
} from './extensions/callout-node.js';
export {
  EMOJI_CATEGORIES,
  LUCIDE_ICON_CATALOG,
  LUCIDE_ICON_PREFIX,
  NO_CALLOUT_ICON_VALUE,
  isLucideIconValue,
  formatLucideIconValue,
  resolveLucideIconComponent,
  getRandomPickerIcon,
  type EmojiCatalogItem,
  type EmojiCategory,
  type LucideIconItem,
} from './extensions/callout-icons.js';
export {
  MarkdownShortcuts,
  TASK_EMPTY_BRACKETS_REGEX,
  TASK_SPACED_BRACKETS_REGEX,
  FRONTMATTER_TRIGGER_REGEX,
  type MarkdownShortcutsOptions,
} from './extensions/markdown-shortcuts.js';
export {
  BlockColor,
  BLOCK_COLOR_PALETTE,
  BLOCK_COLORABLE_TYPES,
  isCustomHexColor,
  normalizeHexColor,
  normalizeBlockColorValue,
  normalizeBlockColorId,
  getBlockColorOption,
  getBlockColorDisplayHex,
  applyBlockColorAtPos,
  applyBlockColorAtPositions,
  syncBlockColorsAtSelection,
  normalizeContainerBlockColors,
} from './extensions/block-color.js';


