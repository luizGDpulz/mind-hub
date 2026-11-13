<template>
  <img
    v-if="icon && isImageUrl(icon)"
    :src="icon"
    class="mind-page-icon-img"
    :style="imgStyle"
    alt=""
  />
  <component
    :is="parsedLucide.component"
    v-else-if="parsedLucide?.component"
    :size="size"
    :stroke-width="strokeWidth"
    class="mind-page-icon-lucide"
    :style="parsedLucide.colorHex ? { color: parsedLucide.colorHex } : undefined"
    data-testid="mind-page-lucide-icon"
  />
  <FileText
    v-else-if="!icon || icon === '📄'"
    :size="size"
    :stroke-width="strokeWidth"
    class="mind-page-icon-default"
    data-testid="mind-page-default-icon"
  />
  <span v-else class="mind-page-icon-emoji" :style="{ fontSize: `${emojiSize}px` }">
    {{ icon }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { FileText } from 'lucide-vue-next';
import { parseLucideIconValue } from '@mind-hub/editor';
import { isImageUrl } from '../../utils/media.js';

const props = withDefaults(
  defineProps<{
    icon?: string | null;
    size?: number;
    strokeWidth?: number;
  }>(),
  {
    icon: '',
    size: 16,
    strokeWidth: 1.75,
  },
);

const parsedLucide = computed(() => parseLucideIconValue(props.icon));
const emojiSize = computed(() => Math.max(13, Math.round(props.size * 0.92)));
const imgStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}));
</script>

<style scoped>
.mind-page-icon-img {
  object-fit: contain;
  border-radius: 4px;
  display: inline-block;
  flex-shrink: 0;
}

.mind-page-icon-lucide {
  color: var(--mind-text-secondary, #495057);
  flex-shrink: 0;
  display: inline-block;
}

.mind-page-icon-default {
  color: var(--mind-text-muted, #868e96);
  flex-shrink: 0;
  display: inline-block;
}

.mind-page-icon-emoji {
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
