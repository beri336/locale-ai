<!-- src/components/chat/ChatThread.vue -->

<template>
  <div class="chat-thread">
    <div v-if="chat" class="chat-window" ref="chatWindow">
      <div class="chat-settings-row">
        <button
          class="copy-btn toolbar-copy-btn chat-settings-toggle-btn"
          type="button"
          title="Chat settings"
          @click.stop="showChatSettings = !showChatSettings"
        >
          <IconSettings :size="16" :stroke-width="1.8" />
          Chat settings
        </button>
      </div>

      <div v-if="showChatSettings" class="chat-settings-panel">
        <div class="field-group">
          <label class="field-label">System prompt override</label>
          <textarea
            v-model="chatSystemPromptInput"
            class="input textarea"
            rows="3"
            :placeholder="
              settingsStore.defaultSystemPrompt ||
              'No default system prompt set'
            "
            @blur="applyChatSystemPrompt"
          ></textarea>
          <button
            v-if="props.chat.systemPrompt !== null"
            class="btn-reset"
            type="button"
            @click="resetChatSystemPrompt"
          >
            Reset to global default
          </button>
        </div>

        <div class="field-group">
          <div class="label-row">
            <label class="field-label">Temperature override</label>
            <output class="range-value">
              {{ chat.temperature ?? settingsStore.temperature }}
            </output>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            :value="chat.temperature ?? settingsStore.temperature"
            class="slider"
            @input="setChatTemperature($event.target.valueAsNumber)"
          />
          <button
            v-if="props.chat.temperature !== null"
            class="btn-reset"
            type="button"
            @click="resetChatTemperature"
          >
            Reset to global default
          </button>
        </div>

        <div class="field-group">
          <label class="field-label">Context window override</label>
          <select
            class="input"
            :value="chat.numCtx ?? settingsStore.numCtx"
            @change="setChatNumCtx(Number($event.target.value))"
          >
            <option :value="2048">2,048 tokens</option>
            <option :value="4096">4,096 tokens</option>
            <option :value="8192">8,192 tokens</option>
            <option :value="16384">16,384 tokens</option>
          </select>
          <button
            v-if="props.chat.numCtx !== null"
            class="btn-reset"
            type="button"
            @click="resetChatNumCtx"
          >
            Reset to global default
          </button>
        </div>
      </div>

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
            @click="handleMarkdownClick"
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
          @click="handleMarkdownClick"
        ></div>
      </div>
    </div>

    <div v-else class="chat-window empty-selection">
      <p>Select or create a chat to get started.</p>
    </div>

    <div class="composer-area">
      <div v-if="chat && !hasValidModel" class="model-warning" role="alert">
        <span class="model-warning-icon" aria-hidden="true">!</span>

        <div>
          <strong>Model unavailable</strong>
          <p>{{ unavailableModelMessage }}</p>
        </div>
      </div>

      <div class="chat-input-row">
        <textarea
          v-model="prompt"
          class="chat-input"
          :placeholder="
            hasValidModel
              ? 'Type a message...'
              : 'Select an installed model to continue'
          "
          :disabled="!hasValidModel || isGenerating"
          @keydown.enter.exact.prevent="handleSend"
        ></textarea>

        <button
          v-if="isGenerating"
          class="btn-stop"
          type="button"
          @click="handleStop"
        >
          Stop
        </button>

        <button
          v-else
          class="btn-primary"
          type="button"
          :disabled="!prompt.trim() || !hasValidModel"
          @click="handleSend"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from "vue";
import { useOllamaStore } from "@/stores/useOllamaStore";
import { renderMarkdown } from "@/utils/markdown";
import { copyToClipboard } from "@/utils/clipboard";
import { useSettingsStore } from "@/stores/settingsStore";
import { IconSettings } from "@tabler/icons-vue";
import {
  buildChatMarkdown,
  downloadMarkdownFile,
  sanitizeFilename,
} from "@/utils/export";

// const copiedCodeButton = ref(null);

const props = defineProps({
  chat: {
    type: Object,
    default: null,
  },
  emptyHint: {
    type: String,
    default: "Start a conversation.",
  },
  modelNames: {
    type: Array,
    default: () => [],
  },
});

const hasValidModel = computed(() => {
  if (!props.chat?.model) return false;

  return props.modelNames.includes(props.chat.model);
});

