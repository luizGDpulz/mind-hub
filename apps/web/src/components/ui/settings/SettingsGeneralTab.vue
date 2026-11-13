<template>
  <section class="mind-settings-section" data-testid="settings-panel-general">
    <h4 class="mind-settings-title">Perfil &amp; Workspace</h4>

    <div class="mind-setting-row">
      <div class="mind-setting-meta">
        <label class="mind-setting-label">Nome do Espaço</label>
        <span class="mind-setting-desc">Título exibido na barra superior e nos metadados.</span>
      </div>
      <input
        :value="workspaceName"
        type="text"
        class="mind-setting-input"
        data-testid="setting-workspace-name-input"
        @input="emit('update:workspaceName', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="mind-setting-row">
      <div class="mind-setting-meta">
        <label class="mind-setting-label">Usuário Responsável</label>
        <span class="mind-setting-desc">Luiz Pulz (Workspace Admin)</span>
      </div>
      <div class="setting-user-pill">
        <div class="user-avatar-mini">LP</div>
        <span class="user-email-text">luizg.pulz@gmail.com</span>
      </div>
    </div>

    <div class="mind-setting-row">
      <div class="mind-setting-meta">
        <label class="mind-setting-label">Idioma da Interface</label>
        <span class="mind-setting-desc">Idioma nativo das mensagens e atalhos.</span>
      </div>
      <select
        :value="language"
        class="mind-setting-select"
        data-testid="setting-language-select"
        @change="emit('update:language', ($event.target as HTMLSelectElement).value)"
      >
        <option value="pt-BR">Português (Brasil)</option>
        <option value="en-US">English (US)</option>
      </select>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  workspaceName: string;
  language: string;
}>();

const emit = defineEmits<{
  (e: 'update:workspaceName', value: string): void;
  (e: 'update:language', value: string): void;
}>();
</script>

<style scoped>
@import './settings-shared.css';

.setting-user-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  background: var(--mind-bg-surface-subtle, #f1f3f5);
  border-radius: 6px;
}

.user-avatar-mini {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--mind-border-control, #dee2e6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
}

.user-email-text {
  font-size: 12.5px;
  color: var(--mind-text-secondary, #37352f);
}
</style>
