<template>
  <q-dialog
    :model-value="modelValue"
    data-testid="clean-search-modal"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="mind-search-modal-container">
      <!-- Search Input Header -->
      <div class="search-modal-header">
        <div class="search-input-wrapper">
          <Search :size="18" class="search-lens-icon" />
          <input
            ref="searchInputRef"
            v-model="localQuery"
            type="search"
            enterkeyhint="search"
            placeholder="Pesquise ou faça uma pergunta em Mind Hub..."
            class="search-modal-bare-input"
            data-testid="search-modal-input"
            @input="onQueryInput"
            @keydown="handleKeyDown"
          />
          <button
            type="button"
            class="search-modal-esc-btn"
            title="Fechar (Esc)"
            @click="$emit('update:modelValue', false)"
          >
            Esc
          </button>
        </div>

        <!-- Filter Chips Row (Notion-style) -->
        <div class="search-filter-chips">
          <button
            type="button"
            class="filter-chip"
            :class="{ 'is-active': titleOnlyFilter }"
            @click="titleOnlyFilter = !titleOnlyFilter"
          >
            <span class="filter-chip-text">Aa Somente título</span>
          </button>
          <button type="button" class="filter-chip">
            <User :size="12" />
            <span class="filter-chip-text">Criado por</span>
          </button>
          <button type="button" class="filter-chip">
            <FileText :size="12" />
            <span class="filter-chip-text">Na página</span>
          </button>
        </div>
      </div>

      <!-- 2-Column Split Content -->
      <div class="search-modal-split-body">
        <!-- Left Column: Results or Recent Pages List -->
        <div class="search-left-column" role="listbox">
          <!-- State 1: Search Results List -->
          <template v-if="localQuery.trim().length > 0">
            <div class="search-section-label">
              Resultados ({{ filteredResults.length }})
            </div>

            <div
              v-for="(item, idx) in filteredResults"
              :key="item.page.id"
              class="search-result-row"
              :class="{ 'is-selected': idx === activeIndex }"
              :data-testid="`search-result-${item.page.id}`"
              role="option"
              :aria-selected="idx === activeIndex"
              @mouseenter="activeIndex = idx"
              @click="handleSelect(item.page.id)"
            >
              <span class="search-item-emoji">{{ item.page.icon || '📄' }}</span>
              <div class="search-item-body">
                <div class="search-item-title-row">
                  <span class="search-item-title">{{ item.page.title }}</span>
                  <span v-if="item.page.sourcePath" class="search-item-path">
                    — {{ formatPath(item.page.sourcePath) }}
                  </span>
                </div>
                <div v-if="item.snippet" class="search-result-snippet">
                  {{ item.snippet }}
                </div>
              </div>
            </div>

            <div v-if="filteredResults.length === 0" class="search-empty-state">
              Nenhuma página encontrada para "{{ localQuery }}".
            </div>
          </template>

          <!-- State 2: Empty Query -> Recent Pages Grouped by Date -->
          <template v-else>
            <template v-for="group in dateGroups" :key="group.label">
              <div v-if="group.items.length > 0" class="search-date-group">
                <div class="search-section-label">{{ group.label }}</div>
                <div
                  v-for="page in group.items"
                  :key="page.id"
                  class="search-result-row"
                  :class="{ 'is-selected': isPageActive(page.id) }"
                  :data-testid="`recent-page-${page.id}`"
                  role="option"
                  :aria-selected="isPageActive(page.id)"
                  @mouseenter="setActivePageId(page.id)"
                  @click="handleSelect(page.id)"
                >
                  <span class="search-item-emoji">{{ page.icon || '📄' }}</span>
                  <div class="search-item-body">
                    <div class="search-item-title-row">
                      <span class="search-item-title">{{ page.title }}</span>
                      <span v-if="page.sourcePath" class="search-item-path">
                        — {{ formatPath(page.sourcePath) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </template>
        </div>

        <!-- Right Column: Instant 0ms Preview -->
        <div class="search-right-preview">
          <template v-if="previewPage">
            <!-- Cover Banner Preview -->
            <div class="preview-banner-preview" />

            <div class="preview-header-row">
              <div class="preview-title-block">
                <span class="preview-page-icon">{{ previewPage.icon || '📄' }}</span>
                <h3 class="preview-page-title">{{ previewPage.title }}</h3>
              </div>
              <button
                type="button"
                class="preview-open-btn"
                title="Abrir página"
                @click="handleSelect(previewPage.id)"
              >
                <ExternalLink :size="14" />
                <span>Abrir</span>
              </button>
            </div>

            <!-- Path & Tags -->
            <div class="preview-meta-row">
              <span v-if="previewPage.sourcePath" class="preview-path-badge">
                {{ previewPage.sourcePath }}
              </span>
              <span
                v-for="tag in previewPage.tags.slice(0, 4)"
                :key="tag"
                class="preview-tag-pill"
              >
                #{{ tag }}
              </span>
            </div>

            <!-- Preview Body Content Snippet -->
            <div class="preview-content-box">
              <div v-if="previewPageSnippet" class="preview-snippet-text">
                {{ previewPageSnippet }}
              </div>
              <div v-else class="preview-no-content">
                Esta página não possui conteúdo em texto.
              </div>
            </div>

            <!-- Child Pages if any -->
            <div v-if="childPages.length > 0" class="preview-subpages-section">
              <div class="preview-subpages-label">Subpáginas:</div>
              <div class="preview-subpages-list">
                <div
                  v-for="child in childPages.slice(0, 5)"
                  :key="child.id"
                  class="preview-subpage-item"
                  @click="handleSelect(child.id)"
                >
                  <span>{{ child.icon || '📄' }}</span>
                  <span class="ellipsis">{{ child.title }}</span>
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="preview-empty-state">
              <FileText :size="32" class="preview-empty-icon" />
              <p>Selecione uma nota para pré-visualizar</p>
            </div>
          </template>
        </div>
      </div>

      <!-- Footer Keyboard Shortcuts -->
      <div class="search-modal-footer">
        <div class="footer-shortcuts">
          <span class="shortcut-item">
            <kbd class="shortcut-kbd">↑</kbd>
            <kbd class="shortcut-kbd">↓</kbd>
            <span>para navegar</span>
          </span>
          <span class="shortcut-item">
            <kbd class="shortcut-kbd">↵</kbd>
            <span>para abrir</span>
          </span>
          <span class="shortcut-item">
            <kbd class="shortcut-kbd">Esc</kbd>
            <span>para fechar</span>
          </span>
        </div>
        <div class="footer-meta">
          <span>{{ pages.length }} páginas indexadas</span>
        </div>
      </div>
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { Search, User, FileText, ExternalLink } from 'lucide-vue-next';
import type { MindPage, SearchResultItem } from '@mind-hub/shared';

const props = defineProps<{
  modelValue: boolean;
  pages: MindPage[];
  searchResults: SearchResultItem[];
  searchQuery: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'update:searchQuery', query: string): void;
  (e: 'select', pageId: string): void;
  (e: 'search', query: string): void;
}>();

const searchInputRef = ref<HTMLInputElement | null>(null);
const localQuery = ref(props.searchQuery);
const activeIndex = ref(0);
const titleOnlyFilter = ref(false);
const manualActivePageId = ref<string | null>(null);

watch(
  () => props.searchQuery,
  (newVal) => {
    localQuery.value = newVal;
  },
);

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      activeIndex.value = 0;
      manualActivePageId.value = null;
      nextTick(() => {
        searchInputRef.value?.focus();
      });
    }
  },
);

