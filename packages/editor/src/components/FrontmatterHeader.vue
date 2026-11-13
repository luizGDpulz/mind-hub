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
          @click="toggleRawMode"
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
      <!-- RAW YAML EDITOR MODE -->
      <div v-if="isRawMode" class="raw-yaml-container">
        <textarea
          v-model="rawYamlContent"
          class="raw-yaml-textarea"
          data-testid="raw-yaml-textarea"
          :readonly="readOnly"
          placeholder="---&#10;tags: [projeto, estudo]&#10;status: ativo&#10;---"
          rows="6"
          spellcheck="false"
          @input="handleRawYamlInput"
        />
        <div v-if="yamlParseError" class="yaml-parse-error" data-testid="yaml-error-msg">
          {{ yamlParseError }}
        </div>
      </div>

      <!-- OBSIDIAN-STYLE VISUAL PROPERTIES LIST -->
      <div v-else class="obsidian-properties-list">
        <div
          v-for="entry in propertyEntries"
          :key="entry.key"
          class="property-row"
          :class="{ 'is-menu-open': openMenuKey === entry.key }"
          :data-testid="`property-row-${entry.key}`"
          @contextmenu.prevent="!readOnly && openPropertyContextMenu(entry.key)"
        >
          <!-- Left Key Column: Type Icon + Inline Key Name -->
          <div class="property-key-cell">
            <button
              type="button"
              class="prop-type-trigger"
              :data-testid="`prop-type-btn-${entry.key}`"
              :disabled="readOnly"
              title="Opções e tipo de propriedade"
              aria-label="Opções da propriedade"
              @click.stop="openPropertyContextMenu(entry.key)"
            >
              <component :is="getPropertyIcon(entry.resolvedType)" :size="14" :stroke-width="1.8" />
            </button>

            <input
              type="text"
              class="prop-key-input"
              :data-testid="`prop-key-input-${entry.key}`"
              :value="entry.key"
              :readonly="readOnly"
              aria-label="Nome da propriedade"
              @change="renamePropertyKey(entry.key, ($event.target as HTMLInputElement).value)"
              @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
            >

            <!-- Floating Obsidian Context Menu (Light Style) -->
            <div
              v-if="openMenuKey === entry.key && !readOnly"
              ref="contextMenuRef"
              class="property-context-menu"
              data-testid="property-context-menu"
              @click.stop
            >
              <div
                class="ctx-submenu-anchor"
                @mouseenter="isTypeSubmenuOpen = true"
              >
                <button
                  type="button"
                  class="ctx-menu-item"
                  :class="{ 'is-active': isTypeSubmenuOpen }"
                  data-testid="prop-menu-type-trigger"
                  @click="isTypeSubmenuOpen = !isTypeSubmenuOpen"
                >
                  <Info :size="14" class="ctx-item-icon" />
                  <span class="ctx-item-label">Tipo de propriedade</span>
                  <ChevronRight :size="13" class="ctx-chevron" />
                </button>

                <div
                  v-if="isTypeSubmenuOpen"
                  class="ctx-type-submenu"
                  data-testid="prop-menu-type-submenu"
                >
                  <button
                    v-for="opt in PROPERTY_TYPE_OPTIONS"
                    :key="opt.id"
                    type="button"
                    class="ctx-menu-item"
                    :class="{ 'is-active': isTypeSelected(entry.key, opt.id) }"
                    :data-testid="`prop-type-option-${opt.id}`"
                    @click="changePropertyType(entry.key, opt.id)"
                  >
                    <component :is="opt.icon" :size="14" class="ctx-item-icon" />
                    <span class="ctx-item-label">{{ opt.label }}</span>
                    <Check v-if="isTypeSelected(entry.key, opt.id)" :size="13" class="ctx-check" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                class="ctx-menu-item"
                data-testid="prop-menu-cut"
                @click="cutProperty(entry.key)"
              >
                <Scissors :size="14" class="ctx-item-icon" />
                <span class="ctx-item-label">Cortar</span>
              </button>

              <button
                type="button"
                class="ctx-menu-item"
                data-testid="prop-menu-copy"
                @click="copyProperty(entry.key)"
              >
                <Copy :size="14" class="ctx-item-icon" />
                <span class="ctx-item-label">Copiar</span>
              </button>

              <button
                type="button"
                class="ctx-menu-item"
                :class="{ 'is-disabled': !propertyClipboard }"
                :disabled="!propertyClipboard"
                data-testid="prop-menu-paste"
                @click="pasteProperty(entry.key)"
              >
                <Clipboard :size="14" class="ctx-item-icon" />
                <span class="ctx-item-label">Colar</span>
              </button>

              <div class="ctx-divider" />

              <button
                type="button"
                class="ctx-menu-item is-danger"
                data-testid="prop-menu-remove"
                @click="removeProperty(entry.key)"
              >
                <Trash2 :size="14" class="ctx-item-icon" />
                <span class="ctx-item-label">Remover</span>
              </button>
            </div>
          </div>

          <!-- Right Value Column -->
          <div class="property-value-cell">
            <!-- CHECKBOX -->
            <template v-if="entry.resolvedType === 'checkbox'">
              <label class="checkbox-value-wrap">
                <input
                  type="checkbox"
                  class="prop-checkbox-input"
                  :data-testid="`prop-value-checkbox-${entry.key}`"
                  :checked="Boolean(entry.value)"
                  :disabled="readOnly"
                  @change="updateField(entry.key, ($event.target as HTMLInputElement).checked)"
                >
              </label>
            </template>

            <!-- DATE -->
            <template v-else-if="entry.resolvedType === 'date'">
              <input
                type="date"
                class="prop-text-input prop-date-input"
                :data-testid="`prop-value-input-${entry.key}`"
                :value="formatDateValue(entry.value)"
                :readonly="readOnly"
                @change="updateField(entry.key, ($event.target as HTMLInputElement).value)"
              >
            </template>

            <!-- DATETIME -->
            <template v-else-if="entry.resolvedType === 'datetime'">
              <input
                type="datetime-local"
                class="prop-text-input prop-date-input"
                :data-testid="`prop-value-input-${entry.key}`"
                :value="formatDatetimeValue(entry.value)"
                :readonly="readOnly"
                @change="updateField(entry.key, ($event.target as HTMLInputElement).value)"
              >
            </template>

            <!-- NUMBER -->
            <template v-else-if="entry.resolvedType === 'number'">
              <input
                type="number"
                class="prop-text-input"
                :data-testid="`prop-value-input-${entry.key}`"
                :value="entry.value === '' || entry.value === null || entry.value === undefined ? '' : Number(entry.value)"
                :readonly="readOnly"
                placeholder="0"
                @input="handleNumberInput(entry.key, ($event.target as HTMLInputElement).value)"
              >
            </template>

            <!-- LIST (Tags & Custom Lists with Inline Facilitator Suggestions) -->
            <template v-else-if="entry.resolvedType === 'list'">
              <div
                class="list-value-wrap"
                :data-testid="entry.key === 'tags' ? 'tags-container' : `list-container-${entry.key}`"
              >
                <span
                  v-for="(item, idx) in asStringArray(entry.value)"
                  :key="`${entry.key}-${item}-${idx}`"
                  class="list-item-chip"
                  :class="{ 'is-tag': isTagKey(entry.key) }"
                  :data-testid="isTagKey(entry.key) ? `tag-pill-${item}` : `list-pill-${entry.key}-${idx}`"
                >
                  <span>{{ isTagKey(entry.key) ? `#${item}` : item }}</span>
                  <button
                    v-if="!readOnly"
                    type="button"
                    class="remove-chip-btn"
                    title="Remover item"
                    @click="removeListItem(entry.key, item)"
                  >
                    <X :size="11" :stroke-width="2" />
                  </button>
                </span>

                <div v-if="!readOnly" class="list-add-anchor">
                  <input
                    v-model="listInputs[entry.key]"
                    type="text"
                    class="list-inline-input"
                    :data-testid="isTagKey(entry.key) ? 'new-tag-input' : `new-list-item-input-${entry.key}`"
                    :placeholder="isTagKey(entry.key) ? 'Adicionar tag...' : 'Adicionar item...'"
                    @focus="focusedListKey = entry.key"
                    @blur="handleListInputBlur(entry.key)"
                    @keydown.enter.prevent="commitListItem(entry.key)"
                    @keydown.,.prevent="commitListItem(entry.key)"
                    @keydown.esc="focusedListKey = null"
                  >

                  <!-- Clean Facilitator Suggestions Dropdown when editing tags/list -->
                  <div
                    v-if="
                      focusedListKey === entry.key &&
                      isTagKey(entry.key) &&
                      (filteredDefaultTagsFor(entry.key).length > 0 || canCreateTagFor(entry.key))
                    "
                    class="facilitator-dropdown"
                    data-testid="default-tags-suggestions"
                  >
                    <button
                      v-if="canCreateTagFor(entry.key)"
                      type="button"
                      class="facilitator-option is-create"
                      data-testid="create-custom-tag-btn"
                      @mousedown.prevent="commitListItem(entry.key)"
                    >
                      <Plus :size="12" />
                      <span>Criar tag "#{{ normalizedListQuery(entry.key) }}"</span>
                    </button>

                    <div v-if="filteredDefaultTagsFor(entry.key).length > 0" class="facilitator-section-title">
                      Sugestões
                    </div>
                    <div class="facilitator-chips-wrap">
                      <button
                        v-for="tag in filteredDefaultTagsFor(entry.key)"
                        :key="tag"
                        type="button"
                        class="facilitator-tag-btn"
                        :data-testid="`default-tag-${tag}`"
                        @mousedown.prevent="addSpecificListItem(entry.key, tag)"
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
                  :data-testid="entry.key === 'status' ? 'status-property-input' : entry.key === 'project' ? 'project-property-input' : `prop-value-input-${entry.key}`"
                  :value="entry.value ?? ''"
                  :readonly="readOnly"
                  placeholder="Vazio"
                  @focus="focusedTextKey = entry.key"
                  @blur="handleTextInputBlur"
                  @input="updateField(entry.key, ($event.target as HTMLInputElement).value)"
                  @keydown.esc="focusedTextKey = null"
                >

                <!-- Clean Facilitator Presets for status/area when focused -->
                <div
                  v-if="!readOnly && focusedTextKey === entry.key && textSuggestionsFor(entry.key).length > 0"
                  class="facilitator-dropdown is-compact"
                  :data-testid="`text-suggestions-${entry.key}`"
                >
                  <button
                    v-for="option in textSuggestionsFor(entry.key)"
                    :key="option"
                    type="button"
                    class="facilitator-option"
                    :class="{ 'is-selected': entry.value === option }"
                    @mousedown.prevent="selectTextSuggestion(entry.key, option)"
                  >
                    <span>{{ option }}</span>
                    <Check v-if="entry.value === option" :size="12" class="ctx-check" />
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>

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
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount, type Component } from 'vue';
import {
  AlignLeft,
  Asterisk,
  Binary,
  Calendar,
  Check,
  CheckSquare,
  ChevronRight,
  Clipboard,
  Clock,
  Code2,
  Copy,
  Info,
  List,
  Plus,
  Scissors,
  Trash2,
  X,
} from 'lucide-vue-next';
import {
  DEFAULT_NOTE_PROPERTY_PRESETS,
  DEFAULT_NOTE_TAGS,
  DEFAULT_STATUS_OPTIONS,
  type EditorFrontmatter,
  type NotePropertyPreset,
  type ObsidianPropertyType,
} from '../types.js';

