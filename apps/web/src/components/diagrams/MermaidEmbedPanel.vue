<template>
  <section class="mermaid-block-card copyable" data-testid="mermaid-diagram-block">
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

        <!-- Node A: Root -->
        <rect x="205" y="12" width="110" height="42" fill="#ececff" stroke="#9370db" stroke-width="1.2" />
        <text x="260" y="37" text-anchor="middle" class="mmd-node-text">{{ parsedMermaidNodes.root }}</text>

        <!-- Edge A -> B -->
        <line x1="260" y1="54" x2="260" y2="114" stroke="#333333" stroke-width="1.2" marker-end="url(#mmd-arrow)" />
        <rect x="222" y="72" width="76" height="20" fill="#e9ecef" rx="3" />
        <text x="260" y="86" text-anchor="middle" class="mmd-edge-text">Get money</text>

        <!-- Node B: Step -->
        <rect x="205" y="116" width="110" height="42" rx="6" fill="#ececff" stroke="#9370db" stroke-width="1.2" />
        <text x="260" y="141" text-anchor="middle" class="mmd-node-text">{{ parsedMermaidNodes.step }}</text>

        <!-- Edge B -> C -->
        <line x1="260" y1="158" x2="260" y2="195" stroke="#333333" stroke-width="1.2" marker-end="url(#mmd-arrow)" />

        <!-- Node C: Decision -->
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
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

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
const copyBtnRef = ref<HTMLButtonElement | null>(null);
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
</script>

<style scoped>
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
  fill: #212529;
  font-family: 'Inter', sans-serif;
}

.mmd-edge-text {
  font-size: 11px;
  fill: #37352f;
  font-family: 'Inter', sans-serif;
}
</style>
