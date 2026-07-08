<!-- src/views/ProjectDetailView.vue -->

<template>
  <div class="project-detail" v-if="project">
    <aside class="chat-sidebar" :class="{ collapsed: isSidebarCollapsed }">
      <div class="sidebar-top">
        <button v-if="!isSidebarCollapsed" class="back-btn" @click="goBack">
          ← Projects
        </button>
        <button
          class="toggle-btn"
          @click="toggleSidebar"
          :title="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          {{ isSidebarCollapsed ? "»" : "«" }}
        </button>
      </div>

      <template v-if="!isSidebarCollapsed">
        <h2 class="project-name">{{ project.name }}</h2>
        <div class="project-tags" v-if="project.tags.length">
          <span v-for="tag in project.tags" :key="tag" class="tag-chip">{{
            tag
          }}</span>
        </div>

        <button class="btn-primary new-chat-btn" @click="handleNewChat">
          + New Chat
        </button>

        <div class="chat-list">
          <ChatListItem
            v-for="chat in project.chats"
            :key="chat.id"
            :chat="chat"
            :is-active="chat.id === activeChatId"
            :show-model="true"
            @select="selectChat(chat.id)"
            @delete="handleDeleteChat(chat.id)"
            @rename="(newTitle) => renameChat(chat, newTitle)"
          />

          <div v-if="project.chats.length === 0" class="empty-state small">
            <p>No chats yet. Start one above.</p>
          </div>
        </div>
      </template>

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
        <h1>{{ activeChat?.title || "Select a chat" }}</h1>
        <select v-if="activeChat" v-model="activeChat.model" class="select">
          <option value="" disabled>Select a model</option>
          <option v-for="name in modelNames" :key="name" :value="name">
            {{ name }}
          </option>
        </select>
      </header>

      <ChatThread
        :chat="activeChat"
        empty-hint="Start a conversation in this project."
        @message-sent="projectsStore.saveProjects()"
      />
    </div>
  </div>

  <div v-else class="empty-state">
    <p>Project not found.</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { useOllamaStore } from "@/stores/useOllamaStore";
import ChatThread from "@/components/chat/ChatThread.vue";
import ChatListItem from "@/components/chat/ChatListItem.vue";

const route = useRoute();
const router = useRouter();
const projectsStore = useProjectsStore();
const ollama = useOllamaStore();

const modelNames = ref([]);
const activeChatId = ref(null);
const prompt = ref("");
const isGenerating = ref(false);
const streamingText = ref("");
const chatWindow = ref(null);

const project = computed(() => projectsStore.getProjectById(route.params.id));

const isSidebarCollapsed = ref(
  localStorage.getItem("project-sidebar-collapsed") === "true",
);

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  localStorage.setItem("project-sidebar-collapsed", isSidebarCollapsed.value);
}

const activeChat = computed(() => {
  if (!project.value) return null;
  return project.value.chats.find((c) => c.id === activeChatId.value) || null;
});

function renameChat(chat, newTitle) {
  chat.title = newTitle;
  projectsStore.saveProjects();
}

watch(
  () => activeChat.value?.model,
  () => {
    projectsStore.saveProjects();
  },
);

function goBack() {
  router.push("/projects");
}

function handleNewChat() {
  const chat = projectsStore.createChatInProject(
    project.value.id,
    modelNames.value[0] || "",
  );
  activeChatId.value = chat.id;
}

function selectChat(id) {
  activeChatId.value = id;
  scrollToBottom();
}

function handleDeleteChat(id) {
  if (!confirm("Delete this chat?")) return;
  projectsStore.deleteChatFromProject(project.value.id, id);
  if (activeChatId.value === id) {
    activeChatId.value = project.value.chats[0]?.id || null;
  }
}

async function scrollToBottom() {
  await nextTick();
  if (chatWindow.value) {
    chatWindow.value.scrollTop = chatWindow.value.scrollHeight;
  }
}

function updateChatTitle(chat, firstMessage) {
  if (chat.title === "New Chat" && firstMessage) {
    chat.title =
      firstMessage.slice(0, 40) + (firstMessage.length > 40 ? "…" : "");
  }
}

async function handleSend() {
  if (!prompt.value || !activeChat.value?.model || isGenerating.value) return;

  const chat = activeChat.value;
  const userMessage = prompt.value;
  chat.messages.push({ role: "user", content: userMessage });
  updateChatTitle(chat, userMessage);
  prompt.value = "";
  projectsStore.saveProjects();
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
    projectsStore.saveProjects();
  } catch (error) {
    console.error("Chat generation failed:", error);
    chat.messages.push({
      role: "assistant",
      content: "Error: failed to generate a response.",
    });
    projectsStore.saveProjects();
  } finally {
    isGenerating.value = false;
    streamingText.value = "";
    scrollToBottom();
  }
}

onMounted(async () => {
  modelNames.value = await ollama.getListOfModelsName();
  if (project.value?.chats.length > 0) {
    activeChatId.value = project.value.chats[0].id;
  }
  scrollToBottom();
});
</script>

<style scoped>
.project-detail {
  height: 100%;
  display: flex;
}

.chat-sidebar {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  overflow-y: auto;
}

.back-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  cursor: pointer;
  padding: 0;
  text-align: left;
}

.back-btn:hover {
  color: var(--color-text);
}

.project-name {
  font-size: var(--text-lg);
  font-weight: 700;
}

.project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag-chip {
  padding: 2px 8px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 11px;
  color: var(--color-text-muted);
}

.new-chat-btn {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}

.chat-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.15s ease;
}

.chat-list-item:hover {
  background: var(--color-surface-2);
}

.chat-list-item.active {
  background: var(--color-surface-2);
}

.chat-list-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
}

.chat-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-model-tag {
  font-size: 11px;
  color: var(--color-text-faint);
}

.chat-delete-btn {
  background: none;
  border: none;
  color: var(--color-text-faint);
  cursor: pointer;
  font-size: var(--text-xs);
  flex-shrink: 0;
}

.chat-delete-btn:hover {
  color: var(--color-error);
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

.empty-state.small {
  padding: var(--space-3) 0;
  font-size: var(--text-xs);
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
  padding: var(--space-1);
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

.chat-sidebar {
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

.sidebar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.chat-sidebar.collapsed .sidebar-top {
  flex-direction: column;
}

.toggle-btn {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: var(--text-sm);
  padding: var(--space-1) var(--space-2);
  flex-shrink: 0;
}

.toggle-btn:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
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
