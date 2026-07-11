<!-- src/views/DashboardView.vue -->

<template>
  <main class="dashboard-view">
    <header class="page-header">
      <div class="page-heading">
        <div class="header-icon" aria-hidden="true">
          <IconHome />
        </div>

        <div>
          <p class="eyebrow">Overview</p>
          <h1>Dashboard</h1>
          <p class="header-description">
            Your local workspace for chats, projects and Ollama models.
          </p>
        </div>
      </div>

      <div class="header-actions">
        <button class="btn-secondary" type="button" @click="openSearchModal">
          <span aria-hidden="true">⌕</span>
          Search chats
        </button>

        <button
          class="btn-primary"
          type="button"
          @click="$router.push('/chat')"
        >
          <span aria-hidden="true">+</span>
          New chat
        </button>
      </div>
    </header>

    <section class="overview-grid" aria-label="Workspace overview">
      <article class="stat-card">
        <div class="stat-card-header">
          <span class="stat-label">All chats</span>
          <span class="stat-icon" aria-hidden="true">◌</span>
        </div>

        <strong class="stat-value">{{ totalChats }}</strong>
        <span class="stat-description">
          {{
            totalChats === 1
              ? "Conversation saved locally"
              : "Conversations saved locally"
          }}
        </span>
      </article>

      <article class="stat-card">
        <div class="stat-card-header">
          <span class="stat-label">Projects</span>
          <span class="stat-icon" aria-hidden="true">□</span>
        </div>

        <strong class="stat-value">{{ totalProjects }}</strong>
        <span class="stat-description">
          {{ totalProjects === 1 ? "Workspace created" : "Workspaces created" }}
        </span>
      </article>

      <article class="stat-card">
        <div class="stat-card-header">
          <span class="stat-label">Messages</span>
          <span class="stat-icon" aria-hidden="true">⌁</span>
        </div>

        <strong class="stat-value">{{ totalMessages }}</strong>
        <span class="stat-description">Across all saved conversations</span>
      </article>

      <article
        class="stat-card status-card"
        :class="{ online: ollamaOnline, offline: !ollamaOnline }"
      >
        <div class="stat-card-header">
          <span class="stat-label">Ollama server</span>
          <span class="server-status-dot"></span>
        </div>

        <strong class="stat-value">
          {{ ollamaOnline ? "Online" : "Offline" }}
        </strong>

        <span class="stat-description">
          {{
            ollamaOnline
              ? "Ready for local inference"
              : "Check your connection settings"
          }}
        </span>
      </article>
    </section>

    <section class="dashboard-section recent-section">
      <div class="section-header">
        <div>
          <p class="section-kicker">Continue working</p>
          <h2>Recent chats</h2>
        </div>

        <button class="link-btn" type="button" @click="$router.push('/chat')">
          View all <span aria-hidden="true">→</span>
        </button>
      </div>

      <div v-if="recentChats.length" class="recent-chat-list">
        <button
          v-for="chat in recentChats"
          :key="`${chat.source}-${chat.id}`"
          class="recent-chat-item"
          type="button"
          @click="goToChat(chat)"
        >
          <span class="recent-chat-icon" aria-hidden="true">
            {{ chat.source === "project" ? "□" : "◌" }}
          </span>

          <span class="recent-chat-info">
            <span class="recent-chat-title">{{ chat.title }}</span>
            <span class="recent-chat-meta">
              {{ chat.model || "No model selected" }} ·
              {{ formatDate(chat.createdAt) }}
            </span>
          </span>

          <span class="source-badge" :class="chat.source">
            {{ chat.source === "project" ? chat.projectName : "Quick chat" }}
          </span>

          <span class="row-arrow" aria-hidden="true">→</span>
        </button>
      </div>

      <div v-else class="inline-empty-state">
        <div class="inline-empty-icon" aria-hidden="true">◌</div>
        <div>
          <h3>No conversations yet</h3>
          <p>Start a new chat to begin working with your local models.</p>
        </div>
        <button
          class="btn-primary"
          type="button"
          @click="$router.push('/chat')"
        >
          <span aria-hidden="true">+</span>
          New chat
        </button>
      </div>
    </section>

    <section class="dashboard-section">
      <div class="section-header">
        <div>
          <p class="section-kicker">Organize work</p>
          <h2>Active projects</h2>
        </div>

        <button
          class="link-btn"
          type="button"
          @click="$router.push('/projects')"
        >
          View all <span aria-hidden="true">→</span>
        </button>
      </div>

      <div v-if="recentProjects.length" class="project-grid-compact">
        <button
          v-for="project in recentProjects"
          :key="project.id"
          class="project-card-compact"
          type="button"
          @click="$router.push(`/projects/${project.id}`)"
        >
          <div class="project-card-header">
            <span class="project-icon" aria-hidden="true">□</span>
            <span class="project-arrow" aria-hidden="true">↗</span>
          </div>

          <span class="project-name">{{ project.name }}</span>

          <span v-if="project.tags.length" class="project-tags">
            <span
              v-for="tag in project.tags.slice(0, 3)"
              :key="tag"
              class="tag-chip"
            >
              {{ tag }}
            </span>
          </span>

          <span class="project-chat-count">
            <span aria-hidden="true">◌</span>
            {{ project.chats.length }}
            {{ project.chats.length === 1 ? "chat" : "chats" }}
          </span>
        </button>

        <button
          class="new-project-card"
          type="button"
          @click="$router.push('/projects')"
        >
          <span class="new-project-icon" aria-hidden="true">+</span>
          <span>Create project</span>
        </button>
      </div>

      <div v-else class="inline-empty-state">
        <div class="inline-empty-icon" aria-hidden="true">□</div>
        <div>
          <h3>No projects yet</h3>
          <p>Group related chats, prompts and experiments in one workspace.</p>
        </div>
        <button
          class="btn-secondary"
          type="button"
          @click="$router.push('/projects')"
        >
          <span aria-hidden="true">+</span>
          Create project
        </button>
      </div>
    </section>

    <section class="dashboard-section model-section">
      <div class="section-header">
        <div>
          <p class="section-kicker">Local inference</p>
          <h2>Model status</h2>
        </div>

        <button class="link-btn" type="button" @click="$router.push('/models')">
          Manage <span aria-hidden="true">→</span>
        </button>
      </div>

      <div v-if="modelNames.length" class="model-list">
        <div v-for="name in modelNames" :key="name" class="model-item">
          <span
            class="model-dot"
            :class="{ running: runningModels.includes(name) }"
          ></span>

          <span class="model-name">{{ name }}</span>

          <span
            class="model-status-label"
            :class="{ running: runningModels.includes(name) }"
          >
            {{ runningModels.includes(name) ? "Running" : "Idle" }}
          </span>
        </div>
      </div>

      <div v-else class="inline-empty-state">
        <div
          class="inline-empty-icon"
          :class="{ offline: !ollamaOnline }"
          aria-hidden="true"
        >
          {{ ollamaOnline ? "◌" : "!" }}
        </div>

        <div>
          <h3>
            {{
              ollamaOnline ? "No models installed" : "Ollama is not reachable"
            }}
          </h3>
          <p>
            {{
              ollamaOnline
                ? "Download a model to start your first local conversation."
                : "Check the Ollama API address and connection in Settings."
            }}
          </p>
        </div>

        <button
          class="btn-secondary"
          type="button"
          @click="$router.push(ollamaOnline ? '/models' : '/settings')"
        >
          {{ ollamaOnline ? "Manage models" : "Open settings" }}
        </button>
      </div>
    </section>
  </main>
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
}

