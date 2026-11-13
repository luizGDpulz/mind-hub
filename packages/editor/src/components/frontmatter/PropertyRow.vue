<template>
  <div
    class="property-row"
    :class="{ 'is-menu-open': isMenuOpen }"
    :data-testid="`property-row-${propKey}`"
    @contextmenu.prevent="!readOnly && emit('toggleMenu')"
  >
    <!-- Left Key Column: Type Icon + Inline Key Name -->
    <div class="property-key-cell">
      <button
        type="button"
        class="prop-type-trigger"
        :data-testid="`prop-type-btn-${propKey}`"
        :disabled="readOnly"
        title="Opções e tipo de propriedade"
        aria-label="Opções da propriedade"
        @click.stop="emit('toggleMenu')"
      >
        <component :is="getPropertyIcon(resolvedType)" :size="14" :stroke-width="1.8" />
      </button>

      <input
        type="text"
        class="prop-key-input"
        :data-testid="`prop-key-input-${propKey}`"
        :value="propKey"
        :readonly="readOnly"
        aria-label="Nome da propriedade"
        @change="emit('renameKey', ($event.target as HTMLInputElement).value)"
        @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
      >

      <PropertyContextMenu
        v-if="isMenuOpen && !readOnly"
        :explicit-type="explicitType"
        :has-clipboard="hasClipboard"
        @change-type="emit('changeType', $event)"
        @cut="emit('cut')"
        @copy="emit('copy')"
        @paste="emit('paste')"
        @remove="emit('remove')"
      />
    </div>

    <!-- Right Value Column -->
    <div class="property-value-cell">
      <!-- CHECKBOX -->
      <template v-if="resolvedType === 'checkbox'">
        <label class="checkbox-value-wrap">
          <input
            type="checkbox"
            class="prop-checkbox-input"
            :data-testid="`prop-value-checkbox-${propKey}`"
            :checked="Boolean(value)"
            :disabled="readOnly"
            @change="emit('updateValue', ($event.target as HTMLInputElement).checked)"
          >
        </label>
      </template>

      <!-- DATE -->
      <template v-else-if="resolvedType === 'date'">
        <input
          type="date"
          class="prop-text-input prop-date-input"
          :data-testid="`prop-value-input-${propKey}`"
          :value="formatDateValue(value)"
          :readonly="readOnly"
          @change="emit('updateValue', ($event.target as HTMLInputElement).value)"
        >
      </template>

      <!-- DATETIME -->
      <template v-else-if="resolvedType === 'datetime'">
        <input
          type="datetime-local"
          class="prop-text-input prop-date-input"
          :data-testid="`prop-value-input-${propKey}`"
          :value="formatDatetimeValue(value)"
          :readonly="readOnly"
          @change="emit('updateValue', ($event.target as HTMLInputElement).value)"
        >
      </template>

      <!-- NUMBER -->
      <template v-else-if="resolvedType === 'number'">
        <input
          type="number"
          class="prop-text-input"
          :data-testid="`prop-value-input-${propKey}`"
          :value="value === '' || value === null || value === undefined ? '' : Number(value)"
          :readonly="readOnly"
          placeholder="0"
          @input="handleNumberInput(($event.target as HTMLInputElement).value)"
        >
      </template>

      <!-- LIST (Tags & Custom Lists with Inline Facilitator Suggestions) -->
      <template v-else-if="resolvedType === 'list'">
        <div
          class="list-value-wrap"
          :data-testid="propKey === 'tags' ? 'tags-container' : `list-container-${propKey}`"
        >
          <span
            v-for="(item, idx) in stringArrayValue"
            :key="`${propKey}-${item}-${idx}`"
            class="list-item-chip"
            :class="{ 'is-tag': isTag }"
            :data-testid="isTag ? `tag-pill-${item}` : `list-pill-${propKey}-${idx}`"
          >
            <span>{{ isTag ? `#${item}` : item }}</span>
            <button
              v-if="!readOnly"
              type="button"
              class="remove-chip-btn"
              title="Remover item"
              @click="removeListItem(item)"
            >
              <X :size="11" :stroke-width="2" />
            </button>
          </span>

          <div v-if="!readOnly" class="list-add-anchor">
            <input
              v-model="listInputDraft"
              type="text"
              class="list-inline-input"
              :data-testid="isTag ? 'new-tag-input' : `new-list-item-input-${propKey}`"
              :placeholder="isTag ? 'Adicionar tag...' : 'Adicionar item...'"
              @focus="isListFocused = true"
              @blur="handleListBlur"
              @keydown.enter.prevent="commitListItem"
              @keydown.,.prevent="commitListItem"
              @keydown.esc="isListFocused = false"
            >

            <div
              v-if="isListFocused && isTag && (filteredDefaultTags.length > 0 || canCreateTag)"
              class="facilitator-dropdown"
              data-testid="default-tags-suggestions"
            >
              <button
                v-if="canCreateTag"
                type="button"
                class="facilitator-option is-create"
                data-testid="create-custom-tag-btn"
                @mousedown.prevent="commitListItem"
              >
                <Plus :size="12" />
                <span>Criar tag "#{{ normalizedListQuery }}"</span>
              </button>

              <div v-if="filteredDefaultTags.length > 0" class="facilitator-section-title">
                Sugestões
              </div>
              <div class="facilitator-chips-wrap">
                <button
                  v-for="tag in filteredDefaultTags"
                  :key="tag"
                  type="button"
                  class="facilitator-tag-btn"
                  :data-testid="`default-tag-${tag}`"
                  @mousedown.prevent="addSpecificListItem(tag)"
                >
                  #{{ tag }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- TEXT / AUTO -->
      <template v-else>
        <div class="text-value-anchor">
          <input
            type="text"
            class="prop-text-input"
            :data-testid="
              propKey === 'status'
                ? 'status-property-input'
                : propKey === 'project'
                  ? 'project-property-input'
                  : `prop-value-input-${propKey}`
            "
            :value="value ?? ''"
            :readonly="readOnly"
            placeholder="Vazio"
            @focus="isTextFocused = true"
            @blur="handleTextBlur"
            @input="emit('updateValue', ($event.target as HTMLInputElement).value)"
            @keydown.esc="isTextFocused = false"
          >

          <div
            v-if="!readOnly && isTextFocused && textSuggestions.length > 0"
            class="facilitator-dropdown is-compact"
            :data-testid="`text-suggestions-${propKey}`"
          >
            <button
              v-for="option in textSuggestions"
              :key="option"
              type="button"
              class="facilitator-option"
              :class="{ 'is-selected': value === option }"
              @mousedown.prevent="selectTextSuggestion(option)"
            >
              <span>{{ option }}</span>
              <Check v-if="value === option" :size="12" class="suggestion-check" />
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Check, Plus, X } from 'lucide-vue-next';
import {
  DEFAULT_NOTE_TAGS,
  DEFAULT_STATUS_OPTIONS,
  type ObsidianPropertyType,
} from '../../types.js';
import PropertyContextMenu from './PropertyContextMenu.vue';
import {
  AREA_OPTIONS,
  asStringArray,
  formatDateValue,
  formatDatetimeValue,
  getPropertyIcon,
  isTagKey,
  normalizeListItem,
} from './frontmatter-helpers.js';