function onQueryInput(): void {
  activeIndex.value = 0;
  manualActivePageId.value = null;
  emit('update:searchQuery', localQuery.value);
  emit('search', localQuery.value);
}

const filteredResults = computed(() => {
  if (!titleOnlyFilter.value) return props.searchResults;
  const q = localQuery.value.trim().toLowerCase();
  return props.searchResults.filter((r) => r.page.title.toLowerCase().includes(q));
});

// Group active pages by date when search query is empty
const activePages = computed(() => {
  return props.pages.filter((p) => !p.deletedAt);
});

const dateGroups = computed(() => {
  const now = new Date().getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const sevenDays = 7 * oneDay;
  const thirtyDays = 30 * oneDay;

  const hoje: MindPage[] = [];
  const semanaPassada: MindPage[] = [];
  const ultimos30Dias: MindPage[] = [];
  const maisAntigas: MindPage[] = [];

  const sorted = [...activePages.value].sort((a, b) => {
    const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return db - da;
  });

  for (const page of sorted) {
    const time = new Date(page.updatedAt || page.createdAt || 0).getTime();
    const diff = now - time;
    if (diff <= oneDay) {
      hoje.push(page);
    } else if (diff <= sevenDays) {
      semanaPassada.push(page);
    } else if (diff <= thirtyDays) {
      ultimos30Dias.push(page);
    } else {
      maisAntigas.push(page);
    }
  }

  return [
    { label: 'Hoje', items: hoje },
    { label: 'Semana passada', items: semanaPassada },
    { label: 'Últimos 30 dias', items: ultimos30Dias },
    { label: 'Mais antigas', items: maisAntigas },
  ];
});

