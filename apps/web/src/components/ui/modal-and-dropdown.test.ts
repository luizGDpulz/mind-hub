import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import MindModal from './MindModal.vue';
import MindConfirmDialog from './MindConfirmDialog.vue';
import MindDropdown from './MindDropdown.vue';
import type { DropdownMenuItem } from './types.js';

describe('MindModal — Primitivo Atômico de Modal', () => {
  it('renderiza título, subtítulo e fecha ao clicar no botão de fechar', async () => {
    const wrapper = mount(MindModal, {
      props: {
        modelValue: true,
        title: 'Configurações de Teste',
        subtitle: 'Subtítulo explicativo',
      },
      slots: {
        default: '<div class="test-body">Conteúdo do modal</div>',
      },
      global: {
        stubs: {
          Teleport: true,
          Transition: false,
        },
      },
    });

    expect(wrapper.find('[data-testid="mind-modal-card"]').exists()).toBe(true);
    expect(wrapper.find('.mind-modal-title').text()).toBe('Configurações de Teste');
    expect(wrapper.find('.mind-modal-subtitle').text()).toBe('Subtítulo explicativo');
    expect(wrapper.find('.test-body').text()).toBe('Conteúdo do modal');

    const closeBtn = wrapper.find('[data-testid="modal-close-btn"]');
    await closeBtn.trigger('click');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('não renderiza o modal se modelValue for falso', () => {
    const wrapper = mount(MindModal, {
      props: {
        modelValue: false,
        title: 'Invisível',
      },
      global: {
        stubs: {
          Teleport: true,
          Transition: false,
        },
      },
    });

    expect(wrapper.find('[data-testid="mind-modal-card"]').exists()).toBe(false);
  });

  it('fecha ao clicar no backdrop se closeOnBackdrop for true', async () => {
    const wrapper = mount(MindModal, {
      props: {
        modelValue: true,
        title: 'Backdrop Test',
        closeOnBackdrop: true,
      },
      global: {
        stubs: {
          Teleport: true,
          Transition: false,
        },
      },
    });

    const backdrop = wrapper.find('[data-testid="mind-modal-backdrop"]');
    await backdrop.trigger('click');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
    expect(wrapper.emitted('close')).toBeTruthy();
  });
});

describe('MindConfirmDialog — Diálogo de Confirmação Seguro', () => {
  it('renderiza mensagem de alerta e dispara eventos confirm e cancel', async () => {
    const wrapper = mount(MindConfirmDialog, {
      props: {
        modelValue: true,
        title: 'Esvaziar lixeira?',
        message: 'Esta ação não poderá ser desfeita.',
        confirmLabel: 'Esvaziar agora',
        cancelLabel: 'Manter arquivos',
        danger: true,
      },
      global: {
        stubs: {
          Teleport: true,
          Transition: false,
        },
      },
    });

    expect(wrapper.text()).toContain('Esvaziar lixeira?');
    expect(wrapper.text()).toContain('Esta ação não poderá ser desfeita.');

    const cancelBtn = wrapper.find('[data-testid="cancel-dialog-btn"]');
    await cancelBtn.trigger('click');
    expect(wrapper.emitted('cancel')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);

    const confirmBtn = wrapper.find('[data-testid="confirm-dialog-btn"]');
    await confirmBtn.trigger('click');
    expect(wrapper.emitted('confirm')).toBeTruthy();
  });
});

describe('MindDropdown — Menu Dropdown Flutuante Reutilizável', () => {
  const sampleItems: DropdownMenuItem[] = [
    { id: 'rename', label: 'Renomear', shortcut: 'F2' },
    { id: 'duplicate', label: 'Duplicar', shortcut: 'Ctrl+D' },
    { id: 'disabled-item', label: 'Desativado', disabled: true },
    { id: 'delete', label: 'Excluir', shortcut: 'Del', danger: true, section: 'danger' },
  ];

  it('renderiza itens e emite select ao clicar em um item ativo', async () => {
    const wrapper = mount(MindDropdown, {
      props: {
        modelValue: true,
        items: sampleItems,
        x: 100,
        y: 200,
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    expect(wrapper.find('[data-testid="mind-dropdown"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="dropdown-item-rename"]').text()).toContain('Renomear');
    expect(wrapper.find('[data-testid="dropdown-item-rename"]').text()).toContain('F2');

    await wrapper.find('[data-testid="dropdown-item-rename"]').trigger('click');

    expect(wrapper.emitted('select')?.[0]?.[0]).toMatchObject({ id: 'rename', label: 'Renomear' });
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
  });

  it('não dispara select em item desativado (disabled)', async () => {
    const wrapper = mount(MindDropdown, {
      props: {
        modelValue: true,
        items: sampleItems,
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    await wrapper.find('[data-testid="dropdown-item-disabled-item"]').trigger('click');
    expect(wrapper.emitted('select')).toBeFalsy();
  });
});
