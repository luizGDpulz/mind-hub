<template>
  <section class="excalidraw-block-card" data-testid="excalidraw-whiteboard-block">
    <div class="excalidraw-top-overlay">
      <button type="button" class="exc-square-btn" aria-label="Excalidraw menu">☰</button>

      <div class="exc-island-toolbar" role="toolbar" aria-label="Excalidraw drawing tools">
        <button
          v-for="tool in excalidrawTools"
          :key="tool.id"
          type="button"
          class="exc-tool-btn"
          :class="{ 'is-active': activeExcTool === tool.id }"
          :title="tool.label"
          @click="selectExcalidrawTool(tool.id)"
        >
          <span>{{ tool.icon }}</span>
          <sub v-if="tool.num" class="exc-tool-sub">{{ tool.num }}</sub>
        </button>
      </div>

      <div class="exc-exit-actions">
        <button
          type="button"
          class="exc-save-exit-btn"
          data-testid="excalidraw-save-btn"
          @click="addExcalidrawCard"
        >
          Save &amp; Exit
        </button>
        <button type="button" class="exc-exit-btn" @click="activeExcTool = 'select'">
          Exit
        </button>
      </div>
    </div>

    <div class="exc-hint-line">
      To move canvas, hold <kbd>Scroll wheel</kbd> or <kbd>Space</kbd> while dragging, or use the hand tool
    </div>

    <h3 class="exc-hand-heading">
      Collect all you'll need during the interview in a
      <span class="exc-underline-highlight">single space:</span>
      questions, talking points, portfolio links, system design components, and more
    </h3>

    <div class="exc-canvas-grid" :style="{ transform: `scale(${excalidrawZoom / 100})` }">
      <div
        v-for="box in excalidrawBoxes"
        :key="box.id"
        class="exc-dashed-card"
        :data-testid="`exc-card-${box.id}`"
      >
        <div class="exc-card-title">{{ box.title }}</div>
        <ul class="exc-card-list">
          <li v-for="(item, idx) in box.bullets" :key="idx">{{ item }}</li>
        </ul>
      </div>
    </div>

    <div class="exc-bottom-bar">
      <div class="exc-zoom-pill">
        <button
          type="button"
          class="exc-zoom-btn"
          aria-label="Zoom out"
          @click="excalidrawZoom = Math.max(50, excalidrawZoom - 10)"
        >
          −
        </button>
        <span class="exc-zoom-label">{{ excalidrawZoom }}%</span>
        <button
          type="button"
          class="exc-zoom-btn"
          aria-label="Zoom in"
          @click="excalidrawZoom = Math.min(120, excalidrawZoom + 10)"
        >
          +
        </button>
      </div>
      <div class="exc-zoom-pill">
        <button type="button" class="exc-zoom-btn" aria-label="Undo">↶</button>
        <button type="button" class="exc-zoom-btn" aria-label="Redo">↷</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const activeExcTool = ref('select');
const excalidrawZoom = ref(100);
const excalidrawTools = [
  { id: 'lock', icon: '🔒', num: '', label: 'Keep tool active' },
  { id: 'hand', icon: '✋', num: '', label: 'Hand (panning tool)' },
  { id: 'select', icon: '↖', num: '1', label: 'Selection' },
  { id: 'rect', icon: '▢', num: '2', label: 'Rectangle' },
  { id: 'diamond', icon: '◇', num: '3', label: 'Diamond' },
  { id: 'ellipse', icon: '◯', num: '4', label: 'Ellipse' },
  { id: 'arrow', icon: '→', num: '5', label: 'Arrow' },
  { id: 'line', icon: '—', num: '6', label: 'Line' },
  { id: 'draw', icon: '✎', num: '7', label: 'Draw' },
  { id: 'text', icon: 'A', num: '8', label: 'Text' },
];