// Flattened list of recent pages for keyboard navigation
const flatRecentPages = computed(() => {
  const result: MindPage[] = [];
  for (const group of dateGroups.value) {
    result.push(...group.items);
  }
  return result;
});

// Identify active page for right column preview
const previewPage = computed<MindPage | null>(() => {
  if (localQuery.value.trim().length > 0) {
    const target = filteredResults.value[activeIndex.value];
    return target?.page ?? null;
  }
  if (manualActivePageId.value) {
    return activePages.value.find((p) => p.id === manualActivePageId.value) ?? flatRecentPages.value[0] ?? null;
  }
  return flatRecentPages.value[activeIndex.value] ?? null;
});

const previewPageSnippet = computed(() => {
  if (!previewPage.value) return '';
  const md = previewPage.value.contentMarkdown?.trim() ?? '';
  if (!md) return '';
  // Strip markdown headers/fences for clean preview snippet
  return md
    .replace(/^#+\s+/gm, '')
    .replace(/```[a-z]*\n[\s\S]*?\n```/g, '[código]')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .slice(0, 400);
});

const childPages = computed(() => {
  if (!previewPage.value) return [];
  return activePages.value.filter((p) => p.parentId === previewPage.value?.id);
});

function isPageActive(pageId: string): boolean {
  return previewPage.value?.id === pageId;
}

function setActivePageId(pageId: string): void {
  manualActivePageId.value = pageId;
  const idx = flatRecentPages.value.findIndex((p) => p.id === pageId);
  if (idx !== -1) {
    activeIndex.value = idx;
  }
}

function formatPath(sourcePath: string): string {
  const parts = sourcePath.split('/').filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? '';
  return parts.slice(0, -1).join(' / ');
}

function handleSelect(pageId: string): void {
  emit('select', pageId);
  emit('update:modelValue', false);
}

function handleKeyDown(e: KeyboardEvent): void {
  const count =
    localQuery.value.trim().length > 0
      ? filteredResults.value.length
      : flatRecentPages.value.length;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (count > 0) {
      activeIndex.value = (activeIndex.value + 1) % count;
      manualActivePageId.value = null;
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (count > 0) {
      activeIndex.value = (activeIndex.value - 1 + count) % count;
      manualActivePageId.value = null;
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (previewPage.value) {
      handleSelect(previewPage.value.id);
    }
  } else if (e.key === 'Escape') {
    e.preventDefault();
    emit('update:modelValue', false);
  }
}
</script>

<style scoped>
.mind-search-modal-container {
  width: 900px;
  max-width: 94vw;
  height: 580px;
  max-height: 88vh;
  background: var(--mind-bg-canvas);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 12px;
  box-shadow: var(--mind-shadow-popover);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header & Search Bar */
.search-modal-header {
  padding: 14px 18px 10px;
  border-bottom: 1px solid var(--mind-border-subtle);
  background: var(--mind-bg-canvas);
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-lens-icon {
  color: var(--mind-text-muted);
  flex-shrink: 0;
}

.search-modal-bare-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15.5px;
  color: var(--mind-text-primary);
  font-family: inherit;
}

.search-modal-bare-input::placeholder {
  color: var(--mind-text-muted);
  opacity: 0.85;
}

.search-modal-esc-btn {
  font-size: 11px;
  font-weight: 600;
  color: var(--mind-text-muted);
  background: var(--mind-bg-surface-subtle);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 4px;
  padding: 2px 7px;
  cursor: pointer;
}

.search-filter-chips {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  font-size: 12px;
  color: var(--mind-text-muted);
  background: var(--mind-bg-surface-subtle);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.filter-chip:hover {
  background: #eaedf0;
  color: var(--mind-text-primary);
}

.filter-chip.is-active {
  background: var(--mind-accent-subtle);
  color: var(--mind-accent-primary);
  border-color: rgba(33, 37, 41, 0.2);
}

/* 2-Column Body */
.search-modal-split-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.search-left-column {
  flex: 1.1;
  min-width: 0;
  border-right: 1px solid var(--mind-border-subtle);
  overflow-y: auto;
  padding: 10px;
}

.search-right-preview {
  flex: 0.9;
  min-width: 0;
  background: #fbfcfd;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
}

.search-section-label {
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--mind-text-muted);
  padding: 6px 10px;
}

.search-date-group {
  margin-bottom: 12px;
}

.search-result-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.1s ease;
  user-select: none;
}

.search-result-row:hover,
.search-result-row.is-selected {
  background: var(--mind-bg-hover);
}

.search-result-row.is-selected {
  background: #f0f2f5;
}

.search-item-emoji {
  font-size: 16px;
  flex-shrink: 0;
}

.search-item-body {
  flex: 1;
  min-width: 0;
}

.search-item-title-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  overflow: hidden;
}

.search-item-title {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--mind-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-item-path {
  font-size: 11.5px;
  color: var(--mind-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-result-snippet {
  font-size: 12px;
  color: var(--mind-text-secondary);
  line-height: 1.35;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-empty-state {
  padding: 32px 16px;
  text-align: center;
  font-size: 13.5px;
  color: var(--mind-text-muted);
}

/* Right Column Preview */
.preview-banner-preview {
  height: 60px;
  border-radius: 6px;
  background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
  margin-bottom: 14px;
}

.preview-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.preview-title-block {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.preview-page-icon {
  font-size: 26px;
  flex-shrink: 0;
}

.preview-page-title {
  font-size: 18px;
  font-weight: 650;
  color: var(--mind-text-primary);
  margin: 0;
  line-height: 1.25;
  word-break: break-word;
}

.preview-open-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  background: var(--mind-bg-canvas);
  border: 1px solid var(--mind-border-control);
  border-radius: 6px;
  color: var(--mind-text-primary);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.12s ease;
}

.preview-open-btn:hover {
  background: var(--mind-bg-hover);
  border-color: var(--mind-border-subtle);
}

.preview-meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
}

.preview-path-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  padding: 2px 6px;
  background: var(--mind-bg-surface-subtle);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 4px;
  color: var(--mind-text-muted);
}

.preview-tag-pill {
  font-size: 11px;
  padding: 2px 7px;
  background: #e9ecef;
  color: var(--mind-text-secondary);
  border-radius: 999px;
}

.preview-content-box {
  background: var(--mind-bg-canvas);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 8px;
  padding: 12px 14px;
  flex: 1;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.5;
  color: var(--mind-text-secondary);
}

.preview-snippet-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-no-content {
  color: var(--mind-text-muted);
  font-style: italic;
}

.preview-subpages-section {
  margin-top: 12px;
}

.preview-subpages-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--mind-text-muted);
  margin-bottom: 6px;
}

.preview-subpages-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-subpage-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  font-size: 12.5px;
  border-radius: 4px;
  color: var(--mind-text-primary);
  cursor: pointer;
  background: var(--mind-bg-canvas);
  border: 1px solid var(--mind-border-subtle);
  transition: background-color 0.1s ease;
}

.preview-subpage-item:hover {
  background: var(--mind-bg-hover);
}

.preview-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--mind-text-muted);
  font-size: 13px;
  gap: 10px;
}

.preview-empty-icon {
  opacity: 0.35;
}

/* Footer Shortcuts */
.search-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-top: 1px solid var(--mind-border-subtle);
  background: var(--mind-bg-surface-subtle);
  font-size: 11.5px;
  color: var(--mind-text-muted);
}

.footer-shortcuts {
  display: flex;
  align-items: center;
  gap: 16px;
}

.shortcut-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.shortcut-kbd {
  font-family: inherit;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  background: var(--mind-bg-canvas);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 4px;
  color: var(--mind-text-primary);
}

.footer-meta {
  font-size: 11px;
}
</style>
