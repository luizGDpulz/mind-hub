import { computed, ref, type Ref } from 'vue';
import type { Editor } from '@tiptap/core';
import type { EditorView } from '@tiptap/pm/view';
import {
  clearBlockSelection,
  findBlocksIntersectingRect,
  setBlockSelection,
  shouldStartMarqueeFromPoint,
} from '../extensions/block-selection.js';
import { collectBlockCandidates, getNodePosAtDOM } from '../extensions/drag-handle.js';

export interface UseMarqueeSelectionOptions {
  editor: Ref<Editor | undefined>;
  readOnly: () => boolean;
  selectedBlockPositions: Ref<number[]>;
}

const INTERACTIVE_OR_CHROME_SELECTOR = [
  '.mind-block-gutter-shell button',
  '.gutter-tooltip',
  '.block-actions-popover',
  '.mind-color-picker-shell',
  '.mind-icon-picker-shell',
].join(', ');

function clearNativeDomSelection(): void {
  if (typeof window === 'undefined') return;
  window.getSelection?.()?.removeAllRanges();
}

function resolveCaretPosForEmptyClick(view: EditorView, clientX: number, clientY: number): number {
  if (typeof view.posAtCoords === 'function') {
    const coordsHit = view.posAtCoords({ left: clientX, top: clientY });
    if (coordsHit) {
      return coordsHit.pos;
    }
  }

  const candidates = collectBlockCandidates(view.dom);
  if (candidates.length === 0) {
    return Math.min(1, view.state.doc.content.size);
  }

  // Pick block whose vertical band covers clientY, or nearest bottom block if below document
  let chosen = candidates[candidates.length - 1]!;
  let minDistance = Number.POSITIVE_INFINITY;
  for (const el of candidates) {
    const rect = el.getBoundingClientRect();
    if (clientY >= rect.top && clientY <= rect.bottom) {
      chosen = el;
      break;
    }
    const dist = Math.min(Math.abs(clientY - rect.top), Math.abs(clientY - rect.bottom));
    if (dist < minDistance) {
      minDistance = dist;
      chosen = el;
    }
  }

  const pos = getNodePosAtDOM(chosen, view);
  if (pos === null) {
    return Math.min(1, view.state.doc.content.size);
  }

  const node = view.state.doc.nodeAt(pos);
  if (!node) {
    return Math.min(1, view.state.doc.content.size);
  }

  const rect = chosen.getBoundingClientRect();
  if (clientX < rect.left) {
    return Math.min(pos + 1, view.state.doc.content.size);
  }
  return Math.max(1, pos + node.nodeSize - 1);
}

/**
 * Coordinates Notion-style marquee block selection (drag starting outside text letters)
 * while isolating native text selection (`::selection` / BubbleMenu) from block lassoing.
 */
export function useMarqueeSelection(options: UseMarqueeSelectionOptions) {
  const isPointerDown = ref(false);
  const marqueeState = ref({
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  const marqueeRectStyle = computed(() => {
    if (!marqueeState.value.active) return null;
    const left = Math.min(marqueeState.value.startX, marqueeState.value.currentX);
    const top = Math.min(marqueeState.value.startY, marqueeState.value.currentY);
    const width = Math.abs(marqueeState.value.currentX - marqueeState.value.startX);
    const height = Math.abs(marqueeState.value.currentY - marqueeState.value.startY);
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  });

  let pendingStart: { x: number; y: number; clickTarget: Element | null } | null = null;

  function onSelectStart(event: Event): void {
    if (pendingStart || marqueeState.value.active) {
      event.preventDefault();
      clearNativeDomSelection();
    }
  }

  function onMouseMove(event: MouseEvent): void {
    const ed = options.editor.value;
    if (!pendingStart || !ed) return;

    const dx = event.clientX - pendingStart.x;
    const dy = event.clientY - pendingStart.y;

    if (!marqueeState.value.active) {
      if (Math.hypot(dx, dy) < 5) return;
      marqueeState.value = {
        active: true,
        startX: pendingStart.x,
        startY: pendingStart.y,
        currentX: event.clientX,
        currentY: event.clientY,
      };
    } else {
      marqueeState.value.currentX = event.clientX;
      marqueeState.value.currentY = event.clientY;
    }

    // Keep browser text highlight & ProseMirror Selection suppressed while lassoing blocks
    clearNativeDomSelection();

    const left = Math.min(marqueeState.value.startX, marqueeState.value.currentX);
    const top = Math.min(marqueeState.value.startY, marqueeState.value.currentY);
    const right = Math.max(marqueeState.value.startX, marqueeState.value.currentX);
    const bottom = Math.max(marqueeState.value.startY, marqueeState.value.currentY);

    const hits = findBlocksIntersectingRect(ed.view, { left, top, right, bottom });
    setBlockSelection(ed.view, hits);
  }

  function cleanupListeners(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('selectstart', onSelectStart);
  }

  function onMouseUp(event: MouseEvent): void {
    cleanupListeners();
    const wasActive = marqueeState.value.active;
    const startSnapshot = pendingStart;

    isPointerDown.value = false;
    marqueeState.value.active = false;
    pendingStart = null;

    const ed = options.editor.value;
    if (!ed) return;

    if (wasActive && options.selectedBlockPositions.value.length > 0) {
      clearNativeDomSelection();
      ed.view.dom.focus({ preventScroll: true });
      return;
    }

    // Single click on empty canvas/margin without drag: focus editor & place caret cleanly
    const clickedInsideCanvas = startSnapshot?.clickTarget?.closest(
      '.mind-editor-canvas-container, .ProseMirror, .mind-editor-root'
    );
    if (
      !wasActive &&
      clickedInsideCanvas &&
      !startSnapshot?.clickTarget?.closest('.mind-frontmatter-header, .mind-note-title-bar')
    ) {
      const targetPos = resolveCaretPosForEmptyClick(ed.view, event.clientX, event.clientY);
      const clamped = Math.max(0, Math.min(targetPos, ed.state.doc.content.size));
      ed.chain().setTextSelection(clamped).focus().run();
    }
  }

  function handleRootMouseDown(event: MouseEvent): void {
    const ed = options.editor.value;
    if (options.readOnly() || !ed || event.button !== 0) return;

    const targetEl = event.target instanceof Element ? event.target : null;
    if (targetEl?.closest(INTERACTIVE_OR_CHROME_SELECTOR)) {
      return;
    }

    if (!shouldStartMarqueeFromPoint(ed.view, targetEl, event.clientX, event.clientY)) {
      if (options.selectedBlockPositions.value.length > 0) {
        clearBlockSelection(ed.view);
      }
      return;
    }

    // Prevent browser native drag-text-selection when dragging starts outside letters
    event.preventDefault();
    clearNativeDomSelection();

    if (options.selectedBlockPositions.value.length > 0) {
      clearBlockSelection(ed.view);
    }

    isPointerDown.value = true;
    pendingStart = { x: event.clientX, y: event.clientY, clickTarget: targetEl };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('selectstart', onSelectStart);
  }

  return {
    isPointerDown,
    marqueeState,
    marqueeRectStyle,
    handleRootMouseDown,
    cleanupListeners,
  };
}
