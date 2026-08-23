<!-- src/components/projects/ProjectDetail.vue -->

<template>
  <main v-if="project" class="project-detail">
    <aside class="project-sidebar" :class="{ collapsed: isSidebarCollapsed }">
      <!-- Sidebar content -->
      <div class="sidebar-top">
        <button v-if="!isSidebarCollapsed" class="back-btn" type="button" @click="goBack">
          <span aria-hidden="true">
            <IconArrowLeft :size="12" :stroke-width="2"></IconArrowLeft>
          </span>
          All projects
        </button>

        <button class="sidebar-toggle-btn" type="button"
          :title="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'" :aria-label="isSidebarCollapsed
            ? 'Expand project sidebar'
            : 'Collapse project sidebar'
            " @click="toggleSidebar">
          <span aria-hidden="true">{{ isSidebarCollapsed ? "»" : "«" }}</span>
        </button>
      </div>

      <!-- Project -->
      <template v-if="!isSidebarCollapsed">
        <!-- Project Summary -->
        <div class="project-summary">
          <div class="project-summary-icon" aria-hidden="true">
            <IconFolder :size="20" :stroke-width="2"></IconFolder>
          </div>

          <div class="project-summary-copy">
            <p class="sidebar-eyebrow">Project</p>
            <h1 class="project-name">{{ project.name }}</h1>
          </div>
        </div>

        <!-- Project Description -->
        <div v-if="project.description" class="project-description">
          {{ project.description }}
        </div>

        <!-- Project Tags -->
        <div v-if="project.tags.length" class="project-tags">
          <span v-for="tag in project.tags" :key="tag" class="tag-chip">
            {{ tag }}
          </span>
        </div>

        <div class="sidebar-divider"></div>

        <!-- Chats -->
        <div class="chats-heading">
          <span>Chats</span>
          <span class="chat-count">Total: {{ project.chats.length }}</span>
          <span class="chat-count">Visible: {{ sortedVisibleChats.length }}</span>
        </div>

        <!-- New Chat Button -->
        <button class="btn-primary new-chat-btn" type="button" @click="handleNewChat">
          <span aria-hidden="true">
            <IconPlus :size="12" :stroke-width="2"></IconPlus>
          </span>
          New chat
        </button>

        <!-- Chat List -->
        <div class="chat-list">
          <ChatListItem v-for="chat in sortedVisibleChats" :key="chat.id" :chat="chat"
            :is-active="chat.id === activeChatId" :show-model="true" @select="selectChat(chat.id)"
            @delete="handleDeleteChat(chat.id)" @rename="(newTitle) => renameChat(chat, newTitle)"
            @toggle-pin="projectsStore.toggleChatPin(project.id, chat.id)" @archive="handleArchiveChat(chat.id)" />

          <!-- Empty State -->
          <div v-if="project.chats.length === 0" class="sidebar-empty-state" />

          <div v-if="sortedVisibleChats.length === 0" class="sidebar-empty-state">
            <span class="sidebar-empty-icon" aria-hidden="true">
              <IconChat :size="20" :stroke-width="2"></IconChat>
            </span>
            <p>No chats in this project yet.</p>
          </div>
        </div>
      </template>

      <button v-else class="collapsed-new-chat-btn" type="button" title="New chat" aria-label="Create new chat"
        @click="handleNewChat">
        <IconPlus :size="12" :stroke-width="2" aria-hidden="true"></IconPlus>
      </button>
    </aside>

    <section class="chat-main">
      <!-- Header -->
      <header class="chat-header">
        <div class="chat-header-copy">
          <p class="chat-header-eyebrow">{{ project.name }}</p>
          <h2>{{ activeChat?.title || "Select a chat" }}</h2>
        </div>

        <select v-if="activeChat" v-model="activeModelRef" class="model-select" aria-label="Select chat model">
          <option value="" disabled>
            Select a local model
          </option>

          <option v-for="model in availableModels" :key="model.id" :value="model.id">
            {{ model.displayName }} · {{ model.providerLabel }}
            {{
              model.provider === "lmstudio" && !model.isLoaded
                ? " (not loaded)"
                : ""
            }}
          </option>
        </select>
      </header>

      <!-- Empty Project Chat State -->
      <div v-if="!activeChat" class="empty-project-chat-state">
        <span class="empty-project-chat-icon" aria-hidden="true">
          <IconSparkles :size="20" :stroke-width="2"></IconSparkles>
        </span>
        <h3>No chat selected</h3>
        <p>
          Create a chat to start a conversation in
          <strong>{{ project.name }}</strong>.
        </p>
        <button class="btn-primary" type="button" @click="handleNewChat">
          <IconPlus :size="12" :stroke-width="2" aria-hidden="true"></IconPlus>
          Start new chat
        </button>
      </div>

      <!-- Chat Thread -->
      <ChatThread v-else :chat="activeChat" :available-models="availableModels"
        empty-hint="Start a conversation in this project." @message-sent="projectsStore.saveProjects" />
    </section>
  </main>

  <!-- Not Found State -->
  <section v-else class="not-found-state">
    <div class="not-found-icon" aria-hidden="true">
      <IconFolder :size="20" :stroke-width="2"></IconFolder>
    </div>
    <h1>Project not found</h1>
    <p>
      This project may have been deleted or is no longer available in local
      storage.
    </p>
    <button class="btn-secondary" type="button" @click="goBack">
      <span aria-hidden="true">
        <IconArrowLeft :size="12" :stroke-width="2"></IconArrowLeft>
      </span>
      Back to projects
    </button>
  </section>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useProjectsStore } from "@/stores/useProjectsStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

