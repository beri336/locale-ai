<!-- src/components/dashboard/Dashboard.vue -->

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
          @click="router.push({ path: '/chat', query: { new: 'true' } })"
        >
          <span aria-hidden="true">+</span>
          New chat
        </button>
      </div>
    </header>

    <section class="dashboard-section weather-section">
      <div class="section-header">
        <div>
          <p class="section-kicker">Local conditions</p>
          <h2>Weather</h2>
        </div>

        <button
          class="link-btn"
          type="button"
          :disabled="isWeatherLoading"
          @click="fetchWeather(settingsStore.weatherCity)"
        >
          Refresh
          <span aria-hidden="true">↻</span>
        </button>
      </div>

      <article v-if="weather" class="weather-card">
        <div class="weather-main">
          <span class="weather-icon" aria-hidden="true">{{
            weather.icon
          }}</span>

          <div>
            <p class="weather-city">
              {{ weather.city }}, {{ weather.country }}
            </p>
            <p class="weather-condition">{{ weather.label }}</p>
          </div>

          <strong class="weather-temperature"
            >{{ weather.temperature }}°</strong
          >
        </div>

        <div class="weather-details">
          <span>Feels like {{ weather.apparentTemperature }}°</span>
          <span>Wind {{ weather.windSpeed }} km/h</span>
          <span>Updated {{ formatWeatherTime(weather.updatedAt) }}</span>
        </div>
      </article>

      <div v-else class="inline-empty-state">
        <div class="inline-empty-icon" aria-hidden="true">
          {{ isWeatherLoading ? "…" : "☁" }}
        </div>

        <div>
          <h3>
            {{ isWeatherLoading ? "Loading weather…" : "Weather unavailable" }}
          </h3>
          <p>
            {{
              weatherError ||
              `Could not load the weather for ${settingsStore.weatherCity}.`
            }}
          </p>
        </div>
      </div>
    </section>

    <section class="overview-grid" aria-label="Workspace overview">
      <article class="stat-card">
        <div class="stat-card-header">
          <span class="stat-label">All chats</span>
          <IconChat
            class="stat-icon"
            :size="20"
            :stroke-width="2"
            aria-hidden="true"
          />
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
          <IconFolder
            class="stat-icon"
            :size="20"
            :stroke-width="2"
            aria-hidden="true"
          />
        </div>

        <strong class="stat-value">{{ totalProjects }}</strong>
        <span class="stat-description">
          {{ totalProjects === 1 ? "Workspace created" : "Workspaces created" }}
        </span>
      </article>

      <article class="stat-card">
        <div class="stat-card-header">
          <span class="stat-label">Messages</span>
          <IconMessages
            class="stat-icon"
            :size="20"
            :stroke-width="2"
            aria-hidden="true"
          />
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

        <button
          class="link-btn"
          type="button"
          @click="router.push({ path: '/chat', query: { new: 'true' } })"
        >
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
            <component
              :is="chat.source === 'project' ? IconFolder : IconMessages"
              :size="18"
              :stroke-width="2"
            />
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
        <div class="inline-empty-icon" aria-hidden="true">
          <IconMessages :size="40" :stroke-width="1.5" />
        </div>
        <div>
          <h3>No conversations yet</h3>
          <p>Start a new chat to begin working with your local models.</p>
        </div>
        <button
          class="btn-primary"
          type="button"
          @click="router.push({ path: '/chat', query: { new: 'true' } })"
        >
          <IconPlus :size="18" :stroke-width="2" aria-hidden="true" />
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
        <div class="inline-empty-icon" aria-hidden="true">
          <IconFolder :size="40" :stroke-width="1.5" />
        </div>
        <div>
          <h3>No projects yet</h3>
          <p>Group related chats, prompts and experiments in one workspace.</p>
        </div>
        <button
          class="btn-secondary"
          type="button"
          @click="$router.push('/projects')"
        >
          <IconPlus :size="18" :stroke-width="2" aria-hidden="true" />
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
import { useSettingsStore } from "@/stores/settingsStore";
import { useWeather } from "@/composables/useWeather";
import IconChat from "@/components/icons/IconChat.vue";
import IconFolder from "@/components/icons/IconFolder.vue";
import IconMessages from "@/components/icons/IconMessages.vue";
import IconPlus from "@/components/icons/IconPlus.vue";

