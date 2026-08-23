<!-- src/components/chat/ChatThread.vue -->

<template>
  <div class="chat-thread">
    <!-- Chat window -->
    <div v-if="chat" class="chat-window" ref="chatWindow">
      <div class="chat-settings-row">
        <button class="copy-btn toolbar-copy-btn chat-settings-toggle-btn" type="button" title="Chat settings"
          @click.stop="showChatSettings = !showChatSettings">
          <IconSettings :size="16" :stroke-width="1.8" />
          Chat settings
        </button>
      </div>

      <!-- Chat settings panel -->
      <div v-if="showChatSettings" class="chat-settings-panel">
        <div class="field-group">
          <label class="field-label">System prompt override</label>
          <textarea v-model="chatSystemPromptInput" class="input textarea" rows="3" :placeholder="settingsStore.defaultSystemPrompt ||
            'No default system prompt set'
            " @blur="applyChatSystemPrompt"></textarea>
          <button v-if="props.chat.systemPrompt !== null" class="btn-reset" type="button"
            @click="resetChatSystemPrompt">
            Reset to global default
          </button>
        </div>

        <!-- Temperature override -->
        <div class="field-group">
          <div class="label-row">
            <label class="field-label">Temperature override</label>
            <output class="range-value">
              {{ chat.temperature ?? settingsStore.temperature }}
            </output>
          </div>
          <input type="range" min="0" max="2" step="0.1" :value="chat.temperature ?? settingsStore.temperature"
            class="slider" @input="setChatTemperature($event.target.valueAsNumber)" />
          <button v-if="props.chat.temperature !== null" class="btn-reset" type="button" @click="resetChatTemperature">
            Reset to global default
          </button>
        </div>

        <!-- Context window override -->
        <div class="field-group">
          <label class="field-label">Context window override</label>
          <select class="input" :value="chat.numCtx ?? settingsStore.numCtx"
            @change="setChatNumCtx(Number($event.target.value))">
            <option :value="2048">2,048 tokens</option>
            <option :value="4096">4,096 tokens</option>
            <option :value="8192">8,192 tokens</option>
            <option :value="16384">16,384 tokens</option>
          </select>
          <button v-if="props.chat.numCtx !== null" class="btn-reset" type="button" @click="resetChatNumCtx">
            Reset to global default
          </button>
        </div>
      </div>

      <!-- Chat toolbar -->
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

          <div class="context-progress" :title="`${contextPercent}% of the configured context window used`">
            <span class="context-progress-fill" :class="contextStatus" :style="{ width: `${contextPercent}%` }"></span>
          </div>

          <div class="context-footer">
            <p class="context-meta">
              {{ contextPercent }}% used · {{ chat.messages.length }} messages
            </p>

            <span v-if="settingsStore.defaultSystemPrompt?.trim()" class="system-prompt-badge"
              title="A default system prompt is included in this chat">
              <span class="system-prompt-badge-icon" aria-hidden="true">
                <IconSparkles :size="10" :stroke-width="2" aria-hidden="true" />
              </span>
              System prompt active
            </span>
          </div>
        </div>

        <div class="toolbar-actions">
          <button class="copy-btn toolbar-copy-btn" @click="handleCopyFullChat"
            :title="copiedAll ? 'Copied!' : 'Copy entire chat'">
            <IconCheck v-if="copiedAll" :size="14" :stroke-width="2" aria-hidden="true" />
            <IconCopy v-else :size="14" :stroke-width="2" aria-hidden="true" />
            {{ copiedAll ? "Copied" : "Copy chat" }}
          </button>

          <button class="copy-btn toolbar-copy-btn" @click="handleExportChat" title="Export chat as Markdown">
            <IconDownload :size="14" :stroke-width="2" aria-hidden="true" />
            Export .md
          </button>
        </div>
      </div>

      <!-- Message list -->
      <div v-for="(message, index) in chat.messages" :key="index" class="message" :class="message.role">
        <!-- Message content -->
        <div v-if="editingIndex === index" class="message-edit">
          <textarea v-model="editText" class="edit-textarea" ref="editTextarea"
            @keydown.enter.exact.prevent="handleSaveEdit(index)" @keydown.esc.prevent="handleCancelEdit">
          </textarea>

          <!-- Edit actions -->
          <div class="edit-actions">
            <button class="btn-secondary" @click="handleCancelEdit">
              Cancel
            </button>
            <button class="btn-primary" :disabled="!editText.trim() || editText === message.content"
              @click="handleSaveEdit(index)">
              Save & Submit
            </button>
          </div>
        </div>

        <!-- Message content -->
        <template v-else>
          <!-- Message bubble -->
          <div v-if="message.role === 'assistant'" class="message-bubble markdown-body"
            v-html="renderMarkdown(message.content)" @click="handleMarkdownClick"></div>
          <div v-else class="message-bubble">{{ message.content }}</div>

          <!-- Message footer -->
          <div class="message-footer">
            <!-- Message metadata -->
            <span class="message-meta">
              <template v-if="message.role === 'assistant' && message.model">
                {{ message.model }} · {{ message.tokenCount }} tokens
              </template>
              <template v-else-if="message.role === 'user' && message.tokenCount">
                {{ message.tokenCount }} tokens
              </template>
            </span>

            <!-- Edit button -->
            <button v-if="message.role === 'user' && !isGenerating" class="copy-btn"
              @click="handleStartEdit(index, message.content)" title="Edit message">
              <IconEdit :size="10" :stroke-width="2" aria-hidden="true" />
            </button>

            <!-- Regenerate button -->
            <button v-if="
              message.role === 'assistant' &&
              isLastAssistantMessage(index) &&
              !isGenerating
            " class="copy-btn" @click="handleRegenerate(index)" title="Regenerate response">
              <IconRefresh :size="10" :stroke-width="2" aria-hidden="true" />
            </button>

            <!-- Copy button -->
            <button class="copy-btn" @click="handleCopyMessage(message.content, index)"
              :title="copiedIndex === index ? 'Copied!' : 'Copy message'">
              <IconCheck v-if="copiedIndex === index" :size="10" :stroke-width="2" aria-hidden="true" />
              <IconCopy v-else :size="10" :stroke-width="2" aria-hidden="true" />
            </button>
          </div>
        </template>
      </div>

      <!-- Streaming message -->
      <div v-if="isGenerating" class="message assistant">
        <div class="message-bubble markdown-body streaming" v-html="renderMarkdown(streamingText || '…')"
          @click="handleMarkdownClick"></div>
      </div>
    </div>

    <!-- Empty chat hint -->
    <div v-else class="chat-window empty-selection">
      <p>Select or create a chat to get started.</p>
    </div>

    <!-- Composer area -->
    <div class="composer-area">
      <!-- Model warning -->
      <div v-if="chat && !hasValidModel" class="model-warning" role="alert">
        <span class="model-warning-icon" aria-hidden="true">!</span>

        <!-- Model warning content -->
        <div>
          <strong>Model unavailable</strong>
          <p>{{ unavailableModelMessage }}</p>
        </div>
      </div>

      <!-- Chat input row -->
      <div class="chat-input-row">
        <!-- Chat input -->
        <textarea v-model="prompt" class="chat-input" :placeholder="hasValidModel
          ? 'Type a message...'
          : 'Select an installed model to continue'
          " @keydown.enter.exact.prevent="handleSend"></textarea>

        <!-- Generate button -->
        <button v-if="isGenerating" class="btn-stop" type="button" @click="handleStop">
          Stop
        </button>

        <!-- Send button -->
        <button v-else class="btn-primary" type="button" :disabled="!prompt.trim() || !hasValidModel"
          @click="handleSend">
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from "vue";

