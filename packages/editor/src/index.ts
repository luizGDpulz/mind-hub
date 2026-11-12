export * from './types.js';
export { default as FrontmatterHeader } from './components/FrontmatterHeader.vue';
export { default as BlockGutter } from './components/BlockGutter.vue';
export {
  GlobalDragHandle,
  GlobalDragHandleKey,
  findBlockDOMAtCoords,
  calculateHandlePosition,
  getNodePosAtDOM,
  type DragHandleOptions,
} from './extensions/drag-handle.js';
