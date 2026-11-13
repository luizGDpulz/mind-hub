<template>
  <div
    class="mind-subpage-link-row"
    :data-testid="`subpage-link-${page.id}`"
    @click="$emit('navigate', page.id)"
  >
    <span class="subpage-icon">
      <MindPageIcon :icon="page.icon" :size="15" />
    </span>
    <span class="subpage-title">{{ page.title }}</span>
  </div>
</template>

<script setup lang="ts">
import type { MindPage } from '@mind-hub/shared';
import MindPageIcon from './MindPageIcon.vue';

defineProps<{
  page: MindPage;
}>();

defineEmits<{
  (e: 'navigate', pageId: string): void;
}>();

function isImageUrl(val: string): boolean {
  return (
    val.startsWith('http://') ||
    val.startsWith('https://') ||
    val.startsWith('data:image/') ||
    val.startsWith('/')
  );
}
</script>

<style scoped>
.mind-subpage-link-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--mind-text-primary);
  font-size: 14.5px;
  font-weight: 500;
  transition: background-color 0.12s ease;
  user-select: none;
}

.mind-subpage-link-row:hover {
  background: var(--mind-bg-hover);
}

.subpage-icon {
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.subpage-custom-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  border-radius: 3px;
}

.subpage-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-bottom: 1px solid transparent;
}

.mind-subpage-link-row:hover .subpage-title {
  border-bottom-color: var(--mind-border-subtle);
}
</style>
