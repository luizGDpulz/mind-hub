<template>
  <div
    class="popover-submenu-anchor"
    @mouseenter="emit('open')"
  >
    <button
      type="button"
      class="popover-item"
      :class="{ 'is-active': active }"
      data-testid="menu-trigger-color"
      @mouseenter="emit('open')"
      @click="emit('toggle')"
    >
      <PaintRoller :size="14" class="item-icon" />
      <span class="item-label">Cor</span>
      <span
        v-if="activeColorIndicator"
        class="active-color-pill"
        :style="activeColorIndicator"
      >
        A
      </span>
      <ChevronRight :size="13" class="chevron-right" />
    </button>

    <div
      v-if="active"
      class="popover-submenu popover-submenu-color-hub"
      data-testid="submenu-color"
    >
      <!-- Quick Access: Last Used Text & Background Colors -->
      <template v-if="lastUsedTextColor || lastUsedBgColor">
        <div class="section-title">Usada recentemente</div>

        <button
          v-if="lastUsedTextColor"
          type="button"
          class="popover-item"
          data-testid="quick-last-text-color"
          @mouseenter="activeColorSubgroup = null"
          @click="emit('selectColor', { textColor: lastUsedTextColor })"
        >
          <span
            class="color-swatch-letter"
            :style="{ color: getBlockColorDisplayHex(lastUsedTextColor, 'text') }"
          >
            A
          </span>
          <span class="item-label">Texto: {{ getBlockColorOption(lastUsedTextColor).label }}</span>
        </button>

        <button
          v-if="lastUsedBgColor"
          type="button"
          class="popover-item"
          data-testid="quick-last-bg-color"
          @mouseenter="activeColorSubgroup = null"
          @click="emit('selectColor', { backgroundColor: lastUsedBgColor })"
        >
          <span
            class="color-swatch-bg"
            :style="{
              backgroundColor: getBlockColorDisplayHex(lastUsedBgColor, 'bg'),
              color: '#37352f',
            }"
          >
            A
          </span>
          <span class="item-label">Fundo: {{ getBlockColorOption(lastUsedBgColor).label }}</span>
        </button>

        <div class="popover-divider" />
      </template>

      <div class="section-title">Cores</div>

      <!-- Subselection 1: Cor do texto > -->
      <div
        class="popover-submenu-anchor"
        @mouseenter="openColorSubgroup('text')"
      >
        <button
          type="button"
          class="popover-item"
          :class="{ 'is-active': activeColorSubgroup === 'text' }"
          data-testid="submenu-color-text-trigger"
          @mouseenter="openColorSubgroup('text')"
          @click="toggleColorSubgroup('text')"
        >
          <span
            class="color-swatch-letter"
            :style="{ color: activeTextSwatchHex }"
          >
            A
          </span>
          <span class="item-label">Cor do texto</span>
          <ChevronRight :size="13" class="chevron-right" />
        </button>

        <div
          v-if="activeColorSubgroup === 'text'"
          class="popover-submenu popover-submenu-nested"
          data-testid="submenu-color-text"
        >
          <div class="section-title">Cor do texto</div>
          <button
            v-for="color in BLOCK_COLOR_PALETTE"
            :key="`text-${color.id}`"
            type="button"
            class="popover-item"
            :class="{ 'is-active': isTextColorActive(color.id) }"
            :data-testid="`text-color-${color.id}`"
            @click="emit('selectColor', { textColor: color.id })"
          >
            <span
              class="color-swatch-letter"
              :style="{ color: color.textColor }"
            >
              A
            </span>
            <span class="item-label">{{ color.label }}</span>
            <Check v-if="isTextColorActive(color.id)" :size="13" class="item-check" />
          </button>

          <div class="popover-divider" />

          <button
            type="button"
            class="popover-item"
            :class="{ 'is-active': showCustomTextPicker }"
            data-testid="custom-text-color-trigger"
            @click="toggleCustomPicker('text')"
          >
            <span
              class="color-swatch-letter"
              :style="{ color: isCustomHexColor(normalizedTextColor) ? normalizedTextColor! : '#212529' }"
            >
              A
            </span>
            <span class="item-label">Personalizada...</span>
            <Pipette :size="13" class="chevron-right" />
          </button>

          <MindColorPicker
            v-if="showCustomTextPicker"
            mode="text"
            :initial-color="isCustomHexColor(normalizedTextColor) ? normalizedTextColor : activeTextSwatchHex"
            @apply="emit('selectColor', { textColor: $event })"
          />
        </div>
      </div>

      <!-- Subselection 2: Cor de fundo > -->
      <div
        class="popover-submenu-anchor"
        @mouseenter="openColorSubgroup('bg')"
      >
        <button
          type="button"
          class="popover-item"
          :class="{ 'is-active': activeColorSubgroup === 'bg' }"
          data-testid="submenu-color-bg-trigger"
          @mouseenter="openColorSubgroup('bg')"
          @click="toggleColorSubgroup('bg')"
        >
          <span
            class="color-swatch-bg"
            :style="{
              backgroundColor: activeBgSwatchHex === 'transparent' ? '#ffffff' : activeBgSwatchHex,
              color: '#37352f',
            }"
          >
            A
          </span>
          <span class="item-label">Cor de fundo</span>
          <ChevronRight :size="13" class="chevron-right" />
        </button>

        <div
          v-if="activeColorSubgroup === 'bg'"
          class="popover-submenu popover-submenu-nested"
          data-testid="submenu-color-bg"
        >
          <div class="section-title">Cor de fundo</div>
          <button
            v-for="color in BLOCK_COLOR_PALETTE"
            :key="`bg-${color.id}`"
            type="button"
            class="popover-item"
            :class="{ 'is-active': isBgColorActive(color.id) }"
            :data-testid="`bg-color-${color.id}`"
            @click="emit('selectColor', { backgroundColor: color.id })"
          >
            <span
              class="color-swatch-bg"
              :style="{
                backgroundColor:
                  color.backgroundColor === 'transparent' ? '#ffffff' : color.backgroundColor,
                color: '#37352f',
              }"
            >
              A
            </span>
            <span class="item-label">{{ color.label }}</span>
            <Check v-if="isBgColorActive(color.id)" :size="13" class="item-check" />
          </button>

          <div class="popover-divider" />

          <button
            type="button"
            class="popover-item"
            :class="{ 'is-active': showCustomBgPicker }"
            data-testid="custom-bg-color-trigger"
            @click="toggleCustomPicker('bg')"
          >
            <span
              class="color-swatch-bg"
              :style="{
                backgroundColor: isCustomHexColor(normalizedBgColor) ? normalizedBgColor! : '#f8f9fa',
                color: '#37352f',
              }"
            >
              A
            </span>
            <span class="item-label">Personalizada...</span>
            <Pipette :size="13" class="chevron-right" />
          </button>

          <MindColorPicker
            v-if="showCustomBgPicker"
            mode="bg"
            :initial-color="isCustomHexColor(normalizedBgColor) ? normalizedBgColor : (activeBgSwatchHex === 'transparent' ? '#e7f5ff' : activeBgSwatchHex)"
            @apply="emit('selectColor', { backgroundColor: $event })"
          />
        </div>
      </div>

      <!-- Quick Clear All Colors -->
      <template v-if="normalizedTextColor || normalizedBgColor">
        <div class="popover-divider" />
        <button
          type="button"
          class="popover-item"
          data-testid="reset-block-colors"
          @mouseenter="activeColorSubgroup = null"
          @click="emit('selectColor', { textColor: 'default', backgroundColor: 'default' })"
        >
          <RotateCcw :size="13" class="item-icon" />
          <span class="item-label">Restaurar padrão</span>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { PaintRoller, ChevronRight, Check, Pipette, RotateCcw } from 'lucide-vue-next';