import { useOllamaApi } from "@/services/ollamaApiService";
import { useLmStudioApi } from "@/services/lmsApiService";

import ChatThread from "@/components/chat/ChatThread.vue";
import ChatListItem from "@/components/chat/ChatListItem.vue";

import IconArrowLeft from "@/components/icons/IconArrowLeft.vue";
import IconPlus from "@/components/icons/IconPlus.vue";
import IconSparkles from "@/components/icons/IconSparkles.vue";
import IconFolder from "@/components/icons/IconFolder.vue";
import IconChat from "@/components/icons/IconChat.vue";


const route = useRoute();
const router = useRouter();

const ollama = useOllamaApi();
const lms = useLmStudioApi();
const projectsStore = useProjectsStore();
const settingsStore = useSettingsStore();

const availableModels = ref([]);

const activeChatId = ref(null);
const chatWindow = ref(null);

const isSidebarCollapsed = ref(
  localStorage.getItem("project-sidebar-collapsed") === "true",
);


// computed properties
const project = computed(() => projectsStore.getProjectById(route.params.id));

const activeModelRef = computed({
  get() {
    return activeChat.value?.model ?? "";
  },
  set(value) {
    if (!activeChat.value) return;

    activeChat.value.model = value;
    projectsStore.saveProjects();
  },
});

const activeModel = computed(
  () =>
    availableModels.value.find(
      (model) => model.id === activeModelRef.value,
    ) ?? null,
);

const activeChat = computed(() => {
  if (!project.value) return null;
  return project.value.chats.find((c) => c.id === activeChatId.value) || null;
});

const sortedVisibleChats = computed(() => {
  if (!project.value) return [];
  return projectsStore.sortChatsByPin(
    projectsStore.getVisibleChats(project.value),
  );
});


// async functions
async function scrollToBottom() {
  await nextTick();
  if (chatWindow.value) {
    chatWindow.value.scrollTop = chatWindow.value.scrollHeight;
  }
}

async function loadAvailableModels() {
  const [ollamaResult, lmStudioResult] = await Promise.allSettled([
    ollama.getAllModelsNames(),
    lms.getAllModelsWithDetails(),
  ]);

  const ollamaModels =
    ollamaResult.status === "fulfilled"
      ? normalizeOllamaModels(ollamaResult.value)
      : [];

  const lmStudioModels =
    lmStudioResult.status === "fulfilled"
      ? normalizeLmStudioModels(lmStudioResult.value)
      : [];

  availableModels.value = [...ollamaModels, ...lmStudioModels];

  ensureActiveChatModel();
}


// function
function normalizeOllamaModels(models) {
  if (!Array.isArray(models)) return [];

  return models
    .filter((name) => typeof name === "string" && name.trim())
    .map((name) => ({
      id: `ollama:${name}`,
      provider: "ollama",
      providerLabel: "Ollama",
      modelId: name,
      displayName: name,
      isLoaded: true,
    }));
}