.page-heading {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.header-icon {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 22%, transparent);
  border-radius: 14px;
}

.header-icon :deep(svg) {
  width: 22px;
  height: 22px;
}

.eyebrow,
.section-kicker {
  margin: 0 0 0.25rem;
  color: var(--color-text-faint);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 0;
  color: var(--color-text);
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.header-description {
  margin: 0.5rem 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  line-height: 1.55;
}

.header-actions {
  display: flex;
  flex-shrink: 0;
  gap: 0.6rem;
  margin-top: 0.2rem;
}

.btn-primary,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 38px;
  padding: 0.55rem 0.85rem;
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
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
  border-color: color-mix(
    in srgb,
    var(--color-primary) 35%,
    var(--color-border)
  );
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  max-width: 1100px;
  gap: 0.85rem;
  margin-bottom: 2.25rem;
}

.stat-card {
  display: grid;
  min-width: 0;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.025);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.stat-card:hover {
  border-color: color-mix(
    in srgb,
    var(--color-primary) 28%,
    var(--color-border)
  );
  box-shadow: 0 10px 24px rgb(0 0 0 / 0.045);
  transform: translateY(-1px);
}

.stat-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.stat-label {
  color: var(--color-text-faint);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.stat-icon {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  color: var(--color-primary);
  font-size: 1rem;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-radius: 8px;
}

.stat-value {
  margin-top: 0.85rem;
  overflow: hidden;
  color: var(--color-text);
  font-size: clamp(1.45rem, 3vw, 1.8rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat-description {
  margin-top: 0.45rem;
  color: var(--color-text-muted);
  font-size: 10px;
  line-height: 1.45;
}

.server-status-dot {
  width: 8px;
  height: 8px;
  background: var(--color-error);
  border-radius: 50%;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-error) 13%, transparent);
}

.status-card.online .server-status-dot {
  background: var(--color-success, #22c55e);
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--color-success, #22c55e) 13%, transparent);
}

.status-card.online .stat-value {
  color: var(--color-success, #22c55e);
}

.status-card.offline .stat-value {
  color: var(--color-error);
}

.dashboard-section {
  max-width: 1100px;
  margin-bottom: 2.25rem;
}

.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.85rem;
}

.section-header h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.05rem;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0;
  color: var(--color-primary);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.link-btn:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.recent-chat-list {
  display: grid;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.025);
}

.recent-chat-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-width: 0;
  padding: 0.8rem 0.95rem;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--color-border);
  transition: background 0.16s ease;
}

.recent-chat-item:last-child {
  border-bottom: 0;
}

