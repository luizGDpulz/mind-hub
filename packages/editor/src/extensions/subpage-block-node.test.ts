import { nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import SubpageBlockView from '../components/SubpageBlockView.vue';
import { BlockColor } from './block-color.js';
import { SubpageBlockNode } from './subpage-block-node.js';

describe('@mind-hub/editor — SubpageBlockNode & SubpageBlockView', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('inserts a subpageBlock node via Tiptap command and supports BlockColor attributes', () => {
    const editor = new Editor({
      extensions: [StarterKit, SubpageBlockNode, BlockColor],
      content: '<p>Introdução</p>',
    });

    editor.commands.insertSubpageBlock({
      pageId: 'page-cal',
      title: 'Calendário Secullum',
      icon: '📅',
      color: 'purple',
      summary: 'Feriados e reuniões da equipe.',
    });

    const json = editor.getJSON();
    const subpage = json.content?.find((n) => n.type === 'subpageBlock');
    expect(subpage).toBeDefined();
    expect(subpage?.attrs?.pageId).toBe('page-cal');
    expect(subpage?.attrs?.title).toBe('Calendário Secullum');
    expect(subpage?.attrs?.icon).toBe('📅');
    expect(subpage?.attrs?.color).toBe('purple');

    editor.destroy();
  });

  it('renders SubpageBlockView with pastel color, navigates on click and shows hover preview card', async () => {
    vi.useFakeTimers();
    const onNavigate = vi.fn();

    const wrapper = mount(SubpageBlockView, {
      props: {
        node: {
          attrs: {
            pageId: 'page-ponto',
            title: 'Ponto Web',
            icon: '❄️',
            color: 'blue',
            href: '#/page/page-ponto',
            summary: '',
          },
        },
        extension: {
          options: {
            getPages: () => [
              {
                id: 'page-ponto',
                title: 'Ponto Web',
                icon: '❄️',
                summary: 'Configurações do sistema de ponto eletrônico.',
                category: 'Secullum',
              },
            ],
            onNavigate,
          },
        },
        selected: false,
      } as never,
      global: {
        stubs: {
          NodeViewWrapper: {
            template: '<div v-bind="$attrs"><slot /></div>',
          },
        },
      },
    });

    const linkBtn = wrapper.find('[data-testid="subpage-block-link"]');
    expect(linkBtn.exists()).toBe(true);
    expect(linkBtn.text()).toContain('Ponto Web');
    expect(['#e7f5ff', 'rgb(231, 245, 255)']).toContain(
      (linkBtn.element as HTMLElement).style.backgroundColor,
    );

    await linkBtn.trigger('click');
    expect(onNavigate).toHaveBeenCalledWith('page-ponto');

    await wrapper.find('[data-testid="subpage-block-view"]').trigger('mouseenter');
    vi.advanceTimersByTime(300);
    await nextTick();

    const preview = wrapper.find('[data-testid="subpage-preview-card"]');
    expect(preview.exists()).toBe(true);
    expect(preview.text()).toContain('Configurações do sistema de ponto eletrônico.');

    await wrapper.find('[data-testid="subpage-block-view"]').trigger('mouseleave');
    await nextTick();
    expect(wrapper.find('[data-testid="subpage-preview-card"]').exists()).toBe(false);

    wrapper.unmount();
  });
});