const router = useRouter();
const ollama = useOllamaStore();
const projectsStore = useProjectsStore();
const { openSearchModal } = useSearchModal();

const settingsStore = useSettingsStore();
const {
  weather,
  isLoading: isWeatherLoading,
  error: weatherError,
  fetchWeather,
} = useWeather();

function formatWeatherTime(isoString) {
  if (!isoString) return "";

  return new Date(isoString).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  allChatsData.value.reduce((sum, entry) => {
    const chat = entry.chat ?? entry;

    return sum + (chat.messages?.length ?? 0);
  }, 0),
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

// Centralized loading function, reusable for both Mount and manual refresh
async function loadDashboardData() {
  allChatsData.value = searchAllChats("");

  try {
    modelNames.value = await ollama.getListOfModelsName();
    ollamaOnline.value = await ollama.checkConnection();
    runningModels.value = await ollama.refreshRunningModelNames();
  } catch (error) {
    console.error("Ollama server not reachable:", error);
    ollamaOnline.value = false;
  }
}

onMounted(async () => {
  fetchWeather(settingsStore.weatherCity);
  await loadDashboardData();

  allChatsData.value = searchAllChats("");

  pollInterval = setInterval(async () => {
    if (ollamaOnline.value) {
      runningModels.value = await ollama.refreshRunningModelNames();
    }
  }, 5000);
});

// Called after data changes (e.g., settings update) -
// updates only the reactive refs; NO window.location.reload()
async function reloadAfterDataChange() {
  await loadDashboardData();
}

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

/* Weather section */
.weather-section {
  max-width: 1100px;
}

.weather-section .link-btn:disabled {
  color: var(--color-text-faint);
  cursor: wait;
  opacity: 0.7;
  text-decoration: none;
}

.weather-card {
  display: grid;
  gap: 1rem;
  min-width: 0;
  padding: 1.1rem 1.15rem;
  overflow: hidden;
  background:
    radial-gradient(
      circle at 100% 0,
      color-mix(in srgb, var(--color-primary) 12%, transparent),
      transparent 42%
    ),
    var(--color-surface);
  border: 1px solid
    color-mix(in srgb, var(--color-primary) 22%, var(--color-border));
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.025);
}

.weather-main {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.8rem;
}

.weather-icon {
  display: grid;
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  place-items: center;
  font-size: 1.8rem;
  line-height: 1;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border: 1px solid
    color-mix(in srgb, var(--color-primary) 16%, var(--color-border));
  border-radius: 14px;
}

