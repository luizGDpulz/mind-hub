<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import {
  AlertOctagon,
  AlertTriangle,
  Clock,
  Flag,
  Flame,
  Info,
  Leaf,
  LayoutGrid,
  Lightbulb,
  Plane,
  Search,
  Shuffle,
  Smile,
  Sparkles,
  Trophy,
  Upload,
  Utensils,
} from 'lucide-vue-next';
import type { CalloutType } from '../types.js';
import {
  EMOJI_CATEGORIES,
  LUCIDE_ICON_CATALOG,
  LUCIDE_ICON_COLORS,
  SKIN_TONE_OPTIONS,
  applyEmojiSkinTone,
  formatLucideIconValue,
  getRandomPickerIcon,
  isLucideIconValue,
  loadRecentEmojis,
  parseLucideIconValue,
  saveRecentEmoji,
} from '../extensions/callout-icons.js';

const INITIAL_LUCIDE_VISIBLE = 120;
const LUCIDE_PAGE_STEP = 120;
const MAX_SEARCH_RESULTS = 160;

const props = withDefaults(
  defineProps<{
    modelValue?: string | null;
    allowRemove?: boolean;
    allowUpload?: boolean;
    calloutType?: CalloutType;
    showCalloutTone?: boolean;
    onUploadFile?: (file: File) => Promise<string>;
  }>(),
  {
    modelValue: null,
    allowRemove: true,
    allowUpload: false,
    calloutType: 'note',
    showCalloutTone: false,
    onUploadFile: undefined,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void;
  (e: 'select', value: string): void;
  (e: 'remove'): void;
  (e: 'selectType', type: CalloutType): void;
}>();

function resolveInitialTab(value?: string | null): 'emoji' | 'icons' | 'upload' {
  if (isLucideIconValue(value)) return 'icons';
  if (
    props.allowUpload &&
    value &&
    (value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('/') ||
      value.startsWith('data:image/'))
  ) {
    return 'upload';
  }
  return 'emoji';
}

const activeTab = ref<'emoji' | 'icons' | 'upload'>(resolveInitialTab(props.modelValue));
const searchQuery = ref('');
const selectedSkinTone = ref<string>('');
const isSkinToneMenuOpen = ref(false);
const recentEmojis = ref<string[]>([]);
const loadedEmojiCategoryCount = ref<number>(3);
const visibleLucideCount = ref<number>(INITIAL_LUCIDE_VISIBLE);
const scrollBodyRef = ref<HTMLElement | null>(null);
const uploadUrlInput = ref('');
const uploadError = ref('');
const isUploadingFile = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

const initialParsedLucide = parseLucideIconValue(props.modelValue);
const selectedLucideColor = ref<string>(initialParsedLucide?.colorId ?? 'default');

watch(
  () => props.modelValue,
  (next) => {
    const parsed = parseLucideIconValue(next);
    if (parsed?.colorId) {
      selectedLucideColor.value = parsed.colorId;
    }
  }
);

onMounted(() => {
  recentEmojis.value = loadRecentEmojis();
});

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

const dockCategoryIcons: Record<string, typeof Smile> = {
  highlight: Sparkles,
  smileys_emotion: Smile,
  animals_nature: Leaf,
  food_drink: Utensils,
  activities: Trophy,
  travel_places: Plane,
  objects: Lightbulb,
  symbols: LayoutGrid,
  flags: Flag,
};

const dockCategories = computed(() =>
  EMOJI_CATEGORIES.filter((cat) => Boolean(dockCategoryIcons[cat.id]))
);

const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase());

const activeSkinTonePreview = computed(() => {
  const found = SKIN_TONE_OPTIONS.find((opt) => opt.modifier === selectedSkinTone.value);
  return found?.preview ?? '✋';
});

const activeLucideColorHex = computed(() => {
  const found = LUCIDE_ICON_COLORS.find((c) => c.id === selectedLucideColor.value);
  return found?.hex ?? '#495057';
});

const filteredEmojiCategories = computed(() => {
  const q = normalizedQuery.value;
  if (!q) {
    return EMOJI_CATEGORIES.slice(0, loadedEmojiCategoryCount.value);
  }

  let remaining = MAX_SEARCH_RESULTS;
  const matchedCategories: Array<{
    id: string;
    label: string;
    items: (typeof EMOJI_CATEGORIES)[number]['items'];
  }> = [];

  for (const category of EMOJI_CATEGORIES) {
    if (remaining <= 0) break;
    const catMatches = category.label.toLowerCase().includes(q);
    const items = category.items
      .filter(
        (item) =>
          catMatches ||
          item.char.includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.keywords.some((kw) => kw.includes(q))
      )
      .slice(0, remaining);
    if (items.length > 0) {
      remaining -= items.length;
      matchedCategories.push({
        ...category,
        items,
      });
    }
  }

  return matchedCategories;
});