.recent-chat-item:hover {
  background: var(--color-surface-2);
}

.recent-chat-item:focus-visible {
  position: relative;
  z-index: 1;
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.recent-chat-icon {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--color-primary);
  font-size: 1.05rem;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-radius: 9px;
}

.recent-chat-info {
  display: grid;
  min-width: 0;
  gap: 0.18rem;
}

.recent-chat-title {
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-chat-meta {
  overflow: hidden;
  color: var(--color-text-faint);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-badge {
  max-width: 180px;
  padding: 0.25rem 0.5rem;
  margin-left: auto;
  overflow: hidden;
  font-size: 10px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
}

.source-badge.global {
  color: var(--color-text-muted);
  background: var(--color-surface-2);
}

.source-badge.project {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-color: color-mix(
    in srgb,
    var(--color-primary) 24%,
    var(--color-border)
  );
}

.row-arrow {
  flex: 0 0 auto;
  color: var(--color-text-faint);
  transition:
    color 0.16s ease,
    transform 0.16s ease;
}

.recent-chat-item:hover .row-arrow {
  color: var(--color-primary);
  transform: translateX(2px);
}

.project-grid-compact {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 0.85rem;
}

.project-card-compact,
.new-project-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-height: 142px;
  padding: 1rem;
  overflow: hidden;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.025);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.project-card-compact:hover,
.new-project-card:hover {
  border-color: color-mix(
    in srgb,
    var(--color-primary) 30%,
    var(--color-border)
  );
  box-shadow: 0 10px 24px rgb(0 0 0 / 0.055);
  transform: translateY(-2px);
}

.project-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.project-icon,
.new-project-icon {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  color: var(--color-primary);
  font-size: 1.1rem;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-radius: 9px;
}

.project-arrow {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  color: var(--color-text-faint);
  font-size: 0.8rem;
  background: var(--color-surface-2);
  border-radius: 50%;
  transition:
    color 0.16s ease,
    transform 0.16s ease;
}

.project-card-compact:hover .project-arrow {
  color: var(--color-primary);
  transform: translate(1px, -1px);
}

.project-name {
  margin-top: 0.85rem;
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  min-height: 19px;
  margin-top: 0.5rem;
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

.project-chat-count {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: auto;
  color: var(--color-text-faint);
  font-size: 10px;
}

.project-chat-count span {
  color: var(--color-primary);
}

.new-project-card {
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  color: var(--color-text-muted);
  border-style: dashed;
  box-shadow: none;
}

.new-project-card:hover {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 4%, var(--color-surface));
}

.new-project-card span:last-child {
  font-size: var(--text-xs);
  font-weight: 600;
}

.model-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.65rem;
}

.model-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  padding: 0.75rem 0.85rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.model-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  background: var(--color-text-faint);
  border-radius: 50%;
}

.model-dot.running {
  background: var(--color-success, #22c55e);
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--color-success, #22c55e) 13%, transparent);
}

.model-name {
  overflow: hidden;
  color: var(--color-text);
  font-family: "Fira Code", ui-monospace, monospace;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-status-label {
  padding: 0.2rem 0.4rem;
  margin-left: auto;
  color: var(--color-text-faint);
  font-size: 10px;
  font-weight: 600;
  background: var(--color-surface-2);
  border-radius: var(--radius-full);
}

.model-status-label.running {
  color: var(--color-success, #22c55e);
  background: color-mix(
    in srgb,
    var(--color-success, #22c55e) 10%,
    transparent
  );
}

.inline-empty-state {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-height: 92px;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
}

.inline-empty-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--color-primary);
  font-size: 1.1rem;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-radius: 10px;
}

.inline-empty-icon.offline {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}

.inline-empty-state > div:nth-child(2) {
  min-width: 0;
}

.inline-empty-state h3 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 650;
}

.inline-empty-state p {
  margin: 0.2rem 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  line-height: 1.45;
}

.inline-empty-state .btn-primary,
.inline-empty-state .btn-secondary {
  flex: 0 0 auto;
  margin-left: auto;
}

@media (max-width: 900px) {
  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .dashboard-view {
    padding: 1.25rem 1rem 2rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .page-heading {
    gap: 0.75rem;
  }

  .header-icon {
    width: 40px;
    height: 40px;
  }

  .header-actions {
    width: 100%;
    margin-top: 0;
  }

  .header-actions .btn-primary,
  .header-actions .btn-secondary {
    flex: 1;
  }

  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
    margin-bottom: 1.75rem;
  }

  .stat-card {
    padding: 0.85rem;
  }

  .stat-description {
    display: none;
  }

  .dashboard-section {
    margin-bottom: 1.75rem;
  }

  .section-header {
    align-items: flex-end;
  }

  .source-badge {
    display: none;
  }

  .project-grid-compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
  }

  .project-card-compact,
  .new-project-card {
    min-height: 130px;
    padding: 0.85rem;
  }

  .inline-empty-state {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .inline-empty-state .btn-primary,
  .inline-empty-state .btn-secondary {
    width: 100%;
    margin-left: 0;
  }

  .model-list {
    grid-template-columns: 1fr;
  }
}
</style>
