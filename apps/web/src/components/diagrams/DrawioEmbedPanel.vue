<template>
  <section class="drawio-block-card" data-testid="drawio-diagram-block">
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
</template>

<script setup lang="ts">
import { ref } from 'vue';

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