.weather-city,
.weather-condition {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weather-city {
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 650;
  letter-spacing: -0.01em;
}

.weather-condition {
  margin-top: 0.18rem;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.weather-temperature {
  color: var(--color-text);
  font-size: clamp(2rem, 5vw, 2.65rem);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  letter-spacing: -0.06em;
  line-height: 0.9;
}

.weather-details {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
  padding-top: 0.85rem;
  color: var(--color-text-muted);
  font-size: 10px;
  border-top: 1px solid var(--color-border);
}

.weather-details span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weather-details span:nth-child(2) {
  text-align: center;
}

.weather-details span:last-child {
  text-align: right;
  color: var(--color-text-faint);
}

@media (max-width: 620px) {
  .weather-card {
    gap: 0.6rem;
    padding: 0.75rem;
    border-radius: var(--radius-md);
  }

  .weather-icon {
    width: 34px;
    height: 34px;
    font-size: 1.25rem;
    border-radius: 10px;
  }

  .weather-city {
    font-size: 12px;
  }

  .weather-condition {
    font-size: 11px;
  }

  .weather-temperature {
    font-size: 1.7rem;
  }

  .weather-details {
    grid-template-columns: 1fr 1fr;
    gap: 0.4rem 0.6rem;
    padding-top: 0.6rem;
    font-size: 9px;
  }

  .weather-details span:last-child {
    grid-column: 1 / -1;
    padding-top: 0.4rem;
    text-align: left;
    border-top: 1px solid var(--color-border);
  }
}

@media (max-width: 900px) {
  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .dashboard-view {
    padding: 0.85rem 0.75rem 1.5rem;
  }

  .page-header {
    flex-direction: column;
    gap: 0.85rem;
    margin-bottom: 1rem;
  }

  .page-heading {
    gap: 0.6rem;
  }

  .header-icon {
    width: 34px;
    height: 34px;
    border-radius: 11px;
  }

  .header-icon :deep(svg) {
    width: 18px;
    height: 18px;
  }

  .eyebrow,
  .section-kicker {
    font-size: 0.62rem;
  }

  .page-header h1 {
    font-size: 1.4rem;
  }

  .header-description {
    margin-top: 0.3rem;
    font-size: 12px;
  }

  .header-actions {
    width: 100%;
    gap: 0.4rem;
    margin-top: 0;
  }

  .header-actions .btn-primary,
  .header-actions .btn-secondary {
    flex: 1;
    min-height: 32px;
    padding: 0.4rem 0.6rem;
    font-size: 11px;
  }

  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem;
    margin-bottom: 1.25rem;
  }

  .stat-card {
    padding: 0.6rem;
    border-radius: var(--radius-md);
  }

  .stat-label {
    font-size: 0.58rem;
  }

  .stat-icon {
    width: 18px;
    height: 18px;
    border-radius: 6px;
  }

  .stat-icon :deep(svg) {
    width: 12px;
    height: 12px;
  }

  .stat-value {
    margin-top: 0.5rem;
    font-size: 1.25rem;
  }

  .stat-description {
    display: none;
  }

  .dashboard-section {
    margin-bottom: 1.25rem;
  }

  .section-header {
    align-items: flex-end;
    margin-bottom: 0.55rem;
  }

  .section-header h2 {
    font-size: 0.9rem;
  }

  .link-btn {
    font-size: 11px;
  }

  .recent-chat-item {
    gap: 0.55rem;
    padding: 0.55rem 0.65rem;
  }

  .recent-chat-icon {
    width: 24px;
    height: 24px;
    border-radius: 7px;
  }

  .recent-chat-icon :deep(svg) {
    width: 14px;
    height: 14px;
  }

  .recent-chat-title {
    font-size: 12px;
  }

  .recent-chat-meta {
    font-size: 9px;
  }

  .source-badge {
    display: none;
  }

  .project-grid-compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem;
  }

  .project-card-compact,
  .new-project-card {
    min-height: 105px;
    padding: 0.6rem;
    border-radius: var(--radius-md);
  }

  .project-icon,
  .new-project-icon {
    width: 24px;
    height: 24px;
    font-size: 0.9rem;
    border-radius: 7px;
  }

  .project-arrow {
    width: 19px;
    height: 19px;
    font-size: 0.65rem;
  }

  .project-name {
    margin-top: 0.5rem;
    font-size: 12px;
  }

  .tag-chip {
    padding: 0.15rem 0.35rem;
    font-size: 9px;
  }

  .project-chat-count {
    font-size: 9px;
  }

  .new-project-card span:last-child {
    font-size: 11px;
  }

  .model-list {
    grid-template-columns: 1fr;
    gap: 0.45rem;
  }

  .model-item {
    padding: 0.55rem 0.65rem;
  }

  .model-name {
    font-size: 10px;
  }

  .model-status-label {
    font-size: 9px;
  }

  .inline-empty-state {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 0.6rem;
    min-height: 0;
    padding: 0.75rem;
  }

  .inline-empty-icon {
    width: 28px;
    height: 28px;
    font-size: 0.9rem;
    border-radius: 8px;
  }

  .inline-empty-state h3 {
    font-size: 12px;
  }

  .inline-empty-state p {
    font-size: 11px;
  }

  .inline-empty-state .btn-primary,
  .inline-empty-state .btn-secondary {
    width: 100%;
    min-height: 34px;
    padding: 0.45rem 0.6rem;
    margin-left: 0;
    font-size: 11px;
  }
}
</style>
