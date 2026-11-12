<template>
  <div
    v-if="visible"
    ref="menuRef"
    class="mind-slash-menu-shell"
    data-testid="slash-menu-shell"
    data-component-testid="slash-command-menu"
    :style="{ top: `${top}px`, left: `${left}px` }"
    role="menu"
    aria-label="Comandos slash"
    @keydown.stop="handleKeyNavigation"
  >
    <div v-if="filteredItems.length === 0" class="no-items-notice" data-testid="no-slash-items">
      Nenhum resultado para "{{ query }}"
    </div>

    <div v-else ref="listRef" class="slash-items-scroll-area" data-testid="slash-command-menu">
      <div
        v-for="section in groupedSections"
        :key="section.title"
        class="slash-section"
      >
        <div class="slash-section-header">{{ section.title }}</div>
        <div
          v-for="item in section.items"
          :key="item.id"
          class="slash-item"
          :class="{ 'is-selected': item.flatIndex === selectedIndex }"
          data-testid="slash-item"
          :data-item-id="item.id"
          @click="selectItem(item)"
          @mouseenter="selectedIndex = item.flatIndex"
        >
          <div class="slash-item-icon">
            <component :is="item.icon" :size="16" />
          </div>
          <div class="slash-item-details">
            <span class="item-title">{{ item.title }}</span>
            <span v-if="item.subtitle" class="item-subtitle"> · {{ item.subtitle }}</span>
            <span v-if="item.badge" class="item-badge">{{ item.badge }}</span>
          </div>
          <div v-if="item.shortcut" class="item-shortcut">{{ item.shortcut }}</div>
        </div>
      </div>
    </div>

    <!-- Rodapé idêntico ao print: "Fechar menu" à esquerda, "esc" à direita -->
    <div class="slash-footer">
      <span class="slash-footer-label">Fechar menu</span>
      <kbd class="slash-footer-kbd">esc</kbd>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import type { SlashMenuItem } from '../types.js';
import { filterSlashItems } from '../extensions/slash-command.js';

interface IndexedSlashItem extends SlashMenuItem {
  flatIndex: number;
}

interface SlashSection {
  title: string;
  items: IndexedSlashItem[];
}

const props = withDefaults(
  defineProps<{
    visible?: boolean;
    top?: number;
    left?: number;
    query?: string;
    items: SlashMenuItem[];
  }>(),
  {
    visible: false,
    top: 0,
    left: 0,
    query: '',
  }
);

const emit = defineEmits<{
  (e: 'select', item: SlashMenuItem): void;
  (e: 'update:query', q: string): void;
  (e: 'close'): void;
}>();

const selectedIndex = ref(0);
const menuRef = ref<HTMLDivElement | null>(null);
const listRef = ref<HTMLDivElement | null>(null);

const filteredItems = computed(() => {
  return filterSlashItems(props.items, props.query);
});

const groupedSections = computed<SlashSection[]>(() => {
  let counter = 0;
  const suggestions: IndexedSlashItem[] = [];
  const basic: IndexedSlashItem[] = [];
  const advanced: IndexedSlashItem[] = [];

  for (const item of filteredItems.value) {
    const indexed: IndexedSlashItem = { ...item, flatIndex: counter++ };
    if (item.category === 'suggestions') {
      suggestions.push(indexed);
    } else if (item.category === 'basic') {
      basic.push(indexed);
    } else {
      advanced.push(indexed);
    }
  }

  const sections: SlashSection[] = [];
  if (suggestions.length > 0) {
    sections.push({ title: 'Sugestões', items: suggestions });
  }
  if (basic.length > 0) {
    sections.push({ title: 'Blocos básicos', items: basic });
  }
  if (advanced.length > 0) {
    sections.push({ title: 'Mídia e Avançado', items: advanced });
  }

  return sections;
});

watch(
  () => props.query,
  () => {
    selectedIndex.value = 0;
  }
);

watch(
  () => props.visible,
  (val) => {
    if (val) {
      selectedIndex.value = 0;
    }
  }
);

function selectItem(item: IndexedSlashItem | SlashMenuItem) {
  const { flatIndex: _, ...original } = item as IndexedSlashItem;
  emit('select', original as SlashMenuItem);
}

function scrollToSelected() {
  nextTick(() => {
    if (!listRef.value) return;
    const selectedEl = listRef.value.querySelector('.slash-item.is-selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  });
}

function handleKeyNavigation(e: KeyboardEvent) {
  if (!props.visible) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    e.stopPropagation();
    if (filteredItems.value.length > 0) {
      selectedIndex.value = (selectedIndex.value + 1) % filteredItems.value.length;
      scrollToSelected();
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    e.stopPropagation();
    if (filteredItems.value.length > 0) {
      selectedIndex.value =
        (selectedIndex.value - 1 + filteredItems.value.length) % filteredItems.value.length;
      scrollToSelected();
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    const target = filteredItems.value[selectedIndex.value];
    if (target) {
      selectItem(target);
    }
  } else if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    emit('close');
  }
}

function onWindowKeyDown(e: KeyboardEvent) {
  if (!props.visible) return;
  if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
    handleKeyNavigation(e);
  }
}

onMounted(() => {
  window.addEventListener('keydown', onWindowKeyDown, true);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKeyDown, true);
});
</script>

<style scoped>
.mind-slash-menu-shell {
  position: fixed;
  width: 285px;
  max-height: 420px;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #111827;
  box-sizing: border-box;
}

.slash-items-scroll-area {
  overflow-y: auto;
  max-height: 350px;
  padding: 6px 4px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

/* Custom subtle scrollbar */
.slash-items-scroll-area::-webkit-scrollbar {
  width: 5px;
}

.slash-items-scroll-area::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.14);
  border-radius: 3px;
}

.slash-section {
  display: flex;
  flex-direction: column;
  margin-bottom: 6px;
}

.slash-section-header {
  font-size: 11.5px;
  font-weight: 600;
  color: #868e96;
  padding: 6px 8px 4px 10px;
  user-select: none;
}

.slash-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.1s ease;
  user-select: none;
}

.slash-item:hover,
.slash-item.is-selected {
  background-color: #f1f3f5;
}

.slash-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 5px;
  color: #37352f;
  flex-shrink: 0;
}

.slash-item-details {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 2px;
}

.item-title {
  font-size: 13.5px;
  font-weight: 500;
  color: #111827;
  line-height: 1.3;
}

.item-subtitle {
  font-size: 12px;
  color: #868e96;
  white-space: nowrap;
}

.item-badge {
  background-color: #e7f5ff;
  color: #1971c2;
  font-size: 10.5px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  margin-left: 6px;
  white-space: nowrap;
}

.item-shortcut {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11.5px;
  color: #868e96;
  margin-left: auto;
  padding-left: 8px;
  flex-shrink: 0;
}

.no-items-notice {
  padding: 18px 12px;
  text-align: center;
  font-size: 12.5px;
  color: #868e96;
}

.slash-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 12px;
  border-top: 1px solid #e9ecef;
  background-color: #f8f9fa;
  user-select: none;
}

.slash-footer-label {
  font-size: 12px;
  color: #868e96;
}

.slash-footer-kbd {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10px;
  color: #495057;
  background-color: #ffffff;
  border: 1px solid #dee2e6;
  padding: 1px 5px;
  border-radius: 3px;
}
</style>