const props = withDefaults(
  defineProps<{
    propKey: string;
    value: unknown;
    resolvedType: Exclude<ObsidianPropertyType, 'auto'>;
    explicitType?: ObsidianPropertyType;
    defaultTags?: string[];
    readOnly?: boolean;
    isMenuOpen?: boolean;
    hasClipboard?: boolean;
  }>(),
  {
    explicitType: undefined,
    defaultTags: () => [...DEFAULT_NOTE_TAGS],
    readOnly: false,
    isMenuOpen: false,
    hasClipboard: false,
  },
);

const emit = defineEmits<{
  (e: 'updateValue', val: unknown): void;
  (e: 'renameKey', nextKey: string): void;
  (e: 'toggleMenu'): void;
  (e: 'changeType', nextType: ObsidianPropertyType): void;
  (e: 'cut'): void;
  (e: 'copy'): void;
  (e: 'paste'): void;
  (e: 'remove'): void;
}>();

const listInputDraft = ref('');
const isListFocused = ref(false);
const isTextFocused = ref(false);

const isTag = computed(() => isTagKey(props.propKey));
const stringArrayValue = computed(() => asStringArray(props.value));

const normalizedListQuery = computed(() => normalizeListItem(props.propKey, listInputDraft.value));

const filteredDefaultTags = computed(() => {
  const pool = props.defaultTags?.length ? props.defaultTags : [...DEFAULT_NOTE_TAGS];
  const existing = stringArrayValue.value;
  const available = pool.filter((tag) => !existing.includes(tag));
  const query = normalizedListQuery.value;
  if (!query) return available;
  return available.filter((tag) => tag.toLowerCase().includes(query));
});

const canCreateTag = computed(() => {
  const candidate = normalizedListQuery.value;
  if (!candidate) return false;
  return (
    !stringArrayValue.value.includes(candidate) &&
    !filteredDefaultTags.value.some((tag) => tag.toLowerCase() === candidate)
  );
});

const textSuggestions = computed<readonly string[]>(() => {
  const lower = props.propKey.toLowerCase();
  if (lower === 'status') return DEFAULT_STATUS_OPTIONS;
  if (lower === 'area') return AREA_OPTIONS;
  return [];
});

function handleNumberInput(raw: string): void {
  if (raw === '') {
    emit('updateValue', '');
    return;
  }
  const num = Number(raw);
  emit('updateValue', Number.isNaN(num) ? 0 : num);
}

