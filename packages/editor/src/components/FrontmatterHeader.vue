<template>
  <div
    class="mind-frontmatter-shell"
    data-testid="mind-frontmatter-header"
    :class="{ 'is-collapsed': isCollapsed }"
  >
    <!-- Header Control Bar: Toggle Collapse & Toggle Raw/Visual Mode -->
    <div class="frontmatter-top-bar">
      <button
        type="button"
        class="frontmatter-toggle-btn"
        data-testid="toggle-frontmatter-collapse"
        :aria-expanded="!isCollapsed"
        @click="isCollapsed = !isCollapsed"
      >
        <span class="chevron-indicator" :class="{ 'is-open': !isCollapsed }">▸</span>
        <span class="bar-title">Propriedades da Nota</span>
        <span class="property-counter-pill">{{ tagCount > 0 ? `${tagCount} tags` : 'sem tags' }}</span>
        <span v-if="props.modelValue.status" class="property-status-pill">{{ props.modelValue.status }}</span>
      </button>

      <div v-if="!isCollapsed" class="frontmatter-actions">
        <button
          type="button"
          class="mode-switch-btn"
          data-testid="toggle-raw-yaml-mode"
          :class="{ 'is-active': isRawMode }"
          @click="toggleRawMode"
        >
          <span v-if="isRawMode">Visual</span>
          <span v-else>YAML Raw</span>
        </button>
      </div>
    </div>

    <!-- Expanded Body -->
    <div v-if="!isCollapsed" class="frontmatter-body" data-testid="frontmatter-content">
      <!-- RAW YAML TEXT EDITOR MODE -->
      <div v-if="isRawMode" class="raw-yaml-container">
        <textarea
          v-model="rawYamlContent"
          class="raw-yaml-textarea"
          data-testid="raw-yaml-textarea"
          placeholder="---&#10;tags: [mind, note]&#10;status: ativo&#10;---"
          rows="6"
          spellcheck="false"
          @input="handleRawYamlInput"
        />
        <div v-if="yamlParseError" class="yaml-parse-error" data-testid="yaml-error-msg">
          {{ yamlParseError }}
        </div>
      </div>

      <!-- VISUAL PROPERTIES MODE (Notion/Obsidian style) -->
      <div v-else class="visual-properties-grid">
        <!-- Status Property -->
        <div class="property-row">
          <div class="property-label">
            <span class="prop-icon">🔘</span>
            <span>Status</span>
          </div>
          <div class="property-value">
            <select
              :value="props.modelValue.status || 'ativo'"
              class="status-select"
              data-testid="status-property-select"
              @change="updateStatus(($event.target as HTMLSelectElement).value)"
            >
              <option value="ativo">ativo</option>
              <option value="rascunho">rascunho</option>
              <option value="em-progresso">em progresso</option>
              <option value="concluído">concluído</option>
              <option value="arquivado">arquivado</option>
            </select>
          </div>
        </div>

        <!-- Project Property -->
        <div class="property-row">
          <div class="property-label">
            <span class="prop-icon">📁</span>
            <span>Projeto</span>
          </div>
          <div class="property-value">
            <input
              type="text"
              :value="props.modelValue.project || ''"
              class="text-property-input"
              data-testid="project-property-input"
              placeholder="Vincular a um projeto..."
              @change="updateField('project', ($event.target as HTMLInputElement).value)"
            >
          </div>
        </div>

        <!-- Tags Property (Pastel Pills + Default Presets + Create Custom) -->
        <div class="property-row tags-property-row">
          <div class="property-label">
            <span class="prop-icon">🏷️</span>
            <span>Tags</span>
          </div>
          <div class="property-value-stack">
            <div class="property-value tags-container" data-testid="tags-container">
              <span
                v-for="tag in currentTags"
                :key="tag"
                class="tag-pastel-pill"
                :data-testid="`tag-pill-${tag}`"
              >
                #{{ tag }}
                <button
                  v-if="!readOnly"
                  type="button"
                  class="remove-tag-btn"
                  title="Remover tag"
                  @click="removeTag(tag)"
                >×</button>
              </span>

              <div v-if="!readOnly" class="add-tag-box">
                <input
                  v-model="newTagInput"
                  type="text"
                  class="new-tag-input"
                  data-testid="new-tag-input"
                  placeholder="+ criar tag"
                  @keydown.enter.prevent="addTag"
                  @keydown.,.prevent="addTag"
                >
              </div>
            </div>

            <div
              v-if="!readOnly && (filteredDefaultTags.length > 0 || canCreateCustomTag)"
              class="default-tags-bar"
              data-testid="default-tags-suggestions"
            >
              <span class="default-tags-label">Padrões:</span>
              <button
                v-if="canCreateCustomTag"
                type="button"
                class="default-tag-chip is-create"
                data-testid="create-custom-tag-btn"
                @click="addTag"
              >
                + criar "#{{ normalizedInputTag }}"
              </button>
              <button
                v-for="tag in filteredDefaultTags"
                :key="tag"
                type="button"
                class="default-tag-chip"
                :data-testid="`default-tag-${tag}`"
                @click="addSpecificTag(tag)"
              >
                + {{ tag }}
              </button>
            </div>
          </div>
        </div>

        <!-- Dates (Read-only Metadata) -->
        <div v-if="props.modelValue.created || props.modelValue.updated" class="property-row metadata-row">
          <div class="property-label">
            <span class="prop-icon">🕒</span>
            <span>Datas</span>
          </div>
          <div class="property-value date-info">
            <span v-if="props.modelValue.created">Criado: {{ props.modelValue.created }}</span>
            <span v-if="props.modelValue.updated" class="date-sep">·</span>
            <span v-if="props.modelValue.updated">Atualizado: {{ props.modelValue.updated }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { DEFAULT_NOTE_TAGS, type EditorFrontmatter } from '../types.js';

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
}>();

