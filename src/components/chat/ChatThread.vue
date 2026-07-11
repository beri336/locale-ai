<!-- src/components/chat/ChatThread.vue -->

<template>
  <div class="chat-thread">
    <div v-if="chat" class="chat-window" ref="chatWindow">
      <div class="chat-toolbar" v-if="chat.messages.length">
        <div class="toolbar-context">
          <div class="context-header">
            <div class="context-label">
              <span class="context-dot" :class="contextStatus"></span>
              <span>Context</span>
            </div>

            <span class="context-value">
              {{ formatTokenCount(contextTokens) }} /
              {{ formatTokenCount(contextLimit) }}
            </span>
          </div>

          <div
            class="context-progress"
            :title="`${contextPercent}% of the configured context window used`"
          >
            <span
              class="context-progress-fill"
              :class="contextStatus"
              :style="{ width: `${contextPercent}%` }"
            ></span>
          </div>

          <div class="context-footer">
            <p class="context-meta">
              {{ contextPercent }}% used · {{ chat.messages.length }} messages
            </p>

            <span
              v-if="settingsStore.defaultSystemPrompt?.trim()"
              class="system-prompt-badge"
              title="A default system prompt is included in this chat"
            >
              <span class="system-prompt-badge-icon" aria-hidden="true">✦</span>
              System prompt active
            </span>
          </div>
        </div>

        <div class="toolbar-actions">
          <button
            class="copy-btn toolbar-copy-btn"
            @click="handleCopyFullChat"
            :title="copiedAll ? 'Copied!' : 'Copy entire chat'"
          >
            {{ copiedAll ? "✓ Copied" : "⧉ Copy chat" }}
          </button>

          <button
            class="copy-btn toolbar-copy-btn"
            @click="handleExportChat"
            title="Export chat as Markdown"
          >
            ⬇ Export .md
          </button>
        </div>
      </div>

      <div
        v-for="(message, index) in chat.messages"
        :key="index"
        class="message"
        :class="message.role"
      >
        <div v-if="editingIndex === index" class="message-edit">
          <textarea
            v-model="editText"
            class="edit-textarea"
            ref="editTextarea"
            @keydown.enter.exact.prevent="handleSaveEdit(index)"
            @keydown.esc.prevent="handleCancelEdit"
          ></textarea>
          <div class="edit-actions">
            <button class="btn-secondary" @click="handleCancelEdit">
              Cancel
            </button>
            <button
              class="btn-primary"
              :disabled="!editText.trim() || editText === message.content"
              @click="handleSaveEdit(index)"
            >
              Save & Submit
            </button>
          </div>
        </div>

        <template v-else>
          <div
            v-if="message.role === 'assistant'"
            class="message-bubble markdown-body"
            v-html="renderMarkdown(message.content)"
          ></div>
          <div v-else class="message-bubble">{{ message.content }}</div>

          <div class="message-footer">
            <span class="message-meta">
              <template v-if="message.role === 'assistant' && message.model">
                {{ message.model }} · {{ message.tokenCount }} tokens
              </template>
              <template
                v-else-if="message.role === 'user' && message.tokenCount"
              >
                {{ message.tokenCount }} tokens
              </template>
            </span>

            <button
              v-if="message.role === 'user' && !isGenerating"
              class="copy-btn"
              @click="handleStartEdit(index, message.content)"
              title="Edit message"
            >
              ✎
            </button>

            <button
              v-if="
                message.role === 'assistant' &&
                isLastAssistantMessage(index) &&
                !isGenerating
              "
              class="copy-btn"
              @click="handleRegenerate(index)"
              title="Regenerate response"
            >
              ↻
            </button>

            <button
              class="copy-btn"
              @click="handleCopyMessage(message.content, index)"
              :title="copiedIndex === index ? 'Copied!' : 'Copy message'"
            >
              {{ copiedIndex === index ? "✓" : "⧉" }}
            </button>
          </div>
        </template>
      </div>

      <div v-if="isGenerating" class="message assistant">
        <div
          class="message-bubble markdown-body streaming"
          v-html="renderMarkdown(streamingText || '…')"
        ></div>
      </div>
    </div>

    <div v-else class="chat-window empty-selection">
      <p>Select or create a chat to get started.</p>
    </div>

    <div class="chat-input-row" v-if="chat">
      <textarea
        v-model="prompt"
        class="chat-input"
        placeholder="Type a message…"
        :disabled="!chat.model || isGenerating"
        @keydown.enter.exact.prevent="handleSend"
      ></textarea>

      <button v-if="isGenerating" class="btn-stop" @click="handleStop">
        ■ Stop
      </button>
      <button
        v-else
        class="btn-primary"
        :disabled="!prompt || !chat.model"
        @click="handleSend"
      >
        Send
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from "vue";
import { useOllamaStore } from "@/stores/useOllamaStore";
import { renderMarkdown } from "@/utils/markdown";
import { copyToClipboard } from "@/utils/clipboard";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  buildChatMarkdown,
  downloadMarkdownFile,
  sanitizeFilename,
} from "@/utils/export";

