<template>
  <section class="database-block-shell" data-testid="database-view-block">
    <div class="db-toolbar">
      <div class="db-views-left" role="tablist" aria-label="Database Views">
        <button
          type="button"
          role="tab"
          :aria-selected="activeView === 'table'"
          class="db-view-tab"
          :class="{ 'is-active': activeView === 'table' }"
          data-testid="db-tab-table"
          @click="activeView = 'table'"
        >
          <span aria-hidden="true">⊞</span>
          <span>Table</span>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeView === 'board'"
          class="db-view-tab"
          :class="{ 'is-active': activeView === 'board' }"
          data-testid="db-tab-board"
          @click="activeView = 'board'"
        >
          <span aria-hidden="true">◫</span>
          <span>Board</span>
        </button>
        <button
          type="button"
          class="db-icon-action"
          aria-label="Add new row"
          title="Nova linha na Database"
          data-testid="db-add-row-btn"
          @click="emitAddRow('Backlog')"
        >
          +
        </button>
      </div>

      <div class="db-actions-right">
        <input
          v-if="showFilterInput"
          v-model="filterQuery"
          type="search"
          placeholder="Filter tasks, team or status..."
          class="db-filter-input"
          data-testid="db-filter-input"
        />
        <button
          type="button"
          class="db-icon-action"
          aria-label="Filter database rows"
          title="Filtrar"
          data-testid="db-toggle-filter-btn"
          @click="showFilterInput = !showFilterInput"
        >
          ⚲
        </button>
        <button
          type="button"
          class="db-icon-action"
          aria-label="Sort by budget"
          title="Alternar ordenação por Budget"
          @click="toggleSort('budget')"
        >
          ⇅
        </button>
      </div>
    </div>

    <div role="status" class="sr-only" data-testid="db-sort-status">
      {{ sortAnnouncement }}
    </div>

    <DatabaseTableView
      v-if="activeView === 'table'"
      :rows="displayedRows"
      :sort-column="sortColumn"
      :sort-direction="sortDirection"
      @toggle-sort="toggleSort"
      @cycle-status="emit('cycle-status', $event)"
    />

    <DatabaseKanbanBoard
      v-else
      :rows="filteredRows"
      @cycle-status="emit('cycle-status', $event)"
      @add-row="emitAddRow"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { DatabaseStatus, DatabaseTaskRow } from '@mind-hub/shared';
import type { DatabaseSortColumn } from './database/database-helpers';
import DatabaseKanbanBoard from './database/DatabaseKanbanBoard.vue';
import DatabaseTableView from './database/DatabaseTableView.vue';

const props = defineProps<{
  rows: ReadonlyArray<DatabaseTaskRow>;
  initialView?: 'table' | 'board';
}>();

const emit = defineEmits<{
  (e: 'cycle-status', rowId: string): void;
  (e: 'add-row', status: DatabaseStatus): void;
}>();

const activeView = ref<'table' | 'board'>(props.initialView ?? 'table');
const showFilterInput = ref(false);
const filterQuery = ref('');
const sortColumn = ref<DatabaseSortColumn | null>(null);
const sortDirection = ref<'ascending' | 'descending'>('ascending');
const sortAnnouncement = ref('');

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const filteredRows = computed<DatabaseTaskRow[]>(() => {
  const q = filterQuery.value.trim().toLowerCase();
  if (!q) return [...props.rows];
  return props.rows.filter(
    (r) =>
      r.task.toLowerCase().includes(q) ||
      r.team.label.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      r.assignees.some((a) => a.toLowerCase().includes(q)),
  );
});

const displayedRows = computed<DatabaseTaskRow[]>(() => {
  const list = [...filteredRows.value];
  const col = sortColumn.value;
  if (!col) return list;

  const factor = sortDirection.value === 'ascending' ? 1 : -1;
  return list.sort((a, b) => {
    if (col === 'budget' || col === 'effort') {
      return factor * (a[col] - b[col]);
    }
    return factor * collator.compare(a[col], b[col]);
  });
});

function toggleSort(col: DatabaseSortColumn): void {
  if (sortColumn.value === col) {
    sortDirection.value =
      sortDirection.value === 'ascending' ? 'descending' : 'ascending';
  } else {
    sortColumn.value = col;
    sortDirection.value = 'ascending';
  }
  sortAnnouncement.value = `Sorted by ${col}, ${sortDirection.value}, ${displayedRows.value.length} rows`;
}

function emitAddRow(status: DatabaseStatus): void {
  emit('add-row', status);
}
</script>

<style scoped>
.database-block-shell {
  margin: 18px 0 28px;
  background: var(--mind-bg-canvas);
}

.db-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  gap: 8px;
}

.db-views-left {
  display: flex;
  align-items: center;
  gap: 4px;
}

.db-view-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--mind-text-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.db-view-tab:hover {
  background: var(--mind-bg-hover);
  color: var(--mind-text-primary);
}

.db-view-tab.is-active {
  background: var(--mind-bg-active);
  border-color: var(--mind-border-control);
  color: var(--mind-text-primary);
  font-weight: 600;
}

.db-actions-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

:deep(.db-icon-action) {
  min-inline-size: 26px;
  min-block-size: 26px;
  border: none;
  background: transparent;
  color: var(--mind-text-muted);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

:deep(.db-icon-action:hover) {
  background: var(--mind-bg-hover);
  color: var(--mind-text-primary);
}

:deep(.db-assignee-chip) {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px 2px 3px;
  border-radius: 999px;
  background: var(--mind-bg-surface-subtle);
  color: var(--mind-text-primary);
  font-size: 12px;
  font-weight: 500;
}

:deep(.db-assignee-avatar) {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #e7f5ff;
  color: #1971c2;
  font-size: 9.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.db-filter-input {
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--mind-border-control);
  border-radius: 6px;
  font-size: 12.5px;
  background: var(--mind-bg-canvas);
  color: var(--mind-text-primary);
  outline: none;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  clip-path: inset(50%);
  overflow: hidden;
  white-space: nowrap;
}
</style>
