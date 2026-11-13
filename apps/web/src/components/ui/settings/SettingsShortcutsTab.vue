<template>
  <section class="mind-settings-section" data-testid="settings-panel-shortcuts">
    <div class="shortcuts-header-row">
      <h4 class="mind-settings-title" style="border-bottom: none; padding-bottom: 0">
        Atalhos de Teclado
      </h4>
      <input
        v-model="shortcutSearch"
        type="text"
        placeholder="Filtrar atalhos..."
        class="shortcuts-filter-input"
        data-testid="shortcuts-filter-input"
      />
    </div>

    <div class="shortcuts-table-container">
      <table class="shortcuts-table">
        <thead>
          <tr>
            <th>Ação</th>
            <th>Categoria</th>
            <th>Atalho</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sc in filteredShortcuts" :key="sc.action">
            <td>{{ sc.action }}</td>
            <td><span class="shortcut-category-badge">{{ sc.category }}</span></td>
            <td><kbd class="shortcut-kbd">{{ sc.keys }}</kbd></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const shortcutSearch = ref('');

const allShortcuts = [
  { action: 'Alternar Barra Lateral', category: 'Navegação', keys: 'Ctrl + \\' },
  { action: 'Busca Rápida Split', category: 'Navegação', keys: 'Ctrl + K' },
  { action: 'Nova Página na Raiz', category: 'Criação', keys: 'Alt + N' },
  { action: 'Comandos de Bloco', category: 'Editor', keys: '/' },
  { action: 'Mencionar Página / Usuário', category: 'Editor', keys: '@' },
  { action: 'Renomear Item na Árvore', category: 'Arquivo', keys: 'F2' },
  { action: 'Duplicar Página', category: 'Arquivo', keys: 'Ctrl + D' },
  { action: 'Mover Página', category: 'Arquivo', keys: 'Ctrl + M' },
  { action: 'Excluir / Lixeira', category: 'Arquivo', keys: 'Del' },
  { action: 'Fechar Modais e Menus', category: 'Global', keys: 'Esc' },
];

const filteredShortcuts = computed(() => {
  const q = shortcutSearch.value.trim().toLowerCase();
  if (!q) return allShortcuts;
  return allShortcuts.filter(
    (s) =>
      s.action.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.keys.toLowerCase().includes(q),
  );
});
</script>

<style scoped>
@import './settings-shared.css';

.shortcuts-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--mind-border-subtle, #e9ecef);
  padding-bottom: 8px;
}

.shortcuts-filter-input {
  padding: 5px 10px;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 6px;
  background: var(--mind-bg-surface-subtle, #f1f3f5);
  font-size: 12.5px;
  outline: none;
  width: 180px;
}

.shortcuts-table-container {
  overflow-x: auto;
}

.shortcuts-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.shortcuts-table th {
  text-align: left;
  padding: 8px 10px;
  background: var(--mind-bg-surface-subtle, #f1f3f5);
  color: var(--mind-text-muted, #868e96);
  font-weight: 600;
  font-size: 12px;
  border-bottom: 1px solid var(--mind-border-subtle, #e9ecef);
}

.shortcuts-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--mind-border-subtle, #e9ecef);
  color: var(--mind-text-secondary, #37352f);
}

.shortcut-category-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--mind-bg-surface-subtle, #f1f3f5);
  color: var(--mind-text-muted, #868e96);
}

.shortcut-kbd {
  font-family: monospace;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #ffffff;
  border: 1px solid var(--mind-border-control, #dee2e6);
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
}
</style>
