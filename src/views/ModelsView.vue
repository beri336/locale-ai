<!-- src/views/ModelsView.vue -->

<template>
  <div class="models-view">
    <header class="page-header">
      <h1>Models</h1>
    </header>

    <div class="models-content">
      <!-- Download -->
      <section class="card">
        <h2>Download New Models</h2>
        <div class="pull-form">
          <input
            v-model="pullName"
            class="input"
            :class="{ 'input-error': pullNameError }"
            placeholder="Model name (e.g., llama2)"
            @input="validatePullName"
            @keyup.enter="handlePull"
          />
          <span v-if="pullNameError" class="input-error-text">{{
            pullNameError
          }}</span>
          <button
            class="btn-primary"
            :disabled="!pullName || isPulling"
            @click="handlePull"
          >
            {{ isPulling ? "Loading…" : "Download" }}
          </button>
        </div>

        <div v-if="activeProgress" class="progress-info">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: progressPercent + '%' }"
            ></div>
          </div>
          <span class="progress-text">
            {{ activeProgress.status }}
            {{ progressPercent > 0 ? progressPercent + "%" : "" }}
          </span>
        </div>
      </section>

      <!-- Remove Model -->
      <section class="card">
        <h2>Remove Installed Model</h2>
        <div class="pull-form">
          <input
            v-model="removeName"
            class="input"
            :class="{ 'input-error': removeNameError }"
            placeholder="Model name (e.g., llama3.2:3b)"
            @input="validateRemoveName"
            @keyup.enter="handleRemove"
          />
          <button
            class="btn-danger"
            :disabled="!removeName || isRemoving || !!removeNameError"
            @click="handleRemove"
          >
            {{ isRemoving ? "Removing…" : "Remove" }}
          </button>
        </div>
        <span v-if="removeNameError" class="input-error-text">{{
          removeNameError
        }}</span>
      </section>

      <!-- Ollama Status -->
      <section class="card">
        <h2>Ollama Status</h2>

        <div class="ollama-info">
          <p class="card-hint">
            All information about your local Ollama server.
          </p>
          <div class="link-row">
            <a href="https://docs.ollama.com" target="_blank">Documentation</a>
            <a href="https://docs.ollama.com/cli" target="_blank"
              >CLI Reference</a
            >
            <a href="https://ollama.com/search" target="_blank">Model Search</a>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-row">
            <span class="info-label">Installation Status</span>
            <span class="info-value mono">{{ isInstalled }}</span>
          </div>

          <div class="info-row">
            <span class="info-label">Connection Status</span>
            <span class="info-value">
              <span
                class="status-dot"
                :class="isConnectedBool ? 'connected' : 'disconnected'"
              ></span>
              {{ isConnected }}
            </span>
          </div>

          <div class="info-row">
            <span class="info-label">Base URL</span>
            <span class="info-value mono">{{ baseUrl }}</span>
          </div>

          <div class="info-row">
            <span class="info-label">Version</span>
            <span class="info-value mono">{{
              version ? "v" + version : "Unknown"
            }}</span>
          </div>

          <div class="info-row">
            <span class="info-label">Total Size</span>
            <span class="info-value">{{ totalSize }}</span>
          </div>

          <div class="info-row">
            <span class="info-label">Models Available</span>
            <span class="info-value">{{ modelNamesLength }}</span>
          </div>

          <div class="info-row">
            <span class="info-label">Running Models</span>
            <span class="info-value">
              {{
                runningModelNames.length ? runningModelNames.join(", ") : "None"
              }}
            </span>
          </div>
        </div>

        <div class="refresh-row">
          <button class="btn-ghost small" @click="refreshModelNames">
            Refresh Models
          </button>
          <button class="btn-ghost small" @click="refreshDetailedListOfModels">
            Refresh Details
          </button>
          <button class="btn-ghost small" @click="refreshRunningModels">
            Refresh Running
          </button>
        </div>

        <div class="select-row">
          <label class="info-label" for="model-select">Select a Model</label>
          <select id="model-select" v-model="selectedModel" class="select">
            <option value="" disabled>Please select a model</option>
            <option v-for="name in modelNames" :key="name" :value="name">
              {{ name }}
            </option>
          </select>
        </div>
      </section>

      <!-- Detailed Model Cards -->
      <section class="card">
        <h2>Detailed Model Information</h2>

        <div v-if="detailedModels.length" class="model-cards">
          <div
            v-for="model in detailedModels"
            :key="model.name"
            class="model-card"
          >
            <h3 class="model-card-title">{{ model.name }}</h3>

            <div class="model-card-row">
              <span class="model-card-key">Size</span>
              <span class="model-card-value">{{
                formatBytes(model.size)
              }}</span>
            </div>

            <div class="model-card-row">
              <span class="model-card-key">Modified At</span>
              <span class="model-card-value">{{
                formatDate(model.modified_at)
              }}</span>
            </div>

            <div class="model-card-row" v-if="model.details?.parent_model">
              <span class="model-card-key">Parent Model</span>
              <span class="model-card-value">{{
                model.details.parent_model
              }}</span>
            </div>

            <div class="model-card-row">
              <span class="model-card-key">Format</span>
              <span class="model-card-value">{{ model.details?.format }}</span>
            </div>

            <div class="model-card-row">
              <span class="model-card-key">Family</span>
              <span class="model-card-value">{{ model.details?.family }}</span>
            </div>

            <div class="model-card-row">
              <span class="model-card-key">Families</span>
              <span class="model-card-value">{{
                model.details?.families?.join(", ")
              }}</span>
            </div>

            <div class="model-card-row">
              <span class="model-card-key">Parameter Size</span>
              <span class="model-card-value">{{
                model.details?.parameter_size
              }}</span>
            </div>

            <div class="model-card-row">
              <span class="model-card-key">Quantization</span>
              <span class="model-card-value">{{
                model.details?.quantization_level
              }}</span>
            </div>
          </div>
        </div>
        <p v-else class="empty-state">
          No detailed model information available.
        </p>
      </section>

      <!-- Installed Models -->
      <section class="card">
        <div class="card-header-row">
          <h2>Installed Models</h2>
          <span class="count-badge">In Total: {{ detailedModels.length }}</span>
        </div>

        <div class="models-list">
          <div
            v-for="model in detailedModels"
            :key="model.name"
            class="model-item"
          >
            <div class="model-info">
              <span class="model-name">{{ model.name }}</span>

              <div class="model-meta">
                <span v-if="model.details?.parameter_size" class="model-tag">
                  {{ model.details.parameter_size }}
                </span>
                <span
                  v-if="model.details?.quantization_level"
                  class="model-tag"
                >
                  {{ model.details.quantization_level }}
                </span>
                <span v-if="model.details?.family" class="model-tag">
                  {{ model.details.family }}
                </span>
                <span class="model-size">{{ formatSize(model.size) }}</span>
                <span class="model-date">{{
                  formatDate(model.modified_at)
                }}</span>
                <span
                  class="running-badge"
                  :class="isModelRunning(model.name) ? 'running' : 'idle'"
                >
                  {{ isModelRunning(model.name) ? "Running" : "Idle" }}
                </span>
              </div>
            </div>

            <div class="model-actions">
              <button
                v-if="!isModelRunning(model.name)"
                class="btn-ghost small"
                @click="handleLoad(model.name)"
              >
                Load
              </button>
              <button
                v-else
                class="btn-ghost small"
                @click="handleUnload(model.name)"
              >
                Unload
              </button>
              <button
                class="btn-danger small"
                @click="handleDelete(model.name)"
              >
                Delete
              </button>
            </div>
          </div>

          <div
            v-if="!loading && detailedModels.length === 0"
            class="empty-state"
          >
            <p>No models installed.</p>
          </div>
        </div>
      </section>

      <!-- Running Models -->
      <section class="card" v-if="runningModelNames.length > 0">
        <h2>Active Processes</h2>
        <div class="model-list">
          <div v-for="name in runningModelNames" :key="name" class="model-item">
            <span class="model-name">{{ name }}</span>
            <button class="btn-danger small" @click="handleUnload(name)">
              Stop
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useOllamaStore } from "@/stores/useOllamaStore";
import { isValidModelName } from "@/utils/validation";

