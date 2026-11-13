<template>
  <div
    class="mind-frontmatter-shell"
    data-testid="mind-frontmatter-header"
    :class="{ 'is-collapsed': isCollapsed }"
  >
    <!-- Header Bar: Clean Obsidian Toggle (YAML puro only shown when expanded) -->
    <div class="frontmatter-top-bar">
      <button
        type="button"
        class="frontmatter-toggle-btn"
        data-testid="toggle-frontmatter-collapse"
        :aria-expanded="!isCollapsed"
        @click="toggleCollapse"
      >
        <ChevronRight
          :size="14"
          :stroke-width="2"
          class="chevron-indicator"
          :class="{ 'is-open': !isCollapsed }"
        />
        <span class="bar-title">Propriedades</span>
      </button>

      <div v-if="!isCollapsed" class="frontmatter-actions">
        <button
          type="button"
          class="mode-switch-btn"
          data-testid="toggle-raw-yaml-mode"
          :class="{ 'is-active': isRawMode }"
          @click="isRawMode = !isRawMode"
        >
          <Code2 :size="13" :stroke-width="1.9" />
          <span>{{ isRawMode ? 'Visual' : 'YAML puro' }}</span>
        </button>

        <button
          v-if="!readOnly"
          type="button"
          class="remove-frontmatter-btn"
          data-testid="remove-frontmatter-btn"
          title="Remover propriedades da nota"
          aria-label="Remover propriedades"
          @click="emit('removeProperties')"
        >
          <X :size="13" :stroke-width="1.9" />
        </button>
      </div>
    </div>

    <!-- Expanded Body -->
    <div v-if="!isCollapsed" class="frontmatter-body" data-testid="frontmatter-content">
      <RawYamlEditor
        v-if="isRawMode"
        :model-value="modelValue"
        :read-only="readOnly"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <!-- OBSIDIAN-STYLE VISUAL PROPERTIES LIST -->
      <div v-else class="obsidian-properties-list">
        <PropertyRow
          v-for="entry in propertyEntries"
          :key="entry.key"
          :prop-key="entry.key"
          :value="entry.value"
          :resolved-type="entry.resolvedType"
          :explicit-type="explicitTypes[entry.key]"
          :default-tags="defaultTags"
          :read-only="readOnly"
          :is-menu-open="openMenuKey === entry.key"
          :has-clipboard="Boolean(propertyClipboard)"
          @update-value="updateField(entry.key, $event)"
          @rename-key="renamePropertyKey(entry.key, $event)"
          @toggle-menu="openPropertyContextMenu(entry.key)"
          @change-type="changePropertyType(entry.key, $event)"
          @cut="cutProperty(entry.key)"
          @copy="copyProperty(entry.key)"
          @paste="pasteProperty(entry.key)"
          @remove="removeProperty(entry.key)"
        />

        <!-- Draft Row for "+ Adicionar propriedade" (Obsidian style + Vault presets) -->
        <div
          v-if="isAddingProperty && !readOnly"
          class="property-row is-draft"
          data-testid="new-property-row"
        >
          <div class="property-key-cell">
            <span class="prop-type-trigger is-muted">
              <Asterisk :size="14" :stroke-width="1.8" />
            </span>
            <input
              ref="newPropertyKeyInputRef"
              v-model="draftPropertyKey"
              type="text"
              class="prop-key-input"
              data-testid="new-property-key-input"
              placeholder="Nome da propriedade..."
              aria-label="Nome da nova propriedade"
              @keydown.enter.prevent="commitDraftProperty"
              @keydown.esc.prevent="cancelDraftProperty"
            >
          </div>
          <div class="property-value-cell">
            <div v-if="availablePropertyPresets.length > 0" class="preset-quick-bar" data-testid="property-presets-bar">
              <button
                v-for="preset in availablePropertyPresets"
                :key="preset.key"
                type="button"
                class="preset-quick-btn"
                :data-testid="`preset-prop-${preset.key}`"
                @mousedown.prevent="addPresetProperty(preset)"
              >
                + {{ preset.label }}
              </button>
            </div>
            <span v-else class="draft-hint-text">Pressione Enter para criar</span>
          </div>
        </div>

        <!-- Footer: + Adicionar propriedade -->
        <div v-if="!readOnly" class="properties-footer">
          <button
            type="button"
            class="add-property-btn"
            data-testid="add-property-btn"
            @click="startAddingProperty"
          >
            <Plus :size="14" :stroke-width="2" />
            <span>Adicionar propriedade</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { Asterisk, ChevronRight, Code2, Plus, X } from 'lucide-vue-next';
import {
  DEFAULT_NOTE_PROPERTY_PRESETS,
  DEFAULT_NOTE_TAGS,
  type EditorFrontmatter,
  type NotePropertyPreset,
  type ObsidianPropertyType,
} from '../types.js';
import PropertyRow from './frontmatter/PropertyRow.vue';
import RawYamlEditor from './frontmatter/RawYamlEditor.vue';
import {
  coerceValueToType,
  findMatchingPreset,
  formatYamlValue,
  inferPropertyType,
  resolvePresetDefault,
  type PropertyClipboardItem,
} from './frontmatter/frontmatter-helpers.js';

