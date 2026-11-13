<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
    readOnly?: boolean;
  }>(),
  {
    modelValue: '',
    placeholder: 'Sem título',
    readOnly: false,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'focusEditor'): void;
}>();

function handleInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).value);
}
</script>

<template>
  <div class="mind-note-title-bar" data-testid="mind-note-title-bar">
    <input
      :value="modelValue"
      type="text"
      class="mind-note-title-input"
      data-testid="mind-note-title-input"
      :placeholder="placeholder"
      :readonly="readOnly"
      aria-label="Título da nota"
      @input="handleInput"
      @keydown.enter.prevent="emit('focusEditor')"
      @keydown.down.prevent="emit('focusEditor')"
    >
  </div>
</template>

<style scoped>
.mind-note-title-bar {
  margin-bottom: 10px;
}

.mind-note-title-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 34px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: #111827;
  padding: 2px 0;
  margin: 0;
  font-family: inherit;
}

.mind-note-title-input:focus,
.mind-note-title-input:focus-visible {
  outline: none;
  border: none;
  box-shadow: none;
}

.mind-note-title-input::placeholder {
  color: #ced4da;
}
</style>
