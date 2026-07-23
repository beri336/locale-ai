<!-- src/components/models/Models.vue -->

<template>
  <div class="models-view">
    <header class="page-header">
      <div class="page-heading">
        <div class="header-icon" aria-hidden="true">
          <IconPackage />
        </div>

        <div>
          <p class="eyebrow">Local inference</p>
          <h1>Models</h1>
          <p class="header-description">
            Manage the Ollama models available on this device.
          </p>
        </div>
      </div>
    </header>

    <div class="models-content">
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
              {{ isConnectedStatus }}
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
            <span class="info-value mono">{{ totalSize }}</span>
          </div>

          <div class="info-row">
            <span class="info-label">Models Available</span>
            <span class="info-value mono">{{ modelNamesLength }}</span>
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
      </section>

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

      <!-- Recommended Models -->
      <section class="card">
        <h2>Recommended Models</h2>
        <div class="recommended-models">
          <div
            v-for="model in recommendedModels"
            :key="model.name"
            class="model-recommend-item"
          >
            <div class="model-recommend-info">
              <p class="model-recommend-name">{{ model.label }}</p>
              <p class="model-recommend-desc">
                {{ model.description }} · {{ model.size }} ·
                <a :href="model.link" target="_blank">Details</a>
              </p>
            </div>

            <button
              v-if="ollama.isModelInstalled(model.name, installedNames)"
              class="btn-installed"
              disabled
            >
              <IconCheck :size="10" :stroke-width="2" aria-hidden="true" />
              Installed
            </button>

            <button
              v-else-if="pullingModel === model.name"
              class="btn-pulling"
              disabled
            >
              {{ pullProgress }}%
            </button>

            <button
              v-else
              class="btn-primary"
              @click="handleInstallModel(model.name)"
            >
              Install '{{ model.label }}'
            </button>
          </div>
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
import IconPackage from "@/components/icons/IconPackage.vue";
import IconCheck from "@/components/icons/IconCheck.vue";

const ollama = useOllamaStore();

const recommendedModels = ref(ollama.getRecommendedModels());
const installedNames = ref([]);
const pullingModel = ref(null);
const pullProgress = ref(0);

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

//const pullProgress = ref(null);

const isConnectedStatus = computed(() =>
  isConnected.value ? "Connected" : "Disconnected",
);

const isConnectedBool = computed(() => isConnected.value === true);

async function refreshInstalledModels() {
  installedNames.value = await ollama.refreshListOfModelsName();
}

async function handleInstallModel(modelName) {
  if (pullingModel.value) return;

  pullingModel.value = modelName;
  pullProgress.value = 0;

  try {
    await ollama.pullModel(modelName, (status) => {
      if (status.total && status.completed) {
        pullProgress.value = Math.round(
          (status.completed / status.total) * 100,
        );
      }
      if (status.status === "success") {
        pullProgress.value = 100;
      }
    });
    await refreshInstalledModels();
  } catch (error) {
    console.error("Model install failed:", error);
    alert(`Installation von ${modelName} fehlgeschlagen.`);
  } finally {
    pullingModel.value = null;
    pullProgress.value = 0;
  }
}

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

function restoreOllamaBaseUrl() {
  const savedBaseUrl = localStorage.getItem("ollama-base-url");

  if (savedBaseUrl) {
    ollama.setBaseUrl(savedBaseUrl);
  }
}

async function loadAllData() {
  loading.value = true;
  try {
    baseUrl.value = ollama.getBaseUrl();
    isInstalled.value = await ollama.checkIsInstalled();
    isConnected.value = await ollama.checkConnection();
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

onMounted(async () => {
  restoreOllamaBaseUrl();

  await loadAllData();

  installedNames.value = [...modelNames.value];
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

.models-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
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

/* Recommended Models */
.recommended-models {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.model-recommend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.model-recommend-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-recommend-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
}

.model-recommend-desc {
  font-size: 11px;
  color: var(--color-text-faint);
}

.btn-installed {
  padding: var(--space-1) var(--space-3);
  background: var(--color-success, #22c55e);
  color: white;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  opacity: 0.85;
  cursor: default;
}

.btn-pulling {
  padding: var(--space-1) var(--space-3);
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  min-width: 60px;
  opacity: 0.9;
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
    max-width: none;
  }

  .card {
    padding: 0.75rem;
    border-radius: var(--radius-md);
  }

  .card h2 {
    font-size: 12px;
    margin-bottom: 0.5rem;
  }

  .card-header-row {
    margin-bottom: 0.4rem;
  }

  .count-badge {
    font-size: 10px;
    padding: 2px 8px;
  }

  .card-hint {
    font-size: 10px;
  }

  .link-row {
    gap: 0.5rem;
    margin-bottom: 0.65rem;
  }

  .link-row a {
    font-size: 10px;
  }

  .pull-form {
    flex-direction: column;
    gap: 0.4rem;
  }

  .input {
    padding: 0.45rem 0.6rem;
    font-size: 16px;
  }

  .btn-primary,
  .btn-danger {
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 12px;
  }

  .progress-info {
    margin-top: 0.5rem;
  }

  .progress-text {
    font-size: 10px;
  }

  .info-row {
    flex-wrap: wrap;
    padding: 0.5rem 0;
    gap: 0.3rem;
  }

  .info-label {
    font-size: 12px;
  }

  .info-value {
    font-size: 12px;
  }

  .info-value.mono {
    max-width: none;
    font-size: 10px;
  }

  .refresh-row {
    gap: 0.35rem;
    margin-top: 0.65rem;
  }

  .refresh-row .btn-ghost {
    flex: 1;
    min-width: 0;
    padding: 0.35rem 0.5rem;
    font-size: 10px;
    text-align: center;
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
    padding-bottom: 0.4rem;
  }

  .model-card-row {
    font-size: 10px;
  }

  .model-item {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.6rem 0;
  }

  .model-name {
    font-size: 12px;
  }

  .model-tag {
    padding: 1px 6px;
    font-size: 9px;
  }

  .model-size,
  .model-date,
  .running-badge {
    font-size: 10px;
  }

  .model-actions {
    width: 100%;
    gap: 0.35rem;
  }

  .model-actions .btn-ghost,
  .model-actions .btn-danger {
    flex: 1;
    padding: 0.35rem 0.5rem;
    font-size: 10px;
  }

  .recommended-models {
    gap: 0.4rem;
  }

  .model-recommend-item {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    padding: 0.6rem;
  }

  .model-recommend-name {
    font-size: 12px;
  }

  .model-recommend-desc {
    font-size: 10px;
  }

  .model-recommend-item .btn-primary,
  .model-recommend-item .btn-installed,
  .model-recommend-item .btn-pulling {
    width: 100%;
    text-align: center;
  }

  .empty-state {
    padding: 1.5rem 0;
    font-size: 12px;
  }

  .input-error-text {
    font-size: 10px;
  }
}
</style>