const isCollapsed = ref(props.initialCollapsed);
const isRawMode = ref(false);
const newTagInput = ref('');
const rawYamlContent = ref('');
const yamlParseError = ref<string | null>(null);

const currentTags = computed<string[]>(() => {
  return Array.isArray(props.modelValue.tags) ? props.modelValue.tags : [];
});

const tagCount = computed(() => currentTags.value.length);

function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, '').replace(/,+$/, '').trim().toLowerCase();
}

const normalizedInputTag = computed(() => normalizeTag(newTagInput.value));

const filteredDefaultTags = computed<string[]>(() => {
  const pool = props.defaultTags?.length ? props.defaultTags : [...DEFAULT_NOTE_TAGS];
  const available = pool.filter((tag) => !currentTags.value.includes(tag));
  const query = normalizedInputTag.value;
  if (!query) return available;
  return available.filter((tag) => tag.toLowerCase().includes(query));
});

const canCreateCustomTag = computed<boolean>(() => {
  const candidate = normalizedInputTag.value;
  if (!candidate) return false;
  return (
    !currentTags.value.includes(candidate) &&
    !filteredDefaultTags.value.some((tag) => tag.toLowerCase() === candidate)
  );
});

function serializeToYaml(data: EditorFrontmatter): string {
  const lines: string[] = ['---'];
  if (data.title) lines.push(`title: ${data.title}`);
  if (Array.isArray(data.tags)) {
    lines.push(`tags: [${data.tags.join(', ')}]`);
  }
  if (data.status) lines.push(`status: ${data.status}`);
  if (data.project) lines.push(`project: ${data.project}`);
  if (data.created) lines.push(`created: ${data.created}`);
  if (data.updated) lines.push(`updated: ${data.updated}`);
  
  for (const [k, v] of Object.entries(data)) {
    if (!['title', 'tags', 'status', 'project', 'created', 'updated'].includes(k) && v !== undefined) {
      lines.push(`${k}: ${JSON.stringify(v)}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

function parseYamlText(text: string): EditorFrontmatter {
  const clean = text.replace(/^---\n?/, '').replace(/\n?---$/, '').trim();
  const result: EditorFrontmatter = {};
  for (const line of clean.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const val = trimmed.slice(colonIdx + 1).trim();
    if (key === 'tags') {
      const match = val.match(/\[(.*)\]/);
      if (match && match[1] !== undefined) {
        result.tags = match[1].split(',').map((t) => t.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
      } else {
        result.tags = val.split(',').map((t) => t.trim()).filter(Boolean);
      }
    } else {
      result[key] = val.replace(/^['"]|['"]$/g, '');
    }
  }
  return result;
}

function toggleRawMode() {
  if (!isRawMode.value) {
    rawYamlContent.value = serializeToYaml(props.modelValue);
    yamlParseError.value = null;
  }
  isRawMode.value = !isRawMode.value;
}

function handleRawYamlInput() {
  try {
    const parsed = parseYamlText(rawYamlContent.value);
    yamlParseError.value = null;
    emit('update:modelValue', parsed);
  } catch (err: unknown) {
    yamlParseError.value = err instanceof Error ? err.message : 'Erro ao processar YAML';
  }
}

function updateField(key: string, val: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: val,
  });
}

function updateStatus(newStatus: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    status: newStatus,
  });
}

function addSpecificTag(rawTag: string) {
  const tag = normalizeTag(rawTag);
  if (!tag) return;
  const existing = currentTags.value;
  if (!existing.includes(tag)) {
    emit('update:modelValue', {
      ...props.modelValue,
      tags: [...existing, tag],
    });
  }
}

function addTag() {
  const tag = normalizedInputTag.value;
  if (!tag) return;
  addSpecificTag(tag);
  newTagInput.value = '';
}

function removeTag(tagToRemove: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    tags: currentTags.value.filter((t) => t !== tagToRemove),
  });
}

watch(
  () => props.modelValue,
  (newVal) => {
    if (isRawMode.value) {
      rawYamlContent.value = serializeToYaml(newVal);
    }
  },
  { deep: true }
);
</script>

<style scoped>
.mind-frontmatter-shell {
  border-bottom: 1px solid #e9ecef;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #37352f;
}

.frontmatter-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0;
}

.frontmatter-toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  color: #787774;
  font-size: 0.8125rem;
  font-weight: 500;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.frontmatter-toggle-btn:hover {
  background-color: #f1f1ef;
  color: #37352f;
}

.chevron-indicator {
  display: inline-block;
  font-size: 0.75rem;
  transition: transform 0.2s ease;
}

.chevron-indicator.is-open {
  transform: rotate(90deg);
}

.property-counter-pill,
.property-status-pill {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  background-color: #f1f1ef;
  color: #5a5955;
  border-radius: 12px;
  font-weight: 500;
}

.frontmatter-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mode-switch-btn {
  background: none;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 0.15rem 0.5rem;
  font-size: 0.75rem;
  color: #787774;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mode-switch-btn:hover,
.mode-switch-btn.is-active {
  background-color: #f8f9fa;
  color: #1a1a1a;
  border-color: #ced4da;
}

.frontmatter-body {
  margin-top: 0.5rem;
  padding-left: 0.5rem;
}

.visual-properties-grid {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.property-row {
  display: flex;
  align-items: center;
  min-height: 1.75rem;
  font-size: 0.8125rem;
}

.property-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 120px;
  flex-shrink: 0;
  color: #9b9a97;
  font-size: 0.775rem;
  font-weight: 500;
}

.prop-icon {
  font-size: 0.8rem;
}

.property-value {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.status-select {
  border: 1px solid transparent;
  border-radius: 4px;
  background-color: transparent;
  padding: 0.15rem 0.4rem;
  font-size: 0.8125rem;
  color: #37352f;
  cursor: pointer;
  transition: all 0.15s ease;
}

.status-select:hover,
.status-select:focus {
  border-color: #e9ecef;
  background-color: #f8f9fa;
}

.text-property-input {
  border: 1px solid transparent;
  border-radius: 4px;
  background-color: transparent;
  padding: 0.2rem 0.4rem;
  font-size: 0.8125rem;
  color: #37352f;
  width: 100%;
  max-width: 320px;
}

.text-property-input:hover,
.text-property-input:focus {
  border-color: #e9ecef;
  background-color: #f8f9fa;
  outline: none;
}

.tag-pastel-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background-color: #e8f3ed;
  color: #1e5e3a;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.remove-tag-btn {
  background: none;
  border: none;
  color: #1e5e3a;
  cursor: pointer;
  padding: 0;
  font-size: 0.8rem;
  line-height: 1;
  opacity: 0.6;
}

.remove-tag-btn:hover {
  opacity: 1;
}

.new-tag-input {
  border: 1px dashed #dee2e6;
  border-radius: 999px;
  background: #ffffff;
  padding: 0.14rem 0.55rem;
  font-size: 0.75rem;
  color: #495057;
  outline: none;
  width: 96px;
  transition: all 0.15s ease;
}

.new-tag-input:focus {
  width: 132px;
  border-color: #1971c2;
  color: #111827;
}

.tags-property-row {
  align-items: flex-start;
  padding-top: 2px;
}

.property-value-stack {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.default-tags-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.default-tags-label {
  font-size: 0.7rem;
  color: #868e96;
  font-weight: 500;
  margin-right: 2px;
}

.default-tag-chip {
  border: 1px solid #e9ecef;
  background-color: #f8f9fa;
  color: #495057;
  border-radius: 999px;
  padding: 0.1rem 0.48rem;
  font-size: 0.7rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s ease;
}

.default-tag-chip:hover {
  background-color: #f1f3f5;
  border-color: #dee2e6;
  color: #111827;
}

.default-tag-chip.is-create {
  background-color: #e7f5ff;
  border-color: #d0ebff;
  color: #1971c2;
}

.metadata-row {
  color: #9b9a97;
  font-size: 0.725rem;
  padding-top: 0.25rem;
}

.date-info {
  color: #9b9a97;
  font-size: 0.725rem;
}

.date-sep {
  margin: 0 0.35rem;
}

.raw-yaml-container {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.raw-yaml-textarea {
  width: 100%;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.8125rem;
  line-height: 1.4;
  padding: 0.5rem;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  background-color: #fcfcfc;
  color: #24292f;
  resize: vertical;
  outline: none;
}

.raw-yaml-textarea:focus {
  border-color: #ced4da;
  background-color: #ffffff;
}

.yaml-parse-error {
  color: #c92a2a;
  font-size: 0.75rem;
  padding: 0.15rem 0;
}
</style>