const props = defineProps({
  chat: { type: Object, default: null },
  emptyHint: { type: String, default: "Start a conversation." },
});

const emit = defineEmits(["message-sent"]);

const ollama = useOllamaStore();
const settingsStore = useSettingsStore();

const prompt = ref("");
const isGenerating = ref(false);
const streamingText = ref("");
const chatWindow = ref(null);

const copiedIndex = ref(null);
const copiedAll = ref(false);

const editingIndex = ref(null);
const editText = ref("");
const editTextarea = ref(null);

const abortController = ref(null);

function handleExportChat() {
  if (!props.chat?.messages?.length) return;

  const markdown = buildChatMarkdown(props.chat);
  const filename = `${sanitizeFilename(props.chat.title)}.md`;
  downloadMarkdownFile(markdown, filename);
}

function isNearBottom() {
  if (!chatWindow.value) return true;
  const { scrollTop, scrollHeight, clientHeight } = chatWindow.value;
  return scrollHeight - scrollTop - clientHeight < 100;
}

async function scrollToBottom(force = false) {
  await nextTick();
  if (!chatWindow.value) return;
  if (force || isNearBottom()) {
    chatWindow.value.scrollTop = chatWindow.value.scrollHeight;
  }
}

watch(() => props.chat?.id, scrollToBottom);

function updateChatTitle(chat, firstMessage) {
  if (chat.title === "New Chat" && firstMessage) {
    chat.title =
      firstMessage.slice(0, 40) + (firstMessage.length > 40 ? "…" : "");
  }
}

async function handleSend() {
  if (!prompt.value || !props.chat?.model || isGenerating.value) return;

  const chat = props.chat;
  const userMessage = prompt.value;
  const userMessageObj = { role: "user", content: userMessage };
  chat.messages.push(userMessageObj);
  updateChatTitle(chat, userMessage);
  prompt.value = "";
  emit("message-sent");
  scrollToBottom(true);

  isGenerating.value = true;
  streamingText.value = "";
  abortController.value = new AbortController();

  try {
    const messagesPayload = [];
    if (
      settingsStore.defaultSystemPrompt &&
      !chat.messages.some((m) => m.role === "system")
    ) {
      messagesPayload.push({
        role: "system",
        content: settingsStore.defaultSystemPrompt,
      });
    }
    messagesPayload.push(
      ...chat.messages.map((m) => ({ role: m.role, content: m.content })),
    );

    const result = await ollama.generateStreamingChatAnswer(
      chat.model,
      messagesPayload,
      {
        temperature: settingsStore.temperature,
        num_ctx: settingsStore.numCtx,
      },
      (chunk) => {
        streamingText.value += chunk.response || "";
        scrollToBottom();
      },
      abortController.value.signal,
    );

    userMessageObj.tokenCount = estimateTokenCount(userMessage);

    chat.messages.push({
      role: "assistant",
      content: result.text,
      model: chat.model,
      tokenCount: result.stats.evalCount,
    });
    emit("message-sent");
    scrollToBottom(true);
  } catch (error) {
    if (error.name === "AbortError") {
      chat.messages.push({
        role: "assistant",
        content: streamingText.value || "*Generation stopped.*",
        model: chat.model,
        stopped: true,
      });
      emit("message-sent");
    } else {
      console.error("Chat generation failed:", error);
      chat.messages.push({
        role: "assistant",
        content: "Error: failed to generate a response.",
      });
      emit("message-sent");
    }
  } finally {
    isGenerating.value = false;
    streamingText.value = "";
    abortController.value = null;
  }
}

function handleStop() {
  if (abortController.value) {
    abortController.value.abort();
  }
}

defineExpose({ scrollToBottom });

