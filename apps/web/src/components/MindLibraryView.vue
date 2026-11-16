<template>
  <section class="mind-library-view" data-testid="mind-library-view">
    <!-- Top Header Row (Image 2) -->
    <header class="library-header-bar">
      <div class="library-header-left">
        <h1 class="library-title-h1">Biblioteca</h1>
      </div>
      <div class="library-header-right">
        <button
          type="button"
          class="library-new-note-btn"
          data-testid="library-new-note-btn"
          @click="handleCreateNote"
        >
          Nova nota
        </button>
      </div>
    </header>

    <!-- Insights & Database Metrics Strip -->
    <div class="library-insights-strip" data-testid="library-insights-strip">
      <div class="insight-card">
        <span class="insight-label">Total de Notas</span>
        <strong class="insight-value">{{ store.activePages.length }}</strong>
        <span class="insight-sub">{{ rootNotesCount }} raiz · {{ childNotesCount }} subnotas</span>
      </div>
      <div class="insight-card">
        <span class="insight-label">Tamanho no Banco</span>
        <strong class="insight-value" data-testid="library-total-db-size">{{ totalDbSizeFormatted }}</strong>
        <span class="insight-sub">JSON + Markdown + Metadados</span>
      </div>
      <div class="insight-card">
        <span class="insight-label">Volume Escrito</span>
        <strong class="insight-value">{{ totalWordsCount }} palavras</strong>
        <span class="insight-sub">{{ filledNotesCount }} preenchidas · {{ emptyNotesCount }} em branco</span>
      </div>
      <div class="insight-card">
        <span class="insight-label">Destaques</span>
        <strong class="insight-value">{{ store.favoritePages.length }} favoritas</strong>
        <span class="insight-sub">{{ notesWithSubpagesCount }} notas com subnotas</span>
      </div>
    </div>

    <!-- Filter Tabs & Right Controls (Image 2) -->
    <div class="library-tabs-toolbar">
      <div class="library-tabs-left" role="tablist" aria-label="Filtros da biblioteca">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          class="library-tab-pill"
          :class="{ 'is-active': activeTab === tab.id }"
          :aria-selected="activeTab === tab.id"
          :data-testid="`library-tab-${tab.id}`"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" :size="14" :stroke-width="1.75" />
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <div class="library-controls-right">
        <div v-if="showSearchInput" class="library-inline-search">
          <Search :size="14" :stroke-width="1.75" class="library-search-icon" />
          <input
            ref="searchInputRef"
            v-model="filterQuery"
            type="text"
            class="library-search-input"
            placeholder="Filtrar por título ou tag..."
            data-testid="library-search-input"
          />
          <button
            v-if="filterQuery"
            type="button"
            class="library-clear-btn"
            aria-label="Limpar filtro"
            @click="filterQuery = ''"
          >
            <X :size="13" :stroke-width="1.75" />
          </button>
        </div>

        <button
          type="button"
          class="library-icon-control-btn"
          :class="{ 'is-active': showSearchInput || Boolean(filterQuery) }"
          title="Filtrar notas"
          aria-label="Filtrar notas"
          data-testid="library-toggle-search-btn"
          @click="toggleSearchInput"
        >
          <Search :size="15" :stroke-width="1.75" />
        </button>

        <button
          type="button"
          class="library-icon-control-btn"
          :title="`Ordenar por: ${sortLabel}`"
          aria-label="Alternar ordenação"
          data-testid="library-sort-cycle-btn"
          @click="cycleSortField"
        >
          <ArrowUpDown :size="15" :stroke-width="1.75" />
        </button>

        <button
          v-if="activeTab === 'hierarchy'"
          type="button"
          class="library-icon-control-btn"
          :title="allExpanded ? 'Recolher subnotas' : 'Expandir todas as subnotas'"
          aria-label="Expandir ou recolher todas"
          data-testid="library-expand-all-btn"
          @click="toggleExpandAll"
        >
          <ChevronsUpDown :size="15" :stroke-width="1.75" />
        </button>
      </div>
    </div>

    <!-- Accessible Status Region for Table Sorting -->
    <div role="status" class="sr-only">{{ sortStatusAnnouncement }}</div>

    <!-- Responsive Table Wrapper -->
    <div
      class="library-table-region"
      role="region"
      aria-labelledby="library-table-caption"
      tabindex="0"
    >
      <table class="library-table" data-testid="library-table">
        <caption id="library-table-caption" class="sr-only">
          Biblioteca de Notas do Mind Hub
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              class="col-title"
              :aria-sort="getAriaSort('title')"
            >
              <button
                type="button"
                class="th-sort-btn"
                data-testid="library-sort-title"
                @click="setSortColumn('title')"
              >
                <FileText :size="14" :stroke-width="1.75" aria-hidden="true" />
                <span>Nome da nota</span>
              </button>
            </th>
            <th scope="col" class="col-hierarchy">
              <span class="th-static-label">Hierarquia</span>
            </th>
            <th
              scope="col"
              class="col-size"
              :aria-sort="getAriaSort('sizeBytes')"
            >
              <button
                type="button"
                class="th-sort-btn"
                data-testid="library-sort-size"
                @click="setSortColumn('sizeBytes')"
              >
                <Database :size="14" :stroke-width="1.75" aria-hidden="true" />
                <span>Tamanho no banco</span>
              </button>
            </th>
            <th
              scope="col"
              class="col-updated"
              :aria-sort="getAriaSort('updatedAt')"
            >
              <button
                type="button"
                class="th-sort-btn"
                data-testid="library-sort-updated"
                @click="setSortColumn('updatedAt')"
              >
                <Clock :size="14" :stroke-width="1.75" aria-hidden="true" />
                <span>Última edição</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in displayedRows"
            :key="row.page.id"
            class="library-table-row"
            :data-testid="`library-row-${row.page.id}`"
            @click="handleOpenFullNote(row.page.id)"
          >
            <td class="cell-title">
              <div
                class="cell-title-inner"
                :style="{ paddingLeft: `${row.depth * 22}px` }"
              >
                <button
                  v-if="activeTab === 'hierarchy' && row.childCount > 0"
                  type="button"
                  class="row-expand-triangle"
                  :class="{ 'is-expanded': isRowExpanded(row.page.id) }"
                  :aria-label="isRowExpanded(row.page.id) ? 'Recolher subnotas' : 'Expandir subnotas'"
                  :data-testid="`library-expand-${row.page.id}`"
                  @click.stop="toggleRowExpand(row.page.id)"
                >
                  <span class="triangle-glyph">▶</span>
                </button>
                <span
                  v-else-if="activeTab === 'hierarchy'"
                  class="row-expand-spacer"
                />

                <MindPageIcon
                  :icon="row.page.icon"
                  :has-content="Boolean(row.page.contentMarkdown?.trim())"
                  :size="16"
                />

                <span class="row-note-title">{{ row.page.title }}</span>

                <button
                  type="button"
                  class="row-open-peek-btn"
                  title="Abrir no modal Center Peek"
                  :data-testid="`library-peek-${row.page.id}`"
                  @click.stop="handleOpenPeekModal(row.page.id)"
                >
                  <PanelRight :size="12" :stroke-width="1.75" />
                  <span>ABRIR</span>
                </button>
              </div>
            </td>

            <td class="cell-hierarchy">
              <span v-if="row.parentTitle" class="hierarchy-pill">
                em {{ row.parentTitle }}
              </span>
              <span v-else class="hierarchy-pill is-root">Raiz</span>
              <span v-if="row.childCount > 0" class="subnotes-count-badge">
                {{ row.childCount }} {{ row.childCount === 1 ? 'subnota' : 'subnotas' }}
              </span>
            </td>

            <td class="cell-size" :data-value="row.sizeBytes" data-testid="library-row-size">
              <span class="size-value">{{ formatBytes(row.sizeBytes) }}</span>
              <span
                v-if="row.subtreeBytes > row.sizeBytes"
                class="size-subtree-hint"
                :title="`Total com subnotas: ${formatBytes(row.subtreeBytes)}`"
              >
                ({{ formatBytes(row.subtreeBytes) }} total)
              </span>
            </td>

            <td class="cell-updated" :data-value="row.updatedTimestamp">
              {{ formatRelativeTime(row.page.updatedAt) }}
            </td>
          </tr>

          <tr v-if="displayedRows.length === 0">
            <td colspan="4" class="library-empty-cell">
              Nenhuma nota encontrada para este filtro.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, type Component } from 'vue';
