<template>
  <div class="diagrams-suite-wrapper" data-testid="diagram-embeds-block">
    <!-- Diagram Type Switcher / Block Selector -->
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

    <!-- 1. MERMAID BLOCK (06-mermaid-code-diagram-block.png) -->
    <section
      v-if="activeKind === 'mermaid'"
      class="mermaid-block-card copyable"
      data-testid="mermaid-diagram-block"
    >
      <div class="mermaid-top-controls">
        <select v-model="mermaidDialect" class="mermaid-lang-select" aria-label="Diagram language">
          <option value="mermaid">mermaid</option>
        </select>
        <span class="copy">
          <button
            ref="copyBtnRef"
            type="button"
            class="copy-button"
            aria-label="Copy Mermaid diagram code"
            data-testid="copy-mermaid-btn"
            @click="handleCopyMermaid"
          >
            <span aria-hidden="true">{{ copiedState ? '✓' : '⧉' }}</span>
          </button>
          <span class="copy-tip" role="status">{{ copyFeedbackText }}</span>
        </span>
      </div>

      <!-- Editable Mermaid Source Code -->
      <div class="mermaid-source-wrap">
        <textarea
          v-model="mermaidSource"
          rows="6"
          spellcheck="false"
          aria-label="Mermaid flowchart source"
          class="mermaid-code-textarea"
          data-testid="mermaid-source-input"
        />
      </div>

      <!-- Rendered Mermaid Flowchart SVG -->
      <div class="mermaid-svg-stage" data-testid="mermaid-svg-output">
        <svg viewBox="0 0 520 430" class="mermaid-svg" role="img" aria-label="Mermaid rendered flowchart">
          <defs>
            <marker
              id="mmd-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#333333" />
            </marker>
          </defs>

          <!-- Node A: Christmas -->
          <rect x="205" y="12" width="110" height="42" fill="#ececff" stroke="#9370db" stroke-width="1.2" />
          <text x="260" y="37" text-anchor="middle" class="mmd-node-text">{{ parsedMermaidNodes.root }}</text>

          <!-- Edge A -> B -->
          <line x1="260" y1="54" x2="260" y2="114" stroke="#333333" stroke-width="1.2" marker-end="url(#mmd-arrow)" />
          <rect x="222" y="72" width="76" height="20" fill="#e9ecef" rx="3" />
          <text x="260" y="86" text-anchor="middle" class="mmd-edge-text">Get money</text>

          <!-- Node B: Go shopping -->
          <rect x="205" y="116" width="110" height="42" rx="6" fill="#ececff" stroke="#9370db" stroke-width="1.2" />
          <text x="260" y="141" text-anchor="middle" class="mmd-node-text">{{ parsedMermaidNodes.step }}</text>

          <!-- Edge B -> C -->
          <line x1="260" y1="158" x2="260" y2="195" stroke="#333333" stroke-width="1.2" marker-end="url(#mmd-arrow)" />

          <!-- Node C: Let me think (Diamond) -->
          <polygon points="260,198 322,255 260,312 198,255" fill="#ececff" stroke="#9370db" stroke-width="1.2" />
          <text x="260" y="259" text-anchor="middle" class="mmd-node-text">{{ parsedMermaidNodes.decision }}</text>

          <!-- Edges from C to D, E, F -->
          <path d="M 222 278 Q 145 320 135 366" fill="none" stroke="#333333" stroke-width="1.2" marker-end="url(#mmd-arrow)" />
          <rect x="135" y="325" width="32" height="18" fill="#e9ecef" rx="2" />
          <text x="151" y="338" text-anchor="middle" class="mmd-edge-text">One</text>

          <line x1="260" y1="312" x2="260" y2="366" stroke="#333333" stroke-width="1.2" marker-end="url(#mmd-arrow)" />
          <rect x="244" y="325" width="32" height="18" fill="#e9ecef" rx="2" />
          <text x="260" y="338" text-anchor="middle" class="mmd-edge-text">Two</text>

          <path d="M 298 278 Q 375 320 385 366" fill="none" stroke="#333333" stroke-width="1.2" marker-end="url(#mmd-arrow)" />
          <rect x="355" y="325" width="42" height="18" fill="#e9ecef" rx="2" />
          <text x="376" y="338" text-anchor="middle" class="mmd-edge-text">Three</text>

          <!-- Leaf Nodes D, E, F -->
          <rect x="90" y="370" width="90" height="42" fill="#ececff" stroke="#9370db" stroke-width="1.2" />
          <text x="135" y="395" text-anchor="middle" class="mmd-node-text">{{ parsedMermaidNodes.branch1 }}</text>

          <rect x="215" y="370" width="90" height="42" fill="#ececff" stroke="#9370db" stroke-width="1.2" />
          <text x="260" y="395" text-anchor="middle" class="mmd-node-text">{{ parsedMermaidNodes.branch2 }}</text>

          <rect x="340" y="370" width="90" height="42" fill="#ececff" stroke="#9370db" stroke-width="1.2" />
          <text x="385" y="395" text-anchor="middle" class="mmd-node-text">{{ parsedMermaidNodes.branch3 }}</text>
        </svg>
      </div>
    </section>

    <!-- 2. EXCALIDRAW WHITEBOARD BLOCK (05-excalidraw-whiteboard-embed.png) -->
    <section
      v-else-if="activeKind === 'excalidraw'"
      class="excalidraw-block-card"
      data-testid="excalidraw-whiteboard-block"
    >
      <!-- Top Bar with Floating Island Toolbar & Save & Exit / Exit buttons -->
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
        <span class="exc-underline-teal">single space:</span>
        questions, talking points, portfolio links, system design components, and more
      </h3>

      <!-- Hand-drawn Dashed System Design Grid -->
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

      <!-- Bottom Left Zoom Controls -->
      <div class="exc-bottom-bar">
        <div class="exc-zoom-pill">
          <button type="button" class="exc-zoom-btn" aria-label="Zoom out" @click="excalidrawZoom = Math.max(50, excalidrawZoom - 10)">−</button>
          <span class="exc-zoom-label">{{ excalidrawZoom }}%</span>
          <button type="button" class="exc-zoom-btn" aria-label="Zoom in" @click="excalidrawZoom = Math.min(120, excalidrawZoom + 10)">+</button>
        </div>
        <div class="exc-zoom-pill">
          <button type="button" class="exc-zoom-btn" aria-label="Undo">↶</button>
          <button type="button" class="exc-zoom-btn" aria-label="Redo">↷</button>
        </div>
      </div>
    </section>

    <!-- 3. DRAW.IO / DIAGRAMS.NET BLOCK (04-drawio-diagram-embed.jpg) -->
    <section
      v-else
      class="drawio-block-card"
      data-testid="drawio-diagram-block"
    >
      <!-- Draw.io Classic Menu & Toolbar -->
      <div class="drawio-menubar">
        <div class="drawio-menus">
          <span>File</span>
          <span>Edit</span>
          <span>View</span>
          <span>Arrange</span>
          <span>Extras</span>
          <span>Help</span>
        </div>
        <div class="drawio-license-pill">
          Open-Source Apache 2.0 (jgraph/drawio)
        </div>
      </div>

      <div class="drawio-iconbar">
        <span class="drawio-tb-item">◫</span>
        <span class="drawio-tb-item">90% ⌄</span>
        <span class="drawio-tb-item">🔍+</span>
        <span class="drawio-tb-item">🔍−</span>
        <span class="drawio-tb-item">↶</span>
        <span class="drawio-tb-item">↷</span>
        <span class="drawio-tb-item">⟶</span>
        <span class="drawio-tb-item">⤡</span>
        <button
          type="button"
          class="drawio-add-node-btn"
          data-testid="drawio-add-shape-btn"
          @click="addDrawioServiceNode"
        >
          + Add Architecture Node
        </button>
      </div>

      <div class="drawio-workspace">
        <!-- Left Shapes Sidebar -->
        <aside class="drawio-left-palette">
          <input
            v-model="drawioSearch"
            type="search"
            placeholder="Type / to search"
            class="drawio-shape-search"
          />
          <div class="drawio-scratchpad">
            <div class="drawio-pal-title">▾ Scratchpad</div>
            <div class="drawio-drop-zone">Drag elements here</div>
          </div>
          <div
            v-for="cat in drawioPaletteCategories"
            :key="cat"
            class="drawio-pal-item"
          >
            ▸ {{ cat }}
          </div>
          <button type="button" class="drawio-more-shapes-btn" @click="addDrawioServiceNode">
            + More Shapes
          </button>
        </aside>

        <!-- 5-Column Layered Architecture Blueprint Canvas -->
        <div class="drawio-blueprint-canvas">
          <div class="drawio-layers-grid">
            <div
              v-for="layer in drawioLayers"
              :key="layer.name"
              class="drawio-layer-column"
            >
              <div class="drawio-layer-header">{{ layer.name }}</div>
              <div class="drawio-layer-nodes">
                <div
                  v-for="node in layer.nodes"
                  :key="node.id"
                  class="drawio-arch-node"
                >
                  <div class="drawio-node-circle" :style="{ backgroundColor: node.colorHex }">
                    {{ node.icon }}
                  </div>
                  <div class="drawio-node-label">{{ node.label }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Security & Governance Bar -->
          <div class="drawio-security-bar">
            <div class="drawio-sec-item">
              <span class="drawio-node-circle" style="background: #e03131">🔒</span>
              <span>SECURITY</span>
            </div>
            <div class="drawio-sec-item">
              <span class="drawio-node-circle" style="background: #0ca678">🏛</span>
              <span>IoT GOVERNANCE</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { DiagramKind } from '@mind-hub/shared';

const props = defineProps<{
  initialKind?: DiagramKind;
}>();

const activeKind = ref<DiagramKind>(props.initialKind ?? 'mermaid');

// 1. Mermaid State (06-mermaid-code-diagram-block.png)
const mermaidDialect = ref('mermaid');
const mermaidSource = ref(
  [
    'flowchart TD',
    '    A[Christmas] -->|Get money| B(Go shopping)',
    '    B --> C{Let me think}',
    '    C -->|One| D[Laptop]',
    '    C -->|Two| E[iPhone]',
    '    C -->|Three| F[fa:fa-car Car]',
  ].join('\n'),
);
const copiedState = ref(false);
const copyFeedbackText = ref('');
let lastAnnouncement = '';

const parsedMermaidNodes = computed(() => {
  const src = mermaidSource.value;
  const extract = (pattern: RegExp, fallback: string): string => {
    const m = src.match(pattern);
    return m?.[1]?.trim() || fallback;
  };
  return {
    root: extract(/A\[([^\]]+)\]/, 'Christmas'),
    step: extract(/B\(([^)]+)\)/, 'Go shopping'),
    decision: extract(/C\{([^}]+)\}/, 'Let me think'),
    branch1: extract(/D\[([^\]]+)\]/, 'Laptop'),
    branch2: extract(/E\[([^\]]+)\]/, 'iPhone'),
    branch3: extract(/F\[(?:fa:fa-car\s+)?([^\]]+)\]/, 'Car'),
  };
});

