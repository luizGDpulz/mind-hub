<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  AlertOctagon,
  AlertTriangle,
  Flame,
  Info,
  Lightbulb,
  Search,
  Shuffle,
} from 'lucide-vue-next';
import type { CalloutType } from '../types.js';
import {
  EMOJI_CATEGORIES,
  LUCIDE_ICON_CATALOG,
  formatLucideIconValue,
  getRandomPickerIcon,
  isLucideIconValue,
} from '../extensions/callout-icons.js';

const props = withDefaults(
  defineProps<{
    modelValue?: string | null;
    allowRemove?: boolean;
    calloutType?: CalloutType;
    showCalloutTone?: boolean;
  }>(),
  {
    modelValue: null,
    allowRemove: true,
    calloutType: 'note',
    showCalloutTone: false,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void;
  (e: 'select', value: string): void;
  (e: 'remove'): void;
  (e: 'selectType', type: CalloutType): void;
}>();

const activeTab = ref<'emoji' | 'icons'>(
  isLucideIconValue(props.modelValue) ? 'icons' : 'emoji'
);
const searchQuery = ref('');

const toneOptions: Array<{
  type: CalloutType;
  label: string;
  swatch: string;
  border: string;
  icon: typeof Info;
}> = [
  { type: 'note', label: 'Padrão', swatch: '#f8f9fa', border: '#dee2e6', icon: Info },
  { type: 'tip', label: 'Dica', swatch: '#ebfbee', border: '#b2f2bb', icon: Lightbulb },
  { type: 'important', label: 'Importante', swatch: '#fff4e6', border: '#ffd8a8', icon: Flame },
  { type: 'warning', label: 'Aviso', swatch: '#fff9db', border: '#ffec99', icon: AlertTriangle },
  { type: 'caution', label: 'Cuidado', swatch: '#fff5f5', border: '#ffc9c9', icon: AlertOctagon },
];

const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase());

const filteredEmojiCategories = computed(() => {
  const q = normalizedQuery.value;
  if (!q) return EMOJI_CATEGORIES;

  return EMOJI_CATEGORIES.map((category) => ({
    ...category,
    items: category.items.filter(
      (item) =>
        item.char.includes(q) ||
        category.label.toLowerCase().includes(q) ||
        item.keywords.some((kw) => kw.toLowerCase().includes(q))
    ),
  })).filter((category) => category.items.length > 0);
});

const filteredLucideIcons = computed(() => {
  const q = normalizedQuery.value;
  if (!q) return LUCIDE_ICON_CATALOG;

  return LUCIDE_ICON_CATALOG.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      item.keywords.some((kw) => kw.toLowerCase().includes(q))
  );
});

function pickIcon(value: string): void {
  emit('update:modelValue', value);
  emit('select', value);
}

function handleRandomPick(): void {
  const value = getRandomPickerIcon(activeTab.value);
  pickIcon(value);
}

function handleRemove(): void {
  emit('update:modelValue', null);
  emit('remove');
}
</script>

