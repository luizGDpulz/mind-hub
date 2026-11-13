<template>
  <div class="diagrams-suite-wrapper" data-testid="diagram-embeds-block">
    <div class="diagram-tabs-bar">
      <div class="diagram-tabs-left" role="tablist" aria-label="Open-Source Diagram Blocks">
        <button
          type="button"
          role="tab"
          :aria-selected="activeKind === 'mermaid'"
          class="diagram-tab-btn"
          :class="{ 'is-active': activeKind === 'mermaid' }"
          data-testid="tab-diagram-mermaid"
          @click="activeKind = 'mermaid'"
        >
          <span>M</span>
          <span>Mermaid (Flowchart)</span>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeKind === 'excalidraw'"
          class="diagram-tab-btn"
          :class="{ 'is-active': activeKind === 'excalidraw' }"
          data-testid="tab-diagram-excalidraw"
          @click="activeKind = 'excalidraw'"
        >
          <span>✎</span>
          <span>Excalidraw (Whiteboard MIT)</span>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeKind === 'drawio'"
          class="diagram-tab-btn"
          :class="{ 'is-active': activeKind === 'drawio' }"
          data-testid="tab-diagram-drawio"
          @click="activeKind = 'drawio'"
        >
          <span>◈</span>
          <span>Draw.io (diagrams.net Apache 2.0)</span>
        </button>
      </div>
    </div>

    <KeepAlive>
      <MermaidEmbedPanel v-if="activeKind === 'mermaid'" />
      <ExcalidrawEmbedPanel v-else-if="activeKind === 'excalidraw'" />
      <DrawioEmbedPanel v-else />
    </KeepAlive>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { DiagramKind } from '@mind-hub/shared';
import DrawioEmbedPanel from './diagrams/DrawioEmbedPanel.vue';
import ExcalidrawEmbedPanel from './diagrams/ExcalidrawEmbedPanel.vue';
import MermaidEmbedPanel from './diagrams/MermaidEmbedPanel.vue';

const props = defineProps<{
  initialKind?: DiagramKind;
}>();

const activeKind = ref<DiagramKind>(props.initialKind ?? 'mermaid');
</script>

<style scoped>
.diagrams-suite-wrapper {
  margin: 22px 0;
}

.diagram-tabs-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.diagram-tabs-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.diagram-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid var(--mind-border-subtle);
  background: var(--mind-bg-canvas);
  color: var(--mind-text-secondary);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
}

.diagram-tab-btn:hover {
  background: var(--mind-bg-hover);
}

.diagram-tab-btn.is-active {
  background: var(--mind-bg-active);
  border-color: var(--mind-border-control);
  color: var(--mind-text-primary);
  font-weight: 600;
}
</style>