import {
  ArrowUpDown,
  ChevronsUpDown,
  Clock,
  Database,
  File,
  FileText,
  Lock,
  PanelRight,
  Search,
  Sparkles,
  Star,
  X,
} from 'lucide-vue-next';
import type { MindPage, PageTreeNode } from '@mind-hub/shared';
import { useMindStore } from '../stores/mind-store.js';
import MindPageIcon from './ui/MindPageIcon.vue';

type LibraryTabId = 'recent' | 'favorites' | 'hierarchy' | 'empty' | 'ai';
type SortColumn = 'title' | 'sizeBytes' | 'updatedAt';

interface LibraryRowItem {
  page: MindPage;
  depth: number;
  childCount: number;
  parentTitle: string | null;
  sizeBytes: number;
  subtreeBytes: number;
  updatedTimestamp: number;
}

const store = useMindStore();

const activeTab = ref<LibraryTabId>('hierarchy');
const filterQuery = ref('');
const showSearchInput = ref(false);
const searchInputRef = ref<HTMLInputElement | null>(null);
const sortColumn = ref<SortColumn>('updatedAt');
const sortDirection = ref<'ascending' | 'descending'>('descending');
const expandedIds = ref<Set<string>>(new Set());
const allExpanded = ref(false);

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

const tabs: Array<{ id: LibraryTabId; label: string; icon: Component }> = [
  { id: 'recent', label: 'Recentes', icon: Clock },
  { id: 'favorites', label: 'Favoritos', icon: Star },
  { id: 'hierarchy', label: 'Minhas Notas', icon: Lock },
  { id: 'empty', label: 'Rascunhos', icon: File },
  { id: 'ai', label: 'Anotações IA', icon: Sparkles },
];

