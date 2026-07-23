<!-- src/views/LmStudioModelsView.vue -->

<template>
  <div class="models-view">
    <header class="page-header">
      <div class="page-heading">
        <div class="header-icon" aria-hidden="true">
          <IconLmStudio />
        </div>
        <div>
          <p class="eyebrow">Local inference</p>
          <h1>LM Studio Models</h1>
          <p class="header-description">
            Manage models served by your local LM Studio instance
          </p>
        </div>
      </div>

      <div class="header-status">
        <span class="status-dot" :class="{ online: lmstudio.isOnline }"></span>
        <span>{{ lmstudio.isOnline ? "Online" : "Offline" }}</span>
        <button
          class="btn-ghost small"
          type="button"
          :disabled="isRefreshing"
          @click="handleRefresh"
        >
          <IconRefresh :size="14" :stroke-width="1.8" />
          {{ isRefreshing ? "Refreshing…" : "Refresh" }}
        </button>
      </div>
    </header>

    <div class="models-content">
      <div v-if="!lmstudio.isOnline" class="offline-banner" role="alert">
        <IconAlertTriangle :size="18" :stroke-width="1.8" />
        <div>
          <strong>LM Studio is not reachable</strong>
          <p>
            Make sure LM Studio is running with the local server enabled, and
            that
            <code>{{ lmstudio.getBaseUrl() }}</code> is correct in
            <RouterLink to="/settings">Settings</RouterLink>.
          </p>
        </div>
      </div>

      <section class="card">
        <div class="card-header-row">
          <h2>Installed Models</h2>
          <span class="count-badge">In Total {{ lmstudio.models.length }}</span>
        </div>

        <div class="models-toolbar">
          <input
            v-model="searchQuery"
            class="input search-input"
            type="text"
            placeholder="Search models…"
          />

          <select v-model="statusFilter" class="select filter-select">
            <option value="all">All models</option>
            <option value="loaded">Loaded only</option>
            <option value="not-loaded">Not loaded</option>
          </select>
        </div>

        <div v-if="lmstudio.isLoading" class="empty-state">
          <p>Loading models…</p>
        </div>

        <div v-else-if="filteredModels.length === 0" class="empty-state">
          <IconPackageOff :size="28" :stroke-width="1.5" />
          <p v-if="lmstudio.models.length === 0">
            No models found. Download models directly in the LM Studio app.
          </p>
          <p v-else>No models match your search.</p>
        </div>

        <div v-else class="model-cards">
          <div
            v-for="model in filteredModels"
            :key="model.id"
            class="model-card"
            :class="{ 'is-loaded': model.isLoaded }"
          >
            <div class="model-card-header">
              <span
                class="model-status-dot"
                :class="{ active: model.isLoaded }"
                :title="model.isLoaded ? 'Loaded in memory' : 'Not loaded'"
              ></span>
              <h3 class="model-card-title" :title="model.id">
                {{ model.displayName || model.id }}
              </h3>
            </div>

            <div class="model-meta-row">
              <span v-if="model.quantization" class="model-tag">{{
                model.quantization
              }}</span>
              <span v-if="model.paramsString" class="model-tag">{{
                model.paramsString
              }}</span>
              <span v-if="model.maxContextLength" class="model-tag">
                {{ formatContextLength(model.maxContextLength) }} ctx
              </span>
              <span v-if="model.type" class="model-tag">{{ model.type }}</span>
            </div>

            <div class="model-card-actions">
              <button
                v-if="!model.isLoaded"
                class="btn-ghost small model-action-btn"
                type="button"
                :disabled="pendingModelId === model.id"
                @click="handleLoad(model.id)"
              >
                <IconPlayerPlay :size="14" :stroke-width="1.8" />
                {{ pendingModelId === model.id ? "Loading…" : "Load" }}
              </button>

              <button
                v-else
                class="btn-ghost small model-action-btn"
                type="button"
                :disabled="pendingModelId === model.id"
                @click="handleUnload(model.id)"
              >
                <IconPlayerStop :size="14" :stroke-width="1.8" />
                {{ pendingModelId === model.id ? "Unloading…" : "Unload" }}
              </button>

              <button
                class="btn-primary small model-action-btn"
                type="button"
                :disabled="!model.isLoaded"
                @click="handleSelect(model.id)"
              >
                <IconCheck
                  v-if="lmstudio.selectedModel === model.id"
                  :size="14"
                  :stroke-width="1.8"
                />
                {{
                  lmstudio.selectedModel === model.id ? "Selected" : "Use model"
                }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>Detailed Model Information</h2>
        <div v-if="lmstudio.models.length" class="model-cards">
          <div
            v-for="model in lmstudio.models"
            :key="model.id"
            class="model-card"
          >
            <h3 class="model-card-title">
              {{ model.displayName || model.id }}
            </h3>

            <div class="model-card-row">
              <span class="model-card-key">Publisher</span>
              <span class="model-card-value">{{ model.publisher || "—" }}</span>
            </div>

            <div class="model-card-row">
              <span class="model-card-key">Architecture</span>
              <span class="model-card-value">{{
                model.architecture || "—"
              }}</span>
            </div>

            <div class="model-card-row">
              <span class="model-card-key">Format</span>
              <span class="model-card-value">{{ model.format || "—" }}</span>
            </div>

            <div class="model-card-row">
              <span class="model-card-key">Quantization</span>
              <span class="model-card-value">{{
                model.quantization || "—"
              }}</span>
            </div>

            <div class="model-card-row" v-if="model.paramsString">
              <span class="model-card-key">Parameters</span>
              <span class="model-card-value">{{ model.paramsString }}</span>
            </div>

            <div class="model-card-row">
              <span class="model-card-key">Size</span>
              <span class="model-card-value">{{
                formatBytes(model.sizeBytes)
              }}</span>
            </div>

            <div class="model-card-row">
              <span class="model-card-key">Max Context</span>
              <span class="model-card-value">
                {{ formatContextLength(model.maxContextLength) }}
              </span>
            </div>

            <div class="model-card-row" v-if="model.capabilities">
              <span class="model-card-key">Vision</span>
              <span class="model-card-value">
                {{ model.capabilities.vision ? "Yes" : "No" }}
              </span>
            </div>

            <div class="model-card-row" v-if="model.capabilities">
              <span class="model-card-key">Tool Use</span>
              <span class="model-card-value">
                {{ model.capabilities.trained_for_tool_use ? "Yes" : "No" }}
              </span>
            </div>

            <div class="model-card-row" v-if="model.capabilities?.reasoning">
              <span class="model-card-key">Reasoning</span>
              <span class="model-card-value">
                {{ model.capabilities.reasoning.default }}
              </span>
            </div>

            <div class="model-card-row">
              <span class="model-card-key">Status</span>
              <span class="model-card-value">
                <span
                  class="running-badge"
                  :class="model.isLoaded ? 'running' : 'idle'"
                >
                  {{ model.isLoaded ? "Loaded" : "Idle" }}
                </span>
              </span>
            </div>
          </div>
        </div>
        <p v-else class="empty-state">
          No detailed model information available.
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useLmStudioStore } from "@/stores/useLmStudioStore";
import {
  IconRefresh,
  IconAlertTriangle,
  IconPackageOff,
  IconPlayerPlay,
  IconPlayerStop,
  IconCheck,
} from "@tabler/icons-vue";
import IconLmStudio from "@/components/icons/IconLmStudio.vue";

