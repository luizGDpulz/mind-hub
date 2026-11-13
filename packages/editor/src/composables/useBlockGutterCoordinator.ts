import { computed, ref, type Ref } from 'vue';
import type { Editor } from '@tiptap/core';
import type { BlockColorUpdate } from '../types.js';
import type { DragHandlePositionPayload } from '../extensions/drag-handle.js';
import {
  deleteBlocksAtPositions,
  duplicateBlocksAtPositions,
  moveSelectedBlocksStep,
  setBlockSelection,
  turnIntoBlocksAtPositions,
} from '../extensions/block-selection.js';
import { applyBlockColorAtPositions } from '../extensions/block-color.js';

export interface GutterState {
  visible: boolean;
  top: number;
  nodePos: number;
  nodeType: string;
  textColor: string | null;
  bgColor: string | null;
}

export interface UseBlockGutterCoordinatorOptions {
  editor: Ref<Editor | undefined>;
  selectedBlockPositions: Ref<number[]>;
  isMarqueeLocked: () => boolean;
}

/** Coordinate left-margin block gutter state, multi-block actions, color styling, and transforms. */
export function useBlockGutterCoordinator(options: UseBlockGutterCoordinatorOptions) {
  const gutterState = ref<GutterState>({
    visible: false,
    top: 0,
    nodePos: 0,
    nodeType: 'paragraph',
    textColor: null,
    bgColor: null,
  });

  const isGutterHovered = ref(false);
  const isGutterMenuOpen = ref(false);

  const activeGutterSelectedCount = computed(() =>
    options.selectedBlockPositions.value.includes(gutterState.value.nodePos)
      ? options.selectedBlockPositions.value.length
      : 0
  );

  function resolveGutterTargetPositions(): number[] {
    if (
      options.selectedBlockPositions.value.length > 1 &&
      options.selectedBlockPositions.value.includes(gutterState.value.nodePos)
    ) {
      return [...options.selectedBlockPositions.value];
    }
    return [gutterState.value.nodePos];
  }

  function handleGutterPositionChange(pos: DragHandlePositionPayload | null): void {
    if (options.isMarqueeLocked()) {
      gutterState.value.visible = false;
      return;
    }
    if (isGutterMenuOpen.value) {
      return;
    }
    if (!pos) {
      if (!isGutterHovered.value) {
        gutterState.value.visible = false;
      }
      return;
    }
    gutterState.value = {
      visible: true,
      top: pos.top,
      nodePos: pos.nodePos,
      nodeType: pos.nodeType,
      textColor: pos.textColor ?? null,
      bgColor: pos.bgColor ?? null,
    };
  }

  function hideGutterOnKeydown(event: KeyboardEvent): void {
    if (
      !['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Escape'].includes(event.key) &&
      !event.ctrlKey &&
      !event.metaKey &&
      !isGutterMenuOpen.value
    ) {
      isGutterHovered.value = false;
      gutterState.value.visible = false;
    }
  }

  function resetGutterState(): void {
    gutterState.value.visible = false;
    isGutterHovered.value = false;
    isGutterMenuOpen.value = false;
  }

  function handleGutterHover(hovered: boolean): void {
    isGutterHovered.value = hovered;
  }

  function handleGutterMenuToggle(isOpen: boolean): void {
    isGutterMenuOpen.value = isOpen;
  }

  function handleAddBlockBelow(): void {
    const editor = options.editor.value;
    if (!editor) return;
    const pos = gutterState.value.nodePos;
    const node = editor.state.doc.nodeAt(pos);
    const insertPos = node ? pos + node.nodeSize : pos + 1;
    const isListItem = node?.type.name === 'listItem' || node?.type.name === 'taskItem';
    const contentToInsert = isListItem
      ? {
          type: node.type.name,
          attrs: node.type.name === 'taskItem' ? { checked: false } : undefined,
          content: [{ type: 'paragraph' }],
        }
      : { type: 'paragraph' };
    const cursorOffset = isListItem ? 2 : 1;

    editor
      .chain()
      .focus()
      .insertContentAt(insertPos, contentToInsert)
      .setTextSelection(insertPos + cursorOffset)
      .run();
  }

  function handleGutterAction(action: 'moveUp' | 'moveDown' | 'duplicate' | 'delete'): void {
    const editor = options.editor.value;
    if (!editor) return;
    const targets = resolveGutterTargetPositions();
    const { view } = editor;

    if (action === 'delete') {
      if (deleteBlocksAtPositions(view, targets)) {
        gutterState.value.visible = false;
        isGutterHovered.value = false;
      }
    } else if (action === 'duplicate') {
      duplicateBlocksAtPositions(view, targets);
    } else if (action === 'moveUp' || action === 'moveDown') {
      const dir = action === 'moveUp' ? 'up' : 'down';
      const result = moveSelectedBlocksStep(view, targets, dir);
      if (result.moved && result.newPositions.length > 0) {
        gutterState.value.nodePos = result.newPositions[0]!;
        if (targets.length > 1) {
          setBlockSelection(view, result.newPositions);
        }
      }
    }
  }

  function handleGutterSetColor(update: BlockColorUpdate): void {
    const editor = options.editor.value;
    if (!editor) return;
    const targets = resolveGutterTargetPositions();
    const applied = applyBlockColorAtPositions(editor, targets, update);
    if (!applied) return;

    if (update.textColor !== undefined) {
      gutterState.value.textColor =
        update.textColor === 'default' || update.textColor === null ? null : update.textColor;
    }
    if (update.backgroundColor !== undefined) {
      gutterState.value.bgColor =
        update.backgroundColor === 'default' || update.backgroundColor === null
          ? null
          : update.backgroundColor;
    }
  }

  function handleGutterTurnInto(type: string): void {
    const editor = options.editor.value;
    if (!editor) return;
    const targets = resolveGutterTargetPositions();

    if (type === 'mermaid') {
      const pos = targets[0] ?? gutterState.value.nodePos;
      editor
        .chain()
        .focus()
        .setTextSelection(Math.min(pos + 1, editor.state.doc.content.size))
        .insertContent({ type: 'mermaid' })
        .run();
      return;
    }

    const res = turnIntoBlocksAtPositions(editor, targets, type);
    if (res.converted && res.newPositions.length > 0) {
      gutterState.value.nodePos = res.newPositions[0]!;
      gutterState.value.nodeType = type;
    }
  }

  return {
    gutterState,
    isGutterHovered,
    isGutterMenuOpen,
    activeGutterSelectedCount,
    handleGutterPositionChange,
    hideGutterOnKeydown,
    resetGutterState,
    handleGutterHover,
    handleGutterMenuToggle,
    handleAddBlockBelow,
    handleGutterAction,
    handleGutterSetColor,
    handleGutterTurnInto,
  };
}
