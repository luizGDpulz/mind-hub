<template>
  <MindPopover
    :model-value="modelValue"
    :top="top"
    :bottom="top !== undefined ? undefined : bottom"
    :left="left"
    width="260px"
    placement-direction="up"
    data-testid="help-versions-popover"
    @update:model-value="$emit('update:modelValue', $event)"
  >
      <!-- Top Documentation & Support Actions -->
      <div class="help-actions-list">
        <button
          type="button"
          class="help-action-item"
          data-testid="help-action-docs"
          @click="handleAction('docs')"
        >
          <BookOpen :size="16" class="help-action-icon" />
          <span class="help-action-label">Documentação</span>
        </button>

        <button
          type="button"
          class="help-action-item"
          data-testid="help-action-support"
          @click="handleAction('support')"
        >
          <MessageSquare :size="16" class="help-action-icon" />
          <span class="help-action-label">Obter suporte</span>
        </button>

        <button
          type="button"
          class="help-action-item"
          data-testid="help-action-more"
          @click="handleAction('more')"
        >
          <MoreHorizontal :size="16" class="help-action-icon" />
          <span class="help-action-label">Mais</span>
          <ChevronRight :size="14" class="help-action-chevron" />
        </button>
      </div>

      <div class="help-menu-divider" />

      <!-- What's New / Novidades Section with Vertical Timeline -->
      <div class="whats-new-section">
        <div class="whats-new-header-label">Novidades</div>

        <div class="whats-new-timeline">
          <!-- Timeline Vertical Spine -->
          <div class="timeline-spine" />

          <!-- Recent Releases on Timeline -->
          <div
            v-for="rel in recentReleases"
            :key="rel.version"
            class="timeline-release-row"
            :data-testid="`timeline-release-${rel.version}`"
            @click="handleAction('view-all')"
          >
            <div class="timeline-dot" />
            <div class="timeline-content">
              <span class="timeline-title">Mind Hub {{ rel.version }}</span>
              <span class="timeline-desc">{{ rel.summary }}</span>
            </div>
          </div>

          <!-- Bottom: View all releases -->
          <div
            class="timeline-release-row is-all-releases"
            data-testid="help-action-all-releases"
            @click="handleAction('view-all')"
          >
            <div class="timeline-gift-icon">
              <Gift :size="13" />
            </div>
            <span class="timeline-all-label">Ver todos os lançamentos</span>
          </div>
        </div>
      </div>
  </MindPopover>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MindPopover from './MindPopover.vue';
import {
  BookOpen,
  MessageSquare,
  MoreHorizontal,
  ChevronRight,
  Gift,
} from 'lucide-vue-next';
import type { MindVersionEntry } from '@mind-hub/shared';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    currentVersion?: string;
    versionHistory?: MindVersionEntry[];
    repoUrl?: string;
    bottom?: number;
    left?: number;
    top?: number;
  }>(),
  {
    currentVersion: '0.4.0',
    versionHistory: () => [],
    repoUrl: 'https://github.com/luizGDpulz/mind-hub',
    bottom: 56,
    left: 200,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'open-all-releases'): void;
}>();

const recentReleases = computed(() => props.versionHistory.slice(0, 3));

function handleAction(action: 'docs' | 'support' | 'more' | 'view-all'): void {
  emit('update:modelValue', false);
  if (action === 'docs') {
    window.open(props.repoUrl, '_blank', 'noopener,noreferrer');
  } else if (action === 'support') {
    window.open(`${props.repoUrl}/issues`, '_blank', 'noopener,noreferrer');
  } else if (action === 'more') {
    window.open(`${props.repoUrl}/blob/main/CHANGELOG.md`, '_blank', 'noopener,noreferrer');
  } else if (action === 'view-all') {
    emit('open-all-releases');
  }
}
</script>

<style scoped>
.help-actions-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.help-action-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 6px 10px;
  background: transparent;
  border: none;
  border-radius: 5px;
  font-size: 13px;
  font-weight: 500;
  color: var(--mind-text-primary, #212529);
  cursor: pointer;
  text-align: left;
  transition: background-color 0.12s ease;
}

.help-action-item:hover {
  background: var(--mind-bg-hover, #f1f3f5);
}

.help-action-icon {
  color: var(--mind-text-secondary, #495057);
  flex-shrink: 0;
}

.help-action-label {
  flex: 1;
}

.help-action-chevron {
  color: var(--mind-text-muted, #868e96);
  flex-shrink: 0;
}

.help-menu-divider {
  height: 1px;
  background: var(--mind-border-subtle, #e9ecef);
  margin: 6px 4px;
}

.whats-new-section {
  display: flex;
  flex-direction: column;
  padding: 4px 6px;
}

.whats-new-header-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--mind-text-muted, #868e96);
  padding: 4px 6px 6px 6px;
  text-transform: capitalize;
}

.whats-new-timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 18px;
}

.timeline-spine {
  position: absolute;
  top: 6px;
  bottom: 18px;
  left: 6px;
  width: 1px;
  background: var(--mind-border-subtle, #ced4da);
}

.timeline-release-row {
  position: relative;
  display: flex;
  align-items: flex-start;
  padding: 4px 6px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.timeline-release-row:hover {
  background: var(--mind-bg-hover, #f1f3f5);
}

.timeline-dot {
  position: absolute;
  left: -15px;
  top: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--mind-text-muted, #868e96);
}

.timeline-release-row:hover .timeline-dot {
  background: var(--mind-accent-primary, #1971c2);
}

.timeline-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.timeline-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--mind-text-primary, #212529);
}

.timeline-desc {
  font-size: 11px;
  color: var(--mind-text-muted, #868e96);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.timeline-release-row.is-all-releases {
  padding-top: 6px;
  align-items: center;
  gap: 8px;
}

.timeline-gift-icon {
  position: absolute;
  left: -18px;
  top: 7px;
  color: var(--mind-text-secondary, #495057);
}

.timeline-all-label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--mind-text-primary, #212529);
}

.timeline-release-row.is-all-releases:hover .timeline-all-label {
  color: var(--mind-accent-primary, #1971c2);
}
</style>