const lmstudio = useLmStudioStore();

const searchQuery = ref("");
const statusFilter = ref("all");
const isRefreshing = ref(false);
const pendingModelId = ref(null);

let pollInterval = null;

const filteredModels = computed(() => {
  return lmstudio.models.filter((model) => {
    const matchesSearch = (model.displayName || model.id || "")
      .toLowerCase()
      .includes(searchQuery.value.toLowerCase());

    const matchesStatus =
      statusFilter.value === "all" ||
      (statusFilter.value === "loaded" && model.isLoaded) ||
      (statusFilter.value === "not-loaded" && !model.isLoaded);

    return matchesSearch && matchesStatus;
  });
});

function formatContextLength(value) {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(value);
}

async function handleRefresh() {
  isRefreshing.value = true;
  await lmstudio.testConnection();
  if (lmstudio.isOnline) {
    await lmstudio.fetchModels();
  }
  isRefreshing.value = false;
}

async function handleLoad(modelId) {
  pendingModelId.value = modelId;
  try {
    await lmstudio.loadModel(modelId);
  } catch (error) {
    console.error("Failed to load model:", error);
  } finally {
    pendingModelId.value = null;
  }
}

async function handleUnload(modelId) {
  pendingModelId.value = modelId;
  try {
    await lmstudio.unloadModel(modelId);
  } catch (error) {
    console.error("Failed to unload model:", error);
  } finally {
    pendingModelId.value = null;
  }
}

function handleSelect(modelId) {
  lmstudio.setSelectedModel(modelId);
}

function formatBytes(bytes, decimals = 1) {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i]
  );
}