import { useOllamaApi } from "@/services/ollamaApiService";
import { useLmStudioApi } from "@/services/lmsApiService";

import { renderMarkdown } from "@/utils/markdown";
import { copyToClipboard } from "@/utils/clipboard";
import {
  buildChatMarkdown,
  downloadMarkdownFile,
  sanitizeFilename,
} from "@/utils/export";

import { useSettingsStore } from "@/stores/useSettingsStore";

import { IconSettings } from "@tabler/icons-vue";
import IconSparkles from "@/components/icons/IconSparkles.vue";
import IconCheck from "@/components/icons/IconCheck.vue";
import IconCopy from "@/components/icons/IconCopy.vue";
import IconDownload from "@/components/icons/IconDownload.vue";
import IconEdit from "@/components/icons/IconEdit.vue";
import IconRefresh from "@/components/icons/IconRefresh.vue";

import "@/assets/styles/markdown.css";


// props / emits
const props = defineProps({
  chat: { type: Object, default: null },
  emptyHint: { type: String, default: "Start a conversation." },
  availableModels: { type: Array, default: () => [] },
});

const emit = defineEmits(["message-sent"]);


// services / stores
const ollama = useOllamaApi();
const lmstudio = useLmStudioApi();
const settingsStore = useSettingsStore();