function computePageDatabaseBytes(page: MindPage): number {
  const mdLen = new TextEncoder().encode(page.contentMarkdown ?? '').length;
  const jsonLen = new TextEncoder().encode(JSON.stringify(page.contentJson ?? {})).length;
  const metaLen = new TextEncoder().encode(
    `${page.id}|${page.slug}|${page.title}|${page.icon ?? ''}|${page.coverUrl ?? ''}|${(page.tags ?? []).join(',')}`,
  ).length;
  return mdLen + jsonLen + metaLen;
}

const pageBytesMap = computed<Map<string, number>>(() => {
  const map = new Map<string, number>();
  for (const page of store.activePages) {
    map.set(page.id, computePageDatabaseBytes(page));
  }
  return map;
});

function computeSubtreeBytes(pageId: string): number {
  let sum = pageBytesMap.value.get(pageId) ?? 0;
  for (const child of store.activePages) {
    if (child.parentId === pageId) {
      sum += computeSubtreeBytes(child.id);
    }
  }
  return sum;
}

const rootNotesCount = computed(
  () => store.activePages.filter((p) => p.parentId === null).length,
);
const childNotesCount = computed(
  () => store.activePages.filter((p) => p.parentId !== null).length,
);
const filledNotesCount = computed(
  () => store.activePages.filter((p) => Boolean(p.contentMarkdown?.trim())).length,
);
const emptyNotesCount = computed(
  () => store.activePages.filter((p) => !p.contentMarkdown?.trim()).length,
);
const notesWithSubpagesCount = computed(() => {
  const parentIds = new Set(
    store.activePages.filter((p) => p.parentId !== null).map((p) => p.parentId!),
  );
  return parentIds.size;
});

const totalDbSizeBytes = computed(() => {
  let total = 0;
  for (const bytes of pageBytesMap.value.values()) {
    total += bytes;
  }
  return total;
});

