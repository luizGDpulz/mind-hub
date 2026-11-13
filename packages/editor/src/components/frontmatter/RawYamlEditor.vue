<template>
  <div class="raw-yaml-container">
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
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { EditorFrontmatter } from '../../types.js';
import { parseYamlText, serializeToYaml } from './frontmatter-helpers.js';

const props = withDefaults(
  defineProps<{
    modelValue: EditorFrontmatter;
    readOnly?: boolean;
  }>(),
  {
    readOnly: false,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: EditorFrontmatter): void;
}>();

const rawYamlContent = ref(serializeToYaml(props.modelValue ?? {}));
const yamlParseError = ref<string | null>(null);

watch(
  () => props.modelValue,
  (newVal) => {
    const serialized = serializeToYaml(newVal ?? {});
    if (serialized !== rawYamlContent.value && !yamlParseError.value) {
      // Only overwrite while idle or externally mutated if current text parses to something else
      try {
        const currentParsed = JSON.stringify(parseYamlText(rawYamlContent.value));
        const incomingJson = JSON.stringify(newVal ?? {});
        if (currentParsed !== incomingJson) {
          rawYamlContent.value = serialized;
        }
      } catch {
        rawYamlContent.value = serialized;
      }
    }
  },
  { deep: true },
);

function handleRawYamlInput(): void {
  try {
    const parsed = parseYamlText(rawYamlContent.value);
    yamlParseError.value = null;
    emit('update:modelValue', parsed);
  } catch (err: unknown) {
    yamlParseError.value = err instanceof Error ? err.message : 'Erro ao processar YAML';
  }
}
</script>

<style scoped>
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
  color: #212529;
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
