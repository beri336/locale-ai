<!-- src/components/search/SearchModal.vue -->

<template>
  <div v-if="isOpen" class="search-overlay" @click.self="closeSearchModal">
    <div class="search-modal">
      <div class="search-input-row">
        <span class="search-icon" aria-hidden="true">
          <IconSearch :size="16" :stroke-width="1.8" />
        </span>
        <input
          ref="searchInput"
          v-model="query"
          class="search-input"
          placeholder="Search chats…"
          @keydown.esc="closeSearchModal"
        />
        <kbd class="esc-hint">Esc</kbd>
      </div>

      <div class="search-results">
        <div
          v-for="result in results"
          :key="`${result.source}-${result.id}`"
          class="search-result-item"
          @click="goToChat(result)"
        >
          <div class="result-content">
            <div class="result-heading">
              <span class="result-title">{{ result.title }}</span>

              <span v-if="result.model" class="result-model">
                {{ result.model }}
              </span>
            </div>

            <p v-if="result.snippet" class="result-snippet">
              <span v-if="result.matchLabel" class="match-label">
                {{ result.matchLabel }}:
              </span>
              {{ result.snippet }}
            </p>
          </div>

          <span class="result-badge" :class="result.source">
            {{ result.source === "project" ? result.projectName : "Chat" }}
          </span>
        </div>

        <div v-if="results.length === 0" class="empty-results">
          <p>No chats found.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useSearchModal } from "@/composables/useSearchModal";
import { searchAllChats } from "@/composables/useChatSearch";
import { IconSearch } from "@tabler/icons-vue";

const router = useRouter();
const { isOpen, openSearchModal, closeSearchModal } = useSearchModal();

const query = ref("");
const results = ref([]);
const searchInput = ref(null);

watch(query, (value) => {
  results.value = searchAllChats(value).slice(0, 20);
});

watch(isOpen, async (open) => {
  if (open) {
    query.value = "";
    results.value = searchAllChats("").slice(0, 20);
    await nextTick();
    searchInput.value?.focus();
  }
});

function goToChat(result) {
  if (result.source === "project") {
    router.push(`/projects/${result.projectId}?chat=${result.id}`);
  } else {
    router.push(`/chat?chat=${result.id}`);
  }

  closeSearchModal();
}
function handleKeydown(event) {
  const key = event.key.toLowerCase();

  if ((event.metaKey || event.ctrlKey) && key === "k") {
    event.preventDefault();
    openSearchModal();
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<style scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
  z-index: 200;
}

.search-modal {
  width: 560px;
  max-width: 90vw;
  max-height: 60vh;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
}

.search-input-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.search-icon {
  flex-shrink: 0;
  font-size: var(--text-lg);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--text-md);
  color: var(--color-text);
}

.esc-hint {
  font-size: 11px;
  color: var(--color-text-faint);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 2px 6px;
  flex-shrink: 0;
}

.search-results {
  overflow-y: auto;
  padding: var(--space-2);
}

.search-result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.15s ease;
}

.search-result-item:hover {
  background: var(--color-surface-2);
}

.result-title {
  font-size: var(--text-sm);
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
  margin-left: var(--space-3);
}

.result-badge.global {
  background: var(--color-surface-2);
  color: var(--color-text-muted);
}

.result-badge.project {
  background: var(--color-primary);
  color: white;
}

.empty-results {
  padding: var(--space-6);
  text-align: center;
  color: var(--color-text-faint);
  font-size: var(--text-sm);
}

.search-result-item {
  gap: var(--space-3);
}

.result-content {
  min-width: 0;
  flex: 1;
}

.result-heading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.result-model {
  flex-shrink: 0;
  color: var(--color-text-faint);
  font-size: var(--text-xs);
}

.result-snippet {
  margin: var(--space-1) 0 0;
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.match-label {
  color: var(--color-text-faint);
}
</style>
