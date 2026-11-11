<template>
  <section class="database-block-shell" data-testid="database-view-block">
    <!-- Top View Switcher & Action Bar (01-database-table-view & 02-database-kanban-board) -->
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
          @click="toggleSort('budget', 'number')"
        >
          ⇅
        </button>
      </div>
    </div>

    <!-- Accessible Status Announcement for Table Sorting -->
    <div role="status" class="sr-only" data-testid="db-sort-status">
      {{ sortAnnouncement }}
    </div>

    <!-- TABLE VIEW (01-database-table-view.png) -->
    <div
      v-if="activeView === 'table'"
      tabindex="0"
      role="region"
      aria-labelledby="database-table-caption"
      class="database-table-wrapper"
      data-testid="db-table-region"
    >
      <table class="database-table">
        <caption id="database-table-caption" class="sr-only">
          Project Tasks and Roadmap Database
        </caption>
        <thead>
          <tr>
            <th scope="col" class="col-num">#</th>
            <th scope="col" :aria-sort="getAriaSort('task')">
              <button
                type="button"
                class="th-sort-btn"
                data-testid="sort-task-btn"
                @click="toggleSort('task', 'text')"
              >
                <span class="th-icon" aria-hidden="true">T</span>
                <span>Task</span>
              </button>
            </th>
            <th scope="col">
              <span class="th-icon" aria-hidden="true">☉</span>
              <span>Team</span>
            </th>
            <th scope="col">
              <span class="th-icon" aria-hidden="true">🏷</span>
              <span>Tags</span>
            </th>
            <th scope="col">
              <span class="th-icon" aria-hidden="true">👤</span>
              <span>Assignee</span>
            </th>
            <th scope="col" data-type="number" :aria-sort="getAriaSort('dueDateIso')">
              <button
                type="button"
                class="th-sort-btn"
                data-testid="sort-date-btn"
                @click="toggleSort('dueDateIso', 'text')"
              >
                <span class="th-icon" aria-hidden="true">📅</span>
                <span>Due Date</span>
              </button>
            </th>
            <th scope="col" data-type="number" class="col-right" :aria-sort="getAriaSort('budget')">
              <button
                type="button"
                class="th-sort-btn th-sort-right"
                data-testid="sort-budget-btn"
                @click="toggleSort('budget', 'number')"
              >
                <span class="th-icon" aria-hidden="true">#</span>
                <span>Budget</span>
              </button>
            </th>
            <th scope="col" data-type="number" class="col-right" :aria-sort="getAriaSort('effort')">
              <button
                type="button"
                class="th-sort-btn th-sort-right"
                data-testid="sort-effort-btn"
                @click="toggleSort('effort', 'number')"
              >
                <span class="th-icon" aria-hidden="true">#</span>
                <span>Effort</span>
              </button>
            </th>
            <th scope="col">
              <span class="th-icon" aria-hidden="true">☉</span>
              <span>Status</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in displayedRows" :key="row.id" :data-testid="`db-row-${row.id}`">
            <td class="col-num text-muted">{{ row.rowNumber }}</td>
            <th scope="row" class="task-title-cell">{{ row.task }}</th>
            <td>
              <span class="mind-pill" :class="`mind-pill-${row.team.tone}`">
                {{ row.team.label }}
              </span>
            </td>
            <td>
              <div class="pill-group">
                <span
                  v-for="tag in row.tags"
                  :key="tag.label"
                  class="mind-pill"
                  :class="`mind-pill-${tag.tone}`"
                >
                  {{ tag.label }}
                </span>
              </div>
            </td>
            <td>
              <div class="pill-group">
                <span
                  v-for="person in row.assignees"
                  :key="person"
                  class="assignee-chip"
                >
                  <span class="assignee-avatar">{{ getInitials(person) }}</span>
                  <span>{{ person }}</span>
                </span>
              </div>
            </td>
            <td class="date-cell">{{ row.dueDate }}</td>
            <td class="col-right num-cell" :data-value="row.budget">
              {{ formatCurrency(row.budget) }}
            </td>
            <td class="col-right num-cell" :data-value="row.effort">
              {{ row.effort }}
            </td>
            <td>
              <button
                type="button"
                class="status-pill-btn mind-pill"
                :class="`mind-pill-${getStatusTone(row.status)}`"
                :title="'Clique para avançar status'"
                :data-testid="`cycle-status-${row.id}`"
                @click="$emit('cycle-status', row.id)"
              >
                {{ row.status }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- KANBAN BOARD VIEW (02-database-kanban-board.png) -->
    <div v-else class="kanban-board-scroll" data-testid="db-kanban-board">
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
              @click="emitAddRow(col.status)"
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
                class="assignee-chip"
              >
                <span class="assignee-avatar">{{ getInitials(person) }}</span>
                <span>{{ person }}</span>
              </span>
            </div>

            <div class="kanban-card-footer">
              <span class="kanban-card-date">{{ card.dueDate }}</span>
              <button
                type="button"
                class="kanban-advance-btn"
                :aria-label="`Advance ${card.task} status`"
                @click="$emit('cycle-status', card.id)"
              >
                →
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type {
  DatabasePriority,
  DatabaseStatus,
  DatabaseTaskRow,
  PastelBadgeTone,
} from '@mind-hub/shared';

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
const sortColumn = ref<'task' | 'dueDateIso' | 'budget' | 'effort' | null>(null);
const sortDirection = ref<'ascending' | 'descending'>('ascending');
const sortAnnouncement = ref('');

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const STATUS_COLUMNS: ReadonlyArray<{ status: DatabaseStatus; dotColor: string }> = [
  { status: 'Backlog', dotColor: '#495057' },
  { status: 'In Progress', dotColor: '#1971c2' },
  { status: 'In Review', dotColor: '#495057' },
  { status: 'Blocked', dotColor: '#c92a2a' },
  { status: 'Done', dotColor: '#2b8a3e' },
];

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

const kanbanColumns = computed(() =>
  STATUS_COLUMNS.map((col) => ({
    ...col,
    items: filteredRows.value.filter((r) => r.status === col.status),
  })),
);

function getAriaSort(
  col: 'task' | 'dueDateIso' | 'budget' | 'effort',
): 'ascending' | 'descending' | undefined {
  if (sortColumn.value !== col) return undefined;
  return sortDirection.value;
}

function toggleSort(
  col: 'task' | 'dueDateIso' | 'budget' | 'effort',
  _kind: 'text' | 'number',
): void {
  if (sortColumn.value === col) {
    sortDirection.value =
      sortDirection.value === 'ascending' ? 'descending' : 'ascending';
  } else {
    sortColumn.value = col;
    sortDirection.value = 'ascending';
  }
  sortAnnouncement.value = `Sorted by ${col}, ${sortDirection.value}, ${displayedRows.value.length} rows`;
}

function getStatusTone(status: DatabaseStatus): PastelBadgeTone {
  switch (status) {
    case 'In Progress':
      return 'blue';
    case 'Done':
      return 'green';
    case 'Blocked':
      return 'red';
    case 'Backlog':
    case 'In Review':
    default:
      return 'gray';
  }
}

function getPriorityTone(priority: DatabasePriority): PastelBadgeTone {
  switch (priority) {
    case 'Urgent':
      return 'red';
    case 'High':
      return 'orange';
    case 'Medium':
      return 'yellow';
    case 'Low':
    default:
      return 'gray';
  }
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function formatCurrency(val: number): string {
  return `$${val.toLocaleString('en-US')}`;
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

.db-icon-action {
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

.db-icon-action:hover {
  background: var(--mind-bg-hover);
  color: var(--mind-text-primary);
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

.database-table-wrapper {
  overflow-x: auto;
  max-inline-size: 100%;
  container-type: inline-size;
  border: 1px solid var(--mind-border-subtle);
  border-radius: 6px;
}

.database-table {
  width: 100%;
  min-inline-size: 720px;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
}

.database-table thead {
  position: sticky;
  inset-block-start: 0;
  z-index: 1;
  background: var(--mind-bg-sidebar);
}

.database-table th,
.database-table td {
  border-bottom: 1px solid var(--mind-border-subtle);
  border-right: 1px solid var(--mind-border-subtle);
  padding: 7px 10px;
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
}

.database-table th:last-child,
.database-table td:last-child {
  border-right: none;
}

.database-table thead th {
  font-size: 12px;
  font-weight: 500;
  color: var(--mind-text-muted);
  background: var(--mind-bg-sidebar);
}

.database-table thead th:has(> button) {
  padding: 0;
}

.th-sort-btn {
  width: 100%;
  min-block-size: 32px;
  padding: 7px 10px;
  border: none;
  background: transparent;
  color: var(--mind-text-muted);
  font-size: 12px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  text-align: left;
}

.th-sort-right {
  justify-content: flex-end;
}

.th-sort-btn:hover {
  background: var(--mind-bg-hover);
  color: var(--mind-text-primary);
}

.th-icon {
  font-size: 11px;
  opacity: 0.75;
  margin-right: 4px;
}

.task-title-cell {
  font-weight: 500;
  color: var(--mind-text-primary);
  background: var(--mind-bg-canvas);
}

.col-num {
  width: 38px;
  text-align: center !important;
  color: var(--mind-text-muted);
}

.col-right {
  text-align: right !important;
}

.num-cell {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  color: var(--mind-text-primary);
}

.date-cell {
  color: var(--mind-text-secondary);
}

.pill-group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
}

.assignee-chip {
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

.assignee-avatar {
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

.status-pill-btn {
  border: none;
  cursor: pointer;
}

/* Kanban Board Styles (02-database-kanban-board.png) */
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

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  clip-path: inset(50%);
  overflow: hidden;
  white-space: nowrap;
}
</style>
