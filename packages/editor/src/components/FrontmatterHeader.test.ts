import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FrontmatterHeader from './FrontmatterHeader.vue';
import type { EditorFrontmatter } from '../types.js';

describe('FrontmatterHeader.vue (Obsidian Style)', () => {
  it('starts collapsed without YAML puro button, and reveals Obsidian properties + YAML puro when expanded', async () => {
    const meta: EditorFrontmatter = {
      title: 'Nota Arquitetural',
      tags: ['vue3', 'tiptap'],
      status: 'ativo',
      project: 'Mind Hub',
    };

    const wrapper = mount(FrontmatterHeader, {
      props: {
        modelValue: meta,
      },
    });

    expect(wrapper.find('[data-testid="mind-frontmatter-header"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="frontmatter-content"]').exists()).toBe(false);
    // YAML puro button must ONLY be visible when properties are expanded
    expect(wrapper.find('[data-testid="toggle-raw-yaml-mode"]').exists()).toBe(false);

    await wrapper.find('[data-testid="toggle-frontmatter-collapse"]').trigger('click');

    expect(wrapper.find('[data-testid="frontmatter-content"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="toggle-raw-yaml-mode"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="toggle-raw-yaml-mode"]').text()).toContain('YAML puro');

    // Title is handled separately outside Visual Propriedades rows
    expect(wrapper.find('[data-testid="property-row-title"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="tag-pill-vue3"]').text()).toContain('#vue3');
    expect(wrapper.find('[data-testid="tag-pill-tiptap"]').text()).toContain('#tiptap');
    expect(
      (wrapper.find('[data-testid="status-property-input"]').element as HTMLInputElement).value
    ).toBe('ativo');

    // Focusing tags input shows clean default tag facilitators
    await wrapper.find('[data-testid="new-tag-input"]').trigger('focus');
    expect(wrapper.find('[data-testid="default-tags-suggestions"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="default-tag-projeto"]').exists()).toBe(true);
  });

  it('adds standard & custom tags on focus/type and emits update:modelValue', async () => {
    const meta: EditorFrontmatter = {
      tags: ['original'],
    };

    const wrapper = mount(FrontmatterHeader, {
      props: {
        modelValue: meta,
        initialCollapsed: false,
      },
    });

    const input = wrapper.find('[data-testid="new-tag-input"]');
    await input.trigger('focus');

    // Click a default tag preset in facilitator dropdown
    await wrapper.find('[data-testid="default-tag-projeto"]').trigger('mousedown');
    expect(wrapper.emitted('update:modelValue')![0]![0]).toMatchObject({
      tags: ['original', 'projeto'],
    });

    // Type and create a brand-new custom tag via Enter
    await input.setValue('nova-tag');
    expect(wrapper.find('[data-testid="create-custom-tag-btn"]').exists()).toBe(true);
    await input.trigger('keydown', { key: 'Enter' });

    const secondEmit = wrapper.emitted('update:modelValue')![1]![0] as EditorFrontmatter;
    expect(secondEmit.tags).toEqual(['original', 'nova-tag']);

    // Remove tag
    await wrapper.find('[data-testid="tag-pill-original"] .remove-chip-btn').trigger('click');
    const lastEmitted = wrapper.emitted('update:modelValue')![2]![0] as EditorFrontmatter;
    expect(lastEmitted.tags).toEqual([]);
  });

  it('supports Obsidian context menu (property types, copy/paste, cut, remove) and adding presets/custom properties', async () => {
    const wrapper = mount(FrontmatterHeader, {
      props: {
        modelValue: { status: 'ativo', customProp: 'valor' },
        initialCollapsed: false,
      },
    });

    // Open type & actions context menu on customProp
    await wrapper.find('[data-testid="prop-type-btn-customProp"]').trigger('click');
    expect(wrapper.find('[data-testid="property-context-menu"]').exists()).toBe(true);

    // Open Tipo de propriedade submenu and switch customProp to checkbox
    await wrapper.find('[data-testid="prop-menu-type-trigger"]').trigger('click');
    expect(wrapper.find('[data-testid="prop-menu-type-submenu"]').exists()).toBe(true);
    await wrapper.find('[data-testid="prop-type-option-checkbox"]').trigger('click');

    const checkboxEmit = wrapper.emitted('update:modelValue')![0]![0] as EditorFrontmatter;
    expect(typeof checkboxEmit.customProp).toBe('boolean');

    // Copy & Paste property
    await wrapper.find('[data-testid="prop-type-btn-status"]').trigger('click');
    await wrapper.find('[data-testid="prop-menu-copy"]').trigger('click');
    await wrapper.find('[data-testid="prop-type-btn-customProp"]').trigger('click');
    await wrapper.find('[data-testid="prop-menu-paste"]').trigger('click');

    const pasteEmit = wrapper.emitted('update:modelValue')!.slice(-1)[0]![0] as EditorFrontmatter;
    expect(pasteEmit.status_copia).toBe('ativo');

    // Add property via preset quick bar
    await wrapper.find('[data-testid="add-property-btn"]').trigger('click');
    expect(wrapper.find('[data-testid="new-property-row"]').exists()).toBe(true);
    await wrapper.find('[data-testid="preset-prop-project"]').trigger('mousedown');

    const presetEmit = wrapper.emitted('update:modelValue')!.slice(-1)[0]![0] as EditorFrontmatter;
    expect('project' in presetEmit).toBe(true);

    // Add completely custom property via draft input
    await wrapper.find('[data-testid="add-property-btn"]').trigger('click');
    const draftInput = wrapper.find('[data-testid="new-property-key-input"]');
    await draftInput.setValue('autor');
    await draftInput.trigger('keydown', { key: 'Enter' });

    const customEmit = wrapper.emitted('update:modelValue')!.slice(-1)[0]![0] as EditorFrontmatter;
    expect('autor' in customEmit).toBe(true);
  });

  it('switches to raw YAML mode (including multiline lists and booleans) and parses changes back into modelValue', async () => {
    const meta: EditorFrontmatter = {
      status: 'ativo',
      tags: ['alpha'],
    };

    const wrapper = mount(FrontmatterHeader, {
      props: {
        modelValue: meta,
        initialCollapsed: false,
      },
    });

    await wrapper.find('[data-testid="toggle-raw-yaml-mode"]').trigger('click');
    expect(wrapper.find('[data-testid="raw-yaml-textarea"]').exists()).toBe(true);

    const textarea = wrapper.find('[data-testid="raw-yaml-textarea"]');
    expect((textarea.element as HTMLTextAreaElement).value).toContain('tags: [alpha]');

    await textarea.setValue('---\ntags:\n  - beta\n  - gamma\nstatus: concluído\npinned: true\n---');
    await textarea.trigger('input');

    const lastEmitted = wrapper.emitted('update:modelValue')!.slice(-1)[0]![0] as EditorFrontmatter;
    expect(lastEmitted.status).toBe('concluído');
    expect(lastEmitted.tags).toEqual(['beta', 'gamma']);
    expect(lastEmitted.pinned).toBe(true);
  });
});