const ollama = useOllamaStore();

const pullNameError = ref("");
const loading = ref(false);
const isInstalled = ref("");
const isConnected = ref(false);
const baseUrl = ref("");
const version = ref("");
const modelNames = ref([]);
const modelNamesLength = ref(0);
const detailedModels = ref([]);
const runningModelNames = ref([]);
const pullName = ref("");
const isPulling = ref(false);

const removeName = ref("");
const removeNameError = ref("");
const isRemoving = ref(false);

const pullProgress = ref(null);

const isConnectedBool = computed(() => isConnected.value === "Connected");

const selectedModel = computed({
  get: () => ollama.getSelectedModel(),
  set: (name) => ollama.setSelectedModel(name),
});

const totalSize = computed(() => {
  const bytes = (detailedModels.value || []).reduce(
    (sum, model) => sum + (model.size || 0),
    0,
  );
  return formatBytes(bytes);
});

const activeProgress = computed(() => pullProgress.value);

const progressPercent = computed(() => {
  const progress = activeProgress.value;
  if (!progress || !progress.total) return 0;
  return Math.round((progress.completed / progress.total) * 100);
});

function isModelRunning(name) {
  return runningModelNames.value.includes(name);
}

async function loadAllData() {
  loading.value = true;
  try {
    baseUrl.value = ollama.getBaseUrl();
    isInstalled.value = await ollama.checkIsInstalled();
    isConnected.value = await ollama.checkIsConnected();
    modelNames.value = await ollama.getListOfModelsName();
    modelNamesLength.value = modelNames.value.length;
    detailedModels.value = await ollama.getDetailedListOfModels();
    runningModelNames.value = await ollama.getRunningModelNames();
    version.value = await ollama.getVersion();
  } catch (error) {
    console.error("loadAllData failed:", error);
    isInstalled.value = "Error";
    isConnected.value = "Error";
    baseUrl.value = "Error";
    modelNames.value = [];
    modelNamesLength.value = 0;
    detailedModels.value = [];
    runningModelNames.value = [];
    version.value = "";
  } finally {
    loading.value = false;
  }
}

