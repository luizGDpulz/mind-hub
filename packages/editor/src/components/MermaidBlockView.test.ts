import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MermaidBlockView from './MermaidBlockView.vue';

describe('MermaidBlockView.vue', () => {
  const sampleCode = `flowchart TD\n    A --> B`;

  it('renders preview mode by default with SVG wrapper', () => {
    const wrapper = mount(MermaidBlockView, {
      props: {
        code: sampleCode,
        title: 'Fluxo de Autenticação',
      },
    });

    expect(wrapper.find('[data-testid="mermaid-block-shell"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mermaid-preview-container"]').exists()).toBe(true);
    expect((wrapper.find('[data-testid="mermaid-title-input"]').element as HTMLInputElement).value).toBe('Fluxo de Autenticação');
  });

  it('toggles code editor mode when clicking action button', async () => {
    const wrapper = mount(MermaidBlockView, {
      props: {
        code: sampleCode,
      },
    });

    expect(wrapper.find('[data-testid="mermaid-code-textarea"]').exists()).toBe(false);

    await wrapper.find('[data-testid="toggle-code-btn"]').trigger('click');
    expect(wrapper.find('[data-testid="mermaid-code-textarea"]').exists()).toBe(true);
    expect((wrapper.find('[data-testid="mermaid-code-textarea"]').element as HTMLTextAreaElement).value).toBe(sampleCode);

    await wrapper.find('[data-testid="toggle-code-btn"]').trigger('click');
    expect(wrapper.find('[data-testid="mermaid-code-textarea"]').exists()).toBe(false);
  });

  it('emits update:code when textarea changes', async () => {
    const wrapper = mount(MermaidBlockView, {
      props: {
        code: sampleCode,
        initialEditing: true,
      },
    });

    const textarea = wrapper.find('[data-testid="mermaid-code-textarea"]');
    await textarea.setValue('sequenceDiagram\n    A->>B: Olá');

    expect(wrapper.emitted('update:code')).toBeTruthy();
    expect(wrapper.emitted('update:code')![0]![0]).toBe('sequenceDiagram\n    A->>B: Olá');
  });
});
