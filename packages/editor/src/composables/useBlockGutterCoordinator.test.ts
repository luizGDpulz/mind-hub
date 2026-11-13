import { describe, expect, it } from 'vitest';
import { ref, shallowRef } from 'vue';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { BlockColor } from '../extensions/block-color.js';
import { useBlockGutterCoordinator } from './useBlockGutterCoordinator.js';

describe('useBlockGutterCoordinator', () => {
  it('coordinates hover/marquee lock, typing dismissal, color updates, and readOnly reset', () => {
    const editorInstance = new Editor({
      extensions: [StarterKit, BlockColor],
      content: '<p>Bloco 1</p><p>Bloco 2</p>',
    });
    const editorRef = shallowRef<Editor | undefined>(editorInstance);
    const selectedBlockPositions = ref<number[]>([]);
    const isMarqueeLocked = ref(false);

    const coordinator = useBlockGutterCoordinator({
      editor: editorRef,
      selectedBlockPositions,
      isMarqueeLocked: () => isMarqueeLocked.value,
    });

    coordinator.handleGutterPositionChange({
      top: 12,
      left: 0,
      nodePos: 0,
      nodeType: 'paragraph',
      textColor: null,
      bgColor: null,
    });
    expect(coordinator.gutterState.value.visible).toBe(true);
    expect(coordinator.gutterState.value.nodePos).toBe(0);

    coordinator.handleGutterSetColor({ textColor: 'blue', backgroundColor: 'yellow' });
    expect(coordinator.gutterState.value.textColor).toBe('blue');
    expect(coordinator.gutterState.value.bgColor).toBe('yellow');

    // Menu open locks typing dismissal until closed
    coordinator.handleGutterMenuToggle(true);
    coordinator.hideGutterOnKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(coordinator.gutterState.value.visible).toBe(true);

    coordinator.handleGutterMenuToggle(false);
    coordinator.hideGutterOnKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(coordinator.gutterState.value.visible).toBe(false);

    // Marquee lock suppresses gutter display
    isMarqueeLocked.value = true;
    coordinator.handleGutterPositionChange({
      top: 40,
      left: 0,
      nodePos: 9,
      nodeType: 'paragraph',
    });
    expect(coordinator.gutterState.value.visible).toBe(false);

    // resetGutterState clears flags safely
    isMarqueeLocked.value = false;
    coordinator.handleGutterHover(true);
    coordinator.resetGutterState();
    expect(coordinator.isGutterHovered.value).toBe(false);
    expect(coordinator.isGutterMenuOpen.value).toBe(false);
    expect(coordinator.gutterState.value.visible).toBe(false);

    editorInstance.destroy();
  });
});
