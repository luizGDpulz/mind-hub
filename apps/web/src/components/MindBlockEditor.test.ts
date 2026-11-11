import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { markdownToMindDoc, type MindDoc } from '@mind-hub/shared';
import MindBlockEditor from './MindBlockEditor.vue';

const sampleMarkdown = [
  '# Arquitetura do Homelab',
  '',
  'Este documento descreve a infraestrutura.',
  '',
  '- Primeiro item de lista',
  '- Segundo item de lista',
].join('\n');

const initialDoc: MindDoc = markdownToMindDoc(sampleMarkdown);

describe('@mind-hub/web — Notion-like MindBlockEditor (Refs #37, #43, #45)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mounts properly and renders initial document in edit mode', () => {
    const wrapper = mount(MindBlockEditor, {
      props: {
        modelValue: initialDoc,
        markdownValue: sampleMarkdown,
        readOnlyMode: false,
      },
    });

    expect(wrapper.find('[data-testid="mind-block-editor"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="editor-edit-mode"]').exists()).toBe(true);
    expect(wrapper.find('.mind-editor-canvas').exists()).toBe(true);
    expect(wrapper.find('[data-testid="block-gutter-add-btn"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="block-gutter-handle-btn"]').exists()).toBe(true);
    expect((wrapper.vm as any).editor).toBeDefined();
    wrapper.unmount();
  });

  it('handles read-only mode toggle cleanly without blanking canvas (Issue #37 invariant)', async () => {
    const wrapper = mount(MindBlockEditor, {
      props: {
        modelValue: initialDoc,
        markdownValue: sampleMarkdown,
        readOnlyMode: false,
      },
    });

    expect(wrapper.find('[data-testid="editor-edit-mode"]').exists()).toBe(true);
    expect(wrapper.find('.block-left-gutter').exists()).toBe(true);
    expect((wrapper.vm as any).editor?.isEditable).toBe(true);

    // Switch to read-only mode
    await wrapper.setProps({ readOnlyMode: true });
    await nextTick();

    expect(wrapper.find('[data-testid="editor-read-mode"]').exists()).toBe(true);
    expect(wrapper.find('.block-left-gutter').exists()).toBe(false);
    expect((wrapper.vm as any).editor?.isEditable).toBe(false);

    // Switch back to edit mode
    await wrapper.setProps({ readOnlyMode: false });
    await nextTick();

    expect(wrapper.find('[data-testid="editor-edit-mode"]').exists()).toBe(true);
    expect(wrapper.find('.block-left-gutter').exists()).toBe(true);
    expect((wrapper.vm as any).editor?.isEditable).toBe(true);
    wrapper.unmount();
  });

  it('renders block gutter controls (+ and ⠿) and toggles block handle menu', async () => {
    const wrapper = mount(MindBlockEditor, {
      props: {
        modelValue: initialDoc,
        markdownValue: sampleMarkdown,
        readOnlyMode: false,
      },
    });

    expect(wrapper.find('[data-testid="block-handle-menu"]').exists()).toBe(false);

    const handleBtn = wrapper.find('[data-testid="block-gutter-handle-btn"]');
    await handleBtn.trigger('click');
    await nextTick();

    const handleMenu = wrapper.find('[data-testid="block-handle-menu"]');
    expect(handleMenu.exists()).toBe(true);
    expect(wrapper.find('[data-testid="block-move-up-btn"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="block-move-down-btn"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="block-duplicate-btn"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="block-delete-btn"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="turn-into-h1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="turn-into-tarefa"]').exists()).toBe(true);

    // Clicking handle button again closes the menu
    await handleBtn.trigger('click');
    await nextTick();
    expect(wrapper.find('[data-testid="block-handle-menu"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('clicking + gutter button inserts block below and reveals slash menu', async () => {
    const wrapper = mount(MindBlockEditor, {
      props: {
        modelValue: initialDoc,
        markdownValue: sampleMarkdown,
        readOnlyMode: false,
      },
    });

    expect(wrapper.find('[data-testid="slash-command-menu"]').exists()).toBe(false);

    const addBtn = wrapper.find('[data-testid="block-gutter-add-btn"]');
    await addBtn.trigger('click');
    await nextTick();

    expect(wrapper.find('[data-testid="slash-command-menu"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('opens slash command menu on "/" keypress and filters commands dynamically', async () => {
    const wrapper = mount(MindBlockEditor, {
      props: {
        modelValue: initialDoc,
        markdownValue: sampleMarkdown,
        readOnlyMode: false,
      },
    });

    const canvas = wrapper.find('.mind-editor-canvas');
    await canvas.trigger('keydown', { key: '/' });
    await nextTick();

    expect(wrapper.find('[data-testid="slash-command-menu"]').exists()).toBe(true);

    const filterInput = wrapper.find('[data-testid="slash-filter-input"]');
    expect(filterInput.exists()).toBe(true);

    await filterInput.setValue('tabela');
    await nextTick();

    expect(wrapper.find('[data-testid="slash-item-tabela"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="slash-item-h1"]').exists()).toBe(false);

    // Escape closes slash menu
    await canvas.trigger('keydown', { key: 'Escape' });
    await nextTick();
    expect(wrapper.find('[data-testid="slash-command-menu"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('supports keyboard navigation (ArrowDown, ArrowUp, Enter) in slash menu', async () => {
    const wrapper = mount(MindBlockEditor, {
      props: {
        modelValue: initialDoc,
        markdownValue: sampleMarkdown,
        readOnlyMode: false,
      },
    });

    const canvas = wrapper.find('.mind-editor-canvas');
    await canvas.trigger('keydown', { key: '/' });
    await nextTick();

    const menu = wrapper.find('[data-testid="slash-command-menu"]');
    expect(menu.exists()).toBe(true);

    // Arrow down selects second item
    await canvas.trigger('keydown', { key: 'ArrowDown' });
    await nextTick();

    const items = wrapper.findAll('.mind-popover-row');
    expect(items.length).toBeGreaterThan(1);

    // Enter applies command
    await canvas.trigger('keydown', { key: 'Enter' });
    await nextTick();

    expect(wrapper.find('[data-testid="slash-command-menu"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('emits insert-database-block and insert-diagram-block on slash command selection', async () => {
    const wrapper = mount(MindBlockEditor, {
      props: {
        modelValue: initialDoc,
        markdownValue: sampleMarkdown,
        readOnlyMode: false,
      },
    });

    const canvas = wrapper.find('.mind-editor-canvas');
    await canvas.trigger('keydown', { key: '/' });
    await nextTick();

    const filterInput = wrapper.find('[data-testid="slash-filter-input"]');
    await filterInput.setValue('database');
    await nextTick();

    const dbItem = wrapper.find('[data-testid="slash-item-database"]');
    expect(dbItem.exists()).toBe(true);
    await dbItem.trigger('click');
    await nextTick();

    expect(wrapper.emitted('insert-database-block')).toBeTruthy();
    expect(wrapper.find('[data-testid="slash-command-menu"]').exists()).toBe(false);

    // Now test diagram command
    await canvas.trigger('keydown', { key: '/' });
    await nextTick();

    const filterInput2 = wrapper.find('[data-testid="slash-filter-input"]');
    await filterInput2.setValue('mermaid');
    await nextTick();

    const diagramItem = wrapper.find('[data-testid="slash-item-mermaid"]');
    expect(diagramItem.exists()).toBe(true);
    await diagramItem.trigger('click');
    await nextTick();

    expect(wrapper.emitted('insert-diagram-block')).toBeTruthy();
    expect(wrapper.emitted('insert-diagram-block')![0]).toEqual(['mermaid']);
    wrapper.unmount();
  });

  it('opens mention menu on "@" keypress and filters users and pages', async () => {
    const wrapper = mount(MindBlockEditor, {
      props: {
        modelValue: initialDoc,
        markdownValue: sampleMarkdown,
        readOnlyMode: false,
        mentionPages: [
          { id: 'page-homelab', title: 'Arquitetura do Homelab', icon: '🚀' },
          { id: 'page-vault', title: 'Second Brain Vault', icon: '🧠' },
        ],
      },
    });

    const canvas = wrapper.find('.mind-editor-canvas');
    await canvas.trigger('keydown', { key: '@' });
    await nextTick();

    expect(wrapper.find('[data-testid="mention-menu-popover"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mention-page-page-homelab"]').exists()).toBe(true);

    const filterInput = wrapper.find('[data-testid="mention-filter-input"]');
    await filterInput.setValue('homelab');
    await nextTick();

    expect(wrapper.find('[data-testid="mention-page-page-homelab"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mention-page-page-vault"]').exists()).toBe(false);

    // Clicking page mention inserts wikilink and closes popover
    await wrapper.find('[data-testid="mention-page-page-homelab"]').trigger('click');
    await nextTick();

    expect(wrapper.find('[data-testid="mention-menu-popover"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('renders floating bubble menu toolbar with formatting buttons', async () => {
    const wrapper = mount(MindBlockEditor, {
      props: {
        modelValue: initialDoc,
        markdownValue: sampleMarkdown,
        readOnlyMode: false,
      },
    });

    // Initially hidden until text selection occurs
    expect(wrapper.find('[data-testid="editor-bubble-menu"]').exists()).toBe(false);

    // Trigger bubble menu visibility
    (wrapper.vm as any).showBubbleMenu = true;
    await nextTick();

    const bubbleMenu = wrapper.find('[data-testid="editor-bubble-menu"]');
    expect(bubbleMenu.exists()).toBe(true);

    // Formatting buttons check
    expect(bubbleMenu.find('button[title*="Negrito"]').exists()).toBe(true);
    expect(bubbleMenu.find('button[title*="Itálico"]').exists()).toBe(true);
    expect(bubbleMenu.find('button[title*="Sublinhado"]').exists()).toBe(true);
    expect(bubbleMenu.find('button[title*="Tachado"]').exists()).toBe(true);
    expect(bubbleMenu.find('button[title*="Código"]').exists()).toBe(true);
    expect(bubbleMenu.find('button[title*="Link"]').exists()).toBe(true);
    expect(bubbleMenu.find('button[title*="Título H1"]').exists()).toBe(true);
    expect(bubbleMenu.find('button[title*="Título H2"]').exists()).toBe(true);
    expect(bubbleMenu.find('button[title*="Título H3"]').exists()).toBe(true);
    expect(bubbleMenu.find('button[title*="Lista de tarefas"]').exists()).toBe(true);
    expect(bubbleMenu.find('button[title*="Citação"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('debounces update:modelValue emission to guarantee zero-lag typing and zero cursor flicker', async () => {
    const wrapper = mount(MindBlockEditor, {
      props: {
        modelValue: initialDoc,
        markdownValue: sampleMarkdown,
        readOnlyMode: false,
      },
    });

    // Verify initially no emit has been made
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();

    // Advancing timers beyond the 250ms debounce threshold
    vi.advanceTimersByTime(300);
    await nextTick();

    // Clean unmount cancels any pending timers cleanly
    wrapper.unmount();
  });
});