const PROPERTY_TYPE_OPTIONS: Array<{
  id: ObsidianPropertyType;
  label: string;
  icon: Component;
}> = [
  { id: 'auto', label: 'Automático (Texto)', icon: Asterisk },
  { id: 'checkbox', label: 'Caixa de seleção', icon: CheckSquare },
  { id: 'date', label: 'Data', icon: Calendar },
  { id: 'datetime', label: 'Data & hora', icon: Clock },
  { id: 'list', label: 'Lista', icon: List },
  { id: 'number', label: 'Número', icon: Binary },
  { id: 'text', label: 'Texto', icon: AlignLeft },
];

const AREA_OPTIONS = ['projetos', 'estudos', 'trabalho', 'pessoal'] as const;

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
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: EditorFrontmatter): void;
  (e: 'removeProperties'): void;
  (e: 'escapeToEditor'): void;
}>();

const isCollapsed = ref(props.initialCollapsed);
const isRawMode = ref(false);
const rawYamlContent = ref('');
const yamlParseError = ref<string | null>(null);

const explicitTypes = reactive<Record<string, ObsidianPropertyType>>({});
const listInputs = reactive<Record<string, string>>({});
const focusedListKey = ref<string | null>(null);
const focusedTextKey = ref<string | null>(null);

const openMenuKey = ref<string | null>(null);
const isTypeSubmenuOpen = ref(false);
const contextMenuRef = ref<HTMLElement[] | HTMLElement | null>(null);

