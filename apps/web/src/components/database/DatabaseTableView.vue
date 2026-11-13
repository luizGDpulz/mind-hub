<template>
  <div
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
              @click="emit('toggle-sort', 'task')"
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
              @click="emit('toggle-sort', 'dueDateIso')"
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
              @click="emit('toggle-sort', 'budget')"
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
              @click="emit('toggle-sort', 'effort')"
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
        <tr v-for="row in rows" :key="row.id" :data-testid="`db-row-${row.id}`">
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
                class="db-assignee-chip"
              >
                <span class="db-assignee-avatar">{{ getInitials(person) }}</span>
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
              @click="emit('cycle-status', row.id)"
            >
              {{ row.status }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { DatabaseTaskRow } from '@mind-hub/shared';
import {
  formatCurrency,
  getInitials,
  getStatusTone,
  type DatabaseSortColumn,
} from './database-helpers';

const props = defineProps<{
  rows: ReadonlyArray<DatabaseTaskRow>;
  sortColumn: DatabaseSortColumn | null;
  sortDirection: 'ascending' | 'descending';
}>();

const emit = defineEmits<{
  (e: 'toggle-sort', col: DatabaseSortColumn): void;
  (e: 'cycle-status', rowId: string): void;
}>();

function getAriaSort(col: DatabaseSortColumn): 'ascending' | 'descending' | undefined {
  if (props.sortColumn !== col) return undefined;
  return props.sortDirection;
}
</script>

<style scoped>
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

.status-pill-btn {
  border: none;
  cursor: pointer;
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