const unavailableModelMessage = computed(() => {
  if (!props.chat?.model) {
    return "Select an installed model before sending a message.";
  }

  return `The model "${props.chat.model}" is no longer installed. Select an available model to continue.`;
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
const chatSettingsPanel = ref(null);
const showChatSettings = ref(false);
const chatSystemPromptInput = ref(props.chat?.systemPrompt ?? "");

const effectiveSystemPrompt = computed(() => {
  return props.chat?.systemPrompt ?? settingsStore.defaultSystemPrompt ?? "";
});

const effectiveTemperature = computed(() => {
  const value = props.chat?.temperature;
  return Number.isFinite(value) ? value : settingsStore.temperature;
});

const effectiveNumCtx = computed(() => {
  const value = props.chat?.numCtx;
  return Number.isFinite(value) ? value : settingsStore.numCtx;
});

watch(
  () => props.chat?.id,
  () => {
    chatSystemPromptInput.value = props.chat?.systemPrompt ?? "";
  },
);

function applyChatSystemPrompt() {
  if (!props.chat) return;

  props.chat.systemPrompt = chatSystemPromptInput.value.trim() || null;
  props.chat.updatedAt = new Date().toISOString();

  emit("message-sent");
}

function resetChatSystemPrompt() {
  if (!props.chat) return;

  props.chat.systemPrompt = null;
  chatSystemPromptInput.value = "";
  props.chat.updatedAt = new Date().toISOString();

  emit("message-sent");
}

function setChatTemperature(value) {
  if (!props.chat) return;

  props.chat.temperature = value;
  props.chat.updatedAt = new Date().toISOString();

  emit("message-sent");
}

function resetChatTemperature() {
  if (!props.chat) return;

  props.chat.temperature = null;
  props.chat.updatedAt = new Date().toISOString();

  emit("message-sent");
}

function setChatNumCtx(value) {
  if (!props.chat) return;

  props.chat.numCtx = value;
  props.chat.updatedAt = new Date().toISOString();

  emit("message-sent");
}

function resetChatNumCtx() {
  if (!props.chat) return;

  props.chat.numCtx = null;
  props.chat.updatedAt = new Date().toISOString();

  emit("message-sent");
}

function handleClickOutside(event) {
  if (!showChatSettings.value) return;

  const panel = chatSettingsPanel.value;
  const toggleButton = document.querySelector(".chat-settings-toggle-btn");

  if (panel?.contains(event.target)) return;
  if (toggleButton?.contains(event.target)) return;

  showChatSettings.value = false;
}

function handleEscapeKey(event) {
  if (event.key === "Escape" && showChatSettings.value) {
    showChatSettings.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  document.addEventListener("keydown", handleEscapeKey);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("keydown", handleEscapeKey);
});

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
  if (!prompt.value.trim() || !hasValidModel.value || isGenerating.value) {
    return;
  }

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
      effectiveSystemPrompt.value &&
      !chat.messages.some((m) => m.role === "system")
    ) {
      messagesPayload.push({
        role: "system",
        content: effectiveSystemPrompt.value,
      });
    }
    messagesPayload.push(
      ...chat.messages.map((m) => ({ role: m.role, content: m.content })),
    );

    const result = await ollama.generateStreamingChatAnswer(
      chat.model,
      messagesPayload,
      {
        temperature: effectiveTemperature.value,
        num_ctx: effectiveNumCtx.value,
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
    const isFirstExchange =
      chat.messages.filter((m) => m.role === "assistant").length === 1;

    if (isFirstExchange) {
      generateChatTitle(chat, userMessage, result.text);
    }
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

async function handleMarkdownClick(event) {
  const copyButton = event.target.closest(".code-copy-btn");

  if (!copyButton) return;

  const code = copyButton.dataset.code;

  if (!code) {
    console.warn("No code found for copy button.");
    return;
  }

  const success = await copyToClipboard(code);

  if (!success) return;

  copyButton.classList.add("is-copied");
  copyButton.setAttribute("aria-label", "Code copied");
  copyButton.setAttribute("title", "Copied!");

  window.setTimeout(() => {
    copyButton.classList.remove("is-copied");
    copyButton.setAttribute("aria-label", "Copy code");
    copyButton.setAttribute("title", "Copy code");
  }, 1500);
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
  const configuredLimit = Number(effectiveNumCtx.value);

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

async function generateChatTitle(chat, userMessage, assistantMessage) {
  try {
    const titlePrompt = [
      {
        role: "system",
        content:
          "Generate a short, concise chat title (max 6 words, no quotes, no punctuation at the end) that summarizes the following conversation. Reply with only the title, nothing else.",
      },
      {
        role: "user",
        content: `User: ${userMessage}\n\nAssistant: ${assistantMessage}`,
      },
    ];

    const result = await ollama.generateStreamingChatAnswer(
      chat.model,
      titlePrompt,
      { temperature: 0.3, num_ctx: 1024 },
      () => {},
    );

    const generatedTitle = result.text
      .replace(/^["'\s]+|["'\s]+$/g, "")
      .split("\n")[0]
      .trim();

    if (generatedTitle && generatedTitle.length <= 80) {
      chat.title = generatedTitle;
      emit("message-sent");
    }
  } catch (error) {
    console.error("Title generation failed, keeping fallback title:", error);
  }
}
</script>

<style scoped>
.chat-thread {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.85rem;
  min-width: 0;
  min-height: 0;
}

.chat-window {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;
  padding: clamp(0.85rem, 2vw, 1.25rem);
  overflow-y: auto;
  scroll-behavior: smooth;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.chat-window.empty-selection {
  align-items: center;
  justify-content: center;
  color: var(--color-text-faint);
  font-size: var(--text-sm);
  text-align: center;
}

.chat-window.empty-selection p {
  margin: 0;
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
  gap: 0.3rem;
  width: 100%;
}

.message.user {
  align-items: flex-end;
}

.message.assistant {
  align-items: flex-start;
}

.message-bubble {
  max-width: min(85%, 820px);
  padding: 0.75rem 0.9rem;
  color: var(--color-text);
  font-size: var(--text-sm);
  line-height: 1.6;
  overflow-wrap: anywhere;
  border-radius: 14px;
}

.message.user .message-bubble {
  white-space: pre-wrap;
  color: #fff;
  background: var(--color-primary);
  border-bottom-right-radius: 5px;
}

.message.assistant .message-bubble {
  white-space: normal;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-bottom-left-radius: 5px;
}

.message-bubble.streaming {
  opacity: 0.88;
}

.chat-input-row {
  display: flex;
  align-items: stretch;
  gap: 0.6rem;
}

.chat-input {
  flex: 1;
  min-height: 48px;
  max-height: 150px;
  padding: 0.7rem 0.8rem;
  resize: none;
  font-size: var(--text-sm);
}

.chat-input::placeholder {
  color: var(--color-text-faint);
}

.chat-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.btn-primary,
.btn-secondary,
.btn-stop {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 92px;
  min-height: 48px;
  padding: 0.65rem 1rem;
  border: 1px solid transparent;
  border-radius: 12px;
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 1px 2px rgb(0 0 0 / 8%);
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    opacity 0.16s ease,
    transform 0.16s ease;
}

.btn-primary {
  color: #fff;
  background: linear-gradient(
    135deg,
    var(--color-primary),
    var(--color-primary-hover)
  );
  border-color: var(--color-primary);
}

.btn-primary:hover:not(:disabled) {
  border-color: var(--color-primary-hover);
  box-shadow: 0 5px 14px
    color-mix(in srgb, var(--color-primary) 30%, transparent);
  transform: translateY(-1px);
}

.btn-primary:active:not(:disabled),
.btn-stop:active:not(:disabled) {
  box-shadow: none;
  transform: translateY(0);
}

.btn-primary:disabled {
  color: var(--color-text-faint);
  cursor: not-allowed;
  background: var(--color-surface-2);
  border-color: var(--color-border);
  box-shadow: none;
  opacity: 0.75;
}

.btn-secondary {
  color: var(--color-text-muted);
  background: var(--color-surface-2);
  border-color: var(--color-border);
}

.btn-secondary:hover:not(:disabled) {
  color: var(--color-text);
  background: var(--color-surface);
  border-color: color-mix(
    in srgb,
    var(--color-primary) 30%,
    var(--color-border)
  );
}

.btn-stop {
  color: #fff;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border-color: #dc2626;
}

.btn-stop:hover {
  box-shadow: 0 5px 14px rgb(220 38 38 / 24%);
  transform: translateY(-1px);
}

/* Markdown styles for assistant messages */
.markdown-body {
  line-height: 1.6;
}

.markdown-body :deep(p) {
  margin: 0;
}

.markdown-body :deep(p + p) {
  margin-top: 0.6rem;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin: 1.1rem 0 0.45rem;
}

.markdown-body :deep(h1:first-child),
.markdown-body :deep(h2:first-child),
.markdown-body :deep(h3:first-child) {
  margin-top: 0;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  font-weight: 700;
  line-height: 1.3;
}

.markdown-body :deep(h1) {
  font-size: var(--text-lg);
}

.markdown-body :deep(h2) {
  font-size: var(--text-md);
}

.markdown-body :deep(h3) {
  font-size: var(--text-sm);
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.25rem;
  margin: 0.7rem 0;
}

.markdown-body :deep(li) {
  margin-bottom: 0.25rem;
}

.markdown-body :deep(a) {
  color: var(--color-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.markdown-body :deep(blockquote) {
  padding-left: 0.75rem;
  margin: 0.75rem 0;
  color: var(--color-text-muted);
  border-left: 3px solid var(--color-border);
}

.markdown-body :deep(code) {
  padding: 0.12rem 0.3rem;
  font-family: "Fira Code", ui-monospace, SFMono-Regular, monospace;
  font-size: 0.85em;
  background: color-mix(in srgb, var(--color-text) 7%, transparent);
  border-radius: var(--radius-sm);
}

.markdown-body :deep(.code-block) {
  max-width: 100%;
  margin: 0.55rem 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  color: #c9d1d9;
  font-size: var(--text-xs);
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: var(--radius-md);
}

.markdown-body :deep(.code-header) {
  position: sticky;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: max-content;
  padding: 0.5rem 0.6rem 0.5rem 0.75rem;
  color: #8b949e;
  font-family: "Fira Code", ui-monospace, SFMono-Regular, monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: #0d1117;
  border-bottom: 1px solid #21262d;
}

.markdown-body :deep(.code-language) {
  padding-right: 1.5rem;
}

.markdown-body :deep(.code-copy-btn) {
  display: inline-grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  place-items: center;
  padding: 0;
  color: #8b949e;
  font-family: inherit;
  font-size: 0;
  line-height: 1;
  cursor: pointer;
  pointer-events: auto;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  transition:
    color 0.16s ease,
    background 0.16s ease,
    border-color 0.16s ease,
    transform 0.16s ease;
}

.markdown-body :deep(.code-copy-btn::before) {
  content: "⧉";
  font-size: 14px;
  line-height: 1;
}

.markdown-body :deep(.code-copy-btn:hover) {
  color: #fff;
  background: #21262d;
  border-color: #30363d;
}

.markdown-body :deep(.code-copy-btn:active) {
  transform: translateY(1px);
}

.markdown-body :deep(.code-copy-btn.is-copied) {
  color: #3fb950;
}

.markdown-body :deep(.code-copy-btn.is-copied::before) {
  content: "✓";
}

.markdown-body :deep(.code-block code) {
  display: block;
  width: max-content;
  min-width: 100%;
  padding: 0.75rem;
  white-space: pre;
  background: transparent;
  border-radius: 0;
}

.markdown-body :deep(table) {
  display: block;
  width: 100%;
  margin: 0.75rem 0;
  overflow-x: auto;
  border-collapse: collapse;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  padding: 0.45rem 0.6rem;
  text-align: left;
  border: 1px solid var(--color-border);
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
  gap: 0.3rem;
  min-height: 20px;
  padding: 0 0.2rem;
}

.message.user .message-footer {
  flex-direction: row-reverse;
}

.message-meta {
  color: var(--color-text-faint);
  font-size: 10px;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  min-height: 24px;
  padding: 0.2rem 0.35rem;
  color: var(--color-text-faint);
  font-family: inherit;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
  transition:
    color 0.16s ease,
    background 0.16s ease,
    opacity 0.16s ease;
}

.message-footer .copy-btn {
  opacity: 0;
}

.message:hover .message-footer .copy-btn,
.message:focus-within .message-footer .copy-btn {
  opacity: 1;
}

.copy-btn:hover {
  color: var(--color-text);
  background: var(--color-surface-2);
}

.toolbar-copy-btn {
  min-height: 30px;
  padding: 0.35rem 0.55rem;
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

/* Edit message styles */
.message-edit {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  width: min(85%, 820px);
}

.message.user .message-edit {
  align-self: flex-end;
}

.edit-textarea,
.chat-input {
  box-sizing: border-box;
  width: 100%;
  color: var(--color-text);
  font-family: inherit;
  line-height: 1.5;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease;
}

.edit-textarea {
  min-height: 76px;
  padding: 0.7rem 0.75rem;
  resize: vertical;
  font-size: var(--text-sm);
}

.edit-textarea:focus,
.chat-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--color-primary) 15%, transparent);
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
}

.chat-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 0 0.85rem;
  border-bottom: 1px solid var(--color-border);
}

.toolbar-context {
  display: grid;
  flex: 1;
  min-width: 150px;
  max-width: 270px;
  gap: 0.3rem;
}

.context-header,
.context-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.context-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 600;
}

.context-dot {
  width: 7px;
  height: 7px;
  background: var(--color-success, #22c55e);
  border-radius: 50%;
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
  border-radius: var(--radius-full);
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
  line-height: 1.3;
}

.toolbar-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.4rem;
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
  gap: 0.25rem;
  flex-shrink: 0;
  padding: 0.18rem 0.4rem;
  color: var(--color-primary);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
  background: color-mix(
    in srgb,
    var(--color-primary) 10%,
    var(--color-surface-2)
  );
  border: 1px solid
    color-mix(in srgb, var(--color-primary) 22%, var(--color-border));
  border-radius: var(--radius-full);
}

.system-prompt-badge-icon {
  font-size: 9px;
  line-height: 1;
}

.composer-area {
  display: grid;
  gap: 0.65rem;
}

.model-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.7rem 0.8rem;
  color: var(--color-warning, #a16207);
  background: color-mix(
    in srgb,
    var(--color-warning, #f59e0b) 12%,
    var(--color-surface)
  );
  border: 1px solid
    color-mix(in srgb, var(--color-warning, #f59e0b) 30%, var(--color-border));
  border-radius: var(--radius-md);
}

.model-warning-icon {
  display: grid;
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  place-items: center;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  background: var(--color-warning, #f59e0b);
  border-radius: 50%;
}

.model-warning strong {
  display: block;
  color: inherit;
  font-size: var(--text-xs);
  font-weight: 700;
}

.model-warning p {
  margin: 0.18rem 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  line-height: 1.45;
}

/* Settings modal styles */
.chat-settings-panel {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  margin-bottom: 0.5rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.chat-settings-panel .btn-reset {
  justify-self: start;
}

.chat-settings-row {
  display: flex;
  justify-content: flex-end;
  padding-bottom: 0.5rem;
}

.chat-window .chat-toolbar {
  margin-top: 0;
}

.chat-settings-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

/* iOS Safari: at least 16px prevents input auto-zoom */
@media (pointer: coarse) {
  .chat-input,
  .edit-textarea {
    font-size: 16px;
  }
}

@media (max-width: 620px) {
  .chat-thread {
    gap: 0.7rem;
  }

  .chat-window {
    gap: 0.85rem;
    padding: 0.75rem;
    border-radius: var(--radius-md);
  }

  .chat-toolbar {
    align-items: stretch;
    flex-direction: column;
    gap: 0.75rem;
  }

  .toolbar-context {
    max-width: none;
  }

  .toolbar-actions {
    width: 100%;
  }

  .toolbar-copy-btn {
    flex: 1;
    min-height: 34px;
  }

  .context-footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.35rem;
  }

  .message-edit {
    width: min(92%, 820px);
    max-width: min(92%, 820px);
    padding: 0.7rem 0.75rem;
  }

  .message-footer .copy-btn {
    opacity: 1;
  }

  .chat-input-row {
    gap: 0.45rem;
  }

  .chat-input {
    min-height: 50px;
  }

  .btn-primary,
  .btn-stop {
    min-width: 78px;
    min-height: 48px;
    padding: 0.65rem 0.8rem;
    font-size: 14px;
  }

  .markdown-body :deep(.code-copy-btn) {
    min-width: 68px;
    min-height: 34px;
    padding: 0.4rem 0.65rem;
    font-size: 11px;
  }

  .message-bubble {
    font-size: 14px;
    line-height: 1.5;
  }

  .markdown-body :deep(p) {
    margin-bottom: 0.55rem;
  }

  .markdown-body :deep(h1) {
    font-size: 1.1rem;
  }

  .markdown-body :deep(h2) {
    font-size: 1rem;
  }

  .markdown-body :deep(h3) {
    font-size: 0.9rem;
  }

  .markdown-body :deep(ul),
  .markdown-body :deep(ol) {
    margin: 0.5rem 0;
  }

  .markdown-body :deep(.code-block) {
    font-size: 12px;
    border-radius: 8px;
  }

  .markdown-body :deep(.code-block code) {
    padding: 0.65rem;
  }
}
</style>
