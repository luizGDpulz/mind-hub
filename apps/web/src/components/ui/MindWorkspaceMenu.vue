<template>
  <div
    v-if="modelValue"
    class="mind-workspace-menu-backdrop"
    @click.self="$emit('update:modelValue', false)"
  >
    <div
      class="mind-workspace-menu-card"
      data-testid="workspace-menu-popover"
      :style="popoverStyle"
    >
      <!-- Top Workspace Profile Header -->
      <div class="workspace-profile-header">
        <div class="workspace-profile-avatar">M</div>
        <div class="workspace-profile-info">
          <div class="workspace-profile-title" :title="workspaceName">
            {{ workspaceName }}
          </div>
          <div class="workspace-profile-subtitle">
            Mind Hub v{{ currentVersion }} · Local-First
          </div>
        </div>
      </div>

      <!-- Action Items (Configurações, Versões, etc.) -->
      <div class="workspace-actions-group">
        <button
          type="button"
          class="workspace-action-item"
          data-testid="workspace-settings-btn"
          @click="handleAction('settings')"
        >
          <Settings :size="15" class="action-icon" />
          <span>Configurações</span>
        </button>

        <button
          type="button"
          class="workspace-action-item"
          data-testid="workspace-versions-btn"
          @click="handleAction('versions')"
        >
          <History :size="15" class="action-icon" />
          <span>Histórico de versões</span>
          <span class="workspace-item-badge">v{{ currentVersion }}</span>
        </button>

        <button
          type="button"
          class="workspace-action-item"
          data-testid="workspace-repo-btn"
          @click="handleAction('repo')"
        >
          <ExternalLink :size="15" class="action-icon" />
          <span>Repositório GitHub</span>
        </button>

        <button
          type="button"
          class="workspace-action-item is-disabled"
          disabled
          title="Funcionalidade em desenvolvimento"
        >
          <UserPlus :size="15" class="action-icon" />
          <span>Convidar membros</span>
          <span class="workspace-item-badge is-muted">Em breve</span>
        </button>
      </div>

      <div class="workspace-menu-divider" />

      <!-- User Account & Workspaces Switcher -->
      <div class="workspace-account-section">
        <div class="workspace-account-email">
          <span>{{ userEmail }}</span>
        </div>

        <div class="workspace-list">
          <div
            class="workspace-list-item is-active"
            data-testid="workspace-item-mind"
          >
            <div class="workspace-list-avatar">M</div>
            <span class="workspace-list-label">{{ workspaceName }}</span>
            <Check :size="14" class="workspace-check-icon" />
          </div>

          <div
            class="workspace-list-item is-disabled"
            title="Espaço de trabalho secundário"
          >
            <span class="workspace-emoji-avatar">🌶️</span>
            <span class="workspace-list-label">Trabalho</span>
            <span class="workspace-role-pill">Convidado</span>
          </div>

          <div
            class="workspace-list-item is-disabled"
            title="Espaço compartilhado"
          >
            <div class="workspace-list-avatar is-secondary">F</div>
            <span class="workspace-list-label">Notion de Filipe Baldi</span>
            <span class="workspace-role-pill">Convidado</span>
          </div>

          <button
            type="button"
            class="workspace-add-btn"
            @click="handleAction('new-workspace')"
          >
            <Plus :size="14" />
            <span>Novo espaço de trabalho</span>
          </button>
        </div>
      </div>

      <div class="workspace-menu-divider" />

      <!-- Logout / Sair -->
      <div class="workspace-footer-group">
        <button
          type="button"
          class="workspace-action-item workspace-logout-item"
          data-testid="workspace-logout-btn"
          @click="handleAction('logout')"
        >
          <LogOut :size="14" class="action-icon" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  Settings,
  History,
  ExternalLink,
  UserPlus,
  Check,
  Plus,
  LogOut,
} from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    workspaceName?: string;
    userEmail?: string;
    currentVersion?: string;
    repoUrl?: string;
    top?: number;
    bottom?: number;
    left?: number;
  }>(),
  {
    workspaceName: 'Mind de Luiz Gustavo Dias Pulz',
    userEmail: 'luizg.pulz@gmail.com',
    currentVersion: '0.2.0',
    repoUrl: 'https://github.com/luizGDpulz/mind-hub',
    bottom: 56,
    left: 10,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'open-settings'): void;
  (e: 'open-versions'): void;
  (e: 'logout'): void;
}>();