const filteredLucideIcons = computed(() => {
  const q = normalizedQuery.value;
  if (!q) {
    return LUCIDE_ICON_CATALOG.slice(0, visibleLucideCount.value);
  }

  return LUCIDE_ICON_CATALOG.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      item.keywords.some((kw) => kw.includes(q))
  ).slice(0, MAX_SEARCH_RESULTS);
});

const currentParsedLucide = computed(() => parseLucideIconValue(props.modelValue));

function resolveRenderedEmoji(char: string, skinToneSupport?: boolean): string {
  if (!skinToneSupport || !selectedSkinTone.value) return char;
  return applyEmojiSkinTone(char, selectedSkinTone.value);
}

function pickIcon(value: string): void {
  if (!isLucideIconValue(value) && !value.startsWith('http') && !value.startsWith('/')) {
    recentEmojis.value = saveRecentEmoji(value);
  }
  emit('update:modelValue', value);
  emit('select', value);
}

function selectLucideColor(colorId: string): void {
  selectedLucideColor.value = colorId;
  if (currentParsedLucide.value) {
    pickIcon(formatLucideIconValue(currentParsedLucide.value.id, colorId));
  }
}

function handleRandomPick(): void {
  const mode = activeTab.value === 'icons' ? 'icons' : 'emoji';
  const value = getRandomPickerIcon(mode, selectedLucideColor.value);
  pickIcon(value);
}

function handleRemove(): void {
  emit('update:modelValue', null);
  emit('remove');
}

function handleScroll(): void {
  const el = scrollBodyRef.value;
  if (!el) return;
  const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 72;
  if (!nearBottom) return;

  if (activeTab.value === 'emoji' && !normalizedQuery.value) {
    if (loadedEmojiCategoryCount.value < EMOJI_CATEGORIES.length) {
      loadedEmojiCategoryCount.value = Math.min(
        EMOJI_CATEGORIES.length,
        loadedEmojiCategoryCount.value + 2
      );
    }
  } else if (activeTab.value === 'icons' && !normalizedQuery.value) {
    if (visibleLucideCount.value < LUCIDE_ICON_CATALOG.length) {
      visibleLucideCount.value = Math.min(
        LUCIDE_ICON_CATALOG.length,
        visibleLucideCount.value + LUCIDE_PAGE_STEP
      );
    }
  }
}

async function jumpToEmojiCategory(categoryId: string): Promise<void> {
  searchQuery.value = '';
  if (categoryId === 'recent') {
    scrollBodyRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  const index = EMOJI_CATEGORIES.findIndex((c) => c.id === categoryId);
  if (index !== -1 && loadedEmojiCategoryCount.value <= index) {
    loadedEmojiCategoryCount.value = index + 2;
  }
  await nextTick();
  const target = scrollBodyRef.value?.querySelector(`[data-emoji-cat="${categoryId}"]`);
  if (target instanceof HTMLElement && typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
}

function applyUploadUrl(): void {
  uploadError.value = '';
  const trimmed = uploadUrlInput.value.trim();
  if (!trimmed) return;
  if (
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('https://') &&
    !trimmed.startsWith('/api/assets/')
  ) {
    uploadError.value = 'Informe uma URL válida iniciando com http:// ou https://.';
    return;
  }
  pickIcon(trimmed);
}

function triggerFileDialog(): void {
  uploadError.value = '';
  fileInputRef.value?.click();
}

async function handleFileSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0];
  if (!file) return;
  if (input) input.value = '';

  uploadError.value = '';
  if (!props.onUploadFile) {
    uploadError.value = 'Upload de arquivo indisponível neste contexto.';
    return;
  }

  isUploadingFile.value = true;
  try {
    const assetUrl = await props.onUploadFile(file);
    if (!assetUrl) {
      uploadError.value = 'Não foi possível salvar o arquivo.';
      return;
    }
    pickIcon(assetUrl);
  } catch (err) {
    uploadError.value =
      err instanceof Error ? err.message : 'Erro ao enviar a imagem para o servidor.';
  } finally {
    isUploadingFile.value = false;
  }
}
</script>

