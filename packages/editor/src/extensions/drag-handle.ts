import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, NodeSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { Node as PmNode } from '@tiptap/pm/model';

export interface DragHandleOptions {
  dragHandleWidth: number;
  customSelectors?: string[];
  onPositionChange?: (pos: { top: number; left: number; nodePos: number; nodeType: string } | null) => void;
}

const DEFAULT_BLOCK_SELECTORS = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'blockquote',
  'pre',
  '.tableWrapper',
  '[data-type="callout"]',
  '[data-type="mermaid"]',
  '.mind-block-node',
];

export function findBlockDOMAtCoords(
  coords: { x: number; y: number },
  view: EditorView,
  extraSelectors: string[] = []
): Element | null {
  const allSelectors = [...DEFAULT_BLOCK_SELECTORS, ...extraSelectors].join(', ');

  // If the cursor is in the left margin / gutter zone (within 120px to the left of the editor),
  // sample horizontally inside the editor (+ 24px) at the same vertical coordinate (coords.y)
  // so the block remains detected even while moving towards and hovering the handle buttons!
  const viewRect = view.dom.getBoundingClientRect();
  const sampleX =
    coords.x < viewRect.left + 10 && coords.x >= viewRect.left - 120
      ? viewRect.left + 24
      : coords.x;

  const elements = document.elementsFromPoint(sampleX, coords.y);

  for (const elem of elements) {
    if (elem.closest('.ProseMirror') !== view.dom) continue;
    if (elem.matches(allSelectors) || elem.parentElement?.matches('.ProseMirror')) {
      return elem;
    }
  }
  return null;
}

export function calculateHandlePosition(
  nodeElem: Element,
  editorShellElem?: HTMLElement | null
): { top: number; left: number; height: number } {
  const rect = nodeElem.getBoundingClientRect();
  const shellRect = editorShellElem?.getBoundingClientRect();

  const comp = window.getComputedStyle(nodeElem);
  const parsedLineHeight = parseInt(comp.lineHeight, 10);
  const lineHeight = isNaN(parsedLineHeight)
    ? (parseInt(comp.fontSize, 10) || 16) * 1.2
    : parsedLineHeight;
  const paddingTop = parseInt(comp.paddingTop, 10) || 0;

  const topOffset = (lineHeight - 24) / 2 + paddingTop;

  if (shellRect) {
    return {
      top: rect.top - shellRect.top + topOffset,
      left: rect.left - shellRect.left,
      height: rect.height,
    };
  }

  return {
    top: rect.top + window.scrollY + topOffset,
    left: rect.left + window.scrollX,
    height: rect.height,
  };
}

export function getNodePosAtDOM(nodeElem: Element, view: EditorView): number | null {
  const rect = nodeElem.getBoundingClientRect();
  const posAtCoords = view.posAtCoords({
    left: rect.left + 2,
    top: rect.top + 2,
  });
  return posAtCoords?.inside ?? posAtCoords?.pos ?? null;
}

export const GlobalDragHandleKey = new PluginKey('globalDragHandle');

export const GlobalDragHandle = Extension.create<DragHandleOptions>({
  name: 'globalDragHandle',

  addOptions() {
    return {
      dragHandleWidth: 24,
      customSelectors: [],
      onPositionChange: undefined,
    };
  },

  addProseMirrorPlugins() {
    let hoveredNodePos: number | null = null;
    let hoveredNodeType = 'paragraph';

    return [
      new Plugin({
        key: GlobalDragHandleKey,
        props: {
          handleDOMEvents: {
            mousemove: (view, event) => {
              if (view.dom.classList.contains('is-dragging-block')) return false;

              const target = findBlockDOMAtCoords(
                { x: event.clientX, y: event.clientY },
                view,
                this.options.customSelectors
              );

              if (!target) {
                return false;
              }

              const pos = getNodePosAtDOM(target, view);
              if (pos === null) return false;

              const $pos = view.state.doc.resolve(pos);
              const node: PmNode | null = $pos.nodeAfter || $pos.parent;
              hoveredNodePos = pos;
              hoveredNodeType = node?.type?.name || 'paragraph';

              if (this.options.onPositionChange) {
                const shell = (view.dom.closest('.mind-editor-canvas-container') ||
                  view.dom.parentElement) as HTMLElement | null;
                const calculated = calculateHandlePosition(target, shell);
                this.options.onPositionChange({
                  top: calculated.top,
                  left: calculated.left,
                  nodePos: pos,
                  nodeType: hoveredNodeType,
                });
              }

              return false;
            },
            mouseleave: (view, event) => {
              const mouseEvent = event as MouseEvent;
              const viewRect = view.dom.getBoundingClientRect();

              // If moving into the left margin zone where the gutter lives, preserve it!
              if (
                mouseEvent.clientX >= viewRect.left - 120 &&
                mouseEvent.clientX <= viewRect.left + 20 &&
                mouseEvent.clientY >= viewRect.top &&
                mouseEvent.clientY <= viewRect.bottom
              ) {
                return false;
              }

              const related = mouseEvent.relatedTarget as HTMLElement | null;
              if (
                related &&
                (view.dom.contains(related) ||
                  related.closest('.mind-block-gutter-shell') ||
                  related.closest('.mind-editor-canvas-container'))
              ) {
                return false;
              }
              if (this.options.onPositionChange) {
                this.options.onPositionChange(null);
              }
              return false;
            },
            dragstart: (view) => {
              view.dom.classList.add('is-dragging-block');
              if (hoveredNodePos !== null) {
                try {
                  const tr = view.state.tr.setSelection(
                    NodeSelection.create(view.state.doc, hoveredNodePos)
                  );
                  view.dispatch(tr);
                } catch {
                  // Fallback se o nó não for selecionável diretamente
                }
              }
              return false;
            },
            dragend: (view) => {
              view.dom.classList.remove('is-dragging-block');
              return false;
            },
            drop: (view, event) => {
              view.dom.classList.remove('is-dragging-block');
              const dropCoords = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (!dropCoords) return false;

              return false;
            },
          },
        },
      }),
    ];
  },
});