function addSpecificListItem(rawItem: string): void {
  const item = normalizeListItem(props.propKey, rawItem);
  if (!item) return;
  const existing = stringArrayValue.value;
  if (!existing.includes(item)) {
    emit('updateValue', [...existing, item]);
  }
  listInputDraft.value = '';
}

function commitListItem(): void {
  addSpecificListItem(listInputDraft.value);
}

function removeListItem(target: string): void {
  emit(
    'updateValue',
    stringArrayValue.value.filter((item) => item !== target),
  );
}

function handleListBlur(): void {
  setTimeout(() => {
    isListFocused.value = false;
  }, 120);
}

function selectTextSuggestion(option: string): void {
  emit('updateValue', option);
  isTextFocused.value = false;
}

function handleTextBlur(): void {
  setTimeout(() => {
    isTextFocused.value = false;
  }, 120);
}
</script>

<style scoped>
.property-row {
  position: relative;
  display: flex;
  align-items: flex-start;
  min-height: 28px;
  padding: 1px 6px;
  margin: 0 -6px;
  border-radius: 5px;
  border: 1px solid transparent;
  transition: background-color 0.1s ease, border-color 0.1s ease;
}

.property-row:hover {
  background-color: #f8f9fa;
}

.property-row.is-menu-open {
  background-color: #ffffff;
  border-color: #dee2e6;
}

.property-key-cell {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  width: 152px;
  min-height: 26px;
  flex-shrink: 0;
  padding-right: 8px;
}

.prop-type-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: -3px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: #868e96;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: background-color 0.1s ease, color 0.1s ease;
}

.prop-type-trigger:hover:not(:disabled) {
  background-color: #e9ecef;
  color: #212529;
}

.prop-key-input {
  width: 100%;
  min-width: 0;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 13px;
  font-weight: 400;
  padding: 2px 4px;
  margin-left: -4px;
  border-radius: 4px;
  outline: none;
  font-family: inherit;
}

.prop-key-input:focus {
  background-color: #ffffff;
  color: #212529;
}

.property-value-cell {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  min-height: 26px;
}

.text-value-anchor {
  position: relative;
  width: 100%;
}

.prop-text-input {
  width: 100%;
  border: none;
  background: transparent;
  color: #212529;
  font-size: 13px;
  padding: 3px 6px;
  border-radius: 4px;
  outline: none;
  font-family: inherit;
}

.prop-text-input:focus {
  background-color: #ffffff;
}

.prop-text-input::placeholder {
  color: #adb5bd;
}

.prop-date-input {
  width: auto;
  color: #37352f;
}

.checkbox-value-wrap {
  display: inline-flex;
  align-items: center;
  padding: 3px 6px;
  cursor: pointer;
}

.prop-checkbox-input {
  width: 15px;
  height: 15px;
  margin: 0;
  accent-color: #1971c2;
  cursor: pointer;
}

.list-value-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  width: 100%;
  padding: 2px 6px;
}

.list-item-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: #f1f3f5;
  color: #37352f;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
}

.list-item-chip.is-tag {
  background-color: #e7f5ff;
  color: #1971c2;
}

.remove-chip-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.65;
  cursor: pointer;
  padding: 0;
}

.remove-chip-btn:hover {
  opacity: 1;
}

.list-add-anchor {
  position: relative;
  flex: 1;
  min-width: 110px;
}

.list-inline-input {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #212529;
  padding: 2px 0;
  outline: none;
  font-family: inherit;
}

.list-inline-input::placeholder {
  color: #adb5bd;
}

.facilitator-dropdown {
  position: absolute;
  left: 0;
  top: calc(100% + 4px);
  z-index: 95;
  min-width: 240px;
  max-width: 340px;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
}

.facilitator-dropdown.is-compact {
  min-width: 160px;
  padding: 4px;
}

.facilitator-section-title {
  font-size: 11px;
  font-weight: 600;
  color: #868e96;
  padding: 3px 6px 4px;
}

.facilitator-chips-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 2px 4px 4px;
}

.facilitator-tag-btn {
  border: 1px solid #e9ecef;
  background-color: #f8f9fa;
  color: #495057;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
}

.facilitator-tag-btn:hover {
  background-color: #e7f5ff;
  border-color: #d0ebff;
  color: #1971c2;
}

.facilitator-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  padding: 5px 8px;
  border-radius: 5px;
  font-size: 12.5px;
  color: #37352f;
  cursor: pointer;
}

.facilitator-option:hover,
.facilitator-option.is-selected {
  background-color: #f1f3f5;
  color: #212529;
}

.facilitator-option.is-create {
  justify-content: flex-start;
  color: #1971c2;
  font-weight: 500;
}

.suggestion-check {
  color: #868e96;
  flex-shrink: 0;
}
</style>