<template>
  <div
    class="mind-icon-picker-shell"
    data-testid="mind-icon-picker"
    @click.stop
    @mousedown.stop
  >
    <!-- Header Tabs: Emoji | Ícones | Fazer upload + Remover -->
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
        <button
          v-if="allowUpload"
          type="button"
          role="tab"
          class="picker-tab-btn"
          :class="{ 'is-active': activeTab === 'upload' }"
          :aria-selected="activeTab === 'upload'"
          data-testid="icon-picker-tab-upload"
          @click="activeTab = 'upload'"
        >
          Fazer upload
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

    <!-- Search + Random + Skin Tone Button -->
    <div v-if="activeTab !== 'upload'" class="picker-toolbar-row">
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

      <div v-if="activeTab === 'emoji'" class="picker-skin-wrap">
        <button
          type="button"
          class="picker-random-btn picker-skin-btn"
          title="Tom de pele"
          aria-label="Selecionar tom de pele"
          data-testid="icon-picker-skin-toggle"
          @click="isSkinToneMenuOpen = !isSkinToneMenuOpen"
        >
          {{ activeSkinTonePreview }}
        </button>
        <div
          v-if="isSkinToneMenuOpen"
          class="picker-skin-popover"
          data-testid="icon-picker-skin-popover"
        >
          <button
            v-for="opt in SKIN_TONE_OPTIONS"
            :key="opt.id"
            type="button"
            class="picker-skin-option"
            :class="{ 'is-active': selectedSkinTone === opt.modifier }"
            :title="opt.label"
            @click="selectedSkinTone = opt.modifier; isSkinToneMenuOpen = false"
          >
            {{ opt.preview }}
          </button>
        </div>
      </div>
    </div>

    <!-- Lucide Icon Colors Strip -->
    <div
      v-if="activeTab === 'icons'"
      class="picker-lucide-colors-bar"
      data-testid="icon-picker-color-strip"
    >
      <button
        v-for="col in LUCIDE_ICON_COLORS"
        :key="col.id"
        type="button"
        class="picker-lucide-color-dot"
        :class="{ 'is-active': selectedLucideColor === col.id }"
        :style="{ backgroundColor: col.hex }"
        :title="col.label"
        :aria-label="`Cor ${col.label}`"
        :data-testid="`icon-color-${col.id}`"
        @click="selectLucideColor(col.id)"
      />
    </div>

    <!-- Tab Body -->
    <div
      v-if="activeTab !== 'upload'"
      ref="scrollBodyRef"
      class="picker-scroll-body"
      @scroll.passive="handleScroll"
    >
      <template v-if="activeTab === 'emoji'">
        <div
          v-if="!normalizedQuery && recentEmojis.length > 0"
          class="picker-category-block"
          data-emoji-cat="recent"
        >
          <div class="picker-category-title">Recentes</div>
          <div class="picker-emoji-grid">
            <button
              v-for="char in recentEmojis"
              :key="`recent-${char}`"
              type="button"
              class="picker-grid-cell picker-emoji-cell"
              :class="{ 'is-selected': modelValue === char }"
              @click="pickIcon(char)"
            >
              {{ char }}
            </button>
          </div>
        </div>

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
          :data-emoji-cat="category.id"
        >
          <div class="picker-category-title">{{ category.label }}</div>
          <div class="picker-emoji-grid">
            <button
              v-for="item in category.items"
              :key="`${category.id}-${item.char}`"
              type="button"
              class="picker-grid-cell picker-emoji-cell"
              :class="{ 'is-selected': modelValue === resolveRenderedEmoji(item.char, item.skinToneSupport) }"
              :data-testid="`emoji-option-${item.char}`"
              :title="item.name"
              @click="pickIcon(resolveRenderedEmoji(item.char, item.skinToneSupport))"
            >
              {{ resolveRenderedEmoji(item.char, item.skinToneSupport) }}
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
          <div class="picker-category-title">
            Ícones ({{ filteredLucideIcons.length }}<span v-if="!normalizedQuery && visibleLucideCount < LUCIDE_ICON_CATALOG.length"> de {{ LUCIDE_ICON_CATALOG.length }}</span>)
          </div>
          <div class="picker-emoji-grid">
            <button
              v-for="item in filteredLucideIcons"
              :key="item.id"
              type="button"
              class="picker-grid-cell picker-lucide-cell"
              :class="{ 'is-selected': currentParsedLucide?.id === item.id }"
              :data-testid="`lucide-option-${item.id}`"
              :title="item.label"
              :aria-label="item.label"
              @click="pickIcon(formatLucideIconValue(item.id, selectedLucideColor))"
            >
              <component
                :is="item.component"
                :size="16"
                :stroke-width="1.9"
                :style="{ color: activeLucideColorHex }"
              />
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Bottom Emoji Category Dock -->
    <div
      v-if="activeTab === 'emoji'"
      class="picker-emoji-dock"
      data-testid="icon-picker-emoji-dock"
    >
      <button
        v-if="recentEmojis.length > 0"
        type="button"
        class="picker-dock-btn"
        title="Recentes"
        aria-label="Recentes"
        @click="jumpToEmojiCategory('recent')"
      >
        <Clock :size="14" />
      </button>
      <button
        v-for="cat in dockCategories"
        :key="`dock-${cat.id}`"
        type="button"
        class="picker-dock-btn"
        :title="cat.label"
        :aria-label="cat.label"
        @click="jumpToEmojiCategory(cat.id)"
      >
        <component :is="dockCategoryIcons[cat.id]" :size="14" />
      </button>
    </div>

    <!-- Upload / Public URL Tab -->
    <div v-else-if="activeTab === 'upload'" class="picker-upload-body">
      <input
        ref="fileInputRef"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        class="picker-hidden-file-input"
        data-testid="icon-upload-file-input"
        @change="handleFileSelected"
      >

      <button
        type="button"
        class="picker-upload-file-btn"
        data-testid="icon-upload-trigger"
        :disabled="isUploadingFile"
        @click="triggerFileDialog"
      >
        <Upload :size="14" />
        <span>{{ isUploadingFile ? 'Enviando imagem...' : 'Enviar arquivo' }}</span>
      </button>

      <div class="picker-upload-divider">ou colar link público</div>

      <div class="picker-upload-url-row">
        <input
          v-model="uploadUrlInput"
          type="url"
          class="picker-upload-url-input"
          data-testid="icon-upload-url-input"
          placeholder="https://exemplo.com/icone.png"
          aria-label="URL pública da imagem"
          @keyup.enter="applyUploadUrl"
        >
        <button
          type="button"
          class="picker-upload-apply-btn"
          data-testid="icon-upload-url-submit"
          :disabled="!uploadUrlInput.trim()"
          @click="applyUploadUrl"
        >
          Enviar
        </button>
      </div>

      <p v-if="uploadError" class="picker-upload-error" data-testid="icon-upload-error">
        {{ uploadError }}
      </p>
      <p class="picker-upload-hint">
        PNG, JPG, WebP, GIF ou SVG (até 2,5 MB salvos no banco de dados).
      </p>
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
  width: 344px;
  max-width: calc(100vw - 32px);
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  overflow: visible;
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
  border-color: #1971c2;
  box-shadow: 0 0 0 2px rgba(25, 113, 194, 0.12);
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

