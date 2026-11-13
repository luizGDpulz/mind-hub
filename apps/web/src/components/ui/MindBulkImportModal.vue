<template>
  <MindModal
    :model-value="modelValue"
    title="Import Second Brain & Markdown Vault (.md Bulk)"
    subtitle="Ingest dozens or hundreds of Markdown files with YAML Frontmatter, nested folders, and [[WikiLinks]] directly into the database."
    max-width="580px"
    data-testid="bulk-import-modal"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="$emit('close')"
  >
    <div class="bulk-import-actions">
      <button
        type="button"
        class="primary-blue-btn"
        data-testid="import-sample-vault-btn"
        @click="$emit('import-sample')"
      >
        Import Second Brain Pack (_Padrões &amp; ADRs)
      </button>
      <button
        type="button"
        class="topbar-text-btn"
        data-testid="sync-server-vault-btn"
        @click="$emit('sync-server')"
      >
        Sync Server Vault (/home/ubuntu/mind)
      </button>
    </div>

    <div class="bulk-upload-field">
      <label class="sidebar-section-label bulk-upload-label" for="bulk-md-file-input">
        Or select multiple .md files from your computer:
      </label>
      <input
        id="bulk-md-file-input"
        type="file"
        multiple
        accept=".md,.markdown"
        class="clean-modal-input"
        data-testid="bulk-file-input"
        @change="handleMultiFileUpload"
      />
    </div>

    <div
      v-if="lastReport"
      class="comment-thread-card"
      data-testid="bulk-import-report"
    >
      <div class="bulk-report-title">
        Last Bulk Import Summary
      </div>
      <div class="comment-body-text">
        • Notes Processed: <strong>{{ lastReport.notesProcessed }}</strong><br />
        • Folder Pages Created: <strong>{{ lastReport.folderPagesCreated }}</strong><br />
        • Created / Updated / Skipped:
        <strong>
          {{ lastReport.createdCount }} /
          {{ lastReport.updatedCount }} /
          {{ lastReport.skippedCount }}
        </strong><br />
        • WikiLinks Resolved: <strong>{{ lastReport.wikiLinksResolved }}</strong>
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        class="topbar-text-btn"
        @click="$emit('update:modelValue', false)"
      >
        Close
      </button>
    </template>
  </MindModal>
</template>

<script setup lang="ts">
import type { BulkImportApiResponse, RawMarkdownFileEntry } from '@mind-hub/shared';
import MindModal from './MindModal.vue';

defineProps<{
  modelValue: boolean;
  lastReport: BulkImportApiResponse | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'close'): void;
  (e: 'import-sample'): void;
  (e: 'sync-server'): void;
  (e: 'upload-files', entries: RawMarkdownFileEntry[]): void;
}>();

async function handleMultiFileUpload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement | null;
  const fileList = input?.files;
  if (!fileList || fileList.length === 0) return;

  const entries: RawMarkdownFileEntry[] = [];
  for (const file of Array.from(fileList)) {
    const content = await file.text();
    const relPath =
      (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    entries.push({
      path: relPath,
      content,
    });
  }

  emit('upload-files', entries);
}
</script>

<style scoped>
.bulk-import-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.bulk-upload-field {
  margin-bottom: 16px;
}

.bulk-upload-label {
  display: block;
  padding-left: 0;
  margin-bottom: 4px;
}

.clean-modal-input {
  width: 100%;
  height: 38px;
  padding: 6px 12px;
  background: var(--mind-bg-surface-subtle);
  border: 1px solid var(--mind-border-control);
  border-radius: 6px;
  font-size: 13.5px;
  color: var(--mind-text-primary);
  outline: none;
}

.bulk-report-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--mind-text-primary);
  margin-bottom: 4px;
}
</style>