const isAddingProperty = ref(false);
const draftPropertyKey = ref('');
const newPropertyKeyInputRef = ref<HTMLInputElement | null>(null);

const propertyClipboard = ref<{
  key: string;
  value: unknown;
  type: ObsidianPropertyType;
} | null>(null);

watch(
  () => props.initialCollapsed,
  (val) => {
    isCollapsed.value = val;
  }
);

function isTagKey(key: string): boolean {
  const lower = key.toLowerCase();
  return lower === 'tags' || lower === 'tag';
}

function inferPropertyType(key: string, value: unknown): Exclude<ObsidianPropertyType, 'auto'> {
  const explicit = explicitTypes[key];
  if (explicit && explicit !== 'auto') {
    return explicit;
  }
  if (typeof value === 'boolean') return 'checkbox';
  if (Array.isArray(value) || isTagKey(key) || key.toLowerCase() === 'aliases') return 'list';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return 'datetime';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
  }
  const lower = key.toLowerCase();
  if (lower === 'created' || lower === 'updated' || lower === 'date' || lower === 'data') {
    return 'date';
  }
  return 'text';
}

const propertyEntries = computed(() => {
  return Object.entries(props.modelValue ?? {})
    .filter(([key]) => key !== 'title')
    .map(([key, value]) => ({
      key,
      value,
      resolvedType: inferPropertyType(key, value),
    }));
});