// state
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


// helpers
function parseModelValue(value) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return { source: "ollama", name: "" };
  }

  if (normalizedValue.startsWith("lmstudio:")) {
    return {
      source: "lmstudio",
      name: normalizedValue.slice("lmstudio:".length),
    };
  }

  if (normalizedValue.startsWith("ollama:")) {
    return {
      source: "ollama",
      name: normalizedValue.slice("ollama:".length),
    };
  }

  return {
    source: "ollama",
    name: normalizedValue,
  };
}

function getStoreForModel(value) {
  const { source } = parseModelValue(value);

  return source === "lmstudio" ? lmstudio : ollama;
}

function isNearBottom() {
  if (!chatWindow.value) return true;

  const { scrollTop, scrollHeight, clientHeight } = chatWindow.value;

  return scrollHeight - scrollTop - clientHeight < 100;
}

function updateChatTitle(chat, firstMessage) {
  if (chat.title === "New Chat" && firstMessage) {
    chat.title =
      firstMessage.slice(0, 40) + (firstMessage.length > 40 ? "…" : "");
  }
}

function updateStreamingText(chunk) {
  const incomingText = chunk?.response ?? "";

  if (!incomingText) {
    return;
  }

  // LM Studio may send the entire accumulated text on every chunk.
  // Ollama normally sends only a delta.
  if (incomingText.startsWith(streamingText.value)) {
    streamingText.value = incomingText;
    return;
  }

  streamingText.value += incomingText;
}

function appendOrReplaceStreamText(currentText, chunk) {
  const incomingText = chunk?.response ?? "";

  if (!incomingText) {
    return currentText;
  }

  if (incomingText.startsWith(currentText)) {
    return incomingText;
  }

  return currentText + incomingText;
}

function handleStop() {
  abortController.value?.abort();
}

function handleCancelEdit() {
  editingIndex.value = null;
  editText.value = "";
}

function estimateTokenCount(text = "") {
  return Math.max(1, Math.ceil(text.trim().length / 4));
}

function formatTokenCount(value) {
  if (value < 1000) return String(value);

  const formatted = value / 1000;

  return `${formatted.toFixed(formatted >= 10 ? 0 : 1)}k`;
}

function isLastAssistantMessage(index) {
  const chat = props.chat;

  if (!chat) return false;

  const lastAssistantIndex = chat.messages.reduce(
    (lastIndex, message, messageIndex) =>
      message.role === "assistant" ? messageIndex : lastIndex,
    -1,
  );

  return index === lastAssistantIndex;
}

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

function handleExportChat() {
  if (!props.chat?.messages?.length) return;

  const markdown = buildChatMarkdown(props.chat);
  const filename = `${sanitizeFilename(props.chat.title)}.md`;

  downloadMarkdownFile(markdown, filename);
}

// computed properties
const hasValidModel = computed(() => {
  const modelId = String(props.chat?.model ?? "").trim();

  if (!modelId) {
    return false;
  }

  return props.availableModels.some((model) => {
    if (typeof model === "string") {
      return model === modelId;
    }

    return model?.id === modelId;
  });
});

const unavailableModelMessage = computed(() => {
  if (!props.chat?.model) {
    return "Select an installed model before sending a message.";
  }

  return `The model "${props.chat.model}" is no longer installed. Select an available model to continue.`;
});

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

// async functions
async function scrollToBottom(force = false) {
  await nextTick();

  if (!chatWindow.value) return;

  if (force || isNearBottom()) {
    chatWindow.value.scrollTop = chatWindow.value.scrollHeight;
  }
}

async function sendWithSession(
  modelValue,
  messages,
  options = {},
  signal = undefined,
  onChunk,
) {
  const { name: modelName } = parseModelValue(modelValue);
  const store = getStoreForModel(modelValue);

  const lastMessage = messages.at(-1);

  if (!lastMessage || lastMessage.role !== "user") {
    throw new Error("Last message must have role 'user'.");
  }

  const session = store.createChatSession(modelName, {
    initialMessages: messages.slice(0, -1),
    options,
  });

  return session.send(
    lastMessage.content,
    (chunk) => {
      onChunk?.(chunk);
    },
    signal,
  );
}