const popoverStyle = computed(() => {
  if (props.top !== undefined) {
    return {
      top: `${props.top}px`,
      left: `${props.left}px`,
    };
  }
  return {
    bottom: `${props.bottom}px`,
    left: `${props.left}px`,
  };
});

function handleAction(action: 'settings' | 'versions' | 'repo' | 'new-workspace' | 'logout'): void {
  emit('update:modelValue', false);
  if (action === 'settings') {
    emit('open-settings');
  } else if (action === 'versions') {
    emit('open-versions');
  } else if (action === 'repo') {
    window.open(props.repoUrl, '_blank', 'noopener,noreferrer');
  } else if (action === 'logout') {
    emit('logout');
  }
}
</script>

<style scoped>
.mind-workspace-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: transparent;
}

.mind-workspace-menu-card {
  position: absolute;
  width: 290px;
  background: var(--mind-bg-canvas, #ffffff);
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 8px;
  box-shadow: var(--mind-shadow-popover, 0 8px 24px rgba(0, 0, 0, 0.12));
  padding: 6px;
  display: flex;
  flex-direction: column;
  animation: mindMenuFadeIn 0.12s cubic-bezier(0.16, 1, 0.3, 1);
  font-family: inherit;
}

@keyframes mindMenuFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.workspace-profile-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--mind-bg-surface-subtle, #f8f9fa);
  margin-bottom: 4px;
}

.workspace-profile-avatar {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  background: var(--mind-text-primary, #212529);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.workspace-profile-info {
  flex: 1;
  min-width: 0;
}

.workspace-profile-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--mind-text-primary, #212529);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.workspace-profile-subtitle {
  font-size: 11px;
  color: var(--mind-text-muted, #868e96);
  margin-top: 1px;
}

.workspace-actions-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.workspace-action-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 6px 10px;
  background: transparent;
  border: none;
  border-radius: 5px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--mind-text-primary, #212529);
  cursor: pointer;
  text-align: left;
  transition: background-color 0.12s ease;
}

.workspace-action-item:hover:not(:disabled) {
  background: var(--mind-bg-hover, #f1f3f5);
}

.workspace-action-item.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.action-icon {
  color: var(--mind-text-muted, #868e96);
  flex-shrink: 0;
}

.workspace-item-badge {
  margin-left: auto;
  font-size: 10.5px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 999px;
  background: #e7f5ff;
  color: #1971c2;
}

.workspace-item-badge.is-muted {
  background: var(--mind-bg-surface-subtle, #f8f9fa);
  color: var(--mind-text-muted, #868e96);
}

.workspace-menu-divider {
  height: 1px;
  background: var(--mind-border-subtle, #e9ecef);
  margin: 5px 4px;
}

.workspace-account-section {
  display: flex;
  flex-direction: column;
}

.workspace-account-email {
  padding: 6px 10px 4px 10px;
  font-size: 11px;
  color: var(--mind-text-muted, #868e96);
  font-weight: 500;
}

.workspace-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.workspace-list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 5px;
  font-size: 12.5px;
  color: var(--mind-text-primary, #212529);
  transition: background-color 0.12s ease;
}

.workspace-list-item.is-active {
  background: var(--mind-bg-hover, #f1f3f5);
  font-weight: 600;
}

.workspace-list-item.is-disabled {
  opacity: 0.65;
}

.workspace-list-avatar {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: var(--mind-text-primary, #212529);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.workspace-list-avatar.is-secondary {
  background: #495057;
}

.workspace-emoji-avatar {
  font-size: 14px;
  line-height: 1;
  width: 20px;
  text-align: center;
}

.workspace-list-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.workspace-check-icon {
  color: var(--mind-text-primary, #212529);
  flex-shrink: 0;
}

.workspace-role-pill {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #fff9db;
  color: #e67700;
  font-weight: 500;
}

.workspace-add-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 6px 10px;
  background: transparent;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  color: var(--mind-accent-primary, #1971c2);
  cursor: pointer;
  text-align: left;
  transition: background-color 0.12s ease;
}

.workspace-add-btn:hover {
  background: var(--mind-bg-hover, #f1f3f5);
}

.workspace-footer-group {
  display: flex;
  flex-direction: column;
}

.workspace-logout-item {
  color: #c92a2a;
}

.workspace-logout-item:hover {
  background: #fff5f5 !important;
}

.workspace-logout-item .action-icon {
  color: #c92a2a;
}
</style>
