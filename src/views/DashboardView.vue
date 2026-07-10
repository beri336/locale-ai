<!-- src/views/DashboardView.vue -->

<template>
  <div class="dashboard-view">
    <header class="page-header">
      <header class="page-header">
        <h1>
          <span class="nav-icon"><IconHome /></span> Dashboard
        </h1>
      </header>
    </header>

    <div class="quick-actions">
      <button class="btn-primary" @click="$router.push('/chat')">
        + New Chat
      </button>
      <button class="btn-primary" @click="$router.push('/projects')">
        + New Project
      </button>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-value">{{ totalChats }}</span>
        <span class="stat-label">{{
          totalChats === 1 ? "Chat" : "Chats"
        }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ totalProjects }}</span>
        <span class="stat-label">{{
          totalProjects === 1 ? "Project" : "Projects"
        }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ totalMessages }}</span>
        <span class="stat-label"
          >{{ totalMessages === 1 ? "Message" : "Messages" }} in Total</span
        >
      </div>
      <div class="stat-card">
        <span
          class="stat-value"
          :class="{ online: ollamaOnline, offline: !ollamaOnline }"
        >
          {{ ollamaOnline ? "Online" : "Offline" }}
        </span>
        <span class="stat-label">Ollama Server</span>
      </div>
    </div>

    <button class="link-btn" @click="openSearchModal">
      Search all your Chats
    </button>

    <section class="dashboard-section">
      <div class="section-header">
        <h2>Recent Chats</h2>
        <button class="link-btn" @click="$router.push('/chat')">
          See all Chats
        </button>
      </div>

      <div v-if="recentChats.length" class="recent-chat-list">
        <div
          v-for="chat in recentChats"
          :key="chat.id"
          class="recent-chat-item"
          @click="goToChat(chat)"
        >
          <div class="recent-chat-info">
            <span class="recent-chat-title">{{ chat.title }}</span>
            <span class="recent-chat-meta">
              {{ chat.model || "no model" }} · {{ formatDate(chat.createdAt) }}
            </span>
          </div>
          <span class="source-badge" :class="chat.source">
            {{ chat.source === "project" ? chat.projectName : "Chat" }}
          </span>
        </div>
      </div>

      <div v-else class="empty-state">
        <p>No chats yet. Start your first conversation.</p>
      </div>
    </section>

    <section class="dashboard-section">
      <div class="section-header">
        <h2>Active Projects</h2>
        <button class="link-btn" @click="$router.push('/projects')">
          See all Projects
        </button>
      </div>

      <div v-if="recentProjects.length" class="project-grid-compact">
        <div
          v-for="project in recentProjects"
          :key="project.id"
          class="project-card-compact"
          @click="$router.push(`/projects/${project.id}`)"
        >
          <h3>{{ project.name }}</h3>
          <div class="project-tags" v-if="project.tags.length">
            <span
              v-for="tag in project.tags.slice(0, 3)"
              :key="tag"
              class="tag-chip"
              >{{ tag }}</span
            >
          </div>
          <span class="project-chat-count"
            >{{ project.chats.length }} chat{{
              project.chats.length === 1 ? "" : "s"
            }}</span
          >
        </div>
      </div>

      <div v-else class="empty-state">
        <p>No projects yet. Create one to organize your chats.</p>
      </div>
    </section>

    <section class="dashboard-section">
      <div class="section-header">
        <h2>Model Status</h2>
        <button class="link-btn" @click="$router.push('/models')">
          Manage
        </button>
      </div>

      <div v-if="modelNames.length" class="model-list">
        <div v-for="name in modelNames" :key="name" class="model-item">
          <span
            class="model-dot"
            :class="{ running: runningModels.includes(name) }"
          ></span>
          <span>{{ name }}</span>
          <span class="model-status-label">{{
            runningModels.includes(name) ? "Running" : "Idle"
          }}</span>
        </div>
      </div>

      <div v-else class="empty-state">
        <p>
          {{
            ollamaOnline
              ? "No models installed."
              : "Ollama server is not reachable."
          }}
        </p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useOllamaStore } from "@/stores/useOllamaStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { useSearchModal } from "@/composables/useSearchModal";
import { searchAllChats } from "@/composables/useChatSearch";
import IconHome from "@/components/icons/IconHome.vue";

const router = useRouter();
const ollama = useOllamaStore();
const projectsStore = useProjectsStore();
const { openSearchModal } = useSearchModal();

const modelNames = ref([]);
const ollamaOnline = ref(false);
const allChatsData = ref([]);

const runningModels = ref([]);

const recentChats = computed(() => allChatsData.value.slice(0, 5));

const recentProjects = computed(() =>
  [...projectsStore.getAllProjects()]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4),
);

const totalChats = computed(() => allChatsData.value.length);
const totalProjects = computed(() => projectsStore.getAllProjects().length);

const totalMessages = computed(() =>
  allChatsData.value.reduce(
    (sum, chat) => sum + (chat.messages?.length || 0),
    0,
  ),
);

function goToChat(chat) {
  if (chat.source === "project") {
    router.push(`/projects/${chat.projectId}`);
  } else {
    router.push("/chat");
  }
}

function formatDate(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString("de-DE", {
    dateStyle: "medium",
  });
}

let pollInterval = null;

onMounted(async () => {
  allChatsData.value = searchAllChats("");

  try {
    modelNames.value = await ollama.getListOfModelsName();
    ollamaOnline.value = true;
    runningModels.value = await ollama.refreshRunningModelNames();
  } catch (error) {
    console.error("Ollama server not reachable:", error);
    ollamaOnline.value = false;
  }
  pollInterval = setInterval(async () => {
    if (ollamaOnline.value) {
      runningModels.value = await ollama.refreshRunningModelNames();
    }
  }, 5000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
</script>

<style scoped>
.dashboard-view {
  height: 100%;
  overflow-y: auto;
  padding: var(--space-8) var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.quick-actions {
  display: flex;
  gap: var(--space-3);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-3);
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.stat-value {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text);
}

.stat-value.online {
  color: var(--color-success, #22c55e);
}

.stat-value.offline {
  color: var(--color-error);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.dashboard-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-header h2 {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-text);
}

.link-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--text-xs);
  cursor: pointer;
}

.link-btn:hover {
  text-decoration: underline;
}

.recent-chat-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.recent-chat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.15s ease;
}

.recent-chat-item:hover {
  background: var(--color-surface-2);
}

.recent-chat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.recent-chat-title {
  font-size: var(--text-sm);
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-chat-meta {
  font-size: 11px;
  color: var(--color-text-faint);
}

.source-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
  margin-left: var(--space-3);
}

.source-badge.global {
  background: var(--color-surface-2);
  color: var(--color-text-muted);
}

.source-badge.project {
  background: var(--color-primary);
  color: white;
}

.project-grid-compact {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-3);
}

.project-card-compact {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  cursor: pointer;
  transition:
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.project-card-compact:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.project-card-compact h3 {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
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

.project-chat-count {
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}

.model-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.model-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-text);
}

.model-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-error);
  flex-shrink: 0;
  transition: background 0.2s ease;
}

.model-dot.running {
  background: var(--color-success, #22c55e);
}

.model-status-label {
  font-size: 11px;
  color: var(--color-text-faint);
  margin-left: auto;
}

.empty-state {
  padding: var(--space-6) 0;
  text-align: center;
  color: var(--color-text-faint);
  font-size: var(--text-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
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

/* Page header styling */
.page-header h1 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* Nav icon SVG styling */
.nav-icon svg {
  width: 20px;
  height: 20px;
  display: block;
}
</style>