const availablePropertyPresets = computed(() => {
  const existingKeys = new Set(Object.keys(props.modelValue ?? {}));
  const query = draftPropertyKey.value.trim().toLowerCase();
  return DEFAULT_NOTE_PROPERTY_PRESETS.filter(
    (preset) => !existingKeys.has(preset.key) && (!query || preset.key.includes(query))
  );
});

function getPropertyIcon(type: Exclude<ObsidianPropertyType, 'auto'>): Component {
  switch (type) {
    case 'checkbox':
      return CheckSquare;
    case 'date':
      return Calendar;
    case 'datetime':
      return Clock;
    case 'list':
      return List;
    case 'number':
      return Binary;
    default:
      return AlignLeft;
  }
}

function isTypeSelected(key: string, optionId: ObsidianPropertyType): boolean {
  const explicit = explicitTypes[key];
  if (!explicit || explicit === 'auto') {
    return optionId === 'auto';
  }
  return explicit === optionId;
}

function toggleCollapse(): void {
  isCollapsed.value = !isCollapsed.value;
  if (isCollapsed.value) {
    openMenuKey.value = null;
    isTypeSubmenuOpen.value = false;
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
    const matchingPreset = DEFAULT_NOTE_PROPERTY_PRESETS.find(
      (p) => p.key.toLowerCase() === cleanKey.toLowerCase()
    );
    current[cleanKey] = matchingPreset ? resolvePresetDefault(matchingPreset) : '';
    if (matchingPreset && matchingPreset.type !== 'text') {
      explicitTypes[cleanKey] = matchingPreset.type;
    }
    emit('update:modelValue', current);
  }
  isAddingProperty.value = false;
  draftPropertyKey.value = '';
}

function resolvePresetDefault(preset: NotePropertyPreset): unknown {
  if (preset.type === 'date' && !preset.defaultValue) {
    return new Date().toISOString().slice(0, 10);
  }
  if (Array.isArray(preset.defaultValue)) {
    return [...preset.defaultValue];
  }
  return preset.defaultValue;
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
  if (openMenuKey.value === key) {
    openMenuKey.value = null;
    isTypeSubmenuOpen.value = false;
    return;
  }
  openMenuKey.value = key;
  isTypeSubmenuOpen.value = false;
}

