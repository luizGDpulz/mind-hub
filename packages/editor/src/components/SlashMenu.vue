<template>
  <div
    v-if="visible"
    ref="menuRef"
    class="mind-slash-menu-shell"
    data-testid="slash-menu-shell"
    :style="{ top: `${top}px`, left: `${left}px` }"
    role="menu"
    aria-label="Slash commands"
    @keydown.stop="handleKeyNavigation"
  >
    <div class="slash-header">
      <Search :size="13" class="search-icon" />
      <input
        ref="searchInputRef"
        :value="query"
        type="text"
        class="slash-search-input"
        data-testid="slash-search-input"
        placeholder="Filtrar blocos..."
        @input="emit('update:query', ($event.target as HTMLInputElement).value)"
        @keydown.stop="handleKeyNavigation"
      >
    </div>

    <div v-if="filteredItems.length === 0" class="no-items-notice" data-testid="no-slash-items">
      Nenhum bloco encontrado
    </div>

    <div v-else class="slash-items-list" data-testid="slash-items-list">
      <div
        v-for="(item, idx) in filteredItems"
        :key="item.id"
        class="slash-item"
        :class="{ 'is-selected': idx === selectedIndex }"
        data-testid="slash-item"
        :data-item-id="item.id"
        @click="selectItem(item)"
        @mouseenter="selectedIndex = idx"
      >
        <div class="slash-item-icon">
          <component :is="item.icon" :size="16" />
        </div>
        <div class="slash-item-details">
          <div class="item-title">{{ item.title }}</div>
          <div class="item-desc">{{ item.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { Search } from 'lucide-vue-next';
import type { SlashMenuItem } from '../types.js';
import { filterSlashItems } from '../extensions/slash-command.js';

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
const searchInputRef = ref<HTMLInputElement | null>(null);
const menuRef = ref<HTMLDivElement | null>(null);

const filteredItems = computed(() => {
  return filterSlashItems(props.items, props.query);
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
      nextTick(() => {
        searchInputRef.value?.focus();
      });
    }
  }
);

function selectItem(item: SlashMenuItem) {
  emit('select', item);
}

function handleKeyNavigation(e: KeyboardEvent) {
  if (!props.visible) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (filteredItems.value.length > 0) {
      selectedIndex.value = (selectedIndex.value + 1) % filteredItems.value.length;
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (filteredItems.value.length > 0) {
      selectedIndex.value =
        (selectedIndex.value - 1 + filteredItems.value.length) % filteredItems.value.length;
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const target = filteredItems.value[selectedIndex.value];
    if (target) {
      selectItem(target);
    }
  } else if (e.key === 'Escape') {
    e.preventDefault();
    emit('close');
  }
}
</script>

<style scoped>
.mind-slash-menu-shell {
  position: fixed;
  width: 280px;
  max-height: 320px;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: system-ui, -apple-system, sans-serif;
}

.slash-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-bottom: 1px solid #f1f1ef;
}

.search-icon {
  color: #9b9a97;
  flex-shrink: 0;
}

.slash-search-input {
  border: none;
  background: none;
  width: 100%;
  font-size: 0.8125rem;
  color: #37352f;
  outline: none;
}

.slash-items-list {
  overflow-y: auto;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.slash-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.slash-item:hover,
.slash-item.is-selected {
  background-color: #f8f9fa;
}

.slash-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background-color: #f1f1ef;
  color: #37352f;
  flex-shrink: 0;
}

.slash-item-details {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #37352f;
  line-height: 1.2;
}

.item-desc {
  font-size: 0.725rem;
  color: #9b9a97;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.no-items-notice {
  padding: 12px;
  text-align: center;
  font-size: 0.8125rem;
  color: #9b9a97;
}
</style>