async function handleCopyMermaid(): Promise<void> {
  const text = mermaidSource.value.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback in non-HTTPS test environments
  }
  copiedState.value = true;
  let msg = 'Copied';
  if (msg === lastAnnouncement) msg += '\u00A0';
  lastAnnouncement = msg;
  copyFeedbackText.value = msg;
  setTimeout(() => {
    copiedState.value = false;
    copyFeedbackText.value = '';
  }, 1800);
}

// 2. Excalidraw State (05-excalidraw-whiteboard-embed.png)
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
      'What are the constraints & latency targets (< 10ms)?',
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
      '✅ Designed high-throughput block engine with Tiptap v2',
      '⚙️ Tech: Vue 3, Quasar, Fastify, Drizzle, pgvector',
      '📈 Result: Sub-10ms query execution & Git sovereignty',
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
    bullets: ['New hand-drawn architecture note', 'Synced with Tiptap block AST'],
  });
}

// 3. Draw.io State (04-drawio-diagram-embed.jpg)
const drawioSearch = ref('');
const drawioPaletteCategories = [
  'General',
  'Misc',
  'Advanced',
  'Basic',
  'Arrows',
  'Flowchart',
  'Entity Relation',
  'UML',
];

const drawioLayers = ref([
  {
    name: 'USER LAYER',
    nodes: [
      { id: 'iot-user', label: 'IoT USER', icon: '👤', colorHex: '#d99b26' },
      { id: 'end-app', label: 'END USER APPLICATION', icon: '🧭', colorHex: '#e6b800' },
    ],
  },
  {
    name: 'PROXIMITY NETWORK',
    nodes: [
      { id: 'phys-entity', label: 'PHYSICAL ENTITY', icon: '◎', colorHex: '#d99b26' },
      { id: 'device', label: 'DEVICE', icon: '📱', colorHex: '#d99b26' },
    ],
  },
  {
    name: 'PUBLIC NETWORK',
    nodes: [
      { id: 'peer-cloud', label: 'PEER CLOUD', icon: '☁', colorHex: '#495057' },
      { id: 'iot-gw', label: 'IoT GATEWAY', icon: '⛩', colorHex: '#e03131' },
      { id: 'edge-svc', label: 'EDGE SERVICES', icon: '🌐', colorHex: '#74b816' },
    ],
  },
  {
    name: 'PROVIDER CLOUD',
    nodes: [
      { id: 'dev-reg', label: 'DEVICE REGISTRY', icon: '🛢', colorHex: '#1c5d7d' },
      { id: 'api-mgmt', label: 'API MANAGEMENT', icon: '⚙', colorHex: '#0ca678' },
      { id: 'app-logic', label: 'APPLICATION LOGIC', icon: '⚡', colorHex: '#e6b800' },
      { id: 'analytics', label: 'ANALYTICS', icon: '📈', colorHex: '#7048e8' },
    ],
  },
  {
    name: 'ENTERPRISE NETWORK',
    nodes: [
      { id: 'ent-dir', label: 'ENTERPRISE USER DIRECTORY', icon: '📁', colorHex: '#1c5d7d' },
      { id: 'ent-data', label: 'ENTERPRISE DATA', icon: '📖', colorHex: '#1c5d7d' },
      { id: 'ent-apps', label: 'ENTERPRISE APPLICATIONS', icon: '🧭', colorHex: '#e6b800' },
    ],
  },
]);