const props = withDefaults(
  defineProps<{
    modelValue: EditorFrontmatter;
    initialCollapsed?: boolean;
    defaultTags?: string[];
    readOnly?: boolean;
  }>(),
  {
    initialCollapsed: true,
    defaultTags: () => [...DEFAULT_NOTE_TAGS],
    readOnly: false,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: EditorFrontmatter): void;
  (e: 'removeProperties'): void;
  (e: 'escapeToEditor'): void;
}>();

const isCollapsed = ref(props.initialCollapsed);
const isRawMode = ref(false);
const explicitTypes = reactive<Record<string, ObsidianPropertyType>>({});
const openMenuKey = ref<string | null>(null);

const isAddingProperty = ref(false);
const draftPropertyKey = ref('');
const newPropertyKeyInputRef = ref<HTMLInputElement | null>(null);
const propertyClipboard = ref<PropertyClipboardItem | null>(null);

watch(
  () => props.initialCollapsed,
  (val) => {
    isCollapsed.value = val;
  },
);

const propertyEntries = computed(() =>
  Object.entries(props.modelValue ?? {})
    .filter(([key]) => key !== 'title')
    .map(([key, value]) => ({
      key,
      value,
      resolvedType: inferPropertyType(key, value, explicitTypes),
    })),
);

const availablePropertyPresets = computed(() => {
  const existingKeys = new Set(Object.keys(props.modelValue ?? {}));
  const query = draftPropertyKey.value.trim().toLowerCase();
  return DEFAULT_NOTE_PROPERTY_PRESETS.filter(
    (preset) => !existingKeys.has(preset.key) && (!query || preset.key.includes(query)),
  );
});

function toggleCollapse(): void {
  isCollapsed.value = !isCollapsed.value;
  if (isCollapsed.value) {
    openMenuKey.value = null;
  }
}

function expand(): void {
  isCollapsed.value = false;
}

function collapse(): void {
  isCollapsed.value = true;
}

async function startAddingProperty(): Promise<void> {
  isCollapsed.value = false;
  isRawMode.value = false;
  isAddingProperty.value = true;
  draftPropertyKey.value = '';
  await nextTick();
  newPropertyKeyInputRef.value?.focus();
}

function cancelDraftProperty(): void {
  isAddingProperty.value = false;
  draftPropertyKey.value = '';
  emit('escapeToEditor');
}

function commitDraftProperty(): void {
  const cleanKey = draftPropertyKey.value.trim().replace(/:+$/, '').trim();
  if (!cleanKey || cleanKey === 'title') {
    isAddingProperty.value = false;
    draftPropertyKey.value = '';
    return;
  }
  const current = { ...(props.modelValue ?? {}) };
  if (!(cleanKey in current)) {
    const matchingPreset = findMatchingPreset(cleanKey);
    current[cleanKey] = matchingPreset ? resolvePresetDefault(matchingPreset) : '';
    if (matchingPreset && matchingPreset.type !== 'text') {
      explicitTypes[cleanKey] = matchingPreset.type;
    }
    emit('update:modelValue', current);
  }
  isAddingProperty.value = false;
  draftPropertyKey.value = '';
}

function addPresetProperty(preset: NotePropertyPreset): void {
  const current = { ...(props.modelValue ?? {}) };
  if (!(preset.key in current)) {
    current[preset.key] = resolvePresetDefault(preset);
    if (preset.type !== 'text') {
      explicitTypes[preset.key] = preset.type;
    }
    emit('update:modelValue', current);
  }
  isAddingProperty.value = false;
  draftPropertyKey.value = '';
}

function openPropertyContextMenu(key: string): void {
  openMenuKey.value = openMenuKey.value === key ? null : key;
}

function changePropertyType(key: string, nextType: ObsidianPropertyType): void {
  explicitTypes[key] = nextType;
  const current = { ...(props.modelValue ?? {}) };
  current[key] = coerceValueToType(current[key], nextType);
  emit('update:modelValue', current);
  openMenuKey.value = null;
}

function copyProperty(key: string): void {
  const val = props.modelValue?.[key];
  const resolved = inferPropertyType(key, val, explicitTypes);
  propertyClipboard.value = {
    key,
    value: Array.isArray(val) ? [...val] : val,
    type: explicitTypes[key] ?? resolved,
  };
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(`${key}: ${formatYamlValue(val)}`).catch(() => {});
  }
  openMenuKey.value = null;
}

function cutProperty(key: string): void {
  copyProperty(key);
  removeProperty(key);
}

function pasteProperty(targetKey: string): void {
  const clip = propertyClipboard.value;
  if (!clip) return;
  const current = { ...(props.modelValue ?? {}) };
  let destKey = clip.key;
  if (destKey in current && destKey !== targetKey) {
    destKey = `${clip.key}_copia`;
  }
  current[destKey] = Array.isArray(clip.value) ? [...clip.value] : clip.value;
  explicitTypes[destKey] = clip.type;
  emit('update:modelValue', current);
  openMenuKey.value = null;
}