onMounted(async () => {
  await handleRefresh();
  pollInterval = setInterval(async () => {
    if (lmstudio.isOnline) {
      await lmstudio.fetchModels();
    } else {
      await lmstudio.testConnection();
    }
  }, 10000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
</script>

<style scoped>
.models-view {
  height: 100%;
  overflow-y: auto;
  padding: var(--space-8) var(--space-6);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  max-width: 1100px;
  margin-bottom: 2rem;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
}

.header-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 22%, transparent);
  border-radius: 13px;
}

.header-icon :deep(svg) {
  width: 21px;
  height: 21px;
}

.eyebrow {
  margin: 0 0 0.2rem;
  color: var(--color-text-faint);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 0;
  color: var(--color-text);
  font-size: clamp(1.65rem, 3vw, 2.2rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.header-description {
  margin: 0.45rem 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  line-height: 1.5;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.status-dot {
  width: 7px;
  height: 7px;
  background: var(--color-error, #ef4444);
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.online {
  background: #6daa45;
  box-shadow: 0 0 0 3px oklch(from #6daa45 l c h / 0.15);
}

.offline-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.85rem 1rem;
  color: var(--color-warning, #a16207);
  background: color-mix(
    in srgb,
    var(--color-warning, #f59e0b) 12%,
    var(--color-surface)
  );
  border: 1px solid
    color-mix(in srgb, var(--color-warning, #f59e0b) 30%, var(--color-border));
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
}

.offline-banner strong {
  display: block;
  font-size: var(--text-sm);
}

.offline-banner p {
  margin: 0.25rem 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.offline-banner code {
  padding: 0.05rem 0.3rem;
  font-family: "Fira Code", ui-monospace, SFMono-Regular, monospace;
  background: color-mix(in srgb, var(--color-text) 8%, transparent);
  border-radius: var(--radius-sm);
}

.models-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: 1100px;
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

.card h2 {
  font-size: var(--text-sm);
  font-weight: 600;
  margin-bottom: var(--space-3);
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.count-badge {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  background: var(--color-surface-2);
  padding: 2px 10px;
  border-radius: var(--radius-full);
}

.models-toolbar {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}

.input,
.select {
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-text);
  outline: none;
  transition: border-color 0.15s ease;
}

.input:focus,
.select:focus {
  border-color: var(--color-primary);
}

.search-input {
  flex: 1;
  min-width: 200px;
}

.filter-select {
  min-width: 160px;
}

.empty-state {
  display: grid;
  gap: 0.5rem;
  justify-items: center;
  padding: var(--space-8) 0;
  color: var(--color-text-faint);
  font-size: var(--text-sm);
  text-align: center;
}

.model-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-3);
}

.model-card {
  display: grid;
  gap: 0.65rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  transition:
    box-shadow 0.15s ease,
    transform 0.15s ease,
    border-color 0.16s ease;
}

.model-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.model-card.is-loaded {
  border-color: color-mix(in srgb, #6daa45 35%, var(--color-border));
}

.model-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.model-status-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  background: var(--color-text-faint);
  border-radius: 50%;
}

.model-status-dot.active {
  background: #6daa45;
  box-shadow: 0 0 0 3px oklch(from #6daa45 l c h / 0.15);
}

.model-card-title {
  margin: 0;
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.model-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 1px 8px;
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 600;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
}

.model-tag-loaded {
  color: #6daa45;
  background: color-mix(in srgb, #6daa45 12%, var(--color-surface-2));
  border-color: color-mix(in srgb, #6daa45 30%, var(--color-border));
}

.model-card-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.model-action-btn {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
}

.btn-ghost,
.btn-danger {
  padding: 4px var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  background: var(--color-bg);
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.btn-ghost {
  color: var(--color-text-muted);
}

.btn-ghost:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
}

.btn-primary {
  padding: var(--space-2) var(--space-4);
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  white-space: nowrap;
  transition: background 0.15s ease;
  border: none;
  cursor: pointer;
}

.btn-primary.small {
  padding: 4px var(--space-3);
  font-size: var(--text-xs);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-primary:disabled,
.btn-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.model-card-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-3);
  padding: 4px 0;
  font-size: var(--text-xs);
}

.model-card-key {
  color: var(--color-text-muted);
  font-weight: 500;
  flex-shrink: 0;
}

.model-card-value {
  color: var(--color-text);
  text-align: right;
  word-break: break-word;
}

.running-badge {
  font-size: var(--text-xs);
}

.running-badge.running {
  color: #6daa45;
}

.running-badge.idle {
  color: var(--color-text-faint);
}

@media (max-width: 620px) {
  .models-view {
    padding: 0.85rem 0.75rem 1.5rem;
  }

  .page-header {
    margin-bottom: 1rem;
  }

  .page-heading {
    gap: 0.55rem;
  }

  .header-icon {
    width: 34px;
    height: 34px;
    border-radius: 11px;
  }

  .header-icon :deep(svg) {
    width: 17px;
    height: 17px;
  }

  .eyebrow {
    font-size: 0.6rem;
  }

  .page-header h1 {
    font-size: 1.4rem;
  }

  .header-description {
    margin-top: 0.3rem;
    font-size: 12px;
  }

  .models-content {
    gap: 0.6rem;
  }

  .card {
    padding: 0.75rem;
    border-radius: var(--radius-md);
  }

  .card h2 {
    font-size: 12px;
  }

  .models-toolbar {
    flex-direction: column;
    gap: 0.4rem;
  }

  .input,
  .select {
    font-size: 16px;
  }

  .model-cards {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .model-card {
    padding: 0.65rem;
  }

  .model-card-title {
    font-size: 12px;
  }

  .model-tag {
    padding: 1px 6px;
    font-size: 9px;
  }

  .model-action-btn {
    padding: 0.35rem 0.5rem;
    font-size: 10px;
  }

  .empty-state {
    padding: 1.5rem 0;
    font-size: 12px;
  }
}
</style>