function addDrawioServiceNode(): void {
  const cloudLayer = drawioLayers.value[3];
  if (!cloudLayer) return;
  cloudLayer.nodes.push({
    id: `svc-${cloudLayer.nodes.length + 1}`,
    label: `MICROSERVICE #${cloudLayer.nodes.length + 1}`,
    icon: '⚙',
    colorHex: '#0ca678',
  });
}
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

/* 1. Mermaid Block (06-mermaid-code-diagram-block.png) */
.mermaid-block-card {
  background: var(--mind-bg-sidebar);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 8px;
  padding: 16px 20px 24px;
  position: relative;
}

.mermaid-top-controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 8px;
}

.mermaid-lang-select {
  height: 26px;
  padding: 0 8px;
  border: 1px solid var(--mind-border-control);
  border-radius: 4px;
  background: var(--mind-bg-canvas);
  color: var(--mind-text-secondary);
  font-size: 12px;
}

.mermaid-source-wrap {
  max-width: 380px;
  margin: 0 auto 14px;
}

.mermaid-code-textarea {
  width: 100%;
  border: none;
  background: transparent;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--mind-text-primary);
  resize: vertical;
  outline: none;
}

.mermaid-svg-stage {
  background: var(--mind-bg-canvas);
  border: 1px solid var(--mind-border-subtle);
  border-radius: 6px;
  padding: 16px;
  display: flex;
  justify-content: center;
}