function normalizeLmStudioModels(models) {
  if (!Array.isArray(models)) return [];

  return models
    .filter(
      (model) =>
        model?.type === "llm" &&
        typeof model.id === "string" &&
        model.id.trim(),
    )
    .map((model) => ({
      id: `lmstudio:${model.id}`,
      provider: "lmstudio",
      providerLabel: "LM Studio",
      modelId: model.id,
      displayName: model.displayName || model.id,
      isLoaded: Boolean(model.isLoaded),
      instanceId: model.instanceId ?? null,
    }))
    .sort((left, right) => {
      if (left.isLoaded !== right.isLoaded) {
        return left.isLoaded ? -1 : 1;
      }

      return left.displayName.localeCompare(right.displayName);
    });
}

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  localStorage.setItem("project-sidebar-collapsed", isSidebarCollapsed.value);
}

function renameChat(chat, newTitle) {
  chat.title = newTitle;
  projectsStore.saveProjects();
}

function goBack() {
  router.push("/projects");
}

function handleNewChat() {
  const chat = projectsStore.createChatInProject(
    project.value.id,
    settingsStore.defaultModel || "",
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

function handleArchiveChat(chatId) {
  projectsStore.toggleChatArchive(project.value.id, chatId);
  if (activeChatId.value === chatId)
    activeChatId.value = sortedVisibleChats.value[0]?.id || null;
}

function updateChatTitle(chat, firstMessage) {
  if (chat.title === "New Chat" && firstMessage) {
    chat.title =
      firstMessage.slice(0, 40) + (firstMessage.length > 40 ? "…" : "");
  }
}

function ensureActiveChatModel() {
  if (!activeChat.value) return;

  const modelRef = activeChat.value.model;

  if (!modelRef) {
    activeChat.value.model = availableModels.value[0]?.id ?? "";
    projectsStore.saveProjects();
    return;
  }

  const isValidModel = availableModels.value.some(
    (model) => model.id === modelRef,
  );

  if (isValidModel) return;

  /*
    Migration for old project chats:
      An old string without a provider is interpreted as an Ollama model.
  */
  const oldOllamaModel = availableModels.value.find(
    (model) =>
      model.provider === "ollama" &&
      model.modelId === modelRef,
  );

  if (oldOllamaModel) {
    activeChat.value.model = oldOllamaModel.id;
    projectsStore.saveProjects();
    return;
  }

  activeChat.value.model = availableModels.value[0]?.id ?? "";
  projectsStore.saveProjects();
}


// watchers
watch(
  () => activeChat.value?.model,
  () => {
    projectsStore.saveProjects();
  },
);


// mounted lifecycle hook
onMounted(async () => {
  if (project.value?.chats.length > 0) {
    const requestedChatId = route.query.chat;

    const requestedChatExists = project.value.chats.some(
      (chat) => chat.id === requestedChatId,
    );

    activeChatId.value = requestedChatExists
      ? requestedChatId
      : project.value.chats[0].id;
  }

  await loadAvailableModels();
  await scrollToBottom();
});
</script>

<style scoped>
/* Page layout */
.project-detail {
  display: flex;
  height: 100%;
  min-height: 0;
  background: var(--color-bg);
}

/* Project sidebar */
.project-sidebar {
  display: flex;
  width: 272px;
  min-height: 0;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1rem;
  overflow: hidden;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  transition:
    width 0.2s ease,
    padding 0.2s ease;
}

.project-sidebar.collapsed {
  width: 56px;
  align-items: center;
  padding: 1rem 0.55rem;
}

/* Sidebar controls */
.sidebar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.project-sidebar.collapsed .sidebar-top {
  flex-direction: column;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  padding: 0.3rem 0;
  color: var(--color-text-muted);
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.back-btn:hover {
  color: var(--color-primary);
}

.sidebar-toggle-btn {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  padding: 0;
  color: var(--color-text-faint);
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition:
    color 0.16s ease,
    background 0.16s ease,
    border-color 0.16s ease;
}

.sidebar-toggle-btn:hover {
  color: var(--color-text);
  background: var(--color-bg);
  border-color: color-mix(in srgb,
      var(--color-primary) 35%,
      var(--color-border));
}

/* Project summary */
.project-summary {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  min-width: 0;
  padding-top: 0.35rem;
}

.project-summary-icon {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--color-primary);
  font-size: 1.25rem;
  background: color-mix(in srgb, var(--color-primary) 11%, transparent);
  border-radius: 10px;
}

.project-summary-copy {
  min-width: 0;
}

.sidebar-eyebrow,
.chat-header-eyebrow {
  margin: 0 0 0.15rem;
  overflow: hidden;
  color: var(--color-text-faint);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.project-name {
  margin: 0;
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--text-md);
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-description {
  display: -webkit-box;
  margin: -0.1rem 0 0;
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: 11px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

/* Project tags */
.project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.tag-chip {
  max-width: 100%;
  padding: 0.2rem 0.45rem;
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: 10px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
}

.sidebar-divider {
  height: 1px;
  margin: 0.1rem 0;
  background: var(--color-border);
}

/* Chat list */
.chats-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--color-text-faint);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.chat-count {
  display: inline-grid;
  min-width: 18px;
  height: 18px;
  place-items: center;
  padding: 0 0.3rem;
  color: var(--color-text-muted);
  font-family: "Fira Code", ui-monospace, monospace;
  font-size: 10px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
}

.chat-list {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  padding-right: 0.1rem;
  overflow-y: auto;
}

/* Shared buttons */
.btn-primary,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 36px;
  padding: 0.5rem 0.75rem;
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease,
    transform 0.16s ease;
}

.btn-primary:active,
.btn-secondary:active {
  transform: translateY(1px);
}

.btn-primary {
  color: #fff;
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
}

.btn-primary:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.btn-secondary {
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-surface-2);
  border-color: color-mix(in srgb,
      var(--color-primary) 35%,
      var(--color-border));
}

.new-chat-btn {
  width: 100%;
}

.collapsed-new-chat-btn {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  padding: 0;
  color: #fff;
  font-family: inherit;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  background: var(--color-primary);
  border: 0;
  border-radius: 9px;
}

.collapsed-new-chat-btn:hover {
  background: var(--color-primary-hover);
}

/* Sidebar empty state */
.sidebar-empty-state {
  display: grid;
  justify-items: center;
  gap: 0.45rem;
  padding: 1.4rem 0.75rem;
  margin: auto 0;
  color: var(--color-text-faint);
  text-align: center;
}

.sidebar-empty-state p {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
}

.sidebar-empty-icon {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  color: var(--color-primary);
  font-size: 1rem;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-radius: 9px;
}

/* Chat content */
.chat-main {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 1rem;
  padding: clamp(1rem, 3vw, 2rem);
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.chat-header-copy {
  min-width: 0;
}

.chat-header h2 {
  margin: 0;
  overflow: hidden;
  color: var(--color-text);
  font-size: clamp(1.1rem, 2vw, 1.35rem);
  font-weight: 650;
  letter-spacing: -0.025em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Model selector */
.model-select {
  min-width: 180px;
  max-width: min(38vw, 280px);
  padding: 0.55rem 2.25rem 0.55rem 0.75rem;
  overflow: hidden;
  color: var(--color-text);
  font-family: inherit;
  font-size: var(--text-xs);
  text-overflow: ellipsis;
  cursor: pointer;
  appearance: none;
  background-color: var(--color-surface);
  background-image:
    linear-gradient(45deg, transparent 50%, currentColor 50%),
    linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position:
    calc(100% - 15px) 50%,
    calc(100% - 10px) 50%;
  background-repeat: no-repeat;
  background-size:
    5px 5px,
    5px 5px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
}

.model-select:hover {
  border-color: color-mix(in srgb,
      var(--color-primary) 35%,
      var(--color-border));
}

.model-select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 14%, transparent);
}

/* Project chat empty state */
.empty-project-chat-state {
  display: grid;
  min-height: 0;
  flex: 1;
  place-content: center;
  justify-items: center;
  gap: 0.65rem;
  padding: 2rem;
  text-align: center;
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
}

.empty-project-chat-icon {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  color: var(--color-primary);
  font-size: 1.3rem;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-radius: 14px;
}

.empty-project-chat-state h3 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-md);
}

