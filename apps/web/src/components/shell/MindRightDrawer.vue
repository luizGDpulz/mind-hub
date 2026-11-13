<template>
  <q-drawer
    v-model="store.isCommentsDrawerOpen"
    side="right"
    bordered
    :width="300"
    class="mind-comments-drawer q-pa-md column no-wrap"
  >
    <div class="drawer-header-row">
      <div class="drawer-tabs">
        <button
          type="button"
          class="drawer-tab-title"
          :class="{ 'is-active': store.rightDrawerMode === 'comments' }"
          @click="store.rightDrawerMode = 'comments'"
        >
          Comments
        </button>
        <button
          type="button"
          class="drawer-tab-title"
          :class="{ 'is-active': store.rightDrawerMode === 'ai' }"
          @click="store.rightDrawerMode = 'ai'"
        >
          AI Assistant
        </button>
      </div>
      <button
        type="button"
        class="sidebar-mini-btn"
        aria-label="Close right drawer"
        @click="closeDrawer"
      >
        ✕
      </button>
    </div>

    <!-- COMMENTS MODE -->
    <div v-if="store.rightDrawerMode === 'comments'" class="col scroll" data-testid="comments-drawer-list">
      <div
        v-for="thread in store.pageComments"
        :key="thread.id"
        class="comment-thread-card"
      >
        <div class="comment-author-row">
          <span class="comment-avatar">{{ thread.authorInitials }}</span>
          <div class="comment-meta">
            <div class="comment-author-name">{{ thread.authorName }}</div>
            <div class="comment-time">{{ thread.createdAtLabel }}</div>
          </div>
        </div>

        <div class="comment-quote-bar">
          {{ thread.quotedText }}
        </div>

        <div class="comment-body-text">
          {{ thread.body }}
        </div>

        <!-- Thread Replies -->
        <div
          v-for="reply in thread.replies"
          :key="reply.id"
          class="comment-reply-item"
        >
          <div class="comment-author-row">
            <span class="comment-avatar">{{ reply.authorInitials }}</span>
            <div class="comment-meta">
              <div class="comment-author-name">{{ reply.authorName }}</div>
              <div class="comment-time">{{ reply.createdAtLabel }}</div>
            </div>
          </div>
          <div class="comment-body-text">{{ reply.body }}</div>
        </div>

        <input
          v-model="replyBuffers[thread.id]"
          type="text"
          placeholder="Reply..."
          class="comment-reply-input"
          :data-testid="`reply-input-${thread.id}`"
          @keyup.enter="submitThreadReply(thread.id)"
        />
      </div>
    </div>

    <!-- AI ASSISTANT MODE -->
    <div v-else class="col column no-wrap" data-testid="ai-drawer-panel">
      <input
        v-model="store.geminiApiKey"
        type="password"
        placeholder="Google Gemini API Key (BYOK optional)"
        class="ai-key-input q-mb-xs"
      />
      <input
        v-model="store.nvidiaApiKey"
        type="password"
        placeholder="NVIDIA NIM API Key (nvapi-... optional)"
        class="ai-key-input q-mb-sm"
        data-testid="nvidia-api-key-input"
      />

      <div class="col scroll">
        <div
          v-for="msg in store.aiChatHistory"
          :key="msg.id"
          class="comment-thread-card"
        >
          <div class="comment-author-name q-mb-xs">
            {{ msg.role === 'user' ? 'You' : 'Mind Hub AI' }}
          </div>
          <div class="comment-body-text" style="white-space: pre-line">{{ msg.text }}</div>
        </div>
      </div>

      <div class="ai-input-row">
        <input
          v-model="aiPromptInput"
          type="text"
          placeholder="Ask about pages or architecture..."
          class="comment-reply-input col"
          data-testid="ai-prompt-input"
          @keyup.enter="sendAiQuestion"
        />
        <button
          type="button"
          class="ai-send-button"
          data-testid="ai-send-btn"
          @click="sendAiQuestion"
        >
          Send
        </button>
      </div>
    </div>
  </q-drawer>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useMindStore } from '../../stores/mind-store.js';

const store = useMindStore();
const aiPromptInput = ref('');
const replyBuffers = reactive<Record<string, string>>({});

function closeDrawer(): void {
  store.isCommentsDrawerOpen = false;
  store.isAiDrawerOpen = false;
}

function submitThreadReply(threadId: string): void {
  const text = (replyBuffers[threadId] ?? '').trim();
  if (!text) return;
  store.addCommentReply(threadId, text);
  replyBuffers[threadId] = '';
}

function sendAiQuestion(): void {
  const q = aiPromptInput.value.trim();
  if (!q) return;
  aiPromptInput.value = '';
  void store.askAiAssistant(q);
}
</script>

<style scoped>
.drawer-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.drawer-tabs {
  display: flex;
  align-items: center;
  gap: 12px;
}

.drawer-tab-title {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--mind-text-muted);
  cursor: pointer;
}

.drawer-tab-title.is-active {
  color: var(--mind-text-primary);
}

.comment-author-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--mind-bg-surface-subtle);
  color: var(--mind-text-primary);
  font-size: 10.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.comment-author-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--mind-text-primary);
  line-height: 1.2;
}

.comment-time {
  font-size: 11px;
  color: var(--mind-text-muted);
}

.comment-reply-item {
  border-top: 1px solid var(--mind-border-subtle);
  padding-top: 8px;
  margin-top: 8px;
}

.comment-reply-input,
.ai-key-input {
  width: 100%;
  height: 32px;
  border: 1px solid var(--mind-border-subtle);
  border-radius: 6px;
  padding: 0 10px;
  font-size: 12.5px;
  background: var(--mind-bg-canvas);
  color: var(--mind-text-primary);
  outline: none;
  margin-top: 6px;
}

.ai-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.ai-send-button {
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
</style>
