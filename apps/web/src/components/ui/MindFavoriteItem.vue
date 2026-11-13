<template>
  <div
    class="sidebar-fav-item"
    :class="{
      'is-active': activePageId === page.id,
      'is-renaming': isRenaming,
    }"
    data-testid="sidebar-fav-item"
    :data-page-id="page.id"
    @click="handleRowClick"
    @contextmenu.prevent="handleContextMenu($event)"
  >
    <!-- Leading Icon (Emoji or Custom URL) -->
    <span class="fav-icon">
      <MindPageIcon :icon="page.icon" :size="15" />
    </span>

    <!-- Inline Rename Input or Title -->
    <input
      v-if="isRenaming"
      ref="renameInputRef"
      v-model="renameBuffer"
      type="text"
      class="fav-rename-input"
      data-testid="fav-rename-input"
      @click.stop
      @keydown.enter="submitRename"
      @keydown.esc="cancelRename"
      @blur="submitRename"
    />
    <span v-else class="fav-title">{{ page.title }}</span>

    <!-- Notion-like Hover Action Buttons: '+' and '...' -->
    <div v-if="!isRenaming" class="fav-action-buttons" @click.stop>
      <button
        type="button"
        class="fav-action-icon-btn"
        title="Nova subpágina"
        aria-label="Criar subpágina"
        data-testid="fav-add-child-btn"
        @click.stop="$emit('create-child', page.id)"
      >
        <Plus :size="14" />
      </button>
      <button
        type="button"
        class="fav-action-icon-btn"
        title="Remova, renomeie e..."
        aria-label="Mais opções"
        data-testid="fav-more-options-btn"
        @click.stop="handleContextMenu($event)"
      >
        <MoreHorizontal :size="14" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { MoreHorizontal, Plus } from 'lucide-vue-next';
import type { MindPage } from '@mind-hub/shared';
import MindPageIcon from './MindPageIcon.vue';

const props = withDefaults(
  defineProps<{
    page: MindPage;
    activePageId: string;
    renamingId?: string;
  }>(),
  {
    renamingId: '',
  },
);

const emit = defineEmits<{
  (e: 'select', pageId: string): void;
  (e: 'create-child', pageId: string): void;
  (e: 'contextmenu', event: MouseEvent, page: MindPage): void;
  (e: 'rename-save', pageId: string, newTitle: string): void;
}>();

const renameBuffer = ref(props.page.title);
const renameInputRef = ref<HTMLInputElement | null>(null);

const isRenaming = computed(() => props.renamingId === props.page.id);

watch(
  isRenaming,
  (val) => {
    if (val) {
      renameBuffer.value = props.page.title;
      nextTick(() => {
        renameInputRef.value?.focus();
        renameInputRef.value?.select();
      });
    }
  },
  { immediate: true },
);

function isImageUrl(val: string): boolean {
  return (
    val.startsWith('http://') ||
    val.startsWith('https://') ||
    val.startsWith('data:image/') ||
    val.startsWith('/')
  );
}

function handleRowClick(): void {
  if (!isRenaming.value) {
    emit('select', props.page.id);
  }
}

function handleContextMenu(event: MouseEvent): void {
  emit('contextmenu', event, props.page);
}

function submitRename(): void {
  if (isRenaming.value) {
    const trimmed = renameBuffer.value.trim();
    if (trimmed && trimmed !== props.page.title) {
      emit('rename-save', props.page.id, trimmed);
    } else {
      cancelRename();
    }
  }
}

function cancelRename(): void {
  emit('rename-save', '', '');
}
</script>

<style scoped>
.sidebar-fav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 13.5px;
  color: var(--mind-text-secondary);
  cursor: pointer;
  user-select: none;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.sidebar-fav-item:hover {
  background: var(--mind-bg-hover);
  color: var(--mind-text-primary);
}

.sidebar-fav-item.is-active {
  background: var(--mind-bg-active);
  color: var(--mind-text-primary);
  font-weight: 500;
}

.fav-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.fav-custom-img-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  border-radius: 3px;
}

.fav-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
  line-height: 1.35;
}

.fav-rename-input {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 1.35;
  padding: 2px 6px;
  border: 1px solid var(--mind-accent-primary, #1971c2);
  border-radius: 4px;
  background: #ffffff;
  color: var(--mind-text-primary, #111827);
  outline: none;
}

.fav-action-buttons {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.12s ease;
  margin-left: auto;
  flex-shrink: 0;
}

.sidebar-fav-item:hover .fav-action-buttons,
.sidebar-fav-item:focus-within .fav-action-buttons {
  opacity: 1;
}

.fav-action-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--mind-text-muted);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.fav-action-icon-btn:hover {
  background: var(--mind-bg-active);
  color: var(--mind-text-primary);
}
</style>
