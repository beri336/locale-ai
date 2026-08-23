<!-- src/components/archive/Archive.vue -->

<template>
  <main class="archive-view">
    <!-- Page Header -->
    <header class="page-header">
      <!-- Header Icon -->
      <div class="page-heading">
        <div class="header-icon" aria-hidden="true">
          <IconArchive />
        </div>

        <!-- Header Text -->
        <div>
          <p class="eyebrow">Storage</p>
          <h1>Archive</h1>

          <p class="header-description">
            Chats you've archived across all projects and quick chats.
          </p>
        </div>
      </div>
    </header>

    <LocalAiNotice />

    <!-- Archive List -->
    <div v-if="archivedEntries.length" class="archive-list">
      <!-- Archive Item -->
      <div v-for="entry in archivedEntries" :key="`${entry.source}-${entry.chat.id}`" class="archive-item">

        <!-- Archive Item Info -->
        <div class="archive-item-info">
          <span class="archive-item-title">{{ entry.chat.title }}</span>
          <span class="archive-item-meta">
            {{ entry.source === "project" ? entry.project.name : "Quick chat" }}
            · {{ entry.chat.model || "No model" }} ·
            {{ formatDate(entry.chat.createdAt) }}
          </span>
        </div>

        <!-- Archive Item Actions -->
        <div class="archive-item-actions">
          <!-- Unarchive Button -->
          <button class="btn-secondary" type="button" @click="unarchive(entry)">
            Unarchive
          </button>

          <!-- Go to Chat Button -->
          <button class="btn-secondary" type="button" @click="goToChat(entry)">
            {{ entry.source === "project" ? "Open project" : "Open chat" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-state-icon" aria-hidden="true">
        <IconArchive :size="40" :stroke-width="1.5" />
      </div>

      <h2>No archived chats</h2>
      <p>Archived chats from your projects and quick chats will appear here.</p>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";

import { useProjectsStore } from "@/stores/useProjectsStore";
import IconArchive from "@/components/icons/IconArchive.vue";

import LocalAiNotice from "@/components/ui/LocalAiNotice.vue";


const CHAT_STORAGE_KEY = "ollama-chats";

const router = useRouter();
const projectsStore = useProjectsStore();

const globalChats = ref([]);


// computed property
const archivedEntries = computed(() => {
  const projectEntries = projectsStore.getAllArchivedChats().map((entry) => ({
    chat: entry.chat,
    project: entry.project,
    source: "project",
  }));

  const globalEntries = globalChats.value
    .filter((chat) => chat.isArchived)
    .map((chat) => ({
      chat,
      project: null,
      source: "global",
    }));

  return [...projectEntries, ...globalEntries].sort(
    (a, b) =>
      new Date(b.chat.updatedAt ?? b.chat.createdAt) -
      new Date(a.chat.updatedAt ?? a.chat.createdAt),
  );
});


// functions
function loadGlobalChats() {
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    globalChats.value = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load global chats for archive:", error);
    globalChats.value = [];
  }
}

function saveGlobalChats() {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(globalChats.value));
  } catch (error) {
    console.error("Failed to save global chats:", error);
  }
}

function unarchive(entry) {
  if (entry.source === "project") {
    projectsStore.toggleChatArchive(entry.project.id, entry.chat.id);
  } else {
    entry.chat.isArchived = false;
    saveGlobalChats();
  }
}

function goToChat(entry) {
  if (entry.source === "project") {
    router.push(`/projects/${entry.project.id}?chat=${entry.chat.id}`);
  } else {
    router.push(`/chat?chat=${entry.chat.id}`);
  }
}

function formatDate(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString("de-DE", {
    dateStyle: "medium",
  });
}


// mounted lifecycle hook
onMounted(() => {
  loadGlobalChats();
});
</script>

<style scoped>
/* Page layout */
.archive-view {
  display: flex;
  max-width: var(--max-width);
  flex-direction: column;
  gap: 1.5rem;
  padding: clamp(1rem, 3vw, 2rem);
}

/* Page header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  max-width: var(--max-width);
}

.page-heading {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.header-icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 11%, transparent);
  border-radius: 12px;
}

.eyebrow {
  margin: 0 0 0.15rem;
  color: var(--color-text-faint);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.page-heading h1 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-lg);
  font-weight: 650;
  letter-spacing: -0.02em;
}

.header-description {
  margin: 0.35rem 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

/* Archived chat list */
.archive-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.archive-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1.1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.archive-item-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.2rem;
}

.archive-item-title {
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.archive-item-meta {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.archive-item-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 0.5rem;
}

/* Shared action buttons */
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.45rem 0.75rem;
  color: var(--color-text);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition:
    background 0.16s ease,
    border-color 0.16s ease;
}

.btn-secondary:hover {
  background: var(--color-surface-2);
  border-color: color-mix(in srgb,
      var(--color-primary) 35%,
      var(--color-border));
}

/* Empty archive state */
.empty-state {
  display: grid;
  justify-items: center;
  gap: 0.6rem;
  padding: 3rem 1.5rem;
  text-align: center;
}

.empty-state-icon {
  display: grid;
  width: 56px;
  height: 56px;
  place-items: center;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-radius: 16px;
}

.empty-state h2 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-md);
}

.empty-state p {
  max-width: 360px;
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  line-height: 1.55;
}

/* Mobile layout */
@media (max-width: 620px) {
  .archive-view {
    gap: 1rem;
    padding: 0.85rem 0.75rem 1.5rem;
  }

  .header-icon {
    width: 34px;
    height: 34px;
    border-radius: 11px;
  }

  .eyebrow {
    font-size: 0.6rem;
  }

  .page-heading h1 {
    font-size: 1.4rem;
  }

  .header-description {
    margin-top: 0.3rem;
    font-size: 12px;
  }

  .archive-list {
    gap: 0.5rem;
  }

  .archive-item {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.65rem;
    padding: 0.75rem;
  }

  .archive-item-title {
    font-size: 12px;
  }

  .archive-item-meta {
    font-size: 10px;
    line-height: 1.45;
  }

  .archive-item-actions {
    width: 100%;
    gap: 0.4rem;
  }

  .archive-item-actions .btn-secondary {
    min-height: 32px;
    flex: 1;
    padding: 0.4rem 0.55rem;
    font-size: 11px;
  }

  .empty-state {
    gap: 0.5rem;
    padding: 2rem 1rem;
  }

  .empty-state-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
  }

  .empty-state h2 {
    font-size: 13px;
  }

  .empty-state p {
    font-size: 12px;
  }
}
</style>