import MindColorPicker from '../MindColorPicker.vue';
import type { BlockColorId, BlockColorUpdate } from '../../types.js';
import {
  BLOCK_COLOR_PALETTE,
  getBlockColorDisplayHex,
  getBlockColorOption,
  isCustomHexColor,
} from '../../extensions/block-color.js';
import type { ColorSubgroupName } from './gutter-helpers.js';

const props = defineProps<{
  active: boolean;
  normalizedTextColor: string | null;
  normalizedBgColor: string | null;
  lastUsedTextColor: string | null;
  lastUsedBgColor: string | null;
}>();

const emit = defineEmits<{
  (e: 'open'): void;
  (e: 'toggle'): void;
  (e: 'selectColor', payload: BlockColorUpdate): void;
}>();

const activeColorSubgroup = ref<ColorSubgroupName>(null);
const showCustomTextPicker = ref(false);
const showCustomBgPicker = ref(false);

const activeTextSwatchHex = computed(() =>
  getBlockColorDisplayHex(props.normalizedTextColor, 'text')
);
const activeBgSwatchHex = computed(() =>
  getBlockColorDisplayHex(props.normalizedBgColor, 'bg')
);

const activeColorIndicator = computed(() => {
  if (!props.normalizedTextColor && !props.normalizedBgColor) return null;
  return {
    color: activeTextSwatchHex.value,
    backgroundColor: activeBgSwatchHex.value === 'transparent' ? '#f8f9fa' : activeBgSwatchHex.value,
  };
});

watch(
  () => props.active,
  (isActive) => {
    if (!isActive) {
      activeColorSubgroup.value = null;
      showCustomTextPicker.value = false;
      showCustomBgPicker.value = false;
    }
  }
);

function isTextColorActive(id: BlockColorId): boolean {
  return (props.normalizedTextColor ?? 'default') === id;
}

function isBgColorActive(id: BlockColorId): boolean {
  return (props.normalizedBgColor ?? 'default') === id;
}

function openColorSubgroup(group: 'text' | 'bg') {
  activeColorSubgroup.value = group;
  if (group !== 'text') showCustomTextPicker.value = false;
  if (group !== 'bg') showCustomBgPicker.value = false;
}

function toggleColorSubgroup(group: 'text' | 'bg') {
  activeColorSubgroup.value = activeColorSubgroup.value === group ? null : group;
}

function toggleCustomPicker(group: 'text' | 'bg') {
  if (group === 'text') {
    showCustomTextPicker.value = !showCustomTextPicker.value;
    showCustomBgPicker.value = false;
  } else {
    showCustomBgPicker.value = !showCustomBgPicker.value;
    showCustomTextPicker.value = false;
  }
}
</script>

<style scoped src="./gutter-menu.css"></style>
