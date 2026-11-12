export * from './types.js';
export { default as FrontmatterHeader } from './components/FrontmatterHeader.vue';
export { default as BlockGutter } from './components/BlockGutter.vue';
export { default as SlashMenu } from './components/SlashMenu.vue';
export { default as PageMentionPopover } from './components/PageMentionPopover.vue';
export { default as MermaidBlockView } from './components/MermaidBlockView.vue';
export {
  GlobalDragHandle,
  GlobalDragHandleKey,
  findBlockDOMAtCoords,
  calculateHandlePosition,
  getNodePosAtDOM,
  type DragHandleOptions,
} from './extensions/drag-handle.js';
export {
  SlashCommand,
  SlashCommandKey,
  filterSlashItems,
  executeSlashItem,
  type SlashCommandOptions,
} from './extensions/slash-command.js';
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