async function handleCopyMessage(content, index) {
  const success = await copyToClipboard(content);
  if (success) {
    copiedIndex.value = index;
    setTimeout(() => {
      copiedIndex.value = null;
    }, 1500);
  }
}

async function handleCopyFullChat() {
  if (!props.chat?.messages?.length) return;

  const fullText = props.chat.messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}:\n${m.content}`)
    .join("\n\n---\n\n");

  const success = await copyToClipboard(fullText);
  if (success) {
    copiedAll.value = true;
    setTimeout(() => {
      copiedAll.value = false;
    }, 1500);
  }
}

async function handleStartEdit(index, content) {
  editingIndex.value = index;
  editText.value = content;
  await nextTick();
  editTextarea.value?.[0]?.focus();
}

function handleCancelEdit() {
  editingIndex.value = null;
  editText.value = "";
}

async function handleSaveEdit(index) {
  const chat = props.chat;
  const originalMessage = chat.messages[index];

  if (!editText.value.trim() || editText.value === originalMessage.content) {
    handleCancelEdit();
    return;
  }

  chat.messages[index].content = editText.value.trim();
  chat.messages.splice(index + 1);

  editingIndex.value = null;
  editText.value = "";
  emit("message-sent");
  scrollToBottom(true);

  isGenerating.value = true;
  streamingText.value = "";

  try {
    const messagesPayload = chat.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const result = await ollama.generateStreamingChatAnswer(
      chat.model,
      messagesPayload,
      {},
      (chunk) => {
        streamingText.value += chunk.response || "";
        scrollToBottom();
      },
    );

    chat.messages[index].tokenCount = estimateTokenCount(
      chat.messages[index].content,
    );

    chat.messages.push({
      role: "assistant",
      content: result.text,
      model: chat.model,
      tokenCount: result.stats.evalCount,
    });
    emit("message-sent");
    scrollToBottom(true);
  } catch (error) {
    console.error("Chat generation failed:", error);
    chat.messages.push({
      role: "assistant",
      content: "Error: failed to generate a response.",
    });
    emit("message-sent");
  } finally {
    isGenerating.value = false;
    streamingText.value = "";
  }
}

// Regenerate the last assistant message by removing it and re-generating a new response
function isLastAssistantMessage(index) {
  const chat = props.chat;
  if (!chat) return false;
  const lastAssistantIndex = chat.messages.reduce(
    (acc, m, i) => (m.role === "assistant" ? i : acc),
    -1,
  );
  return index === lastAssistantIndex;
}

async function handleRegenerate(index) {
  if (isGenerating.value) return;

  const chat = props.chat;
  chat.messages.splice(index);
  emit("message-sent");
  scrollToBottom(true);

  isGenerating.value = true;
  streamingText.value = "";
  abortController.value = new AbortController();

  try {
    const messagesPayload = [];
    if (
      settingsStore.defaultSystemPrompt &&
      !chat.messages.some((m) => m.role === "system")
    ) {
      messagesPayload.push({
        role: "system",
        content: settingsStore.defaultSystemPrompt,
      });
    }
    messagesPayload.push(
      ...chat.messages.map((m) => ({ role: m.role, content: m.content })),
    );

    const result = await ollama.generateStreamingChatAnswer(
      chat.model,
      messagesPayload,
      {
        temperature: settingsStore.temperature,
        num_ctx: settingsStore.numCtx,
      },
      (chunk) => {
        streamingText.value += chunk.response || "";
        scrollToBottom();
      },
      abortController.value.signal,
    );

    chat.messages.push({
      role: "assistant",
      content: result.text,
      model: chat.model,
      tokenCount: result.stats.evalCount,
    });
    emit("message-sent");
    scrollToBottom(true);
  } catch (error) {
    if (error.name === "AbortError") {
      chat.messages.push({
        role: "assistant",
        content: streamingText.value || "*Generation stopped.*",
        model: chat.model,
        stopped: true,
      });
      emit("message-sent");
    } else {
      console.error("Regenerate failed:", error);
      chat.messages.push({
        role: "assistant",
        content: "Error: failed to generate a response.",
      });
      emit("message-sent");
    }
  } finally {
    isGenerating.value = false;
    streamingText.value = "";
    abortController.value = null;
  }
}

const contextLimit = computed(() => {
  const configuredLimit = Number(settingsStore.numCtx);

  return Number.isFinite(configuredLimit) && configuredLimit > 0
    ? configuredLimit
    : 4096;
});

const contextTokens = computed(() => {
  if (!props.chat?.messages?.length) return 0;

  return props.chat.messages.reduce((total, message) => {
    if (Number.isFinite(message.tokenCount) && message.tokenCount > 0) {
      return total + message.tokenCount;
    }

    return total + estimateTokenCount(message.content);
  }, 0);
});

const contextPercent = computed(() => {
  if (!contextLimit.value) return 0;

  return Math.min(
    100,
    Math.round((contextTokens.value / contextLimit.value) * 100),
  );
});

const contextStatus = computed(() => {
  if (contextPercent.value >= 90) return "critical";
  if (contextPercent.value >= 75) return "warning";
  return "healthy";
});

function estimateTokenCount(text = "") {
  // Pragmatic fallback for messages without Ollama token statistics.
  // For German/English mixed text, ~4 characters per token is sufficient
  // for a visible context estimate.
  return Math.max(1, Math.ceil(text.trim().length / 4));
}

function formatTokenCount(value) {
  if (value < 1000) return String(value);

  const formatted = value / 1000;
  return `${formatted.toFixed(formatted >= 10 ? 0 : 1)}k`;
}
</script>

<style scoped>
.chat-thread {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
  min-height: 0;
}

.chat-window {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.chat-window.empty-selection {
  align-items: center;
  justify-content: center;
  color: var(--color-text-faint);
  font-size: var(--text-sm);
}

.empty-state {
  margin: auto;
  text-align: center;
  color: var(--color-text-faint);
  font-size: var(--text-sm);
}

.message {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.message.user {
  align-items: flex-end;
}

.message.assistant {
  align-items: flex-start;
}

.message-bubble {
  max-width: 70%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  white-space: pre-wrap;
  word-break: break-word;
}

.message.user .message-bubble {
  background: var(--color-primary);
  color: white;
}

.message.assistant .message-bubble {
  background: var(--color-surface-2);
  color: var(--color-text);
}

.message-bubble.streaming {
  opacity: 0.85;
}

.chat-input-row {
  display: flex;
  gap: var(--space-2);
}

.chat-input {
  flex: 1;
  resize: none;
  min-height: 44px;
  max-height: 140px;
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-text);
  font-family: inherit;
}

.chat-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.btn-primary {
  padding: 0 var(--space-4);
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  white-space: nowrap;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Markdown styles for assistant messages */
.markdown-body {
  line-height: 1.6;
}

.markdown-body :deep(p) {
  margin: 0 0 var(--space-2) 0;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  font-weight: 700;
  margin: var(--space-3) 0 var(--space-2) 0;
}

.markdown-body :deep(h1) {
  font-size: var(--text-lg);
}

.markdown-body :deep(h2) {
  font-size: var(--text-md);
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: var(--space-2) 0;
  padding-left: var(--space-5);
}

.markdown-body :deep(li) {
  margin-bottom: 4px;
}

.markdown-body :deep(strong) {
  font-weight: 700;
}

.markdown-body :deep(em) {
  font-style: italic;
}

.markdown-body :deep(a) {
  color: var(--color-primary);
  text-decoration: underline;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid var(--color-border);
  padding-left: var(--space-3);
  color: var(--color-text-muted);
  margin: var(--space-2) 0;
}

.markdown-body :deep(code) {
  background: var(--color-surface-2);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 0.85em;
  font-family: "Fira Code", monospace;
}

.markdown-body :deep(.code-block) {
  background: #0d1117;
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin: var(--space-2) 0;
  font-size: var(--text-xs);
}

.markdown-body :deep(.code-header) {
  padding: var(--space-1) var(--space-3);
  font-size: 11px;
  color: #8b949e;
  border-bottom: 1px solid #21262d;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.markdown-body :deep(.code-block code) {
  background: transparent;
  padding: var(--space-3);
  display: block;
  font-family: "Fira Code", monospace;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  margin: var(--space-2) 0;
  width: 100%;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--color-border);
  padding: var(--space-2) var(--space-3);
  text-align: left;
}

.message.assistant .message-bubble {
  max-width: 85%;
}

.message-bubble.markdown-body :deep(pre) {
  max-width: 100%;
}

/* Copy button styles */
.message:hover .message-header {
  visibility: visible;
}

.message.user .message-header {
  justify-content: flex-end;
}

.message.assistant .message-header {
  justify-content: flex-start;
}

/* .chat-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-2);
} */

.message-footer {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-1);
}

.message.user .message-footer {
  flex-direction: row-reverse;
}

.message-meta {
  font-size: 11px;
  color: var(--color-text-faint);
}

.copy-btn {
  background: none;
  border: none;
  color: var(--color-text-faint);
  font-size: 12px;
  padding: 2px 4px;
  cursor: pointer;
  transition:
    opacity 0.15s ease,
    color 0.15s ease;
}

.message-footer .copy-btn {
  opacity: 0;
}

.message:hover .message-footer .copy-btn {
  opacity: 1;
}

.copy-btn:hover {
  color: var(--color-text);
}

.toolbar-copy-btn {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
}

.toolbar-copy-btn:hover {
  background: var(--color-surface-2);
}

/* Edit message styles */
.message-edit {
  width: 100%;
  max-width: 85%;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.message.user .message-edit {
  align-self: flex-end;
}

.edit-textarea {
  width: 100%;
  min-height: 60px;
  resize: vertical;
  padding: var(--space-3);
  background: var(--color-bg);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-family: inherit;
  color: var(--color-text);
}

.edit-textarea:focus {
  outline: none;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.btn-secondary {
  padding: var(--space-1) var(--space-3);
  background: var(--color-surface-2);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  cursor: pointer;
}

.btn-secondary:hover {
  background: var(--color-surface);
}

/* Button to stop generation */
.btn-stop {
  padding: 0 var(--space-4);
  background: var(--color-error, #ef4444);
  color: white;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  white-space: nowrap;
  border: none;
  cursor: pointer;
}

.btn-stop:hover {
  opacity: 0.9;
}

.chat-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 0 0 var(--space-3);
  margin-bottom: var(--space-1);
  border-bottom: 1px solid var(--color-border);
}

.toolbar-context {
  display: grid;
  flex: 1;
  min-width: 150px;
  max-width: 260px;
  gap: 4px;
}

.context-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.context-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 600;
}

.context-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-success, #22c55e);
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--color-success, #22c55e) 14%, transparent);
}

.context-dot.warning {
  background: #f59e0b;
  box-shadow: 0 0 0 3px rgb(245 158 11 / 14%);
}

.context-dot.critical {
  background: var(--color-error, #ef4444);
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--color-error, #ef4444) 14%, transparent);
}

.context-value {
  color: var(--color-text);
  font-family: "Fira Code", ui-monospace, SFMono-Regular, monospace;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.context-progress {
  width: 100%;
  height: 5px;
  overflow: hidden;
  background: var(--color-surface-2);
  border-radius: 999px;
}

.context-progress-fill {
  display: block;
  height: 100%;
  background: var(--color-success, #22c55e);
  border-radius: inherit;
  transition:
    width 0.25s ease,
    background-color 0.25s ease;
}

.context-progress-fill.warning {
  background: #f59e0b;
}

.context-progress-fill.critical {
  background: var(--color-error, #ef4444);
}

.context-meta {
  margin: 0;
  color: var(--color-text-faint);
  font-size: 10px;
  line-height: 1.2;
}

.toolbar-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-2);
}

.toolbar-copy-btn {
  padding: 5px 8px;
  color: var(--color-text-muted);
  font-size: 11px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.toolbar-copy-btn:hover {
  color: var(--color-text);
  background: var(--color-surface-2);
  border-color: color-mix(
    in srgb,
    var(--color-primary) 35%,
    var(--color-border)
  );
}

.context-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.context-footer .context-meta {
  margin: 0;
}

.system-prompt-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 2px 6px;
  color: var(--color-primary);
  background: color-mix(
    in srgb,
    var(--color-primary) 10%,
    var(--color-surface-2)
  );
  border: 1px solid
    color-mix(in srgb, var(--color-primary) 22%, var(--color-border));
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
}

.system-prompt-badge-icon {
  display: inline-grid;
  place-items: center;
  width: 11px;
  height: 11px;
  font-size: 9px;
  line-height: 1;
}

@media (max-width: 620px) {
  .chat-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .toolbar-context {
    max-width: none;
  }

  .toolbar-actions {
    width: 100%;
  }

  .toolbar-copy-btn {
    flex: 1;
    min-height: 32px;
  }

  .context-footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }
}
</style>
