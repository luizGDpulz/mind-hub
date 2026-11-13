import type {
  DatabasePriority,
  DatabaseStatus,
  PastelBadgeTone,
} from '@mind-hub/shared';

export type DatabaseSortColumn = 'task' | 'dueDateIso' | 'budget' | 'effort';

export const STATUS_COLUMNS: ReadonlyArray<{ status: DatabaseStatus; dotColor: string }> = [
  { status: 'Backlog', dotColor: '#495057' },
  { status: 'In Progress', dotColor: '#1971c2' },
  { status: 'In Review', dotColor: '#495057' },
  { status: 'Blocked', dotColor: '#c92a2a' },
  { status: 'Done', dotColor: '#2b8a3e' },
];

export function getStatusTone(status: DatabaseStatus): PastelBadgeTone {
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

export function getPriorityTone(priority: DatabasePriority): PastelBadgeTone {
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

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function formatCurrency(val: number): string {
  return `$${val.toLocaleString('en-US')}`;
}