const excalidrawBoxes = ref([
  {
    id: 'clarifying',
    title: 'Clarifying questions for the task 💬',
    bullets: [
      'Who are the users?',
      'How many active users are expected (per day + peak)?',
      'What are the constraints & latency targets?',
    ],
  },
  {
    id: 'questions-job',
    title: 'Questions about the architecture 🙋',
    bullets: [
      'Stack: Fastify + Drizzle ORM + PostgreSQL pgvector',
      'Zero any & strict TypeScript contracts',
      'Native /mcp JSON-RPC 2.0 endpoint',
    ],
  },
  {
    id: 'experience',
    title: 'Experience highlights ⭐',
    bullets: [
      '✅ Designed high-throughput block engine with MindEditor',
      '⚙️ Tech: Vue 3, Quasar, Fastify, Drizzle, pgvector',
      '📈 Result: Git sovereignty & full-text + vector indexing',
    ],
  },
  {
    id: 'scaling',
    title: 'Scaling 🚀 & Caching 📦',
    bullets: [
      'Replication & Partitioning across read replicas',
      'In-memory & Distributed Redis / pgvector HNSW index',
      'Load balancing behind Nginx Proxy Manager (proxy-net)',
    ],
  },
]);

function selectExcalidrawTool(toolId: string): void {
  activeExcTool.value = toolId;
}

function addExcalidrawCard(): void {
  excalidrawBoxes.value.push({
    id: `custom-${excalidrawBoxes.value.length + 1}`,
    title: `System Component #${excalidrawBoxes.value.length + 1} 🧩`,
    bullets: ['New hand-drawn architecture note', 'Synced with Mind block AST'],
  });
}
</script>

<style scoped>
.excalidraw-block-card {
  background: var(--mind-bg-canvas);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 8px;
  padding: 16px;
  box-shadow: var(--mind-shadow-card);
}

.excalidraw-top-overlay {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.exc-square-btn {
  width: 34px;
  height: 34px;
  border: 1px solid var(--mind-border-control);
  border-radius: 6px;
  background: var(--mind-bg-sidebar);
  cursor: pointer;
}

.exc-island-toolbar {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--mind-bg-canvas);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 8px;
  box-shadow: var(--mind-shadow-popover);
}

.exc-tool-btn {
  min-width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--mind-text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 1px;
}

.exc-tool-btn.is-active,
.exc-tool-btn:hover {
  background: #e7f5ff;
  color: #1971c2;
}

.exc-tool-sub {
  font-size: 9px;
  opacity: 0.7;
}

.exc-exit-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.exc-save-exit-btn {
  height: 32px;
  padding: 0 12px;
  background: var(--mind-accent-solid);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.exc-exit-btn {
  height: 32px;
  padding: 0 12px;
  background: #e03131;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.exc-hint-line {
  text-align: center;
  font-size: 11px;
  color: var(--mind-text-muted);
  margin-bottom: 10px;
}

.exc-hand-heading {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  max-width: 580px;
  margin: 0 auto 16px;
  line-height: 1.4;
  color: var(--mind-text-primary);
}

.exc-underline-highlight {
  border-bottom: 3px solid #20c997;
}

.exc-canvas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px;
  transform-origin: top center;
}

.exc-dashed-card {
  border: 1.5px dashed #495057;
  border-radius: 10px;
  padding: 12px 14px;
  background: var(--mind-bg-canvas);
}

.exc-card-title {
  font-size: 13.5px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--mind-text-primary);
  border-bottom: 2px solid #e7f5ff;
  padding-bottom: 4px;
}

.exc-card-list {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  color: var(--mind-text-secondary);
  line-height: 1.5;
}

.exc-bottom-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}

.exc-zoom-pill {
  display: inline-flex;
  align-items: center;
  background: var(--mind-bg-sidebar);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 6px;
  overflow: hidden;
}

.exc-zoom-btn {
  border: none;
  background: transparent;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 12.5px;
}

.exc-zoom-label {
  font-size: 11.5px;
  padding: 0 6px;
  color: var(--mind-text-secondary);
}
</style>
