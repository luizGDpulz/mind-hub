import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FrontmatterHeader from './FrontmatterHeader.vue';
import type { EditorFrontmatter } from '../types.js';

describe('FrontmatterHeader.vue', () => {
  it('renders properties in visual mode with tags and status', () => {
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
    expect(wrapper.find('[data-testid="tag-pill-vue3"]').text()).toContain('#vue3');
    expect(wrapper.find('[data-testid="tag-pill-tiptap"]').text()).toContain('#tiptap');
    expect((wrapper.find('[data-testid="status-property-select"]').element as HTMLSelectElement).value).toBe('ativo');
  });

  it('toggles collapse and expand', async () => {
    const wrapper = mount(FrontmatterHeader, {
      props: {
        modelValue: { tags: ['teste'] },
        initialCollapsed: false,
      },
    });

    expect(wrapper.find('[data-testid="frontmatter-content"]').exists()).toBe(true);

    await wrapper.find('[data-testid="toggle-frontmatter-collapse"]').trigger('click');
    expect(wrapper.find('[data-testid="frontmatter-content"]').exists()).toBe(false);

    await wrapper.find('[data-testid="toggle-frontmatter-collapse"]').trigger('click');
    expect(wrapper.find('[data-testid="frontmatter-content"]').exists()).toBe(true);
  });

  it('adds and removes tags visually and emits update:modelValue', async () => {
    const meta: EditorFrontmatter = {
      tags: ['original'],
    };

    const wrapper = mount(FrontmatterHeader, {
      props: {
        modelValue: meta,
      },
    });

    const input = wrapper.find('[data-testid="new-tag-input"]');
    await input.setValue('nova-tag');
    await input.trigger('keydown', { key: 'Enter' });

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    const emitted = wrapper.emitted('update:modelValue')![0]![0] as EditorFrontmatter;
    expect(emitted.tags).toEqual(['original', 'nova-tag']);

    // Remove tag
    await wrapper.find('[data-testid="tag-pill-original"] .remove-tag-btn').trigger('click');
    const lastEmitted = wrapper.emitted('update:modelValue')![1]![0] as EditorFrontmatter;
    expect(lastEmitted.tags).toEqual([]);
  });

  it('switches to raw YAML mode and parses changes back into modelValue', async () => {
    const meta: EditorFrontmatter = {
      status: 'ativo',
      tags: ['alpha'],
    };

    const wrapper = mount(FrontmatterHeader, {
      props: {
        modelValue: meta,
      },
    });

    await wrapper.find('[data-testid="toggle-raw-yaml-mode"]').trigger('click');
    expect(wrapper.find('[data-testid="raw-yaml-textarea"]').exists()).toBe(true);

    const textarea = wrapper.find('[data-testid="raw-yaml-textarea"]');
    expect((textarea.element as HTMLTextAreaElement).value).toContain('tags: [alpha]');

    await textarea.setValue('---\ntags: [beta, gamma]\nstatus: concluído\n---');
    await textarea.trigger('input');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    const lastEmitted = wrapper.emitted('update:modelValue')!.slice(-1)[0]![0] as EditorFrontmatter;
    expect(lastEmitted.status).toBe('concluído');
    expect(lastEmitted.tags).toEqual(['beta', 'gamma']);
  });
});