.mermaid-svg {
  width: 100%;
  max-width: 500px;
  height: auto;
}

.mmd-node-text {
  font-size: 12px;
  fill: #1f2937;
  font-family: 'Inter', sans-serif;
}

.mmd-edge-text {
  font-size: 11px;
  fill: #37352f;
  font-family: 'Inter', sans-serif;
}

/* 2. Excalidraw Block (05-excalidraw-whiteboard-embed.png) */
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

.exc-underline-teal {
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

/* 3. Draw.io Block (04-drawio-diagram-embed.jpg) */
.drawio-block-card {
  border: 1px solid var(--mind-border-control);
  border-radius: 8px;
  overflow: hidden;
  background: var(--mind-bg-canvas);
}

.drawio-menubar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--mind-bg-sidebar);
  border-bottom: 1px solid var(--mind-border-subtle);
  font-size: 12px;
}

.drawio-menus {
  display: flex;
  gap: 14px;
  color: var(--mind-text-secondary);
}

.drawio-license-pill {
  font-size: 11px;
  color: var(--mind-text-muted);
}

.drawio-iconbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: var(--mind-bg-canvas);
  border-bottom: 1px solid var(--mind-border-subtle);
  font-size: 12px;
  color: var(--mind-text-secondary);
}

.drawio-add-node-btn {
  margin-left: auto;
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid #1971c2;
  background: #e7f5ff;
  color: #1971c2;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}

.drawio-workspace {
  display: flex;
  min-height: 330px;
}

.drawio-left-palette {
  width: 155px;
  min-width: 155px;
  background: var(--mind-bg-sidebar);
  border-right: 1px solid var(--mind-border-subtle);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.drawio-shape-search {
  height: 26px;
  padding: 0 8px;
  border: 1px solid var(--mind-border-control);
  border-radius: 999px;
  font-size: 11.5px;
  background: var(--mind-bg-canvas);
}

.drawio-pal-title {
  font-size: 11.5px;
  font-weight: 600;
  margin-bottom: 4px;
}

.drawio-drop-zone {
  border: 1px dashed var(--mind-border-control);
  border-radius: 4px;
  padding: 8px 4px;
  text-align: center;
  font-size: 10.5px;
  color: var(--mind-text-muted);
}

.drawio-pal-item {
  font-size: 11.5px;
  color: var(--mind-text-secondary);
  padding: 2px 4px;
}

.drawio-more-shapes-btn {
  margin-top: auto;
  padding: 5px 8px;
  background: #e7f5ff;
  color: #1971c2;
  border: none;
  border-radius: 4px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}

.drawio-blueprint-canvas {
  flex: 1;
  padding: 12px;
  background-color: #ffffff;
  background-image:
    linear-gradient(to right, #f1f3f5 1px, transparent 1px),
    linear-gradient(to bottom, #f1f3f5 1px, transparent 1px);
  background-size: 16px 16px;
  overflow-x: auto;
}

.drawio-layers-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(115px, 1fr));
  border: 1.5px solid #1c5d7d;
  background: rgba(255, 255, 255, 0.85);
}

.drawio-layer-column {
  border-right: 1.5px solid #1c5d7d;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.drawio-layer-column:last-child {
  border-right: none;
}

.drawio-layer-header {
  font-size: 10px;
  font-weight: 700;
  color: #1c5d7d;
  text-align: center;
}

.drawio-layer-nodes {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.drawio-arch-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
}

.drawio-node-circle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.drawio-node-label {
  font-size: 9.5px;
  font-weight: 600;
  color: #1c5d7d;
  max-width: 96px;
  line-height: 1.2;
}

.drawio-security-bar {
  margin-top: 10px;
  border: 1.5px solid #1c5d7d;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: rgba(255, 255, 255, 0.9);
}

.drawio-sec-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10.5px;
  font-weight: 700;
  color: #1c5d7d;
}
</style>