async function handleSend() {
  if (!prompt.value.trim() || !hasValidModel.value || isGenerating.value) {
    return;
  }

  const chat = props.chat;
  const userMessage = prompt.value.trim();

  const userMessageObj = {
    role: "user",
    content: userMessage,
  };

  chat.messages.push(userMessageObj);
  updateChatTitle(chat, userMessage);

  prompt.value = "";
  emit("message-sent");

  await scrollToBottom(true);

  isGenerating.value = true;
  streamingText.value = "";
  abortController.value = new AbortController();

  let titleGenerationData = null;

  try {
    const messagesPayload = [];

    if (
      effectiveSystemPrompt.value &&
      !chat.messages.some((message) => message.role === "system")
    ) {
      messagesPayload.push({
        role: "system",
        content: effectiveSystemPrompt.value,
      });
    }

    messagesPayload.push(
      ...chat.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    );

    const result = await sendWithSession(
      chat.model,
      messagesPayload,
      {
        temperature: effectiveTemperature.value,
        num_ctx: effectiveNumCtx.value,
      },
      abortController.value.signal,
      (chunk) => {
        updateStreamingText(chunk);
        scrollToBottom();
      },
    );

    const responseText = (
      result?.text ||
      streamingText.value ||
      ""
    ).trim();

    userMessageObj.tokenCount = estimateTokenCount(userMessage);

    if (!responseText) {
      throw new Error("The model returned an empty response.");
    }

    chat.messages.push({
      role: "assistant",
      content: responseText,
      model: chat.model,
      tokenCount:
        result?.stats?.evalCount ?? estimateTokenCount(responseText),
    });

    chat.updatedAt = new Date().toISOString();

    emit("message-sent");
    await scrollToBottom(true);

    const isFirstExchange =
      chat.messages.filter((message) => message.role === "assistant")
        .length === 1;

    if (isFirstExchange) {
      titleGenerationData = {
        chat,
        userMessage,
        assistantMessage: responseText,
      };
    }
  } catch (error) {
    if (error.name === "AbortError") {
      const stoppedText = streamingText.value.trim();

      chat.messages.push({
        role: "assistant",
        content: stoppedText || "*Generation stopped.*",
        model: chat.model,
        stopped: true,
      });

      chat.updatedAt = new Date().toISOString();
      emit("message-sent");
    } else {
      console.error("Chat generation failed:", error);

      chat.messages.push({
        role: "assistant",
        content: "Error: failed to generate a response.",
        model: chat.model,
      });

      chat.updatedAt = new Date().toISOString();
      emit("message-sent");
    }
  } finally {
    isGenerating.value = false;
    streamingText.value = "";
    abortController.value = null;
  }

  if (titleGenerationData) {
    window.setTimeout(() => {
      generateChatTitle(
        titleGenerationData.chat,
        titleGenerationData.userMessage,
        titleGenerationData.assistantMessage,
      );
    }, 300);
  }
}