.empty-project-chat-state p {
  max-width: 340px;
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  line-height: 1.55;
}

.empty-project-chat-state .btn-primary {
  margin-top: 0.35rem;
}

/* Project not found state */
.not-found-state {
  display: grid;
  justify-items: center;
  max-width: 500px;
  padding: 2rem;
  margin: auto;
  text-align: center;
}

.not-found-icon {
  display: grid;
  width: 48px;
  height: 48px;
  margin-bottom: 0.8rem;
  place-items: center;
  color: var(--color-primary);
  font-size: 1.8rem;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-radius: 14px;
}

.not-found-state h1 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-lg);
}

.not-found-state p {
  max-width: 360px;
  margin: 0.55rem 0 1rem;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  line-height: 1.55;
}

/* Touch-friendly inputs */
@media (pointer: coarse) {
  .model-select {
    font-size: 16px;
  }
}

/* Tablet layout */
@media (max-width: 760px) {
  .project-sidebar {
    width: 200px;
    padding: 0.75rem;
  }

  .chat-main {
    padding: 0.85rem;
  }

  .model-select {
    min-width: 130px;
    font-size: 11px;
  }
}

/* Mobile layout */
@media (max-width: 620px) {
  /* Sidebar overlay */
  .project-detail {
    position: relative;
  }

  .project-sidebar {
    position: absolute;
    z-index: 10;
    top: 0;
    bottom: 0;
    left: 0;
    width: min(80vw, 260px);
    gap: 0.65rem;
    padding: 0.75rem;
    box-shadow: 12px 0 28px rgb(0 0 0 / 0.12);
  }

  .project-sidebar.collapsed {
    width: 42px;
    padding: 0.6rem 0.35rem;
    box-shadow: 4px 0 14px rgb(0 0 0 / 0.07);
  }

  /* Sidebar elements */
  .back-btn {
    font-size: 10px;
  }

  .sidebar-toggle-btn {
    width: 24px;
    height: 24px;
    font-size: 0.75rem;
  }

  .project-summary {
    gap: 0.5rem;
    padding-top: 0.25rem;
  }

  .project-summary-icon {
    width: 26px;
    height: 26px;
    font-size: 1rem;
    border-radius: 8px;
  }

  .sidebar-eyebrow,
  .chat-header-eyebrow {
    font-size: 0.58rem;
  }

  .project-name {
    font-size: 13px;
  }

  .project-description {
    font-size: 10px;
  }

  .tag-chip {
    padding: 0.15rem 0.35rem;
    font-size: 9px;
  }

  .chats-heading {
    font-size: 0.58rem;
  }

  .chat-count {
    min-width: 15px;
    height: 15px;
    font-size: 9px;
  }

  .new-chat-btn {
    min-height: 30px;
    padding: 0.4rem 0.6rem;
    font-size: 11px;
  }

  .sidebar-empty-state p {
    font-size: 10px;
  }

  .sidebar-empty-icon {
    width: 24px;
    height: 24px;
    font-size: 0.85rem;
  }

  .collapsed-new-chat-btn {
    width: 26px;
    height: 26px;
    font-size: 1.05rem;
  }

  /* Chat content */
  .chat-main {
    gap: 0.65rem;
    padding: 0.75rem 0.75rem 0.75rem 3.4rem;
  }

  .chat-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.5rem;
  }

  .chat-header h2 {
    font-size: 1rem;
  }

  .model-select {
    width: 100%;
    max-width: none;
    padding: 0.45rem 2rem 0.45rem 0.6rem;
    font-size: 12px;
  }

  /* Background interaction while sidebar is open */
  .project-sidebar:not(.collapsed)+.chat-main {
    filter: brightness(0.82);
    pointer-events: none;
  }

  /* Empty states */
  .empty-project-chat-state {
    gap: 0.5rem;
    padding: 1.25rem;
  }

  .empty-project-chat-icon {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }

  .empty-project-chat-state h3 {
    font-size: 13px;
  }

  .empty-project-chat-state p {
    font-size: 12px;
  }

  .not-found-icon {
    width: 38px;
    height: 38px;
    font-size: 1.4rem;
  }

  .not-found-state h1 {
    font-size: 1.05rem;
  }

  .not-found-state p {
    font-size: 12px;
  }
}
</style>
