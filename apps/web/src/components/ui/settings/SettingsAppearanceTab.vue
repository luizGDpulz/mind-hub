<template>
  <section class="mind-settings-section" data-testid="settings-panel-appearance">
    <h4 class="mind-settings-title">Aparência &amp; Tipografia</h4>

    <div class="mind-setting-row">
      <div class="mind-setting-meta">
        <label class="mind-setting-label">Tema Visual</label>
        <span class="mind-setting-desc">Design System sóbrio inspirado no Docmost / Notion.</span>
      </div>
      <span class="mind-pill-blue">mind-light-style (Ativo)</span>
    </div>

    <div class="mind-setting-row">
      <div class="mind-setting-meta">
        <label class="mind-setting-label">Densidade da Interface</label>
        <span class="mind-setting-desc">Espaçamento dos nós da árvore e dos menus.</span>
      </div>
      <div class="mind-setting-radio-group">
        <label class="mind-setting-radio-label">
          <input
            type="radio"
            value="comfortable"
            :checked="densityMode === 'comfortable'"
            data-testid="density-comfortable"
            @change="emit('update:densityMode', 'comfortable')"
          />
          <span>Confortável</span>
        </label>
        <label class="mind-setting-radio-label">
          <input
            type="radio"
            value="compact"
            :checked="densityMode === 'compact'"
            data-testid="density-compact"
            @change="emit('update:densityMode', 'compact')"
          />
          <span>Compacto</span>
        </label>
      </div>
    </div>

    <div class="mind-setting-row">
      <div class="mind-setting-meta">
        <label class="mind-setting-label">Largura do Canvas</label>
        <span class="mind-setting-desc">Largura máxima da coluna central de leitura/escrita.</span>
      </div>
      <div class="mind-setting-radio-group">
        <label class="mind-setting-radio-label">
          <input
            type="radio"
            value="centered"
            :checked="contentWidthMode === 'centered'"
            data-testid="width-centered"
            @change="emit('update:contentWidthMode', 'centered')"
          />
          <span>Centralizado (760px)</span>
        </label>
        <label class="mind-setting-radio-label">
          <input
            type="radio"
            value="full"
            :checked="contentWidthMode === 'full'"
            data-testid="width-full"
            @change="emit('update:contentWidthMode', 'full')"
          />
          <span>Largura Total (100%)</span>
        </label>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  densityMode: 'comfortable' | 'compact';
  contentWidthMode: 'centered' | 'full';
}>();

const emit = defineEmits<{
  (e: 'update:densityMode', value: 'comfortable' | 'compact'): void;
  (e: 'update:contentWidthMode', value: 'centered' | 'full'): void;
}>();
</script>

<style scoped>
@import './settings-shared.css';
</style>
