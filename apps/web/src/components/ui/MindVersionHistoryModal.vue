<template>
  <MindModal
    :model-value="modelValue"
    max-width="660px"
    hide-header
    flush
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="mind-version-modal-card" data-testid="version-history-modal">
      <!-- Modal Header -->
      <div class="version-modal-header">
        <div class="version-modal-title-group">
          <History :size="18" class="version-header-icon" />
          <span class="version-modal-title">Evolução & Histórico de Versões</span>
          <span class="version-current-badge">v{{ currentVersion }}</span>
        </div>
        <button
          type="button"
          class="version-modal-close-btn"
          aria-label="Fechar modal"
          @click="$emit('update:modelValue', false)"
        >
          <X :size="16" />
        </button>
      </div>

      <!-- Version Timeline Content -->
      <div class="version-timeline-container">
        <div
          v-for="(ver, idx) in versionHistory"
          :key="ver.version"
          class="version-card"
          :class="{ 'is-latest': idx === 0 }"
          :data-testid="`version-card-${ver.version}`"
        >
          <div class="version-card-top">
            <div class="version-tag-row">
              <span class="version-badge">v{{ ver.version }}</span>
              <span v-if="idx === 0" class="version-latest-pill">Versão Atual</span>
              <span class="version-milestone-title">{{ ver.milestoneTitle }}</span>
            </div>
            <span class="version-date">{{ formatDate(ver.releaseDate) }}</span>
          </div>

          <p class="version-summary">{{ ver.summary }}</p>

          <div class="version-highlights-list">
            <div
              v-for="(item, hIdx) in ver.highlights"
              :key="hIdx"
              class="version-highlight-item"
            >
              <Check :size="13" class="highlight-check-icon" />
              <span>{{ item }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="version-modal-footer">
        <span class="version-footer-note">
          Versões atômicas versionadas sob especificação SemVer.
        </span>
        <button
          type="button"
          class="version-repo-btn"
          @click="openRepo"
        >
          <ExternalLink :size="13" />
          <span>Ver CHANGELOG no GitHub</span>
        </button>
      </div>
    </div>
  </MindModal>
</template>

<script setup lang="ts">
import MindModal from './MindModal.vue';
import { History, X, Check, ExternalLink } from 'lucide-vue-next';
import type { MindVersionEntry } from '@mind-hub/shared';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    currentVersion?: string;
    versionHistory?: MindVersionEntry[];
    repoUrl?: string;
  }>(),
  {
    currentVersion: '0.4.0',
    versionHistory: () => [],
    repoUrl: 'https://github.com/luizGDpulz/mind-hub',
  },
);

defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function openRepo(): void {
  window.open(`${props.repoUrl}/blob/main/CHANGELOG.md`, '_blank', 'noopener,noreferrer');
}
</script>

<style scoped>
.mind-version-modal-card {
  width: 100%;
  background: var(--mind-bg-canvas, #ffffff);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: inherit;
}

.version-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--mind-border-subtle, #e9ecef);
}

.version-modal-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-header-icon {
  color: var(--mind-text-muted, #868e96);
}

.version-modal-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--mind-text-primary, #212529);
}

.version-current-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e7f5ff;
  color: #1971c2;
}

.version-modal-close-btn {
  background: transparent;
  border: none;
  color: var(--mind-text-muted, #868e96);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s ease;
}

.version-modal-close-btn:hover {
  background: var(--mind-bg-hover, #f1f3f5);
  color: var(--mind-text-primary, #212529);
}

.version-timeline-container {
  max-height: 480px;
  overflow-y: auto;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.version-card {
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 8px;
  padding: 14px 16px;
  background: #fafbfc;
  transition: border-color 0.12s ease;
}

.version-card.is-latest {
  background: #ffffff;
  border-color: #ced4da;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.version-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 8px;
}

.version-tag-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.version-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 7px;
  background: var(--mind-text-primary, #212529);
  color: #ffffff;
  border-radius: 5px;
}

.version-latest-pill {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 7px;
  background: #d3f9d8;
  color: #2b8a3e;
  border-radius: 999px;
}

.version-milestone-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--mind-text-primary, #212529);
}

.version-date {
  font-size: 11.5px;
  color: var(--mind-text-muted, #868e96);
  flex-shrink: 0;
}

.version-summary {
  font-size: 12.5px;
  color: var(--mind-text-secondary, #495057);
  line-height: 1.5;
  margin: 0 0 10px 0;
}

.version-highlights-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.version-highlight-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: var(--mind-text-primary, #212529);
  line-height: 1.4;
}

.highlight-check-icon {
  color: #2b8a3e;
  margin-top: 2px;
  flex-shrink: 0;
}

.version-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  border-top: 1px solid var(--mind-border-subtle, #e9ecef);
  background: var(--mind-bg-surface-subtle, #f8f9fa);
}

.version-footer-note {
  font-size: 11px;
  color: var(--mind-text-muted, #868e96);
}

.version-repo-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--mind-accent-primary, #1971c2);
  background: #ffffff;
  border: 1px solid var(--mind-border-control, #ced4da);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.version-repo-btn:hover {
  background: var(--mind-bg-hover, #f1f3f5);
  border-color: #adb5bd;
}
</style>
