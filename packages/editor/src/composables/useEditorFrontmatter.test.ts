import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import {
  hasFrontmatterProperties,
  useEditorFrontmatter,
} from './useEditorFrontmatter.js';
import type { EditorFrontmatter } from '../types.js';

describe('useEditorFrontmatter', () => {
  it('hasFrontmatterProperties ignores title-only and empty-tag metadata', () => {
    expect(hasFrontmatterProperties(undefined)).toBe(false);
    expect(hasFrontmatterProperties({})).toBe(false);
    expect(hasFrontmatterProperties({ title: 'Nota' })).toBe(false);
    expect(hasFrontmatterProperties({ title: 'Nota', tags: [] })).toBe(false);
    expect(hasFrontmatterProperties({ tags: ['adr'] })).toBe(true);
    expect(hasFrontmatterProperties({ status: 'draft' })).toBe(true);
  });

  it('toggles property visibility, opens, and clears frontmatter cleanly', async () => {
    const showProperties = ref<boolean | undefined>(undefined);
    const frontmatter = ref<EditorFrontmatter>({});
    const emitUpdateShowProperties = vi.fn((val: boolean) => {
      showProperties.value = val;
    });
    const emitUpdateFrontmatter = vi.fn((val: EditorFrontmatter) => {
      frontmatter.value = val;
    });

    const Harness = defineComponent({
      setup() {
        return useEditorFrontmatter({
          enableFrontmatterHeader: () => true,
          readOnly: () => false,
          showProperties: () => showProperties.value,
          frontmatter: () => frontmatter.value,
          emitUpdateShowProperties,
          emitUpdateFrontmatter,
        });
      },
      template: '<div />',
    });

    const wrapper = mount(Harness);
    expect(wrapper.vm.isFrontmatterVisible).toBe(false);

    await wrapper.vm.openProperties(false);
    expect(emitUpdateShowProperties).toHaveBeenCalledWith(true);
    expect(wrapper.vm.isFrontmatterVisible).toBe(true);
    expect(wrapper.vm.frontmatterInitialCollapsed).toBe(false);

    wrapper.vm.handleRemoveProperties();
    expect(emitUpdateShowProperties).toHaveBeenLastCalledWith(false);
    expect(emitUpdateFrontmatter).toHaveBeenLastCalledWith({});
    expect(wrapper.vm.isFrontmatterVisible).toBe(false);
    expect(wrapper.vm.frontmatterInitialCollapsed).toBe(true);
  });

  it('keeps controlled showProperties=false hidden even when frontmatter has properties (refs #83)', async () => {
    const showProperties = ref<boolean>(false);
    const frontmatter = ref<EditorFrontmatter>({ tags: ['adr'], status: 'active' });
    const emitUpdateShowProperties = vi.fn((val: boolean) => {
      showProperties.value = val;
    });

    const Harness = defineComponent({
      setup() {
        return useEditorFrontmatter({
          enableFrontmatterHeader: () => true,
          readOnly: () => false,
          showProperties: () => showProperties.value,
          frontmatter: () => frontmatter.value,
          emitUpdateShowProperties,
          emitUpdateFrontmatter: vi.fn(),
        });
      },
      template: '<div />',
    });

    const wrapper = mount(Harness);
    expect(wrapper.vm.isFrontmatterVisible).toBe(false);

    await wrapper.vm.openProperties(false);
    expect(emitUpdateShowProperties).toHaveBeenCalledWith(true);
    expect(wrapper.vm.isFrontmatterVisible).toBe(true);
  });
});