function coerceValueToType(value: unknown, targetType: ObsidianPropertyType): unknown {
  if (targetType === 'auto' || targetType === 'text') {
    if (Array.isArray(value)) return value.join(', ');
    if (value === null || value === undefined) return '';
    return String(value);
  }
  if (targetType === 'checkbox') {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return ['true', 'sim', 'yes', '1'].includes(value.toLowerCase());
    return Boolean(value);
  }
  if (targetType === 'number') {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (targetType === 'list') {
    if (Array.isArray(value)) return value.map((item) => String(item));
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    }
    return value ? [String(value)] : [];
  }
  if (targetType === 'date') {
    const str = typeof value === 'string' ? value.trim() : '';
    const match = str.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : new Date().toISOString().slice(0, 10);
  }
  if (targetType === 'datetime') {
    const str = typeof value === 'string' ? value.trim() : '';
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) return str.slice(0, 16);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return `${str}T09:00`;
    return new Date().toISOString().slice(0, 16);
  }
  return value;
}

function changePropertyType(key: string, nextType: ObsidianPropertyType): void {
  explicitTypes[key] = nextType;
  const current = { ...(props.modelValue ?? {}) };
  current[key] = coerceValueToType(current[key], nextType);
  emit('update:modelValue', current);
  openMenuKey.value = null;
  isTypeSubmenuOpen.value = false;
}

function copyProperty(key: string): void {
  const val = props.modelValue?.[key];
  const resolved = inferPropertyType(key, val);
  propertyClipboard.value = {
    key,
    value: Array.isArray(val) ? [...val] : val,
    type: explicitTypes[key] ?? resolved,
  };
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(`${key}: ${formatYamlValue(val)}`).catch(() => {});
  }
  openMenuKey.value = null;
  isTypeSubmenuOpen.value = false;
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
  isTypeSubmenuOpen.value = false;
}

