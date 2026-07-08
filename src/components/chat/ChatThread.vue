<!-- src/components/chat/ChatThread.vue -->

<template>
  <div class="chat-thread">
    <div v-if="chat" class="chat-window" ref="chatWindow">
      <div v-if="chat.messages.length === 0" class="empty-state">
        <p>{{ emptyHint }}</p>
      </div>

      <div
        v-for="(message, index) in chat.messages"
        :key="index"
        class="message"
        :class="message.role"
      >
        <div class="message-bubble">{{ message.content }}</div>
        <span
          v-if="message.role === 'assistant' && message.model"
          class="message-meta"
        >
          {{ message.model }} · {{ message.tokenCount }} tokens
        </span>
      </div>

      <div v-if="isGenerating" class="message assistant">
        <div class="message-bubble streaming">{{ streamingText || "…" }}</div>
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

async function scrollToBottom() {
  await nextTick();
  if (chatWindow.value) {
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
  chat.messages.push({ role: "user", content: userMessage });
  updateChatTitle(chat, userMessage);
  prompt.value = "";
  emit("message-sent");
  scrollToBottom();

  isGenerating.value = true;
  streamingText.value = "";

  try {
    const result = await ollama.generateStreamingAnswer(
      chat.model,
      userMessage,
      {},
      (chunk) => {
        streamingText.value += chunk.response || "";
        scrollToBottom();
      },
    );

    chat.messages.push({
      role: "assistant",
      content: result.text,
      model: chat.model,
      tokenCount: result.stats.evalCount,
    });
    emit("message-sent");
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
    scrollToBottom();
  }
}

defineExpose({ scrollToBottom });
</script>

<style scoped>
.chat-thread {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.chat-window {
  flex: 1;
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

.message-meta {
  font-size: 11px;
  color: var(--color-text-faint);
  padding: 0 var(--space-1);
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
</style>