async function refreshModelNames() {
  try {
    modelNames.value = await ollama.refreshListOfModelsName();
    modelNamesLength.value = modelNames.value.length;
  } catch (error) {
    console.error("refreshModelNames failed:", error);
  }
}

async function refreshDetailedListOfModels() {
  try {
    detailedModels.value = await ollama.refreshDetailedListOfModels();
  } catch (error) {
    console.error("refreshDetailedListOfModels failed:", error);
  }
}

async function refreshRunningModels() {
  try {
    runningModelNames.value = await ollama.refreshRunningModelNames();
  } catch (error) {
    console.error("refreshRunningModels failed:", error);
  }
}

async function handlePull() {
  if (!pullName.value || !validatePullName()) return;

  isPulling.value = true;
  const name = pullName.value;
  pullProgress.value = { status: "Starting…", completed: 0, total: 0 };

  try {
    await ollama.pullModel(name, (status) => {
      pullProgress.value = status;
    });
    await refreshModelNames();
    await refreshDetailedListOfModels();
  } catch (error) {
    console.error("handlePull failed:", error);
    pullNameError.value =
      "Failed to pull model. Please check the name and try again.";
  } finally {
    isPulling.value = false;
    pullProgress.value = null;
    pullName.value = "";
  }
}

async function handleRemove() {
  if (!removeName.value || !validateRemoveName()) return;

  isRemoving.value = true;
  const name = removeName.value;

  const success = await ollama.removeModel(name);

  if (success) {
    removeName.value = "";
    await refreshModelNames();
    await refreshDetailedListOfModels();
  } else {
    removeNameError.value = "Failed to remove model. Please try again.";
  }

  isRemoving.value = false;
}

function handleDelete(modelName) {
  if (confirm(`Are you sure you want to delete the model "${modelName}"?`)) {
    ollama.removeModel(modelName).then(() => {
      refreshModelNames();
      refreshDetailedListOfModels();
    });
  }
}

async function handleLoad(modelName) {
  await ollama.loadOllamaModel(modelName);
  await refreshRunningModels();
}

async function handleUnload(modelName) {
  await ollama.unloadOllamaModel(modelName);
  await refreshRunningModels();
}

function formatBytes(bytes, decimals = 2) {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i]
  );
}

function formatSize(bytes) {
  if (!bytes) return "";
  const gb = bytes / 1024 ** 3;
  return gb >= 1
    ? gb.toFixed(1) + " GB"
    : (bytes / 1024 ** 2).toFixed(0) + " MB";
}

