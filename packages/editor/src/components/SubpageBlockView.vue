<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/vue-3';
import { getBlockColorDisplayHex } from '../extensions/block-color.js';
import type { PageReference } from '../types.js';

const props = defineProps<NodeViewProps>();

const isHovered = ref(false);
let hoverTimer: ReturnType<typeof setTimeout> | null = null;

const pageId = computed(() => String(props.node.attrs.pageId ?? ''));

const livePage = computed<PageReference | undefined>(() => {
  const getPages = props.extension.options.getPages as (() => PageReference[]) | undefined;
  const pages = getPages ? getPages() : [];
  if (!pageId.value) return undefined;
  return pages.find((p) => p.id === pageId.value);
});

const displayTitle = computed(
  () => livePage.value?.title ?? (String(props.node.attrs.title ?? 'Subpágina') || 'Subpágina'),
);

const displayIcon = computed(
  () => livePage.value?.icon ?? (String(props.node.attrs.icon ?? '📄') || '📄'),
);

const displaySummary = computed(
  () => livePage.value?.summary ?? String(props.node.attrs.summary ?? ''),
);

const isImageIcon = computed(() => {
  const v = displayIcon.value.trim();
  return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/api/assets/') || v.startsWith('data:image/');
});

const effectiveBgColor = computed(() => {
  const bg = props.node.attrs.bgColor || props.node.attrs.color;
  const resolved = getBlockColorDisplayHex(bg, 'bg');
  return resolved === 'transparent' ? undefined : resolved;
});

const effectiveTextColor = computed(() => {
  const text = props.node.attrs.textColor;
  if (!text || text === 'default') return undefined;
  return getBlockColorDisplayHex(text, 'text');
});

function handleMouseEnter(): void {
  if (hoverTimer) clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => {
    isHovered.value = true;
  }, 240);
}

function handleMouseLeave(): void {
  if (hoverTimer) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }
  isHovered.value = false;
}

function handleNavigate(): void {
  if (!pageId.value) return;
  const onNavigate = props.extension.options.onNavigate as ((id: string) => void) | undefined;
  onNavigate?.(pageId.value);
}

onBeforeUnmount(() => {
  if (hoverTimer) clearTimeout(hoverTimer);
});
</script>

<template>
  <NodeViewWrapper
    class="mind-subpage-block-wrapper"
    :class="{ 'is-selected': selected }"
    data-testid="subpage-block-view"
    contenteditable="false"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <button
      type="button"
      class="mind-subpage-row"
      data-testid="subpage-block-link"
      :style="{
        backgroundColor: effectiveBgColor,
        color: effectiveTextColor,
      }"
      @click="handleNavigate"
    >
      <span class="mind-subpage-icon" aria-hidden="true">
        <img v-if="isImageIcon" :src="displayIcon" alt="" class="mind-subpage-icon-img" />
        <span v-else>{{ displayIcon }}</span>
      </span>
      <span class="mind-subpage-title">{{ displayTitle }}</span>
    </button>

    <!-- Notion-like Hover Preview Card -->
    <div
      v-if="isHovered"
      class="mind-subpage-preview-card"
      data-testid="subpage-preview-card"
      role="tooltip"
    >
      <div class="preview-card-icon">
        <img v-if="isImageIcon" :src="displayIcon" alt="" class="mind-subpage-icon-img" />
        <span v-else>{{ displayIcon }}</span>
      </div>
      <div class="preview-card-category">
        {{ livePage?.category || 'Subpágina' }}
      </div>
      <div class="preview-card-title">{{ displayTitle }}</div>
      <div class="preview-card-body">
        {{ displaySummary || 'Clique para abrir e editar esta página.' }}
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.mind-subpage-block-wrapper {
  position: relative;
  margin: 3px 0;
  user-select: none;
}

.mind-subpage-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 32px;
  padding: 5px 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #111827;
  font-family: inherit;
  font-size: 14.5px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.14s ease, border-color 0.14s ease;
}

.mind-subpage-row:hover {
  background-color: #f8f9fa;
  border-color: #e9ecef;
}

.mind-subpage-block-wrapper.is-selected .mind-subpage-row {
  border-color: #cbd5e1;
  background-color: #f1f3f5;
}

.mind-subpage-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
}

.mind-subpage-icon-img {
  width: 18px;
  height: 18px;
  object-fit: cover;
  border-radius: 4px;
}

.mind-subpage-title {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: rgba(17, 24, 39, 0.25);
  text-underline-offset: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mind-subpage-preview-card {
  position: absolute;
  left: 12px;
  top: calc(100% + 4px);
  z-index: 40;
  width: 270px;
  padding: 12px 14px;
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(17, 24, 39, 0.1);
  pointer-events: none;
}

.preview-card-icon {
  font-size: 22px;
  margin-bottom: 6px;
}

.preview-card-category {
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 2px;
}

.preview-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}

.preview-card-body {
  padding: 8px 10px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  background: #f8f9fa;
  font-size: 12px;
  line-height: 1.45;
  color: #4b5563;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
