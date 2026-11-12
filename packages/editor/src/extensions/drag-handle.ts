import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, NodeSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { Node as PmNode } from '@tiptap/pm/model';

export interface DragHandleOptions {
  dragHandleWidth: number;
  customSelectors?: string[];
  onPositionChange?: (
    pos: { top: number; left: number; nodePos: number; nodeType: string } | null
  ) => void;
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
  const viewRect = view.dom.getBoundingClientRect();

  // Only detect blocks when cursor is within the horizontal band of the editor + left/right margins
  if (coords.x < viewRect.left - 120 || coords.x > viewRect.right + 60) {
    return null;
  }

  // Project horizontal sample coordinate inside the editor whenever cursor is in left or right margin
  const sampleX = Math.min(Math.max(coords.x, viewRect.left + 24), viewRect.right - 24);

  const elements = document.elementsFromPoint(sampleX, coords.y);
  for (const elem of elements) {
    if (elem === view.dom) continue;
    if (elem.closest('.ProseMirror') !== view.dom) continue;
    if (elem.matches(allSelectors) || elem.parentElement?.matches('.ProseMirror')) {
      return elem;
    }
  }

  // Fallback for vertical gaps (margins between paragraphs/headings):
  // Find direct child block of .ProseMirror closest to coords.y within 16px tolerance
  const children = Array.from(view.dom.children);
  let bestMatch: Element | null = null;
  let bestDistance = 16;

  for (const child of children) {
    const rect = child.getBoundingClientRect();
    if (coords.y >= rect.top && coords.y <= rect.bottom) {
      return child;
    }
    const dist = Math.min(Math.abs(coords.y - rect.top), Math.abs(coords.y - rect.bottom));
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = child;
    }
  }

  return bestMatch;
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

  // Align the 20px gutter buttons with the vertical center of the first line
  const topOffset = Math.max(0, (lineHeight - 20) / 2) + paddingTop;

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
  let rawPos: number | null = null;

  try {
    const directPos = view.posAtDOM(nodeElem, 0);
    if (
      typeof directPos === 'number' &&
      directPos >= 0 &&
      directPos <= view.state.doc.content.size
    ) {
      rawPos = directPos;
    }
  } catch {
    // Fallback to coordinates below
  }

  if (rawPos === null) {
    const rect = nodeElem.getBoundingClientRect();
    const posAtCoords = view.posAtCoords({
      left: rect.left + 15,
      top: rect.top + 5,
    });

    if (posAtCoords) {
      // In ProseMirror, posAtCoords.inside is -1 when hovering top-level nodes; fallback to posAtCoords.pos!
      const candidate = posAtCoords.inside >= 0 ? posAtCoords.inside : posAtCoords.pos;
      if (
        typeof candidate === 'number' &&
        candidate >= 0 &&
        candidate <= view.state.doc.content.size
      ) {
        rawPos = candidate;
      }
    }
  }

  if (rawPos === null) return null;

  try {
    const $pos = view.state.doc.resolve(rawPos);
    if ($pos.depth >= 1) {
      return $pos.before(1);
    }
    return rawPos;
  } catch {
    return null;
  }
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

    const updateHandleFromPoint = (view: EditorView, clientX: number, clientY: number) => {
      if (!view.editable) return;
      if (view.dom.classList.contains('is-dragging-block')) return;

      const target = findBlockDOMAtCoords(
        { x: clientX, y: clientY },
        view,
        this.options.customSelectors
      );

      if (!target) {
        return;
      }

      const pos = getNodePosAtDOM(target, view);
      if (pos === null || pos < 0 || pos > view.state.doc.content.size) {
        return;
      }

      let nodeType: string;
      try {
        const node: PmNode | null = view.state.doc.nodeAt(pos);
        nodeType = node?.type?.name || 'paragraph';
      } catch {
        return;
      }

      hoveredNodePos = pos;
      hoveredNodeType = nodeType;

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
    };

    return [
      new Plugin({
        key: GlobalDragHandleKey,
        view: (editorView) => {
          // Attach listeners to the outer editor root so hovering in the left margin/padding
          // (outside .ProseMirror) still detects the block and shows the gutter!
          const rootElem = (editorView.dom.closest('.mind-editor-root') ||
            editorView.dom.parentElement ||
            editorView.dom) as HTMLElement;

          const onRootMouseMove = (event: MouseEvent) => {
            const targetEl = event.target as HTMLElement | null;
            // Keep current block locked if user is interacting with an open block action popover
            if (targetEl?.closest('.block-actions-popover')) {
              return;
            }
            updateHandleFromPoint(editorView, event.clientX, event.clientY);
          };

          const onRootMouseLeave = () => {
            if (this.options.onPositionChange) {
              this.options.onPositionChange(null);
            }
          };

          rootElem.addEventListener('mousemove', onRootMouseMove);
          rootElem.addEventListener('mouseleave', onRootMouseLeave);

          return {
            destroy: () => {
              rootElem.removeEventListener('mousemove', onRootMouseMove);
              rootElem.removeEventListener('mouseleave', onRootMouseLeave);
            },
          };
        },
        props: {
          handleDOMEvents: {
            dragstart: (view) => {
              view.dom.classList.add('is-dragging-block');
              if (
                hoveredNodePos !== null &&
                hoveredNodePos >= 0 &&
                hoveredNodePos < view.state.doc.content.size
              ) {
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
