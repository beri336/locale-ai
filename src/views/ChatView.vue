<!-- src/views/ChatView.vue -->

<template>
  <div class="chat-view">
    <aside class="chat-sidebar" :class="{ collapsed: isSidebarCollapsed }">
      <div class="sidebar-header">
        <button
          v-if="!isSidebarCollapsed"
          class="btn-primary new-chat-btn"
          @click="handleNewChat"
        >
          + New Chat
        </button>
        <button
          class="toggle-btn"
          @click="toggleSidebar"
          :title="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          {{ isSidebarCollapsed ? "»" : "«" }}
        </button>
      </div>

      <div v-if="!isSidebarCollapsed" class="chat-list">
        <ChatListItem
          v-for="chat in chats"
          :key="chat.id"
          :chat="chat"
          :is-active="chat.id === activeChatId"
          @select="selectChat(chat.id)"
          @delete="handleDeleteChat(chat.id)"
          @rename="(newTitle) => renameChat(chat, newTitle)"
        />

        <div v-if="chats.length === 0" class="empty-state small">
          <p>No chats yet.</p>
        </div>
      </div>

      <button
        v-else
        class="collapsed-new-chat-btn"
        @click="handleNewChat"
        title="New Chat"
      >
        +
      </button>
    </aside>

    <div class="chat-main">
      <header class="page-header">
        <h1>{{ activeChat?.title || "Chat" }}</h1>
        <select
          v-if="activeChat"
          v-model="selectedModel"
          class="select"
          @change="handleModelChange"
        >
          <option value="" disabled>Select a model</option>
          <option v-for="name in modelNames" :key="name" :value="name">
            {{ name }}
          </option>
        </select>
      </header>

      <div v-if="!activeChat" class="empty-chat-state">
        <p class="empty-chat-title">No chat selected</p>
        <p class="empty-chat-hint">
          Start a new conversation to begin chatting.
        </p>
        <button class="btn-primary" @click="handleNewChat">
          + Start New Chat
        </button>
      </div>

      <ChatThread
        v-else
        :chat="activeChat"
        empty-hint="Start a conversation by selecting a model and typing a message."
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useOllamaStore } from "@/stores/useOllamaStore";
import ChatListItem from "@/components/chat/ChatListItem.vue";
import ChatThread from "@/components/chat/ChatThread.vue";
import { useSettingsStore } from "@/stores/settingsStore";

const ollama = useOllamaStore();
const settingsStore = useSettingsStore();

const STORAGE_KEY = "ollama-chats";

const modelNames = ref([]);
const chats = ref([]);
const activeChatId = ref(null);

const activeChat = computed(
  () => chats.value.find((c) => c.id === activeChatId.value) || null,
);

const selectedModel = computed({
  get: () => activeChat.value?.model || ollama.getSelectedModel(),
  set: (name) => {
    if (activeChat.value) activeChat.value.model = name;
    ollama.setSelectedModel(name);
  },
});

function loadChats() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    chats.value = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load chats:", error);
    chats.value = [];
  }
}

function saveChats() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats.value));
  } catch (error) {
    console.error("Failed to save chats:", error);
  }
}

watch(chats, saveChats, { deep: true });

function createChat() {
  const newChat = {
    id: `chat_${Date.now()}`,
    title: "New Chat",
    model: settingsStore.defaultModel || ollama.getSelectedModel() || modelNames.value[0] || "",
    messages: [],
    createdAt: new Date().toISOString(),
  };
  chats.value.unshift(newChat);
  activeChatId.value = newChat.id;
  return newChat;
}

function handleNewChat() {
  createChat();
}

function selectChat(id) {
  activeChatId.value = id;
}

function handleDeleteChat(id) {
  if (!confirm("Delete this chat?")) return;

  const index = chats.value.findIndex((c) => c.id === id);
  if (index === -1) return;

  chats.value.splice(index, 1);

  if (activeChatId.value === id) {
    activeChatId.value = chats.value[0]?.id || null;
  }
}

function renameChat(chat, newTitle) {
  chat.title = newTitle;
}

function handleModelChange() {
  if (activeChat.value) {
    ollama.setSelectedModel(activeChat.value.model);
  }
}

onMounted(async () => {
  modelNames.value = await ollama.getListOfModelsName();
  const hasStoredChats = localStorage.getItem(STORAGE_KEY) !== null;
  loadChats();

  if (chats.value.length > 0) {
    activeChatId.value = chats.value[0].id;
  } else if (!hasStoredChats) {
    createChat();
  }
});

const isSidebarCollapsed = ref(
  localStorage.getItem("chat-sidebar-collapsed") === "true",
);

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  localStorage.setItem("chat-sidebar-collapsed", isSidebarCollapsed.value);
}
</script>

<style scoped>
.chat-view {
  height: 100%;
  display: flex;
}

.chat-sidebar {
  width: 240px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  transition:
    width 0.2s ease,
    padding 0.2s ease;
  overflow: hidden;
}

.chat-sidebar.collapsed {
  width: 56px;
  padding: var(--space-4) var(--space-2);
  align-items: center;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.chat-sidebar.collapsed .sidebar-header {
  flex-direction: column;
}

.new-chat-btn {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
}

.toggle-btn {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: var(--text-sm);
  padding: var(--space-1) var(--space-2);
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--space-6);
  gap: var(--space-4);
  min-width: 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--color-text);
}

.page-header h1 {
  font-size: var(--text-xl);
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select {
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  min-width: 200px;
  color: var(--color-text-muted);
}

.empty-state {
  margin: auto;
  text-align: center;
  color: var(--color-text-faint);
  font-size: var(--text-sm);
}

.empty-state.small {
  padding: var(--space-4) 0;
  font-size: var(--text-xs);
}

.btn-primary {
  padding: var(--space-2) var(--space-4);
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

.empty-chat-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  text-align: center;
}

.empty-chat-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text);
}

.empty-chat-hint {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin-bottom: var(--space-3);
}

.collapsed-new-chat-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-md);
  font-size: var(--text-lg);
  border: none;
  cursor: pointer;
}
</style>