function removeProperty(key: string): void {
  const current = { ...(props.modelValue ?? {}) };
  delete current[key];
  delete explicitTypes[key];
  emit('update:modelValue', current);
  openMenuKey.value = null;
  isTypeSubmenuOpen.value = false;
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

function handleNumberInput(key: string, raw: string): void {
  if (raw === '') {
    updateField(key, '');
    return;
  }
  const num = Number(raw);
  updateField(key, Number.isNaN(num) ? 0 : num);
}

function formatDateValue(val: unknown): string {
  if (typeof val !== 'string') return '';
  return val.slice(0, 10);
}

function formatDatetimeValue(val: unknown): string {
  if (typeof val !== 'string') return '';
  return val.slice(0, 16);
}

function asStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map((item) => String(item));
  if (typeof val === 'string' && val.trim()) {
    return val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeListItem(key: string, raw: string): string {
  const cleaned = raw.trim().replace(/,+$/, '').trim();
  if (!cleaned) return '';
  return isTagKey(key) ? cleaned.replace(/^#+/, '').toLowerCase() : cleaned;
}

function normalizedListQuery(key: string): string {
  return normalizeListItem(key, listInputs[key] ?? '');
}

function filteredDefaultTagsFor(key: string): string[] {
  const pool = props.defaultTags?.length ? props.defaultTags : [...DEFAULT_NOTE_TAGS];
  const existing = asStringArray(props.modelValue?.[key]);
  const available = pool.filter((tag) => !existing.includes(tag));
  const query = normalizedListQuery(key);
  if (!query) return available;
  return available.filter((tag) => tag.toLowerCase().includes(query));
}

function canCreateTagFor(key: string): boolean {
  const candidate = normalizedListQuery(key);
  if (!candidate) return false;
  const existing = asStringArray(props.modelValue?.[key]);
  return (
    !existing.includes(candidate) &&
    !filteredDefaultTagsFor(key).some((tag) => tag.toLowerCase() === candidate)
  );
}

function addSpecificListItem(key: string, rawItem: string): void {
  const item = normalizeListItem(key, rawItem);
  if (!item) return;
  const existing = asStringArray(props.modelValue?.[key]);
  if (!existing.includes(item)) {
    updateField(key, [...existing, item]);
  }
  listInputs[key] = '';
}

function commitListItem(key: string): void {
  const val = listInputs[key] ?? '';
  addSpecificListItem(key, val);
}

function removeListItem(key: string, target: string): void {
  const existing = asStringArray(props.modelValue?.[key]);
  updateField(
    key,
    existing.filter((item) => item !== target)
  );
}

function handleListInputBlur(key: string): void {
  setTimeout(() => {
    if (focusedListKey.value === key) {
      focusedListKey.value = null;
    }
  }, 120);
}

function textSuggestionsFor(key: string): readonly string[] {
  const lower = key.toLowerCase();
  if (lower === 'status') return DEFAULT_STATUS_OPTIONS;
  if (lower === 'area') return AREA_OPTIONS;
  return [];
}

function selectTextSuggestion(key: string, val: string): void {
  updateField(key, val);
  focusedTextKey.value = null;
}

function handleTextInputBlur(): void {
  setTimeout(() => {
    focusedTextKey.value = null;
  }, 120);
}

function formatYamlValue(val: unknown): string {
  if (Array.isArray(val)) return `[${val.join(', ')}]`;
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (val === null || val === undefined) return '';
  return String(val);
}

function serializeToYaml(data: EditorFrontmatter): string {
  const lines: string[] = ['---'];
  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) continue;
    lines.push(`${key}: ${formatYamlValue(val)}`);
  }
  lines.push('---');
  return lines.join('\n');
}

function parseScalarYamlValue(rawVal: string): unknown {
  const trimmed = rawVal.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed !== '' && /^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed.replace(/^['"]|['"]$/g, '');
}

function parseYamlText(text: string): EditorFrontmatter {
  const clean = text.replace(/^---\r?\n?/, '').replace(/\r?\n?---$/, '').trim();
  const result: EditorFrontmatter = {};
  let activeListKey: string | null = null;

  for (const rawLine of clean.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const listMatch = /^\s*-\s+(.+)$/.exec(rawLine);
    if (listMatch && activeListKey) {
      const existing = Array.isArray(result[activeListKey])
        ? (result[activeListKey] as string[])
        : [];
      const itemVal = (listMatch[1] ?? '').trim().replace(/^['"]|['"]$/g, '');
      if (itemVal) {
        existing.push(itemVal);
      }
      result[activeListKey] = existing;
      continue;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) {
      activeListKey = null;
      continue;
    }

    const key = trimmed.slice(0, colonIdx).trim();
    const val = trimmed.slice(colonIdx + 1).trim();
    if (!key) continue;

    if (val === '') {
      // Could be start of multi-line YAML array (or empty value)
      activeListKey = key;
      result[key] = key === 'tags' ? [] : '';
      continue;
    }

    activeListKey = null;
    if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1);
      result[key] = inner
        .split(',')
        .map((t) => t.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    } else if (key === 'tags') {
      result.tags = val
        .split(',')
        .map((t) => t.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    } else {
      result[key] = parseScalarYamlValue(val);
    }
  }

  return result;
}

function toggleRawMode(): void {
  if (!isRawMode.value) {
    rawYamlContent.value = serializeToYaml(props.modelValue ?? {});
    yamlParseError.value = null;
  }
  isRawMode.value = !isRawMode.value;
}

function handleRawYamlInput(): void {
  try {
    const parsed = parseYamlText(rawYamlContent.value);
    yamlParseError.value = null;
    emit('update:modelValue', parsed);
  } catch (err: unknown) {
    yamlParseError.value = err instanceof Error ? err.message : 'Erro ao processar YAML';
  }
}

watch(
  () => props.modelValue,
  (newVal) => {
    if (isRawMode.value) {
      rawYamlContent.value = serializeToYaml(newVal ?? {});
    }
  },
  { deep: true }
);

function handleWindowMouseDown(event: MouseEvent): void {
  if (!openMenuKey.value) return;
  const target = event.target as Node | null;
  const menuEl = Array.isArray(contextMenuRef.value)
    ? contextMenuRef.value[0]
    : contextMenuRef.value;
  if (menuEl && target && menuEl.contains(target)) {
    return;
  }
  if ((event.target as Element | null)?.closest('.prop-type-trigger')) {
    return;
  }
  openMenuKey.value = null;
  isTypeSubmenuOpen.value = false;
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
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f1f3f5;
  font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
  color: #37352f;
}

.mind-frontmatter-shell.is-collapsed {
  border-bottom-color: transparent;
  padding-bottom: 2px;
  margin-bottom: 8px;
}

.frontmatter-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 28px;
}

.frontmatter-toggle-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px 2px 22px;
  margin-left: -22px;
  border-radius: 5px;
  color: #111827;
  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.015em;
  transition: color 0.12s ease;
}

.chevron-indicator {
  position: absolute;
  left: 3px;
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
  gap: 6px;
}

.mode-switch-btn,
.remove-frontmatter-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 5px;
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 500;
  color: #495057;
  cursor: pointer;
  transition: all 0.12s ease;
}

.remove-frontmatter-btn {
  padding: 4px 5px;
  color: #868e96;
}

.mode-switch-btn:hover,
.mode-switch-btn.is-active {
  background-color: #f8f9fa;
  color: #111827;
  border-color: #dee2e6;
}

.remove-frontmatter-btn:hover {
  background-color: #fff5f5;
  color: #c92a2a;
  border-color: #ffc9c9;
}

.frontmatter-body {
  margin-top: 6px;
}

.obsidian-properties-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.property-row {
  position: relative;
  display: flex;
  align-items: flex-start;
  min-height: 30px;
  padding: 2px 6px;
  margin: 0 -6px;
  border-radius: 6px;
  border: 1px solid transparent;
  transition: background-color 0.1s ease, border-color 0.1s ease;
}

.property-row:hover {
  background-color: #f8f9fa;
}

.property-row.is-menu-open,
.property-row.is-draft {
  background-color: #ffffff;
  border-color: #dee2e6;
}

.property-key-cell {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  width: 156px;
  min-height: 26px;
  flex-shrink: 0;
  padding-right: 8px;
}

.prop-type-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
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
  color: #111827;
}

.prop-type-trigger.is-muted {
  cursor: default;
}

.prop-key-input {
  width: 100%;
  min-width: 0;
  border: none;
  background: transparent;
  color: #495057;
  font-size: 13px;
  font-weight: 500;
  padding: 2px 4px;
  border-radius: 4px;
  outline: none;
  font-family: inherit;
}

.prop-key-input:focus {
  background-color: #ffffff;
  color: #111827;
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
  color: #111827;
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
  padding: 2px 4px;
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
  color: #111827;
  padding: 2px 4px;
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
  color: #111827;
}

.facilitator-option.is-create {
  justify-content: flex-start;
  color: #1971c2;
  font-weight: 500;
}

/* Obsidian Context Menu in Light Theme */
.property-context-menu {
  position: absolute;
  left: 0;
  top: calc(100% + 4px);
  z-index: 120;
  width: 210px;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
}

.ctx-submenu-anchor {
  position: relative;
}

.ctx-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: none;
  background: transparent;
  padding: 6px 8px;
  border-radius: 5px;
  font-size: 12.5px;
  color: #37352f;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.ctx-menu-item:hover:not(:disabled),
.ctx-menu-item.is-active {
  background-color: #f1f3f5;
  color: #111827;
}

.ctx-menu-item.is-danger {
  color: #c92a2a;
}

.ctx-menu-item.is-danger:hover {
  background-color: #fff5f5;
  color: #c92a2a;
}

.ctx-menu-item.is-disabled,
.ctx-menu-item:disabled {
  color: #adb5bd;
  cursor: not-allowed;
}

.ctx-item-icon {
  flex-shrink: 0;
  opacity: 0.8;
}

.ctx-item-label {
  flex: 1;
}

.ctx-chevron,
.ctx-check {
  color: #868e96;
  flex-shrink: 0;
}

.ctx-divider {
  height: 1px;
  background-color: #e9ecef;
  margin: 4px 2px;
}

.ctx-type-submenu {
  position: absolute;
  left: calc(100% + 4px);
  top: -4px;
  width: 196px;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
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
  margin-top: 4px;
}

.add-property-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  color: #868e96;
  font-size: 12.5px;
  font-weight: 500;
  padding: 4px 6px;
  margin-left: -2px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.add-property-btn:hover {
  background-color: #f8f9fa;
  color: #111827;
}

.raw-yaml-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.raw-yaml-textarea {
  width: 100%;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.45;
  padding: 8px 10px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  background-color: #f8f9fa;
  color: #111827;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}

.raw-yaml-textarea:focus {
  border-color: #dee2e6;
  background-color: #ffffff;
}

.yaml-parse-error {
  color: #c92a2a;
  font-size: 12px;
}
</style>
