<!-- src/components/chat/ChatThread.vue -->

<template>
  <div class="chat-thread">
    <div v-if="chat" class="chat-window" ref="chatWindow">
      <div class="chat-toolbar" v-if="chat.messages.length">
        <button
          class="copy-btn"
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

      <div
        v-for="(message, index) in chat.messages"
        :key="index"
        class="message"
        :class="message.role"
      >
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
            <template v-else-if="message.role === 'user' && message.tokenCount">
              {{ message.tokenCount }} tokens
            </template>
          </span>

          <button
            class="copy-btn"
            @click="handleCopyMessage(message.content, index)"
            :title="copiedIndex === index ? 'Copied!' : 'Copy message'"
          >
            {{ copiedIndex === index ? "✓" : "⧉" }}
          </button>
        </div>
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
      <button
        class="btn-primary"
        :disabled="!prompt || !chat.model || isGenerating"
        @click="handleSend"
      >
        {{ isGenerating ? "Generating…" : "Send" }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from "vue";
import { useOllamaStore } from "@/stores/useOllamaStore";
import { renderMarkdown } from "@/utils/markdown";
import { copyToClipboard } from "@/utils/clipboard";
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

const prompt = ref("");
const isGenerating = ref(false);
const streamingText = ref("");
const chatWindow = ref(null);

const copiedIndex = ref(null);
const copiedAll = ref(false);

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

    userMessageObj.tokenCount = result.stats.promptEvalCount;

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

.chat-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-2);
}

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
</style>
