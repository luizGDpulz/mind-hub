<template>
  <div v-if="modelValue" class="mind-modal-backdrop" @click.self="close">
    <div
      class="mind-icon-picker-modal-host"
      data-testid="mind-icon-picker-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Escolher ícone da página"
    >
      <MindIconPicker
        :model-value="currentIcon || null"
        :allow-remove="true"
        :allow-upload="true"
        :show-callout-tone="false"
        :on-upload-file="uploadIconAsset"
        @select="handleSelect"
        @remove="handleRemove"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { MindIconPicker } from '@mind-hub/editor';

withDefaults(
  defineProps<{
    modelValue: boolean;
    currentIcon?: string | null;
  }>(),
  {
    currentIcon: '',
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'select', icon: string): void;
}>();

function close(): void {
  emit('update:modelValue', false);
}

function handleSelect(icon: string): void {
  emit('select', icon);
  close();
}

function handleRemove(): void {
  emit('select', '');
  close();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Falha ao ler arquivo selecionado.'));
      }
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo selecionado.'));
    reader.readAsDataURL(file);
  });
}

async function uploadIconAsset(file: File): Promise<string> {
  const dataBase64 = await fileToBase64(file);
  const response = await fetch('/api/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type,
      dataBase64,
    }),
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorPayload.error ?? 'Erro ao salvar imagem no servidor.');
  }

  const payload = (await response.json()) as { asset?: { url?: string } };
  const url = payload.asset?.url;
  if (!url) {
    throw new Error('Servidor não retornou URL do asset.');
  }
  return url;
}
</script>

<style scoped>
.mind-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: rgba(15, 23, 42, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
}

.mind-icon-picker-modal-host {
  max-width: calc(100vw - 32px);
}
</style>