async function handleCopyMessage(content, index) {
  const success = await copyToClipboard(content);

  if (success) {
    copiedIndex.value = index;

    window.setTimeout(() => {
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
    .map(
      (message) =>
        `${message.role === "user" ? "User" : "Assistant"}:\n${message.content}`,
    )
    .join("\n\n---\n\n");

  const success = await copyToClipboard(fullText);

  if (success) {
    copiedAll.value = true;

    window.setTimeout(() => {
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
  abortController.value = new AbortController();

  try {
    const messagesPayload = chat.messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const result = await sendWithSession(
      chat.model,
      messagesPayload,
      {
        temperature: effectiveTemperature.value,
        num_ctx: effectiveNumCtx.value,
      },
      abortController.value.signal,
      (chunk) => {
        updateStreamingText(chunk);
        scrollToBottom();
      },
    );

    chat.messages[index].tokenCount = estimateTokenCount(
      chat.messages[index].content,
    );

    const responseText = result?.text?.trim() || streamingText.value.trim();

    chat.messages.push({
      role: "assistant",
      content: responseText || "Error: empty model response.",
      model: chat.model,
      tokenCount: result?.stats?.evalCount ?? estimateTokenCount(responseText),
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
    abortController.value = null;
  }
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
      effectiveSystemPrompt.value &&
      !chat.messages.some((message) => message.role === "system")
    ) {
      messagesPayload.push({
        role: "system",
        content: effectiveSystemPrompt.value,
      });
    }

    messagesPayload.push(
      ...chat.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    );

    const result = await sendWithSession(
      chat.model,
      messagesPayload,
      {
        temperature: effectiveTemperature.value,
        num_ctx: effectiveNumCtx.value,
      },
      abortController.value.signal,
      (chunk) => {
        updateStreamingText(chunk);
        scrollToBottom();
      },
    );

    const responseText = result?.text?.trim() || streamingText.value.trim();

    chat.messages.push({
      role: "assistant",
      content: responseText || "Error: empty model response.",
      model: chat.model,
      tokenCount: result?.stats?.evalCount ?? estimateTokenCount(responseText),
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

async function generateChatTitle(chat, userMessage, assistantMessage) {
  if (!assistantMessage?.trim()) {
    return;
  }

  try {
    const titlePrompt = [
      {
        role: "system",
        content:
          "Generate a short concise chat title. Use a maximum of 6 words. Do not use quotation marks. Do not add punctuation at the end. Reply with only the title.",
      },
      {
        role: "user",
        content: `User: ${userMessage}\n\nAssistant: ${assistantMessage}`,
      },
    ];

    const titleAbortController = new AbortController();
    let generatedTitleText = "";

    const result = await sendWithSession(
      chat.model,
      titlePrompt,
      {
        temperature: 0.2,
        num_ctx: effectiveNumCtx.value,
      },
      titleAbortController.signal,
      (chunk) => {
        generatedTitleText = appendOrReplaceStreamText(
          generatedTitleText,
          chunk,
        );
      },
    );

    const titleText = (result?.text || generatedTitleText || "")
      .replace(/^["'\s]+|["'\s]+$/g, "")
      .split("\n")[0]
      .trim();

    if (!titleText || titleText.length > 80) {
      return;
    }

    chat.title = titleText;
    chat.updatedAt = new Date().toISOString();

    emit("message-sent");
  } catch (error) {
    console.error(
      "Title generation failed, keeping fallback title:",
      error,
    );
  }
}

// watchers
watch(
  () => props.chat?.id,
  () => {
    chatSystemPromptInput.value = props.chat?.systemPrompt ?? "";
  },
);

watch(
  () => props.chat?.systemPrompt,
  (systemPrompt) => {
    chatSystemPromptInput.value = systemPrompt ?? "";
  },
);

watch(() => props.chat?.id, scrollToBottom);

// expose
defineExpose({ scrollToBottom });

// lifecycle
onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  document.addEventListener("keydown", handleEscapeKey);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("keydown", handleEscapeKey);
});
</script>

<style scoped>
/* layout */
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
  color: var(--color-text-faint);
  font-size: var(--text-sm);
  text-align: center;
}

/* messages */
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
  color: #fff;
  white-space: pre-wrap;
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

/* message footer */
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

.message-footer .copy-btn {
  opacity: 0;
}

.message:hover .message-footer .copy-btn,
.message:focus-within .message-footer .copy-btn {
  opacity: 1;
}

/* message editing */
.message-edit {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  width: min(85%, 820px);
}

.message.user .message-edit {
  align-self: flex-end;
}

.edit-textarea {
  min-height: 76px;
  padding: 0.7rem 0.75rem;
  resize: vertical;
  font-size: var(--text-sm);
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
}

/* composer */
.composer-area {
  display: grid;
  gap: 0.65rem;
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

/* input fields */
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

.edit-textarea:focus,
.chat-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent);
}

/* buttons */
.btn-primary,
.btn-secondary,
.btn-stop {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 92px;
  min-height: 48px;
  padding: 0.65rem 1rem;
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 12px;
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
  background: linear-gradient(135deg,
      var(--color-primary),
      var(--color-primary-hover));
  border-color: var(--color-primary);
}

.btn-primary:hover:not(:disabled) {
  border-color: var(--color-primary-hover);
  box-shadow: 0 5px 14px color-mix(in srgb, var(--color-primary) 30%, transparent);
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
  border-color: color-mix(in srgb,
      var(--color-primary) 30%,
      var(--color-border));
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

/* copy buttons */
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
  border-color: color-mix(in srgb,
      var(--color-primary) 35%,
      var(--color-border));
}

/* chat toolbar */
.chat-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 0 0.85rem;
  border-bottom: 1px solid var(--color-border);
}

.chat-window .chat-toolbar {
  margin-top: 0;
}

.toolbar-context {
  display: grid;
  flex: 1;
  min-width: 150px;
  max-width: 270px;
  gap: 0.3rem;
}

.toolbar-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.4rem;
}

/* context usage */
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
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-success, #22c55e) 14%, transparent);
}

.context-dot.warning {
  background: #f59e0b;
  box-shadow: 0 0 0 3px rgb(245 158 11 / 14%);
}

.context-dot.critical {
  background: var(--color-error, #ef4444);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-error, #ef4444) 14%, transparent);
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

.context-footer {
  gap: var(--space-2);
}

.context-footer .context-meta {
  margin: 0;
}

.context-meta {
  margin: 0;
  color: var(--color-text-faint);
  font-size: 10px;
  line-height: 1.3;
}

/* system prompt badge */
.system-prompt-badge {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.25rem;
  padding: 0.18rem 0.4rem;
  color: var(--color-primary);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
  background: color-mix(in srgb,
      var(--color-primary) 10%,
      var(--color-surface-2));
  border: 1px solid color-mix(in srgb,
      var(--color-primary) 22%,
      var(--color-border));
  border-radius: var(--radius-full);
}

.system-prompt-badge-icon {
  font-size: 9px;
  line-height: 1;
}

/* model warning */
.model-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.7rem 0.8rem;
  color: var(--color-warning, #a16207);
  background: color-mix(in srgb,
      var(--color-warning, #f59e0b) 12%,
      var(--color-surface));
  border: 1px solid color-mix(in srgb,
      var(--color-warning, #f59e0b) 30%,
      var(--color-border));
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

/* chat settings */
.chat-settings-row {
  display: flex;
  justify-content: flex-end;
  padding-bottom: 0.5rem;
}

.chat-settings-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

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

/* mobile input accessibility */
@media (pointer: coarse) {

  .chat-input,
  .edit-textarea {
    font-size: 16px;
  }
}

/* responsive tablet/mobile */
@media (max-width: 620px) {
  .chat-thread {
    gap: 0.5rem;
  }

  .chat-window {
    gap: 0.6rem;
    padding: 0.5rem;
    border-radius: var(--radius-sm);
  }

  .chat-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    padding-bottom: 0.6rem;
  }

  .toolbar-context {
    max-width: none;
    gap: 0.2rem;
  }

  .toolbar-actions {
    width: 100%;
    gap: 0.3rem;
  }

  .toolbar-copy-btn {
    flex: 1;
    min-height: 28px;
    padding: 0.3rem 0.45rem;
    font-size: 10px;
  }

  .context-label,
  .context-value {
    font-size: 10px;
  }

  .context-meta {
    font-size: 9px;
  }

  .context-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .system-prompt-badge {
    padding: 0.14rem 0.32rem;
    font-size: 9px;
  }

  .message {
    gap: 0.2rem;
  }

  .message-edit {
    width: min(94%, 820px);
    max-width: min(94%, 820px);
    gap: 0.4rem;
    padding: 0.5rem 0.55rem;
  }

  .message-footer .copy-btn {
    min-width: 20px;
    min-height: 20px;
    font-size: 10px;
    opacity: 1;
  }

  .message-meta {
    font-size: 9px;
  }

  .message-bubble {
    max-width: 92%;
    padding: 0.55rem 0.7rem;
    font-size: 13px;
    line-height: 1.45;
  }

  .chat-input-row {
    gap: 0.35rem;
  }

  .chat-input {
    min-height: 40px;
    max-height: 120px;
    padding: 0.5rem 0.6rem;
  }

  .btn-primary,
  .btn-secondary,
  .btn-stop {
    min-width: 64px;
    min-height: 40px;
    padding: 0.45rem 0.65rem;
    font-size: 13px;
  }

  .chat-settings-panel {
    gap: 0.7rem;
    padding: 0.7rem;
  }

  .field-label {
    font-size: 12px;
  }

  .chat-settings-toggle-btn {
    padding: 0.3rem 0.5rem;
    font-size: 12px;
  }

  .model-warning {
    gap: 0.45rem;
    padding: 0.5rem 0.6rem;
  }

  .model-warning strong,
  .model-warning p {
    font-size: 11px;
  }
}

/* responsive narrow mobile */
@media (max-width: 430px) {
  .message-bubble {
    max-width: 94%;
    font-size: 12.5px;
  }

  .toolbar-copy-btn {
    padding: 0.25rem 0.35rem;
    font-size: 9px;
  }

  .btn-primary,
  .btn-stop {
    min-width: 56px;
    padding: 0.4rem 0.55rem;
  }
}
</style>
