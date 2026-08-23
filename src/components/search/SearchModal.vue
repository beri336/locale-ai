<!-- src/components/search/SearchModal.vue -->

<template>
  <!-- Search Modal -->
  <div v-if="isOpen" class="search-overlay" @click.self="closeSearchModal">
    <!-- Search Modal Content -->
    <div class="search-modal">
      <!-- Search Input Row -->
      <div class="search-input-row">
        <span class="search-icon" aria-hidden="true">
          <IconSearch :size="16" :stroke-width="1.8" />
        </span>

        <!-- Search Input -->
        <input ref="searchInput" :value="searchQuery" class="search-input" placeholder="Search chats…"
          @input="setSearchQuery($event.target.value)" @keydown.esc="closeSearchModal" />

        <kbd class="esc-hint">Esc</kbd>
      </div>

      <!-- Search Results -->
      <div class="search-results">
        <!-- Search Result Items -->
        <div v-for="result in results" :key="`${result.source}-${result.id}`" class="search-result-item"
          @click="goToChat(result)">
          <!-- Search Result Item -->
          <div class="result-content">
            <!-- Result Heading -->
            <div class="result-heading">
              <span class="result-title">{{ result.title }}</span>

              <span v-if="result.model" class="result-model">
                {{ result.model }}
              </span>
            </div>

            <!-- Result Snippet -->
            <p v-if="result.snippet" class="result-snippet">
              <span v-if="result.matchLabel" class="match-label">
                {{ result.matchLabel }}:
              </span>
              {{ result.snippet }}
            </p>
          </div>

          <!-- Result Badge -->
          <span class="result-badge" :class="result.source">
            {{ result.source === "project" ? result.projectName : "Chat" }}
          </span>
        </div>

        <!-- Empty Results -->
        <div v-if="results.length === 0" class="empty-results">
          <p>No chats found.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { watch, nextTick, ref } from "vue";
import { useRouter } from "vue-router";

import { useSearchModal } from "@/composables/useSearchModal";
import { useChatSearch } from "@/composables/useChatSearch";
import IconSearch from "@/components/icons/IconSearch.vue";


const router = useRouter();

const { isOpen, closeSearchModal } = useSearchModal();
const { searchQuery, setSearchQuery, results } = useChatSearch();

const searchInput = ref(null);


// wacthers
watch(isOpen, async (open) => {
  if (open) {
    setSearchQuery("");
    await nextTick();
    searchInput.value?.focus();
  }
});


// functions
function goToChat(result) {
  if (result.source === "project") {
    router.push(`/projects/${result.projectId}?chat=${result.chatId}`);
  } else {
    router.push(`/chat?chat=${result.chatId}`);
  }

  closeSearchModal();
}
</script>

<style scoped>
/* Search overlay */
.search-overlay {
  position: fixed;
  z-index: 200;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
  background: rgb(0 0 0 / 0.5);
}

/* Search modal */
.search-modal {
  display: flex;
  width: 560px;
  max-width: 90vw;
  max-height: 60vh;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.25);
}

/* Search input */
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
  color: var(--color-text);
  font-size: var(--text-md);
  background: transparent;
  border: 0;
  outline: none;
}

.esc-hint {
  flex-shrink: 0;
  padding: 2px 6px;
  color: var(--color-text-faint);
  font-size: 11px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

/* Search results */
.search-results {
  padding: var(--space-2);
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: background 0.15s ease;
}

.search-result-item:hover {
  background: var(--color-surface-2);
}

.result-content {
  min-width: 0;
  flex: 1;
}

.result-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--space-2);
}

.result-title {
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--text-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
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

/* Result source badges */
.result-badge {
  flex-shrink: 0;
  padding: 2px 8px;
  margin-left: var(--space-3);
  font-size: 11px;
  border-radius: var(--radius-full);
}

.result-badge.global {
  color: var(--color-text-muted);
  background: var(--color-surface-2);
}

.result-badge.project {
  color: #fff;
  background: var(--color-primary);
}

/* Empty search state */
.empty-results {
  padding: var(--space-6);
  color: var(--color-text-faint);
  font-size: var(--text-sm);
  text-align: center;
}

/* Touch input sizing */
@media (pointer: coarse) {
  .search-input {
    font-size: 16px;
  }
}

/* Mobile layout */
@media (max-width: 620px) {
  .search-overlay {
    align-items: stretch;
    justify-content: stretch;
    padding-top: 6vh;
  }

  .search-modal {
    width: 100%;
    max-width: none;
    max-height: 88vh;
    margin: 0 0.5rem;
    border-radius: var(--radius-md);
  }

  .search-input-row {
    gap: 0.5rem;
    padding: 0.65rem 0.75rem;
  }

  .search-icon {
    font-size: 14px;
  }

  .esc-hint {
    display: none;
  }

  .search-results {
    padding: 0.35rem;
  }

  .search-result-item {
    gap: 0.5rem;
    padding: 0.55rem 0.6rem;
  }

  .result-title {
    font-size: 12px;
  }

  .result-model,
  .result-snippet {
    font-size: 10px;
  }

  .result-badge {
    padding: 1px 6px;
    margin-left: 0.5rem;
    font-size: 9px;
  }

  .empty-results {
    padding: 1.5rem;
    font-size: 12px;
  }
}
</style>
