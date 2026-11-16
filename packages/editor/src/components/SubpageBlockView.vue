<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/vue-3';
import { ArrowRight, ChevronRight, File, FileText } from 'lucide-vue-next';
import { getBlockColorDisplayHex } from '../extensions/block-color.js';
import { parseLucideIconValue } from '../extensions/callout-icons.js';
import type { PageReference } from '../types.js';

const props = defineProps<NodeViewProps>();

const isHovered = ref(false);
let hoverTimer: ReturnType<typeof setTimeout> | null = null;
let hasPointerMoved = false;

const pageId = computed(() => String(props.node.attrs.pageId ?? ''));

const livePage = computed<PageReference | undefined>(() => {
  const getPages = props.extension.options.getPages as (() => PageReference[]) | undefined;
  const pages = getPages ? getPages() : [];
  if (!pageId.value) return undefined;
  return pages.find((p) => p.id === pageId.value);
});

const displayTitle = computed(
  () => livePage.value?.title ?? (String(props.node.attrs.title ?? 'Nova Nota') || 'Nova Nota'),
);

const displayIcon = computed(
  () => livePage.value?.icon ?? String(props.node.attrs.icon ?? ''),
);

const hasContent = computed(() => Boolean(livePage.value?.hasContent));

const isDefaultIcon = computed(() => {
  const v = displayIcon.value.trim();
  return !v || v === '📄' || v === '📑' || v === '📁';
});

const parsedLucide = computed(() => parseLucideIconValue(displayIcon.value));

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

function startHoverTimer(): void {
  if (hoverTimer) clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => {
    isHovered.value = true;
  }, 260);
}

function handleMouseEnter(): void {
  if (!hasPointerMoved) return;
  startHoverTimer();
}

function handleMouseMove(): void {
  if (!hasPointerMoved) {
    hasPointerMoved = true;
    startHoverTimer();
  }
}

function handleMouseLeave(): void {
  if (hoverTimer) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }
  isHovered.value = false;
}

function handleNavigate(): void {
  handleMouseLeave();
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
    @mousemove="handleMouseMove"
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
        <component
          :is="parsedLucide.component"
          v-else-if="parsedLucide?.component"
          :size="16"
          :stroke-width="1.75"
          class="mind-subpage-lucide-icon"
          :style="parsedLucide.colorHex ? { color: parsedLucide.colorHex } : undefined"
        />
        <FileText
          v-else-if="isDefaultIcon && hasContent"
          :size="16"
          :stroke-width="1.75"
          class="mind-subpage-default-icon"
        />
        <File
          v-else-if="isDefaultIcon"
          :size="16"
          :stroke-width="1.75"
          class="mind-subpage-default-icon"
        />
        <span v-else>{{ displayIcon }}</span>
      </span>
      <span class="mind-subpage-title">{{ displayTitle }}</span>
      <span class="mind-subpage-trailing-clean" aria-hidden="true">
        <ArrowRight :size="14" :stroke-width="1.75" />
      </span>
      <span class="mind-subpage-trailing-card" aria-hidden="true">
        <ChevronRight :size="15" :stroke-width="1.75" />
      </span>
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
        <component
          :is="parsedLucide.component"
          v-else-if="parsedLucide?.component"
          :size="22"
          :stroke-width="1.75"
          class="mind-subpage-lucide-icon"
          :style="parsedLucide.colorHex ? { color: parsedLucide.colorHex } : undefined"
        />
        <FileText
          v-else-if="isDefaultIcon && hasContent"
          :size="22"
          :stroke-width="1.75"
          class="mind-subpage-default-icon"
        />
        <File
          v-else-if="isDefaultIcon"
          :size="22"
          :stroke-width="1.75"
          class="mind-subpage-default-icon"
        />
        <span v-else>{{ displayIcon }}</span>
      </div>
      <div class="preview-card-category">
        {{ livePage?.category || 'Subnota' }}
      </div>
      <div class="preview-card-title">{{ displayTitle }}</div>
      <div v-if="displaySummary" class="preview-card-body">
        {{ displaySummary }}
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.mind-subpage-block-wrapper {
  position: relative;
  margin: 2px -10px;
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
  color: #212529;
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

.mind-subpage-default-icon {
  color: #868e96;
  flex-shrink: 0;
}

.mind-subpage-lucide-icon {
  color: #495057;
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
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

/* Opção A (Clean Docmost/Linear row - default) */
.mind-subpage-trailing-clean {
  display: inline-flex;
  align-items: center;
  color: #868e96;
  opacity: 0;
  transform: translateX(-3px);
  transition: opacity 0.14s ease, transform 0.14s ease;
  flex-shrink: 0;
}

.mind-subpage-row:hover .mind-subpage-trailing-clean {
  opacity: 1;
  transform: translateX(0);
}

.mind-subpage-trailing-card {
  display: none;
  align-items: center;
  color: #868e96;
  flex-shrink: 0;
}

/* Opção B (Compact Obsidian-like bordered card) */
:global(.mind-subnote-style-card) .mind-subpage-row {
  min-height: 36px;
  padding: 6px 12px;
  background-color: #f8f9fa;
  border-color: #e9ecef;
  border-radius: 7px;
}

:global(.mind-subnote-style-card) .mind-subpage-row:hover {
  background-color: #f1f3f5;
  border-color: #dee2e6;
}

:global(.mind-subnote-style-card) .mind-subpage-trailing-clean {
  display: none;
}

:global(.mind-subnote-style-card) .mind-subpage-trailing-card {
  display: inline-flex;
}

.mind-subpage-preview-card {
  position: absolute;
  left: 0;
  top: calc(100% + 4px);
  z-index: 40;
  width: 270px;
  padding: 12px 14px;
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(33, 37, 41, 0.1);
  pointer-events: none;
}

.preview-card-icon {
  font-size: 22px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
}

.preview-card-category {
  font-size: 11px;
  font-weight: 500;
  color: #868e96;
  margin-bottom: 2px;
}

.preview-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 4px;
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