function removeProperty(key: string): void {
  const current = { ...(props.modelValue ?? {}) };
  delete current[key];
  delete explicitTypes[key];
  emit('update:modelValue', current);
  openMenuKey.value = null;
}

function renamePropertyKey(oldKey: string, rawNewKey: string): void {
  const nextKey = rawNewKey.trim();
  if (!nextKey || nextKey === oldKey || nextKey === 'title') return;
  if (nextKey in (props.modelValue ?? {})) return;

  const rebuilt: EditorFrontmatter = {};
  for (const [k, v] of Object.entries(props.modelValue ?? {})) {
    if (k === oldKey) {
      rebuilt[nextKey] = v;
    } else {
      rebuilt[k] = v;
    }
  }
  if (explicitTypes[oldKey]) {
    explicitTypes[nextKey] = explicitTypes[oldKey];
    delete explicitTypes[oldKey];
  }
  emit('update:modelValue', rebuilt);
}

function updateField(key: string, val: unknown): void {
  emit('update:modelValue', {
    ...(props.modelValue ?? {}),
    [key]: val,
  });
}

function handleWindowMouseDown(event: MouseEvent): void {
  if (!openMenuKey.value) return;
  const el = event.target as Element | null;
  if (el?.closest('[data-testid="property-context-menu"], .prop-type-trigger')) {
    return;
  }
  openMenuKey.value = null;
}

onMounted(() => {
  window.addEventListener('mousedown', handleWindowMouseDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('mousedown', handleWindowMouseDown);
});

defineExpose({
  expand,
  collapse,
  startAddingProperty,
});
</script>

<style scoped>
.mind-frontmatter-shell {
  margin-bottom: 12px;
  padding-bottom: 2px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #37352f;
}

.mind-frontmatter-shell.is-collapsed {
  padding-bottom: 0;
  margin-bottom: 6px;
}

.frontmatter-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 26px;
}

.frontmatter-toggle-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px 2px 20px;
  margin-left: -20px;
  border-radius: 5px;
  color: #ced4da;
  font-family: inherit;
  font-size: 15.5px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: -0.01em;
  transition: color 0.12s ease;
}

.frontmatter-toggle-btn:hover {
  color: #adb5bd;
}

.chevron-indicator {
  position: absolute;
  left: 2px;
  top: 50%;
  color: #868e96;
  opacity: 0;
  transform: translateY(-50%);
  transition: opacity 0.14s ease, transform 0.16s ease, color 0.12s ease;
}

.frontmatter-top-bar:hover .chevron-indicator,
.frontmatter-toggle-btn:hover .chevron-indicator,
.frontmatter-toggle-btn:focus-visible .chevron-indicator {
  opacity: 1;
}

.frontmatter-toggle-btn:hover .chevron-indicator {
  color: #495057;
}

.chevron-indicator.is-open {
  transform: translateY(-50%) rotate(90deg);
}

.frontmatter-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.mode-switch-btn,
.remove-frontmatter-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 5px;
  padding: 3px 7px;
  font-size: 11.5px;
  font-weight: 500;
  color: #868e96;
  opacity: 0.78;
  cursor: pointer;
  font-family: inherit;
  transition: background-color 0.12s ease, color 0.12s ease, opacity 0.12s ease;
}

.remove-frontmatter-btn {
  padding: 3px 5px;
}

.frontmatter-top-bar:hover .mode-switch-btn,
.frontmatter-top-bar:hover .remove-frontmatter-btn,
.mode-switch-btn:hover,
.mode-switch-btn.is-active {
  opacity: 1;
}

.mode-switch-btn:hover,
.mode-switch-btn.is-active {
  background-color: #f1f3f5;
  color: #212529;
}

.remove-frontmatter-btn:hover {
  opacity: 1;
  background-color: #fff5f5;
  color: #c92a2a;
}

.frontmatter-body {
  margin-top: 4px;
}

.obsidian-properties-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.property-row.is-draft {
  position: relative;
  display: flex;
  align-items: flex-start;
  min-height: 28px;
  padding: 1px 6px;
  margin: 0 -6px;
  border-radius: 5px;
  background-color: #ffffff;
  border: 1px solid #dee2e6;
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

.prop-type-trigger.is-muted {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: -3px;
  color: #868e96;
  flex-shrink: 0;
  cursor: default;
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

.preset-quick-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 2px 4px;
}

.preset-quick-btn {
  border: 1px solid #e9ecef;
  background-color: #f8f9fa;
  color: #495057;
  border-radius: 4px;
  padding: 1px 7px;
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
}

.preset-quick-btn:hover {
  background-color: #e7f5ff;
  border-color: #d0ebff;
  color: #1971c2;
}

.draft-hint-text {
  font-size: 12px;
  color: #868e96;
  padding-left: 6px;
}

.properties-footer {
  margin-top: 2px;
}

.add-property-btn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 13px;
  font-weight: 400;
  padding: 4px 8px 4px 6px;
  margin-left: -6px;
  border-radius: 5px;
  cursor: pointer;
  font-family: inherit;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.add-property-btn:hover {
  background-color: #f8f9fa;
  color: #212529;
}
</style>
