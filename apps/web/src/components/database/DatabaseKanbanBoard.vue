<template>
  <div class="kanban-board-scroll" data-testid="db-kanban-board">
    <div
      v-for="col in kanbanColumns"
      :key="col.status"
      class="kanban-column"
      :data-testid="`kanban-col-${col.status}`"
    >
      <div class="kanban-col-header">
        <div class="kanban-col-title-wrap">
          <span class="status-dot" :style="{ backgroundColor: col.dotColor }" />
          <span class="kanban-col-title">{{ col.status }}</span>
          <span class="kanban-col-count">{{ col.items.length }}</span>
        </div>
        <div class="kanban-col-actions">
          <button
            type="button"
            class="db-icon-action"
            :aria-label="`Add task to ${col.status}`"
            @click="emit('add-row', col.status)"
          >
            +
          </button>
        </div>
      </div>

      <div class="kanban-cards-stack">
        <article
          v-for="card in col.items"
          :key="card.id"
          class="kanban-card"
          :data-testid="`kanban-card-${card.id}`"
        >
          <div class="kanban-card-title">{{ card.task }}</div>

          <div class="kanban-card-badges">
            <span class="mind-pill" :class="`mind-pill-${getPriorityTone(card.priority)}`">
              {{ card.priority }}
            </span>
          </div>

          <div class="kanban-card-assignees">
            <span
              v-for="person in card.assignees"
              :key="person"
              class="db-assignee-chip"
            >
              <span class="db-assignee-avatar">{{ getInitials(person) }}</span>
              <span>{{ person }}</span>
            </span>
          </div>

          <div class="kanban-card-footer">
            <span class="kanban-card-date">{{ card.dueDate }}</span>
            <button
              type="button"
              class="kanban-advance-btn"
              :aria-label="`Advance ${card.task} status`"
              @click="emit('cycle-status', card.id)"
            >
              →
            </button>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DatabaseStatus, DatabaseTaskRow } from '@mind-hub/shared';
import { getInitials, getPriorityTone, STATUS_COLUMNS } from './database-helpers';

const props = defineProps<{
  rows: ReadonlyArray<DatabaseTaskRow>;
}>();

const emit = defineEmits<{
  (e: 'cycle-status', rowId: string): void;
  (e: 'add-row', status: DatabaseStatus): void;
}>();

const kanbanColumns = computed(() =>
  STATUS_COLUMNS.map((col) => ({
    ...col,
    items: props.rows.filter((r) => r.status === col.status),
  })),
);
</script>

<style scoped>
.kanban-board-scroll {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.kanban-column {
  width: 248px;
  min-width: 248px;
  background: var(--mind-bg-sidebar);
  border-radius: 8px;
  padding: 10px;
}

.kanban-col-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 0 2px;
}

.kanban-col-title-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.kanban-col-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--mind-text-primary);
}

.kanban-col-count {
  font-size: 12px;
  color: var(--mind-text-muted);
  margin-left: 2px;
}

.kanban-cards-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kanban-card {
  background: var(--mind-bg-canvas);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 6px;
  padding: 11px 12px;
  box-shadow: var(--mind-shadow-card);
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.kanban-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--mind-text-primary);
  line-height: 1.35;
}

.kanban-card-badges,
.kanban-card-assignees {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.kanban-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2px;
}

.kanban-card-date {
  font-size: 11.5px;
  color: var(--mind-text-muted);
}

.kanban-advance-btn {
  border: none;
  background: transparent;
  color: var(--mind-text-muted);
  font-size: 12px;
  cursor: pointer;
  padding: 2px 5px;
  border-radius: 4px;
}

.kanban-advance-btn:hover {
  background: var(--mind-bg-hover);
  color: var(--mind-text-primary);
}
</style>
