<template>
  <div>
    <!-- Autocomplete Search Popover (@ or [[) -->
    <div
      v-if="suggestionVisible"
      class="mind-mention-suggest-shell"
      data-testid="page-mention-suggest-popover"
      :style="{ top: `${top}px`, left: `${left}px` }"
      role="menu"
      aria-label="Page suggestions"
      @keydown.stop="handleKeyNavigation"
    >
      <div class="suggest-header">
        <FileText :size="13" class="header-icon" />
        <span class="header-text">Vincular Página</span>
      </div>

      <div v-if="filteredPagesList.length === 0" class="no-pages-notice" data-testid="no-pages-notice">
        Nenhuma página encontrada
      </div>

      <div v-else class="suggest-items-list" data-testid="suggest-items-list">
        <div
          v-for="(page, idx) in filteredPagesList"
          :key="page.id"
          class="suggest-item"
          :class="{ 'is-selected': idx === selectedIndex }"
          data-testid="suggest-page-item"
          :data-page-id="page.id"
          @click="selectPage(page)"
          @mouseenter="selectedIndex = idx"
        >
          <span class="page-icon">{{ page.icon || '📄' }}</span>
          <div class="page-details">
            <div class="page-title">{{ page.title }}</div>
            <div v-if="page.summary" class="page-summary">{{ page.summary }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Hover Preview Card (When hovering existing mention) -->
    <div
      v-if="hoverPreviewVisible && activeHoverPage"
      class="mind-mention-hover-card"
      data-testid="page-mention-hover-card"
      :style="{ top: `${hoverTop}px`, left: `${hoverLeft}px` }"
    >
      <div class="hover-card-header">
        <span class="hover-page-icon">{{ activeHoverPage.icon || '📄' }}</span>
        <div class="hover-title-area">
          <div class="hover-page-title">{{ activeHoverPage.title }}</div>
          <div v-if="activeHoverPage.slug" class="hover-page-slug">/{{ activeHoverPage.slug }}</div>
        </div>
      </div>

      <div v-if="activeHoverPage.summary" class="hover-card-summary">
        {{ activeHoverPage.summary }}
      </div>

      <div class="hover-card-footer">
        <button
          type="button"
          class="open-page-action-btn"
          data-testid="hover-card-open-btn"
          @click="emit('openPage', activeHoverPage.id)"
        >
          <ExternalLink :size="12" />
          <span>Abrir página</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { FileText, ExternalLink } from 'lucide-vue-next';
import type { PageReference } from '../types.js';
import { filterPages } from '../extensions/page-mention.js';

const props = withDefaults(
  defineProps<{
    suggestionVisible?: boolean;
    hoverPreviewVisible?: boolean;
    top?: number;
    left?: number;
    hoverTop?: number;
    hoverLeft?: number;
    query?: string;
    pages: PageReference[];
    activeHoverPage?: PageReference | null;
  }>(),
  {
    suggestionVisible: false,
    hoverPreviewVisible: false,
    top: 0,
    left: 0,
    hoverTop: 0,
    hoverLeft: 0,
    query: '',
    activeHoverPage: null,
  }
);

const emit = defineEmits<{
  (e: 'select', page: PageReference): void;
  (e: 'close'): void;
  (e: 'openPage', pageId: string): void;
}>();

const selectedIndex = ref(0);

const filteredPagesList = computed(() => {
  return filterPages(props.pages, props.query);
});

watch(
  () => props.query,
  () => {
    selectedIndex.value = 0;
  }
);

watch(
  () => props.suggestionVisible,
  (val) => {
    if (val) {
      selectedIndex.value = 0;
    }
  }
);

function selectPage(page: PageReference) {
  emit('select', page);
}

function handleKeyNavigation(e: KeyboardEvent) {
  if (!props.suggestionVisible) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (filteredPagesList.value.length > 0) {
      selectedIndex.value = (selectedIndex.value + 1) % filteredPagesList.value.length;
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (filteredPagesList.value.length > 0) {
      selectedIndex.value =
        (selectedIndex.value - 1 + filteredPagesList.value.length) % filteredPagesList.value.length;
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const target = filteredPagesList.value[selectedIndex.value];
    if (target) {
      selectPage(target);
    }
  } else if (e.key === 'Escape') {
    e.preventDefault();
    emit('close');
  }
}
</script>

<style scoped>
.mind-mention-suggest-shell {
  position: absolute;
  width: 260px;
  max-height: 280px;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: system-ui, -apple-system, sans-serif;
}

.suggest-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #f1f1ef;
  font-size: 0.725rem;
  font-weight: 600;
  color: #787774;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.header-icon {
  color: #9b9a97;
}

.suggest-items-list {
  overflow-y: auto;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.suggest-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.suggest-item:hover,
.suggest-item.is-selected {
  background-color: #f8f9fa;
}

.page-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.page-details {
  flex: 1;
  min-width: 0;
}

.page-title {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #37352f;
  line-height: 1.2;
}

.page-summary {
  font-size: 0.7rem;
  color: #9b9a97;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

.no-pages-notice {
  padding: 12px;
  text-align: center;
  font-size: 0.775rem;
  color: #9b9a97;
}

.mind-mention-hover-card {
  position: absolute;
  width: 250px;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.1);
  padding: 10px;
  z-index: 100;
  font-family: system-ui, -apple-system, sans-serif;
  user-select: none;
}

.hover-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hover-page-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.hover-title-area {
  flex: 1;
  min-width: 0;
}

.hover-page-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #24292f;
  line-height: 1.2;
}

.hover-page-slug {
  font-size: 0.7rem;
  color: #9b9a97;
}

.hover-card-summary {
  margin-top: 8px;
  font-size: 0.775rem;
  color: #57606a;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hover-card-footer {
  margin-top: 10px;
  padding-top: 6px;
  border-top: 1px solid #f1f1ef;
  display: flex;
  justify-content: flex-end;
}

.open-page-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: #f1f1ef;
  border: none;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 0.725rem;
  color: #37352f;
  cursor: pointer;
  transition: all 0.12s ease;
}

.open-page-action-btn:hover {
  background-color: #e9ecef;
  color: #1a1a1a;
}
</style>