function formatDate(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function validatePullName() {
  if (!pullName.value) {
    pullNameError.value = "";
    return true;
  }
  if (!isValidModelName(pullName.value)) {
    pullNameError.value =
      "Invalid model name. Use letters, numbers, dots, dashes, underscores, and an optional :tag.";
    return false;
  }
  pullNameError.value = "";
  return true;
}

function validateRemoveName() {
  removeNameError.value = "";

  if (!removeName.value) return true;

  if (!isValidModelName(removeName.value)) {
    removeNameError.value = "Invalid model name format.";
    return false;
  }

  if (!modelNames.value.includes(removeName.value)) {
    removeNameError.value = "This model is not installed.";
    return false;
  }

  if (runningModelNames.value.includes(removeName.value)) {
    removeNameError.value = "This model is currently running. Unload it first.";
    return false;
  }

  return true;
}

onMounted(() => {
  loadAllData();
});
</script>

<style scoped>
.models-view {
  height: 100%;
  overflow-y: auto;
  padding: var(--space-8) var(--space-6);
}

.page-header {
  margin-bottom: var(--space-6);
}

.page-header h1 {
  font-size: var(--text-xl);
  font-weight: 700;
}

.models-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: 720px;
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
  margin-bottom: var(--space-2);
}

.count-badge {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  background: var(--color-surface-2);
  padding: 2px 10px;
  border-radius: var(--radius-full);
}

/* Pull form */
.pull-form {
  display: flex;
  gap: var(--space-2);
}

.input {
  flex: 1;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-text);
  outline: none;
  transition: border-color 0.15s ease;
}

.input:focus {
  border-color: var(--color-primary);
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
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.progress-info {
  margin-top: var(--space-3);
}

.progress-bar {
  height: 4px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 300ms ease;
}

.progress-text {
  display: block;
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

/* Ollama info card */
.card-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
}

.link-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.link-row a {
  font-size: var(--text-xs);
  color: var(--color-primary);
  text-decoration: none;
}

.link-row a:hover {
  text-decoration: underline;
}

.info-grid {
  display: flex;
  flex-direction: column;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-divider);
  gap: var(--space-3);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  font-weight: 500;
  flex-shrink: 0;
}

.info-value {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
  text-align: right;
}

.info-value.mono {
  font-family: "JetBrains Mono", "SF Mono", monospace;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-muted);
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.connected {
  background: #6daa45;
  box-shadow: 0 0 0 3px oklch(from #6daa45 l c h / 0.15);
}

.status-dot.disconnected {
  background: var(--color-error);
  box-shadow: 0 0 0 3px oklch(from var(--color-error) l c h / 0.15);
}

.refresh-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.select-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-divider);
}

.select {
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-text);
  min-width: 200px;
}

/* Model cards */
.model-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-3);
}

.model-card {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  transition:
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.model-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.model-card-title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-divider);
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

/* Installed models list */
.models-list,
.model-list {
  display: flex;
  flex-direction: column;
}

.model-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-divider);
}

.model-item:last-child {
  border-bottom: none;
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.model-name {
  font-size: var(--text-sm);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.model-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.model-tag {
  padding: 1px 8px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 11px;
  color: var(--color-text-muted);
}

.model-size,
.model-date {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
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

.model-actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}

.btn-ghost,
.btn-danger {
  padding: 4px var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  background: transparent;
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

.btn-danger {
  color: var(--color-error);
  border-color: oklch(from var(--color-error) l c h / 0.3);
}

.btn-danger:hover {
  background: oklch(from var(--color-error) l c h / 0.08);
}

.empty-state {
  padding: var(--space-8) 0;
  text-align: center;
  color: var(--color-text-faint);
  font-size: var(--text-sm);
}

/* Remove Models */
.btn-danger {
  padding: var(--space-2) var(--space-4);
  background: transparent;
  color: var(--color-error);
  border: 1px solid oklch(from var(--color-error) l c h / 0.3);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  white-space: nowrap;
  transition: background 0.15s ease;
}

.btn-danger:hover:not(:disabled) {
  background: oklch(from var(--color-error) l c h / 0.08);
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-error-text {
  color: var(--color-error);
  font-size: var(--text-xs);
  margin-top: var(--space-1);
}
</style>