.picker-skin-wrap {
  position: relative;
}

.picker-skin-btn {
  font-size: 14px;
}

.picker-skin-popover {
  position: absolute;
  top: 34px;
  right: 0;
  z-index: 20;
  display: flex;
  gap: 4px;
  padding: 4px;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
}

.picker-skin-option {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  font-size: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.picker-skin-option:hover,
.picker-skin-option.is-active {
  background-color: #f1f3f5;
}

.picker-lucide-colors-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px 8px;
  border-bottom: 1px solid #f1f3f5;
}

.picker-lucide-color-dot {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 1.5px solid rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.picker-lucide-color-dot:hover {
  transform: scale(1.12);
}

.picker-lucide-color-dot.is-active {
  box-shadow: 0 0 0 2px #ffffff, 0 0 0 3.5px #111827;
}

.picker-scroll-body {
  max-height: 240px;
  overflow-y: auto;
  padding: 6px 10px 10px;
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
  grid-template-columns: repeat(9, 1fr);
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

.picker-emoji-dock {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  border-top: 1px solid #f1f3f5;
  background-color: #ffffff;
}

.picker-dock-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 24px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: #868e96;
  cursor: pointer;
}

.picker-dock-btn:hover {
  background-color: #f1f3f5;
  color: #111827;
}

.picker-upload-body {
  padding: 14px 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.picker-hidden-file-input {
  display: none;
}

.picker-upload-file-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 9px 12px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  background-color: #ffffff;
  color: #212529;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease;
}

.picker-upload-file-btn:hover:not(:disabled) {
  background-color: #f8f9fa;
  border-color: #ced4da;
}

.picker-upload-file-btn:disabled {
  opacity: 0.65;
  cursor: wait;
}

.picker-upload-divider {
  font-size: 11px;
  color: #868e96;
  text-align: center;
}

.picker-upload-url-row {
  display: flex;
  gap: 6px;
}

.picker-upload-url-input {
  flex: 1 1 auto;
  min-width: 0;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12.5px;
  color: #111827;
  outline: none;
}

.picker-upload-url-input:focus {
  border-color: #1971c2;
  box-shadow: 0 0 0 2px rgba(25, 113, 194, 0.12);
}

.picker-upload-apply-btn {
  padding: 6px 12px;
  border: 1px solid #1971c2;
  border-radius: 6px;
  background-color: #1971c2;
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
}

.picker-upload-apply-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.picker-upload-error {
  margin: 0;
  font-size: 11.5px;
  color: #c92a2a;
}

.picker-upload-hint {
  margin: 0;
  font-size: 11.5px;
  color: #868e96;
  line-height: 1.4;
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