const totalDbSizeFormatted = computed(() => formatBytes(totalDbSizeBytes.value));

const totalWordsCount = computed(() => {
  let count = 0;
  for (const page of store.activePages) {
    const clean = (page.contentMarkdown ?? '')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .trim();
    if (clean) {
      count += clean.split(/\s+/).filter(Boolean).length;
    }
  }
  return count;
});

const sortLabel = computed(() => {
  if (sortColumn.value === 'title') return 'Nome';
  if (sortColumn.value === 'sizeBytes') return 'Tamanho no banco';
  return 'Última edição';
});

const sortStatusAnnouncement = computed(
  () => `Ordenado por ${sortLabel.value}, ${sortDirection.value === 'ascending' ? 'crescente' : 'decrescente'}`,
);

function getAriaSort(col: SortColumn): 'ascending' | 'descending' | undefined {
  if (sortColumn.value !== col) return undefined;
  return sortDirection.value;
}

function setSortColumn(col: SortColumn): void {
  if (sortColumn.value === col) {
    sortDirection.value = sortDirection.value === 'ascending' ? 'descending' : 'ascending';
  } else {
    sortColumn.value = col;
    sortDirection.value = col === 'title' ? 'ascending' : 'descending';
  }
}

function cycleSortField(): void {
  const order: SortColumn[] = ['updatedAt', 'title', 'sizeBytes'];
  const nextIdx = (order.indexOf(sortColumn.value) + 1) % order.length;
  setSortColumn(order[nextIdx]!);
}

function compareRowItems(a: LibraryRowItem, b: LibraryRowItem): number {
  const factor = sortDirection.value === 'ascending' ? 1 : -1;
  if (sortColumn.value === 'title') {
    return factor * collator.compare(a.page.title, b.page.title);
  }
  if (sortColumn.value === 'sizeBytes') {
    return factor * (a.sizeBytes - b.sizeBytes);
  }
  return factor * (a.updatedTimestamp - b.updatedTimestamp);
}

function buildRowItem(page: MindPage, depth = 0): LibraryRowItem {
  const childCount = store.activePages.filter((p) => p.parentId === page.id).length;
  const parent = page.parentId
    ? store.activePages.find((p) => p.id === page.parentId) ?? null
    : null;
  const sizeBytes = pageBytesMap.value.get(page.id) ?? 0;
  const subtreeBytes = childCount > 0 ? computeSubtreeBytes(page.id) : sizeBytes;
  const parsedTime = Date.parse(page.updatedAt);
  return {
    page,
    depth,
    childCount,
    parentTitle: parent?.title ?? null,
    sizeBytes,
    subtreeBytes,
    updatedTimestamp: Number.isNaN(parsedTime) ? 0 : parsedTime,
  };
}

function matchesSearch(page: MindPage): boolean {
  const q = filterQuery.value.trim().toLowerCase();
  if (!q) return true;
  if (page.title.toLowerCase().includes(q)) return true;
  if (page.tags.some((t) => t.toLowerCase().includes(q))) return true;
  return false;
}

const displayedRows = computed<LibraryRowItem[]>(() => {
  if (activeTab.value === 'hierarchy' && !filterQuery.value.trim()) {
    const result: LibraryRowItem[] = [];
    const walkNodes = (nodes: PageTreeNode[], depth: number): void => {
      const items = nodes.map((n) => buildRowItem(n, depth));
      if (sortColumn.value !== 'updatedAt' || sortDirection.value !== 'descending') {
        items.sort(compareRowItems);
      }
      for (const item of items) {
        result.push(item);
        const nodeObj = nodes.find((n) => n.id === item.page.id);
        if (nodeObj && nodeObj.children.length > 0 && isRowExpanded(item.page.id)) {
          walkNodes(nodeObj.children, depth + 1);
        }
      }
    };
    walkNodes(store.pageTree, 0);
    return result;
  }

  let pool = store.activePages.filter(matchesSearch);
  if (activeTab.value === 'favorites') {
    pool = pool.filter((p) => p.isFavorite);
  } else if (activeTab.value === 'empty') {
    pool = pool.filter((p) => !p.contentMarkdown?.trim() || p.tags.includes('rascunho'));
  } else if (activeTab.value === 'ai') {
    pool = pool.filter(
      (p) =>
        p.tags.some((t) => ['ia', 'ai', 'insight', 'adr'].includes(t.toLowerCase())) ||
        p.isInbox,
    );
  }

  const rows = pool.map((p) => buildRowItem(p, 0));
  rows.sort(compareRowItems);
  return rows;
});