<template>
  <div
    class="mind-icon-picker-shell"
    data-testid="mind-icon-picker"
    @click.stop
    @mousedown.stop
  >
    <!-- Header Tabs: Emoji | Ícones + Remover -->
    <div class="picker-tabs-row">
      <div class="picker-tabs-left" role="tablist" aria-label="Tipo de ícone">
        <button
          type="button"
          role="tab"
          class="picker-tab-btn"
          :class="{ 'is-active': activeTab === 'emoji' }"
          :aria-selected="activeTab === 'emoji'"
          data-testid="icon-picker-tab-emoji"
          @click="activeTab = 'emoji'"
        >
          Emoji
        </button>
        <button
          type="button"
          role="tab"
          class="picker-tab-btn"
          :class="{ 'is-active': activeTab === 'icons' }"
          :aria-selected="activeTab === 'icons'"
          data-testid="icon-picker-tab-icons"
          @click="activeTab = 'icons'"
        >
          Ícones
        </button>
      </div>

      <button
        v-if="allowRemove"
        type="button"
        class="picker-remove-btn"
        data-testid="icon-picker-remove"
        @click="handleRemove"
      >
        Remover
      </button>
    </div>

    <!-- Search + Random Button -->
    <div class="picker-toolbar-row">
      <div class="picker-search-wrap">
        <Search :size="13" class="picker-search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          class="picker-search-input"
          data-testid="icon-picker-search"
          placeholder="Filtrar..."
          aria-label="Filtrar emojis e ícones"
        >
      </div>

      <button
        type="button"
        class="picker-random-btn"
        title="Escolher ícone aleatório"
        aria-label="Escolher ícone aleatório"
        data-testid="icon-picker-random"
        @click="handleRandomPick"
      >
        <Shuffle :size="14" />
      </button>
    </div>

    <!-- Tab Body: Emoji Grid or Lucide Icons Grid -->
    <div class="picker-scroll-body">
      <template v-if="activeTab === 'emoji'">
        <div
          v-if="filteredEmojiCategories.length === 0"
          class="picker-empty-state"
        >
          Nenhum emoji encontrado para "{{ searchQuery }}"
        </div>

        <div
          v-for="category in filteredEmojiCategories"
          :key="category.id"
          class="picker-category-block"
        >
          <div class="picker-category-title">{{ category.label }}</div>
          <div class="picker-emoji-grid">
            <button
              v-for="item in category.items"
              :key="item.char"
              type="button"
              class="picker-grid-cell picker-emoji-cell"
              :class="{ 'is-selected': modelValue === item.char }"
              :data-testid="`emoji-option-${item.char}`"
              :title="item.keywords[0]"
              @click="pickIcon(item.char)"
            >
              {{ item.char }}
            </button>
          </div>
        </div>
      </template>

      <template v-else>
        <div
          v-if="filteredLucideIcons.length === 0"
          class="picker-empty-state"
        >
          Nenhum ícone encontrado para "{{ searchQuery }}"
        </div>

        <div v-else class="picker-category-block">
          <div class="picker-category-title">Ícones do sistema</div>
          <div class="picker-emoji-grid">
            <button
              v-for="item in filteredLucideIcons"
              :key="item.id"
              type="button"
              class="picker-grid-cell picker-lucide-cell"
              :class="{ 'is-selected': modelValue === formatLucideIconValue(item.id) }"
              :data-testid="`lucide-option-${item.id}`"
              :title="item.label"
              :aria-label="item.label"
              @click="pickIcon(formatLucideIconValue(item.id))"
            >
              <component :is="item.component" :size="16" :stroke-width="1.9" />
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Optional Callout Tone Strip -->
    <div v-if="showCalloutTone" class="picker-tone-footer">
      <span class="picker-tone-label">Estilo</span>
      <div class="picker-tone-pills">
        <button
          v-for="tone in toneOptions"
          :key="tone.type"
          type="button"
          class="picker-tone-btn"
          :class="{ 'is-active': calloutType === tone.type }"
          :style="{ backgroundColor: tone.swatch, borderColor: tone.border }"
          :title="tone.label"
          :aria-label="`Estilo ${tone.label}`"
          :data-testid="`callout-option-${tone.type}`"
          @click="emit('selectType', tone.type)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mind-icon-picker-shell {
  width: 316px;
  max-width: calc(100vw - 32px);
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  color: #111827;
}

.picker-tabs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px 0;
  border-bottom: 1px solid #f1f3f5;
}

.picker-tabs-left {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.picker-tab-btn {
  position: relative;
  border: none;
  background: transparent;
  padding: 6px 2px 8px;
  font-size: 13px;
  font-weight: 500;
  color: #6c757d;
  cursor: pointer;
  transition: color 0.12s ease;
}

.picker-tab-btn:hover {
  color: #111827;
}

.picker-tab-btn.is-active {
  color: #111827;
  font-weight: 600;
}

.picker-tab-btn.is-active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background-color: #111827;
  border-radius: 1px;
}

.picker-remove-btn {
  border: none;
  background: transparent;
  padding: 4px 6px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 500;
  color: #6c757d;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.picker-remove-btn:hover {
  background-color: #f8f9fa;
  color: #c92a2a;
}

.picker-toolbar-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
}

.picker-search-wrap {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 4px 8px;
  transition: border-color 0.12s ease, background-color 0.12s ease;
}

.picker-search-wrap:focus-within {
  background-color: #ffffff;
  border-color: #adb5bd;
}

.picker-search-icon {
  color: #868e96;
  flex-shrink: 0;
}

.picker-search-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12.5px;
  color: #111827;
  font-family: inherit;
}

.picker-search-input::placeholder {
  color: #adb5bd;
}

.picker-random-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  background-color: #ffffff;
  color: #495057;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.12s ease, border-color 0.12s ease;
}

.picker-random-btn:hover {
  background-color: #f1f3f5;
  border-color: #dee2e6;
}

.picker-scroll-body {
  max-height: 230px;
  overflow-y: auto;
  padding: 2px 10px 10px;
}

.picker-category-block + .picker-category-block {
  margin-top: 10px;
}

.picker-category-title {
  font-size: 11px;
  font-weight: 600;
  color: #868e96;
  margin-bottom: 6px;
}

.picker-emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
}

.picker-grid-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.picker-emoji-cell {
  font-size: 17px;
  line-height: 1;
}

.picker-lucide-cell {
  color: #495057;
}

.picker-grid-cell:hover {
  background-color: #f1f3f5;
}

.picker-grid-cell.is-selected {
  background-color: #e9ecef;
  box-shadow: inset 0 0 0 1px #ced4da;
}

.picker-empty-state {
  padding: 20px 8px;
  text-align: center;
  font-size: 12px;
  color: #868e96;
}

.picker-tone-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  background-color: #f8f9fa;
  border-top: 1px solid #f1f3f5;
}

.picker-tone-label {
  font-size: 11px;
  font-weight: 600;
  color: #868e96;
}

.picker-tone-pills {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.picker-tone-btn {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1.5px solid #dee2e6;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.picker-tone-btn:hover {
  transform: scale(1.1);
}

.picker-tone-btn.is-active {
  box-shadow: 0 0 0 2px #ffffff, 0 0 0 3.5px #495057;
}
</style>
