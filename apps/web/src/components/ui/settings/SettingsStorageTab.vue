<template>
  <section class="mind-settings-section" data-testid="settings-panel-storage">
    <h4 class="mind-settings-title">Armazenamento &amp; Manutenção</h4>

    <div class="storage-metrics-grid">
      <div class="storage-metric-card">
        <span class="metric-num">{{ activePagesCount }}</span>
        <span class="metric-label">Páginas Ativas</span>
      </div>
      <div class="storage-metric-card">
        <span class="metric-num">{{ deletedPagesCount }}</span>
        <span class="metric-label">Itens na Lixeira</span>
      </div>
      <div class="storage-metric-card">
        <span class="metric-num">{{ databaseTasksCount }}</span>
        <span class="metric-label">Tarefas em Banco</span>
      </div>
    </div>

    <div class="settings-danger-box">
      <div class="mind-setting-meta">
        <label class="mind-setting-label is-danger">Esvaziar Lixeira</label>
        <span class="mind-setting-desc">
          Exclui permanentemente todos os {{ deletedPagesCount }} itens da lixeira.
        </span>
      </div>
      <button
        type="button"
        class="danger-red-btn"
        :disabled="deletedPagesCount === 0"
        data-testid="empty-trash-from-settings-btn"
        @click="emit('request-empty-trash')"
      >
        Esvaziar Lixeira
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  activePagesCount: number;
  deletedPagesCount: number;
  databaseTasksCount: number;
}>();

const emit = defineEmits<{
  (e: 'request-empty-trash'): void;
}>();
</script>

<style scoped>
@import './settings-shared.css';

.storage-metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.storage-metric-card {
  padding: 14px;
  background: var(--mind-bg-surface-subtle, #f1f3f5);
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.metric-num {
  font-size: 24px;
  font-weight: 700;
  color: var(--mind-text-primary, #212529);
}

.metric-label {
  font-size: 12px;
  color: var(--mind-text-muted, #868e96);
}

.settings-danger-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #fff5f5;
  border: 1px solid #ffc9c9;
  border-radius: 8px;
  gap: 16px;
  margin-top: 10px;
}

.danger-red-btn {
  background: #c92a2a;
  color: #ffffff;
  border: none;
  padding: 7px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.danger-red-btn:hover:not(:disabled) {
  background: #b02525;
}

.danger-red-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