function isRowExpanded(pageId: string): boolean {
  return expandedIds.value.has(pageId);
}

function toggleRowExpand(pageId: string): void {
  const next = new Set(expandedIds.value);
  if (next.has(pageId)) {
    next.delete(pageId);
  } else {
    next.add(pageId);
  }
  expandedIds.value = next;
}

function toggleExpandAll(): void {
  if (allExpanded.value) {
    expandedIds.value = new Set();
    allExpanded.value = false;
  } else {
    const allParentIds = store.activePages
      .filter((p) => store.activePages.some((c) => c.parentId === p.id))
      .map((p) => p.id);
    expandedIds.value = new Set(allParentIds);
    allExpanded.value = true;
  }
}

async function toggleSearchInput(): Promise<void> {
  showSearchInput.value = !showSearchInput.value;
  if (showSearchInput.value) {
    await nextTick();
    searchInputRef.value?.focus();
  } else {
    filterQuery.value = '';
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function formatRelativeTime(isoDate: string): string {
  const ts = Date.parse(isoDate);
  if (Number.isNaN(ts)) return 'Hoje';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'agora mesmo';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 7) return `${diffDays}d atrás`;

  const d = new Date(ts);
  const months = [
    'jan.',
    'fev.',
    'mar.',
    'abr.',
    'mai.',
    'jun.',
    'jul.',
    'ago.',
    'set.',
    'out.',
    'nov.',
    'dez.',
  ];
  return `${d.getDate()} de ${months[d.getMonth()]}`;
}

function handleOpenFullNote(pageId: string): void {
  store.activeSurface = 'editor';
  store.selectPage(pageId);
}

function handleOpenPeekModal(pageId: string): void {
  store.openNoteModal(pageId);
}

async function handleCreateNote(): Promise<void> {
  const newPage = await store.createPage({
    title: 'Nova Nota',
    icon: '',
    parentId: null,
    contentMarkdown: '',
    tags: [],
  });
  store.openNoteModal(newPage.id);
}
</script>

<style scoped>
.mind-library-view {
  max-width: 1120px;
  margin: 0 auto;
  padding: 36px 56px 96px;
}

.library-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.library-title-h1 {
  font-size: 30px;
  font-weight: 700;
  color: var(--mind-text-primary, #212529);
  margin: 0;
  line-height: 1.2;
}

.library-new-note-btn {
  height: 32px;
  padding: 0 14px;
  border: none;
  border-radius: 6px;
  background: var(--mind-accent-primary, #1971c2);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.library-new-note-btn:hover {
  background: var(--mind-accent-hover, #1864ab);
}

.library-insights-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  margin-bottom: 22px;
}

.insight-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 14px;
  background: #f8f9fa;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 8px;
}

.insight-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--mind-text-muted, #868e96);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.insight-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--mind-text-primary, #212529);
}

.insight-sub {
  font-size: 11.5px;
  color: var(--mind-text-muted, #868e96);
}

.library-tabs-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.library-tabs-left {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.library-tab-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--mind-text-muted, #868e96);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s ease;
}

.library-tab-pill:hover {
  color: var(--mind-text-primary, #212529);
  background: var(--mind-bg-hover, #f1f3f5);
}

.library-tab-pill.is-active {
  color: var(--mind-text-primary, #212529);
  background: var(--mind-bg-surface-subtle, #f1f3f5);
  border-color: var(--mind-border-subtle, #e9ecef);
  font-weight: 600;
}

.library-controls-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.library-inline-search {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 8px;
  background: #f8f9fa;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 6px;
}

.library-search-icon {
  color: var(--mind-text-muted, #868e96);
}

.library-search-input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 12.5px;
  color: var(--mind-text-primary, #212529);
  width: 170px;
}

.library-clear-btn {
  border: none;
  background: transparent;
  color: var(--mind-text-muted, #868e96);
  cursor: pointer;
  padding: 2px;
  display: inline-flex;
}

.library-icon-control-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--mind-text-muted, #868e96);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.library-icon-control-btn:hover,
.library-icon-control-btn.is-active {
  background: var(--mind-bg-hover, #f1f3f5);
  color: var(--mind-text-primary, #212529);
}

.library-table-region {
  overflow-x: auto;
}

.library-table {
  width: 100%;
  min-inline-size: 640px;
  border-collapse: collapse;
  font-size: 13.5px;
}

.library-table thead tr {
  border-top: 1px solid var(--mind-border-subtle, #e9ecef);
  border-bottom: 1px solid var(--mind-border-subtle, #e9ecef);
}

.library-table th {
  text-align: left;
  font-size: 12px;
  font-weight: 500;
  color: var(--mind-text-muted, #868e96);
  padding: 8px 10px;
  user-select: none;
}

.library-table th:has(> button) {
  padding: 0;
}

.th-sort-btn {
  width: 100%;
  min-height: 34px;
  padding: 8px 10px;
  border: none;
  background: transparent;
  color: var(--mind-text-muted, #868e96);
  font-size: 12px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  text-align: left;
}

.th-sort-btn:hover {
  color: var(--mind-text-primary, #212529);
  background: #f8f9fa;
}

.th-static-label {
  display: inline-flex;
  align-items: center;
}

.col-title {
  width: 48%;
}

.col-hierarchy {
  width: 20%;
}

.col-size {
  width: 16%;
}

.col-updated {
  width: 16%;
}

.library-table-row {
  border-bottom: 1px solid var(--mind-border-subtle, #e9ecef);
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.library-table-row:hover {
  background: #f8f9fa;
}

.library-table td {
  padding: 8px 10px;
  vertical-align: middle;
}

.cell-title-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.row-expand-triangle {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--mind-text-muted, #868e96);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

.row-expand-triangle:hover {
  background: var(--mind-bg-active, #e9ecef);
  color: var(--mind-text-primary, #212529);
}

.triangle-glyph {
  font-size: 9px;
  transition: transform 0.14s ease;
  display: inline-block;
}

.row-expand-triangle.is-expanded .triangle-glyph {
  transform: rotate(90deg);
}

.row-expand-spacer {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.row-note-title {
  font-weight: 500;
  color: var(--mind-text-primary, #212529);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-open-peek-btn {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 7px;
  border: 1px solid var(--mind-border-subtle, #e9ecef);
  border-radius: 4px;
  background: #ffffff;
  color: var(--mind-text-secondary, #495057);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.12s ease, background-color 0.12s ease;
  flex-shrink: 0;
}

.library-table-row:hover .row-open-peek-btn,
.row-open-peek-btn:focus-visible {
  opacity: 1;
}

.row-open-peek-btn:hover {
  background: #f1f3f5;
  color: var(--mind-text-primary, #212529);
}

.cell-hierarchy {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.hierarchy-pill {
  font-size: 11.5px;
  color: var(--mind-text-muted, #868e96);
}

.subnotes-count-badge {
  font-size: 11px;
  font-weight: 500;
  color: #495057;
  background: #f1f3f5;
  padding: 1px 6px;
  border-radius: 999px;
}

.cell-size {
  font-size: 12.5px;
  color: var(--mind-text-secondary, #495057);
  white-space: nowrap;
}

.size-value {
  font-weight: 500;
}

.size-subtree-hint {
  margin-left: 4px;
  font-size: 11px;
  color: var(--mind-text-muted, #868e96);
}

.cell-updated {
  font-size: 12.5px;
  color: var(--mind-text-muted, #868e96);
  white-space: nowrap;
}

.library-empty-cell {
  text-align: center;
  padding: 36px 16px !important;
  color: var(--mind-text-muted, #868e96);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
</style>
