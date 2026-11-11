<template>
  <div
    class="mind-sidebar-search-bar"
    data-testid="sidebar-search-trigger"
    role="button"
    tabindex="0"
    aria-label="Abrir busca global"
    @click="$emit('open')"
    @keydown.enter="$emit('open')"
    @keydown.space.prevent="$emit('open')"
  >
    <div class="search-left">
      <Search :size="14" class="search-icon" />
      <span class="search-placeholder">Busque ou peça</span>
    </div>
    <kbd class="search-kbd-badge">Ctrl+K</kbd>
  </div>
</template>

<script setup lang="ts">
import { Search } from 'lucide-vue-next';

defineEmits<{
  (e: 'open'): void;
}>();
</script>

<style scoped>
.mind-sidebar-search-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--mind-bg-surface-subtle);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease;
  user-select: none;
  margin-bottom: 8px;
}

.mind-sidebar-search-bar:hover {
  background: #eaedf0;
  border-color: #dee2e6;
}

.search-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.search-icon {
  color: var(--mind-text-muted);
  flex-shrink: 0;
}

.search-placeholder {
  font-size: 13px;
  color: var(--mind-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-kbd-badge {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--mind-text-muted);
  background: var(--mind-bg-canvas);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 4px;
  padding: 1px 5px;
  line-height: 1.2;
}
</style>
