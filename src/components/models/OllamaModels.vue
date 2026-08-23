<!-- src/components/models/OllamaModels.vue -->

<template>
  <div class="models-view">
    <!-- Page Header -->
    <header class="page-header">
      <div class="page-heading">
        <div class="header-icon" aria-hidden="true">
          <IconOllama />
        </div>

        <div>
          <p class="eyebrow">Local inference</p>
          <h1>Models</h1>
          <p class="header-description">
            Manage the Ollama models available on this device.
          </p>
        </div>
      </div>

      <div class="header-status">
        <span class="status-dot" :class="statusBool ? 'connected' : 'disconnected'"></span>

        <span>{{ statusBool ? "Online" : "Offline" }}</span>

        <button class="btn-ghost small" type="button" :disabled="isRefreshing" @click="handleRefresh">
          <IconRefresh :size="14" :stroke-width="1.8" aria-hidden="true" />
          {{ isRefreshing ? "Refreshing…" : "Refresh" }}
        </button>
      </div>
    </header>

    <div class="models-content">
      <!-- Offline Banner -->
      <div v-if="!statusBool" class="offline-banner" role="alert">
        <IconAlertTriangle :size="18" :stroke-width="1.8" />
        <div>
          <strong>Ollama is not reachable</strong>
          <p>
            Make sure Ollama is running with the local server enabled, and
            that
            <code>{{ baseUrl }}</code> is correct in
            <RouterLink to="/settings">Settings</RouterLink>.
          </p>
        </div>
      </div>

      <!-- Debug Mode: only a local app instance -->
      <section v-if="isLocalApp" class="card debug-card">
        <div class="debug-card-header">
          <div>
            <h2>Debug Mode</h2>
            <p class="card-hint">
              Show additional diagnostic output while developing locally.
            </p>
          </div>

          <span class="debug-state" :class="{ enabled: debugEnabled }">
            <span class="debug-state-dot" aria-hidden="true"></span>
            {{ debugEnabled ? "Enabled" : "Disabled" }}
          </span>
        </div>

        <div class="debug-card-body">
          <p class="debug-description">
            {{
              canUseDebug
                ? "Debug logs are written to the browser console."
                : "Connect to a reachable local Ollama server to use debug mode."
            }}
          </p>

          <button type="button" class="btn-debug" :class="{ active: debugEnabled }" :disabled="!canUseDebug"
            @click="toggleDebug">
            {{
              debugEnabled
                ? "Disable Debug Mode"
                : "Enable Debug Mode"
            }}
          </button>
        </div>
      </section>

      <!-- Card: Status -->
      <section class="card">
        <h2>Status</h2>

        <p class="card-hint">
          All information about your local Ollama server.
        </p>

        <!-- Url References -->
        <div class="link-row">
          <a v-for="link in resourceLinks" :key="link.url" :href="link.url" target="_blank" rel="noopener noreferrer">
            {{ link.label }}
          </a>
        </div>

        <!-- Installation Status -->
        <div class="info-grid">
          <div class="info-row">
            <span class="info-label">Installation Status</span>

            <!-- Error Condition -->
            <span v-if="errorInstalled" class="info-value text-error mono">
              {{ errorInstalled }}
            </span>

            <!-- Loaded -->
            <span v-else-if="statusBool !== null" class="info-value mono">
              <span class="status-dot" :class="statusBool ? 'connected' : 'disconnected'" aria-hidden="true"></span>
              {{ isInstalled }}
            </span>

            <!-- Loading -->
            <span v-else class="info-value mono">
              Loading...
            </span>
          </div>
        </div>

        <!-- Connection Status -->
        <div class="info-grid">
          <div class="info-row">
            <span class="info-label">Connection Status</span>

            <!-- Error Condition -->
            <span v-if="errorConnection" class="info-value text-error mono">
              {{ errorConnection }}
            </span>

            <!-- Loaded -->
            <span v-else-if="statusBool !== null" class="info-value mono">
              <span class="status-dot" :class="statusBool ? 'connected' : 'disconnected'" aria-hidden="true"></span>
              {{ isConnected }}
            </span>

            <!-- Loading -->
            <span v-else class="info-value mono">
              Loading...
            </span>
          </div>
        </div>

        <!-- Base Url -->
        <div class="info-row">
          <span class="info-label">Base URL</span>
          <span class="info-value mono">{{ baseUrl }}</span>
        </div>

        <!-- Version -->
        <div class="info-row">
          <span class="info-label">Version</span>
          <span class="info-value mono">{{
            version ? "v" + version : "Unknown"
          }}</span>
        </div>

        <!-- Total Size -->
        <div class="info-row">
          <span class="info-label">Total Size</span>
          <span class="info-value mono">{{ totalSize }}</span>
        </div>

        <!-- Installed Models Counter -->
        <div class="info-row">
          <span class="info-label">Models Available</span>
          <span class="info-value mono">
            {{ formatModelCount(modelsCounter) }}
          </span>
        </div>

        <!-- Running Models Counter -->
        <div class="info-row">
          <span class="info-label">Running Models</span>
          <span class="info-value mono">
            {{ formatRunningModelCount(runningModelsCounter) }}
          </span>
        </div>
      </section>

      <!-- Card: Set New Base Url -->
      <section class="card endpoint-card">
        <div class="card-header-row">
          <div>
            <h2>Ollama API Endpoint</h2>
            <p class="card-hint">
              Set the address of the Ollama server this app should use.
            </p>
          </div>

          <span class="endpoint-status">
            Active
          </span>
        </div>

        <div class="endpoint-current">
          <span class="endpoint-label">Current endpoint</span>
          <code class="endpoint-value">{{ baseUrl }}</code>
        </div>

        <div class="endpoint-form">
          <label for="base-url-input" class="endpoint-input-label">
            New endpoint
          </label>

          <div class="endpoint-input-row">
            <input id="base-url-input" v-model="newBaseUrl" class="input endpoint-input" type="url" inputmode="url"
              autocomplete="url" placeholder="http://localhost:11434" :disabled="isUpdatingBaseUrl"
              @keyup.enter="updateBaseUrl" />

            <button type="button" class="btn-primary endpoint-update-button"
              :disabled="isUpdatingBaseUrl || !newBaseUrl.trim()" @click="updateBaseUrl">
              {{ isUpdatingBaseUrl ? "Updating…" : "Update" }}
            </button>
          </div>

          <p class="endpoint-help">
            Example: <code>http://localhost:11434</code> or
            <code>http://192.168.178.21:11434</code>
          </p>
        </div>

        <div class="endpoint-footer">
          <button type="button" class="btn-ghost small" :disabled="isUpdatingBaseUrl" @click="resetBaseUrl">
            Reset to default
          </button>

          <span v-if="baseUrlMessage" class="endpoint-feedback text-success" role="status">
            {{ baseUrlMessage }}
          </span>

          <span v-else-if="baseUrlError" class="endpoint-feedback text-error" role="alert">
            {{ baseUrlError }}
          </span>
        </div>
      </section>

      <!-- Card: Download New Models -->
      <section class="card">
        <h2>Download New Models</h2>

        <p class="card-hint">
          Download and install new language models.
        </p>

        <div class="pull-section">
          <div class="pull-form">
            <input v-model.trim="pullName" class="input" :class="{ 'input-error': pullNameError }"
              placeholder="Model name (e.g., llama3.2)" :disabled="isPulling" @input="validatePullName"
              @keyup.enter="handlePullCustom" />

            <button type="button" class="btn-primary" :disabled="!canPull || !statusBool" @click="handlePullCustom">
              {{ isPulling ? "Downloading…" : "Download" }}
            </button>
          </div>

          <span v-if="pullNameError" class="input-error-text">
            {{ pullNameError }}
          </span>

          <!-- exactly one status block: “pulling” OR “paused” -->
          <div v-if="
            customPullStatus?.state === 'pulling' ||
            customPullStatus?.state === 'paused'
          " class="pull-status" aria-live="polite">
            <div class="pull-status-header">
              <span class="pull-status-label">
                <template v-if="customPullStatus.state === 'pulling'">
                  Downloading <strong>{{ activePullName }}</strong>
                </template>

                <template v-else>
                  Download paused for <strong>{{ activePullName }}</strong>
                </template>
              </span>

              <span class="pull-status-percent">
                {{ pullProgressPercent }}%
              </span>
            </div>

            <div class="progress-bar" role="progressbar" aria-label="Model download progress"
              :aria-valuenow="pullProgressPercent" aria-valuemin="0" aria-valuemax="100">
              <div class="progress-fill" :style="{ width: `${pullProgressPercent}%` }"></div>
            </div>

            <p class="progress-text">
              {{
                customPullStatus.state === "paused"
                  ? "The page was reloaded. Continue the download when ready."
                  : customPullStatus.progress?.status ?? "Preparing download…"
              }}
            </p>

            <button v-if="customPullStatus.state === 'paused'" type="button" class="btn-primary pull-resume-button"
              @click="resumePull">
              Resume download
            </button>
          </div>

          <p v-else-if="customPullStatus?.state === 'error'" class="pull-message text-error" role="alert">
            {{ customPullStatus.error }}
          </p>

          <p v-else-if="customPullStatus?.state === 'completed'" class="pull-message text-success">
            {{ activePullName }} was installed successfully.
          </p>
        </div>
      </section>

      <!-- Card: Recommended Models pulling -->
      <section class="card">
        <h2>Recommended Models</h2>

        <p class="card-hint">
          Curated models for chat, coding, and embeddings.
        </p>

        <!-- Recommended Models -->
        <div class="recommended-models">
          <div v-for="model in recommendedModels" :key="model.name" class="model-recommend-item">
            <!-- Model Info -->
            <div class="model-recommend-info">
              <!-- Model Name -->
              <p class="model-recommend-name">
                {{ model.label }}
              </p>

              <!-- Model Description -->
              <p class="model-recommend-desc">
                {{ model.description }} · {{ model.size }} ·
                <a class="btn-details" :href="model.url" target="_blank" rel="noopener noreferrer">
                  <span>Details</span>
                  <IconArrowUpRight class="btn-details-icon" :size="15" :stroke-width="1.75" aria-hidden="true" />
                </a>
              </p>

              <!-- Progress -->
              <div v-if="getRecommendedPullState(model.name)?.state === 'pulling'" class="recommended-progress">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{
                    width: `${getPullProgressPercent(
                      getRecommendedPullState(model.name).progress,
                    )}%`,
                  }"></div>
                </div>

                <span class="progress-text">
                  {{
                    getRecommendedPullState(model.name).progress?.status ??
                    "Preparing download…"
                  }}
                  —
                  {{
                    getPullProgressPercent(
                      getRecommendedPullState(model.name).progress,
                    )
                  }}%
                </span>
              </div>

              <!-- Error Message -->
              <p v-else-if="getRecommendedPullState(model.name)?.state === 'error'"
                class="recommended-error text-error">
                {{ getRecommendedPullState(model.name).error }}
              </p>
            </div>

            <!-- Install Button -->
            <button v-if="isRecommendedModelInstalled(model.name)" type="button" class="btn-installed" disabled>
              Installed
            </button>

            <!-- Pull Button -->
            <button v-else type="button" class="btn-primary"
              :disabled="!statusBool || getRecommendedPullState(model.name)?.state === 'pulling'"
              @click="handlePullRecommended(model)">
              <template v-if="getRecommendedPullState(model.name)?.state === 'pulling'">
                Downloading…
              </template>

              <template v-else-if="
                getRecommendedPullState(model.name)?.state === 'completed'
              ">
                Installed
              </template>

              <template v-else-if="getRecommendedPullState(model.name)?.state === 'error'">
                Retry
              </template>

              <template v-else>
                Install
              </template>
            </button>
          </div>
        </div>
      </section>

      <!-- Card: Remove Model -->
      <section class="card">
        <h2>Remove Model</h2>

        <p class="card-hint">
          Remove a model from your device to free up space.
        </p>

        <!-- Model Selection -->
        <div class="select-row">
          <label for="remove-model-select" class="info-label">Select Model</label>
          <select id="remove-model-select" v-model="selectedModel" class="select" :disabled="!statusBool">
            <option value="" disabled>Select a model</option>
            <option v-for="name in installedNames" :key="name" :value="name">{{ name }}</option>
          </select>
        </div>

        <!-- Remove Button -->
        <div class="refresh-row">
          <button type="button" class="btn-danger" :disabled="!selectedModel || isRemoving" @click="confirmRemoveModel">
            {{ isRemoving ? "Removing…" : "Remove Model" }}
          </button>

          <p v-if="removeMessage" class="remove-message text-success">
            {{ removeMessage }}
          </p>

          <p v-if="removeError" class="remove-message text-error" role="alert">
            {{ removeError }}
          </p>
        </div>
      </section>

      <!-- Card: Load Model -->
      <section class="card">
        <h2>Load Model</h2>

        <p class="card-hint">
          Load an installed model into memory so it is ready for inference.
        </p>

        <!-- Model Selection -->
        <div class="select-row">
          <label for="load-model-select" class="info-label">
            Select model
          </label>

          <select id="load-model-select" v-model="selectedModelToLoad" class="select"
            :disabled="isLoadingModel || unloadedModels.length === 0">
            <option value="" disabled>
              Select an installed model
            </option>

            <option v-for="model in unloadedModels" :key="model.name" :value="model.name">
              {{ model.name }}
            </option>
          </select>
        </div>

        <!-- Load Button -->
        <div class="refresh-row">
          <button type="button" class="btn-primary" :disabled="!selectedModelToLoad || isLoadingModel"
            @click="handleLoadModel">
            {{ isLoadingModel ? "Loading…" : "Load Model" }}
          </button>

          <p v-if="loadMessage" class="remove-message text-success">
            {{ loadMessage }}
          </p>

          <p v-if="loadError" class="remove-message text-error" role="alert">
            {{ loadError }}
          </p>
        </div>
      </section>

      <!-- Card: Unload Model -->
      <section class="card">
        <h2>Unload Model</h2>

        <p class="card-hint">
          Remove a loaded model from memory. The downloaded model remains on disk.
        </p>

        <!-- Model Selection -->
        <div class="select-row">
          <label for="unload-model-select" class="info-label">
            Select loaded model
          </label>

          <select id="unload-model-select" v-model="selectedModelToUnload" class="select"
            :disabled="isUnloadingModel || loadedModels.length === 0">
            <option value="" disabled>
              Select a loaded model
            </option>

            <option v-for="model in loadedModels" :key="model.name" :value="model.name">
              {{ model.name }}
            </option>
          </select>
        </div>

        <!-- Unload Button -->
        <div class="refresh-row">
          <button type="button" class="btn-danger" :disabled="!selectedModelToUnload || isUnloadingModel"
            @click="handleUnloadModel">
            {{ isUnloadingModel ? "Unloading…" : "Unload Model" }}
          </button>

          <p v-if="unloadMessage" class="remove-message text-success">
            {{ unloadMessage }}
          </p>

          <p v-if="unloadError" class="remove-message text-error" role="alert">
            {{ unloadError }}
          </p>
        </div>
      </section>

      <!-- Card: Installed Models -->
      <section class="card">
        <!-- Header -->
        <div class="card-header-row">
          <div>
            <h2>All Models</h2>
            <p class="card-hint">
              Technical details for every model installed on this device.
            </p>
          </div>

          <span class="count-badge">
            {{ filteredModels.length }}
          </span>
        </div>

        <!-- Model Toolbar -->
        <div class="models-toolbar">
          <input v-model="searchQuery" class="input search-input" type="search" placeholder="Search models…" />

          <select v-model="statusFilter" class="select filter-select">
            <option value="all">All models</option>
            <option value="loaded">Loaded only</option>
            <option value="not-loaded">Not loaded</option>
          </select>
        </div>

        <!-- No Models -->
        <div v-if="modelsCounter === 0" class="empty-state">
          No models available.
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredModels.length === 0" class="empty-state">
          <p>No models match your search or selected status filter.</p>
        </div>

        <!-- Model Detail List -->
        <div v-else class="model-detail-list">
          <article v-for="model in filteredModels" :key="model.name" class="model-detail-card">
            <header class="model-detail-header">
              <div class="model-title-group">
                <h3 class="model-detail-name">
                  {{ model.name }}
                </h3>

                <span v-if="model.architecture" class="model-family-badge">
                  {{ model.architecture }}
                </span>

                <span v-if="model.sizeBytes != null" class="model-size-badge">
                  {{ formatBytes(model.sizeBytes) }}
                </span>
              </div>

              <span v-if="model.size" class="model-size-badge">
                {{ formatBytes(model.size) }}
              </span>
            </header>

            <dl class="model-detail-grid">
              <div v-if="model.details?.parameter_size" class="model-detail-item">
                <dt>Parameters</dt>
                <dd>{{ model.details.parameter_size }}</dd>
              </div>

              <div v-if="model.details?.quantization_level" class="model-detail-item">
                <dt>Quantization</dt>
                <dd>{{ model.details.quantization_level }}</dd>
              </div>

              <div v-if="model.details?.parent_model" class="model-detail-item">
                <dt>Parent model</dt>
                <dd class="mono-value">
                  {{ model.details.parent_model }}
                </dd>
              </div>

              <div v-if="model.modified_at" class="model-detail-item">
                <dt>Last modified</dt>
                <dd>{{ formatDate(model.modified_at) }}</dd>
              </div>

              <div v-if="model.id" class="model-detail-item">
                <dt>Id</dt>
                <dd>{{ model.id }}</dd>
              </div>

              <div v-if="model.name" class="model-detail-item">
                <dt>Name</dt>
                <dd>{{ model.name }}</dd>
              </div>

              <div v-if="model.sizeBytes" class="model-detail-item">
                <dt>Size</dt>
                <dd>{{ formatBytes(model.sizeBytes) }}</dd>
              </div>

              <div v-if="model.sizeVramBytes" class="model-detail-item">
                <dt>Size</dt>
                <dd>{{ formatBytes(model.sizeVramBytes) }}</dd>
              </div>

              <div v-if="model.digest" class="model-detail-item">
                <dt>Digest</dt>
                <dd>{{ model.digest }}</dd>
              </div>

              <div v-if="model.expiresAt" class="model-detail-item">
                <dt>Expires at</dt>
                <dd>{{ formatDate(model.expiresAt) }}</dd>
              </div>

              <div v-if="model.type" class="model-detail-item">
                <dt>Type</dt>
                <dd>{{ model.type }}</dd>
              </div>

              <div v-if="model.format" class="model-detail-item">
                <dt>Format</dt>
                <dd>{{ model.format }}</dd>
              </div>

              <div v-if="model.architecture" class="model-detail-item">
                <dt>Architecture</dt>
                <dd>{{ model.architecture }}</dd>
              </div>

              <div v-if="model.families" class="model-detail-item">
                <dt>Families</dt>
                <dd>{{ model.families.join(', ') }}</dd>
              </div>

              <div v-if="model.parentModel" class="model-detail-item">
                <dt>Parent Model</dt>
                <dd>{{ model.parentModel }}</dd>
              </div>

              <div v-if="model.paramsString" class="model-detail-item">
                <dt>Parameters</dt>
                <dd>{{ model.paramsString }}</dd>
              </div>

              <div v-if="model.quantization" class="model-detail-item">
                <dt>Quantization</dt>
                <dd>{{ model.quantization }}</dd>
              </div>

              <div class="model-detail-item">
                <dt>Status</dt>
                <dd>
                  {{ isModelLoaded(model) ? "Loaded" : "Not loaded" }}
                </dd>
              </div>
            </dl>
          </article>
        </div>
      </section>

      <!-- Card: Chat defaults -->
      <section class="card chat-defaults-card">
        <div class="card-header-row">
          <div>
            <h2>Chat Defaults</h2>
            <p class="card-hint">
              These settings are used when creating new chat sessions.
            </p>
          </div>

          <span class="defaults-saved-badge">
            Saved automatically
          </span>
        </div>

        <!-- Default Settings -->
        <div class="defaults-form">
          <!-- Temperature -->
          <div class="default-setting">
            <div class="setting-label-row">
              <label for="default-temperature">Temperature</label>

              <output class="setting-value">
                {{ temperatureLabel }}
              </output>
            </div>

            <input id="default-temperature" v-model.number="temperature" class="temperature-slider" type="range" min="0"
              max="1" step="0.1" />

            <p class="setting-help">
              Lower values are more predictable; higher values are more creative.
            </p>
          </div>

          <!-- Context Window -->
          <div class="default-setting">
            <div class="setting-label-row">
              <label for="default-context-window">
                Context window
              </label>

              <span class="setting-value">
                {{ contextWindow.toLocaleString() }} tokens
              </span>
            </div>

            <input id="default-context-window" v-model.number="contextWindow" class="input setting-number-input"
              type="number" min="512" step="512" />

            <p class="setting-help">
              Maximum amount of conversation context available to the model.
            </p>
          </div>

          <!-- System Prompt -->
          <div class="default-setting">
            <div class="setting-label-row">
              <label for="default-system-prompt">
                Default system prompt
              </label>

              <span class="setting-optional">
                Optional
              </span>
            </div>

            <textarea id="default-system-prompt" v-model="systemPrompt" class="input system-prompt-input" rows="4"
              placeholder="You are a helpful assistant."></textarea>

            <p class="setting-help">
              Sets the assistant’s general behavior for new chats.
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";

import { useOllamaApi } from "@/services/ollamaApiService";
import { useSettingsStore } from "@/stores/useSettingsStore";

import IconOllama from "@/components/icons/IconOllama.vue";
import IconArrowUpRight from "../icons/IconArrowUpRight.vue";
import IconAlertTriangle from "@/components/icons/IconAlertTriangle.vue";
import IconRefresh from "@/components/icons/IconRefresh.vue";

const ollamaApi = useOllamaApi();
const settingsStore = useSettingsStore();

const isInstalled = ref("");
const isConnected = ref("");
const totalSize = ref("")
const pullName = ref("")
const pullNameError = ref("")
const activePullName = ref("")
const selectedModel = ref("")
const removeMessage = ref("")
const removeError = ref("")
const baseUrlMessage = ref("")
const baseUrlError = ref("")
const debugError = ref("")
const selectedModelToLoad = ref("")
const selectedModelToUnload = ref("")
const loadMessage = ref("")
const loadError = ref("")
const unloadMessage = ref("")
const unloadError = ref("")
const runningModelsWithDetails = ref([])
const searchQuery = ref("")

const statusFilter = ref("all")

const statusBool = ref(null);
const errorInstalled = ref(null);
const errorConnection = ref(null);
const version = ref(null);
const customPullStatus = ref(null)

const defaults = ollamaApi.chatDefaults; // from loadChatDefaults(), defaults has to be implemented before temperature, context-window and system-prompt

const resourceLinks = ollamaApi.getResourceLinks()
const baseUrl = computed(() => settingsStore.apiUrl);
const recommendedModels = ref(ollamaApi.getRecommendedModels());
const newBaseUrl = ref(settingsStore.apiUrl);
const debugEnabled = ref(ollamaApi.isDebugEnabled());
const temperature = ref(defaults.temperature);
const contextWindow = ref(defaults.num_ctx);
const systemPrompt = ref(defaults.system);

const modelsCounter = ref(0)
const runningModelsCounter = ref(0)

const allModelsWithDetails = ref([]);
const installedNames = ref([])

const recommendedPullStatus = ref({}) // key: model.name, value: { state: string, progress: number }

const isRemoving = ref(false)
const isUpdatingBaseUrl = ref(false)
const isRefreshing = ref(false);
const isLoadingModel = ref(false)
const isUnloadingModel = ref(false)


// async functions
async function reloadStatus() {
  errorInstalled.value = null
  errorConnection.value = null

  try {
    statusBool.value = await ollamaApi.status();
    isInstalled.value = await ollamaApi.isInstalled();
    isConnected.value = await ollamaApi.isConnected();
    version.value = await ollamaApi.getVersion();

    await ollamaApi.refreshModelsCache() // important: first, retrieve the models from the Ollama server
    await ollamaApi.refreshRunningModelsCache()

    totalSize.value = await ollamaApi.getInstalledModelsTotalSize()
    modelsCounter.value = await ollamaApi.getAllModelsTotalCount()
    runningModelsCounter.value = await ollamaApi.getRunningModelsTotalCount();
    installedNames.value = await ollamaApi.getAllModelsNames()
    allModelsWithDetails.value = await ollamaApi.getAllModelsWithDetails();
    runningModelsWithDetails.value = await ollamaApi.getRunningModelsWithDetails();
  } catch (err) {
    console.error("[reloadStatus] Error:", err);
    errorInstalled.value = err.message ?? "Error checking installation status.";
    errorConnection.value = err.message ?? "Error checking connection status.";

    statusBool.value = null;

    isInstalled.value = "Error";
    isConnected.value = "Error";
    version.value = "Error";
    totalSize.value = "Error"

    modelsCounter.value = 0
    runningModelsCounter.value = 0;

    installedNames.value = [];
    allModelsWithDetails.value = [];
    runningModelsWithDetails.value = [];
  }
}

async function handlePullCustom() {
  const name = pullName.value.trim()

  if (!name) {
    customPullStatus.value = {
      state: "error",
      error: "Please enter a model name.",
    }
    return
  }

  if (pullNameError.value) {
    return
  }

  activePullName.value = name

  const initialPull = {
    name,
    progress: null,
    startedAt: Date.now(),
    updatedAt: Date.now(),
  }

  ollamaApi.setActivePull(initialPull)

  customPullStatus.value = {
    state: "pulling",
    progress: null,
  }

  try {
    const result = await ollamaApi.pullModel(name, (progress) => {
      customPullStatus.value = {
        state: "pulling",
        progress,
      }

      ollamaApi.setActivePull({
        name,
        progress,
        startedAt: initialPull.startedAt,
        updatedAt: Date.now(),
      })
    })

    if (!result.success) {
      ollamaApi.clearActivePull()

      customPullStatus.value = {
        state: "error",
        error: result.error ?? "Could not download the model.",
      }
      return
    }

    customPullStatus.value = {
      state: "completed",
      progress: result.status,
    }

    ollamaApi.clearActivePull()
    await reloadStatus()
  } catch (err) {
    const wasPageReloaded = err?.name === "AbortError"

    if (!wasPageReloaded) {
      ollamaApi.clearActivePull()
    }

    customPullStatus.value = {
      state: "error",
      error: err?.message ?? "Could not download the model.",
    }
  }
}

async function handlePullRecommended(model) {
  const name = model.name

  // if this model is already being loaded
  if (recommendedPullStatus.value[name]?.state === "pulling") {
    return
  }

  // prevents parallel downloads via the empty field
  if (isPulling.value) {
    return
  }

  recommendedPullStatus.value[name] = {
    state: "pulling",
    progress: null,
    error: null,
  }

  try {
    const result = await ollamaApi.pullModel(name, (progress) => {
      recommendedPullStatus.value[name] = {
        state: "pulling",
        progress,
        error: null,
      }
    })

    if (!result.success) {
      recommendedPullStatus.value[name] = {
        state: "error",
        progress: null,
        error: result.error ?? "Could not download the model.",
      }
      return
    }

    recommendedPullStatus.value[name] = {
      state: "completed",
      progress: result.status,
      error: null,
    }

    await reloadStatus()
  } catch (err) {
    recommendedPullStatus.value[name] = {
      state: "error",
      progress: null,
      error: err?.message ?? "Could not download the model.",
    }
  }
}

async function handleRefresh() {
  if (isRefreshing.value) {
    return
  }

  isRefreshing.value = true

  try {
    await reloadStatus()
  } finally {
    isRefreshing.value = false
  }
}

async function resumePull() {
  const name = activePullName.value

  if (!name) {
    return
  }

  pullName.value = name
  pullNameError.value = ""

  await handlePullCustom()
}

async function handleRemoveModel(name) {
  isRemoving.value = true
  removeMessage.value = ""
  removeError.value = ""

  try {
    const result = await ollamaApi.removeModel(name)

    if (!result.success) {
      removeError.value =
        result.message ??
        result.error ??
        "Could not remove the model."
      return
    }

    removeMessage.value = `"${name}" was removed successfully.`
    selectedModel.value = ""

    await reloadStatus()

    window.setTimeout(() => {
      removeMessage.value = ""
    }, 5000)
  } catch (err) {
    removeError.value = err?.message ?? "Could not remove the model."
  } finally {
    isRemoving.value = false
  }
}

async function updateBaseUrl() {
  const nextUrl = newBaseUrl.value.trim()

  baseUrlMessage.value = ""
  baseUrlError.value = ""

  if (!nextUrl) {
    baseUrlError.value = "Please enter an Ollama base URL."
    return
  }

  isUpdatingBaseUrl.value = true

  try {
    settingsStore.apiUrl = nextUrl;
    newBaseUrl.value = settingsStore.apiUrl;

    await reloadStatus();

    baseUrlMessage.value = "Base URL updated successfully.";
    window.setTimeout(() => {
      baseUrlMessage.value = ""
    }, 5_000)
  } catch (err) {
    baseUrlError.value = err?.message ?? "Invalid base URL."
    window.setTimeout(() => {
      baseUrlMessage.value = ""
    }, 10_000)
  } finally {
    isUpdatingBaseUrl.value = false
  }
}

async function resetBaseUrl() {
  baseUrlMessage.value = ""
  baseUrlError.value = ""
  isUpdatingBaseUrl.value = true

  try {
    settingsStore.apiUrl = "http://localhost:11434";
    newBaseUrl.value = settingsStore.apiUrl;

    await reloadStatus();

    baseUrlMessage.value = "Base URL reset to the default address.";
    window.setTimeout(() => {
      baseUrlMessage.value = ""
    }, 5_000)
  } catch (err) {
    baseUrlError.value =
      err?.message ?? "Could not reset the base URL."
    window.setTimeout(() => {
      baseUrlMessage.value = ""
    }, 10_000)
  } finally {
    isUpdatingBaseUrl.value = false
  }
}

async function toggleDebug() {
  if (!canUseDebug.value) {
    return
  }

  try {
    ollamaApi.toggleDebug()
    debugEnabled.value = ollamaApi.isDebugEnabled()
  } catch (err) {
    debugError.value = err?.message ?? "Failed to toggle debug mode."
  }
}

async function handleLoadModel() {
  const modelName = selectedModelToLoad.value

  if (!modelName || isLoadingModel.value) {
    return
  }

  loadMessage.value = ""
  loadError.value = ""
  isLoadingModel.value = true

  try {
    // -1 => the model remains loaded until it is explicitly unloaded
    const result = await ollamaApi.loadModel(modelName, -1)

    if (!result.success) {
      loadError.value = result.error ?? "Could not load model."
      return
    }

    loadMessage.value = result.message ?? `"${modelName}" was loaded successfully.`
    selectedModelToLoad.value = ""

    await reloadStatus()
  } catch (err) {
    loadError.value = err?.message ?? "Could not load model."
  } finally {
    isLoadingModel.value = false
  }
}

async function handleUnloadModel() {
  const modelName = selectedModelToUnload.value

  if (!modelName || isUnloadingModel.value) {
    return
  }

  unloadMessage.value = ""
  unloadError.value = ""
  isUnloadingModel.value = true

  try {
    const result = await ollamaApi.unloadModel(modelName)

    if (!result.success) {
      unloadError.value = result.error ?? "Could not unload model."
      return
    }

    unloadMessage.value = `"${modelName}" was unloaded successfully.`
    selectedModelToUnload.value = ""

    await reloadStatus()
  } catch (err) {
    unloadError.value = err?.message ?? "Could not unload model."
  } finally {
    isUnloadingModel.value = false
  }
}


// helper functions
function formatModelCount(count) {
  if (count === 0) return "0 models"
  if (count === 1) return "1 model"

  return `${count} models`
}

function formatRunningModelCount(count) {
  if (count === 0) return "0 models running"
  if (count === 1) return "1 model running"

  return `${count} models running`
}

function restorePausedPull() {
  const savedPull = ollamaApi.getActivePull()

  if (!savedPull?.name) {
    return
  }

  activePullName.value = savedPull.name

  customPullStatus.value = {
    state: "paused",
    progress: savedPull.progress ?? null,
  }
}

function getRecommendedPullState(name) {
  return recommendedPullStatus.value[name] ?? null
}

function getPullProgressPercent(progress) {
  if (!progress?.total || !progress?.completed) {
    return 0
  }

  return Math.min(
    100,
    Math.round((progress.completed / progress.total) * 100),
  )
}

function confirmRemoveModel() {
  const name = selectedModel.value

  if (!name || isRemoving.value) {
    return
  }

  const confirmed = window.confirm(
    `Remove "${name}" permanently?\n\nThis will free disk space and cannot be undone.`,
  )

  if (!confirmed) {
    return
  }

  handleRemoveModel(name)
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function isModelLoaded(model) {
  return runningModelNames.value.has(model.name)
}

function isRecommendedModelInstalled(modelName) {
  const normalizedRecommendedName = ollamaApi.normalizeModelName(modelName);

  return installedNames.value.some((installedName) => {
    return (
      ollamaApi.normalizeModelName(installedName) ===
      normalizedRecommendedName
    );
  });
}


// computed properties
const isPulling = computed(() => {
  return customPullStatus.value?.state === "pulling"
})

const canPull = computed(() => {
  return Boolean(pullName.value.trim()) &&
    !pullNameError.value &&
    !isPulling.value
})

const pullProgressPercent = computed(() => {
  const progress = customPullStatus.value?.progress

  if (!progress?.total || !progress?.completed) {
    return 0
  }

  return Math.min(
    100,
    Math.round((progress.completed / progress.total) * 100),
  )
})

const isLocalApp = computed(() => {
  const host = window.location.hostname

  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1"
  )
})

const canUseDebug = computed(() => {
  return isLocalApp.value && statusBool.value === true
})

const temperatureLabel = computed(() => {
  return Number(temperature.value).toFixed(1)
})

const loadedModels = computed(() => {
  return runningModelsWithDetails.value
})

const unloadedModels = computed(() => {
  const loadedNames = new Set(
    runningModelsWithDetails.value.map(model => model.name),
  )

  return allModelsWithDetails.value.filter(
    model => !loadedNames.has(model.name),
  )
})

const filteredModels = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return allModelsWithDetails.value.filter((model) => {
    const loaded = isModelLoaded(model)

    const matchesStatus =
      statusFilter.value === "all" ||
      (statusFilter.value === "loaded" && loaded) ||
      (statusFilter.value === "not-loaded" && !loaded)

    if (!matchesStatus) {
      return false
    }

    if (!query) {
      return true
    }

    const searchableValues = [
      model.name,
      model.id,
      model.architecture,
      model.quantization,
      model.paramsString,
      model.type,
      model.format,
    ]

    return searchableValues.some((value) =>
      String(value ?? "").toLowerCase().includes(query),
    )
  })
})

const runningModelNames = computed(() => {
  return new Set(
    runningModelsWithDetails.value.map((model) => model.name),
  )
})


// watchers
watch(
  [temperature, contextWindow, systemPrompt],
  ([nextTemperature, nextContextWindow, nextSystemPrompt]) => {
    ollamaApi.saveChatDefaults({
      temperature: nextTemperature,
      num_ctx: nextContextWindow,
      system: nextSystemPrompt,
    })
  },
)


// mounted lifecycle hooks
onMounted(async () => {
  restorePausedPull()
  await reloadStatus()
})
</script>

<style scoped>
/* Page layout */
.models-view {
  height: 100%;
  padding: var(--space-8) var(--space-6);
  overflow-y: auto;
}

.models-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: var(--max-width);
}

/* Page header */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  max-width: var(--max-width);
  margin-bottom: 0.75rem;
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

.eyebrow {
  margin: 0 0 0.2rem;
  color: var(--color-text-faint);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
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
  flex: 0 0 auto;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

/* Shared cards */
.card {
  padding: var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.card h2 {
  margin-bottom: var(--space-3);
  font-size: var(--text-sm);
  font-weight: 600;
}

.card-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.card-hint {
  margin-bottom: var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.count-badge {
  padding: 2px 10px;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  background: var(--color-surface-2);
  border-radius: var(--radius-full);
}

/* Shared form controls */
.input {
  min-width: 0;
  flex: 1;
  padding: var(--space-2) var(--space-3);
  color: var(--color-text);
  font-size: var(--text-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color 0.15s ease;
}

.input:focus {
  border-color: var(--color-primary);
}

.select {
  min-width: 200px;
  padding: var(--space-2) var(--space-3);
  color: var(--color-text);
  font-size: var(--text-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.input-error-text {
  display: block;
  margin-top: var(--space-1);
  color: var(--color-error);
  font-size: var(--text-xs);
}

/* Shared buttons */
.btn-primary,
.btn-danger,
.btn-ghost,
.btn-debug {
  cursor: pointer;
}

.btn-primary {
  padding: var(--space-2) var(--space-4);
  color: white;
  font-size: var(--text-sm);
  font-weight: 500;
  white-space: nowrap;
  background: var(--color-primary);
  border-radius: var(--radius-md);
  transition: background 0.15s ease;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-primary:disabled,
.btn-danger:disabled,
.btn-debug:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btn-ghost {
  padding: 4px var(--space-3);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.btn-ghost:hover {
  color: var(--color-text);
  background: var(--color-surface-2);
}

.btn-danger {
  padding: var(--space-2) var(--space-4);
  color: var(--color-error);
  font-size: var(--text-sm);
  font-weight: 500;
  white-space: nowrap;
  background: transparent;
  border: 1px solid oklch(from var(--color-error) l c h / 0.3);
  border-radius: var(--radius-md);
  transition: background 0.15s ease;
}

.btn-danger:hover:not(:disabled) {
  background: oklch(from var(--color-error) l c h / 0.08);
}

/* Status indicators */
.status-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
}

.status-dot.connected {
  background: #6daa45;
  box-shadow: 0 0 0 3px oklch(from #6daa45 l c h / 0.15);
}

.status-dot.disconnected {
  background: var(--color-error);
  box-shadow: 0 0 0 3px oklch(from var(--color-error) l c h / 0.15);
}

/* Offline banner */
.offline-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.85rem 1rem;
  margin-bottom: var(--space-4);
  color: var(--color-warning, #a16207);
  background: color-mix(in srgb,
      var(--color-warning, #f59e0b) 12%,
      var(--color-surface));
  border: 1px solid color-mix(in srgb,
      var(--color-warning, #f59e0b) 30%,
      var(--color-border));
  border-radius: var(--radius-md);
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

/* Status and server information */
.link-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.link-row a {
  color: var(--color-primary);
  font-size: var(--text-xs);
  text-decoration: none;
}

.link-row a:hover {
  text-decoration: underline;
}

.info-grid {
  display: grid;
  gap: 0.6rem;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  min-width: 0;
  padding: 0.7rem 0.8rem;
  margin-bottom: 0.6rem;
  background: var(--color-surface-2);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
}

.info-row:hover {
  border-color: color-mix(in srgb,
      var(--color-primary) 35%,
      var(--color-border));
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  flex: 0 1 auto;
  color: var(--color-text-faint);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.info-value {
  display: inline-flex;
  min-width: 0;
  flex: 0 1 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 0.45rem;
  overflow: hidden;
  color: var(--color-text);
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-value.mono {
  max-width: 240px;
  overflow: hidden;
  color: var(--color-text-muted);
  font-family: "JetBrains Mono", "SF Mono", monospace;
  font-size: var(--text-xs);
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* API endpoint configuration */
.endpoint-card,
.chat-defaults-card {
  overflow: hidden;
}

.endpoint-status,
.defaults-saved-badge {
  display: inline-flex;
  min-height: 22px;
  flex: 0 0 auto;
  align-items: center;
  padding: 2px 8px;
  color: var(--color-success);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: color-mix(in srgb, var(--color-success) 9%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-success) 28%, var(--color-border));
  border-radius: var(--radius-full);
}

.defaults-saved-badge {
  padding: 3px 8px;
}

.endpoint-current {
  display: grid;
  gap: 5px;
  padding: var(--space-3);
  margin-top: var(--space-4);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.endpoint-label,
.endpoint-input-label {
  color: var(--color-text-faint);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.endpoint-value {
  overflow: hidden;
  color: var(--color-text);
  font-family: "JetBrains Mono", "SF Mono", monospace;
  font-size: var(--text-xs);
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.endpoint-form {
  margin-top: var(--space-4);
}

.endpoint-input-label {
  display: block;
  margin-bottom: var(--space-2);
}

.endpoint-input-row {
  display: flex;
  gap: var(--space-2);
}

.endpoint-input {
  min-width: 0;
  flex: 1;
  font-family: "JetBrains Mono", "SF Mono", monospace;
}

.endpoint-update-button {
  flex: 0 0 auto;
}

.endpoint-help {
  margin: var(--space-2) 0 0;
  color: var(--color-text-faint);
  font-size: var(--text-xs);
  line-height: 1.45;
}

.endpoint-help code {
  padding: 1px 4px;
  color: var(--color-text-muted);
  font-family: "JetBrains Mono", "SF Mono", monospace;
  font-size: 0.92em;
  background: var(--color-surface-2);
  border-radius: 4px;
}

.endpoint-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding-top: var(--space-3);
  margin-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.endpoint-feedback {
  font-size: var(--text-xs);
  line-height: 1.4;
  text-align: right;
}

/* Debug mode */
.debug-card {
  border-color: color-mix(in srgb,
      var(--color-primary) 22%,
      var(--color-border));
}

.debug-card-header,
.debug-card-body {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.debug-card-body {
  align-items: center;
  padding-top: var(--space-3);
  margin-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.debug-description {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  line-height: 1.5;
}

.debug-state {
  display: inline-flex;
  min-height: 24px;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  color: var(--color-text-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
}

.debug-state-dot {
  width: 6px;
  height: 6px;
  background: var(--color-text-faint);
  border-radius: 50%;
}

.debug-state.enabled {
  color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 9%, transparent);
  border-color: color-mix(in srgb,
      var(--color-success) 30%,
      var(--color-border));
}

.debug-state.enabled .debug-state-dot {
  background: currentColor;
  box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 16%, transparent);
}

.btn-debug {
  min-height: 34px;
  flex: 0 0 auto;
  padding: 0.45rem 0.7rem;
  color: var(--color-text);
  font-size: var(--text-xs);
  font-weight: 600;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease;
}

.btn-debug:hover:not(:disabled) {
  color: var(--color-primary);
  background: color-mix(in srgb,
      var(--color-primary) 8%,
      var(--color-surface-2));
  border-color: color-mix(in srgb,
      var(--color-primary) 35%,
      var(--color-border));
}

.btn-debug.active {
  color: var(--color-success);
  background: color-mix(in srgb,
      var(--color-success) 9%,
      var(--color-surface-2));
  border-color: color-mix(in srgb,
      var(--color-success) 35%,
      var(--color-border));
}

/* Model download */
.pull-section {
  min-width: 0;
}

.pull-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-2);
}

.pull-form .input {
  width: 100%;
}

.pull-form .btn-primary {
  min-width: 108px;
}

.pull-status {
  padding: var(--space-3);
  margin-top: var(--space-3);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.pull-status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.pull-status-label,
.pull-status-percent {
  font-family: "JetBrains Mono", "SF Mono", monospace;
  font-size: var(--text-xs);
}

.pull-status-label {
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pull-status-label strong {
  color: var(--color-text);
  font-weight: 600;
}

.pull-status-percent {
  flex-shrink: 0;
  color: var(--color-primary);
  font-weight: 600;
}

.pull-resume-button {
  margin-top: var(--space-3);
}

.progress-info {
  margin-top: var(--space-3);
}

.progress-bar {
  height: 4px;
  overflow: hidden;
  background: var(--color-border);
  border-radius: var(--radius-full);
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 300ms ease;
}

.progress-text {
  display: block;
  margin-top: var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.pull-message,
.remove-message {
  margin: var(--space-3) 0 0;
  font-size: var(--text-xs);
  line-height: 1.45;
}

/* Recommended models */
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
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 600;
}

.model-recommend-desc {
  color: var(--color-text-faint);
  font-size: 11px;
}

.btn-installed,
.btn-pulling {
  min-width: 60px;
  padding: var(--space-1) var(--space-3);
  color: white;
  font-size: var(--text-sm);
  border-radius: var(--radius-md);
}

.btn-installed {
  cursor: default;
  background: var(--color-success, #22c55e);
  opacity: 0.85;
}

.btn-pulling {
  background: var(--color-primary);
  opacity: 0.9;
}

.btn-details {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  min-height: 30px;
  padding: 0.35rem 0.55rem;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: 500;
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition:
    color 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease;
}

.btn-details:hover {
  color: var(--color-primary);
  cursor: pointer;
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  border-color: color-mix(in srgb,
      var(--color-primary) 30%,
      var(--color-border));
}

.btn-details:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.btn-details-icon {
  display: block;
  flex: 0 0 auto;
  color: currentColor;
  transition: transform 0.15s ease;
}

.btn-details:hover .btn-details-icon {
  transform: translate(1px, -1px);
}

/* Model actions */
.select-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--space-4);
  margin-top: var(--space-4);
  border-top: 1px solid var(--color-divider);
}

.refresh-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

/* Legacy model cards */
.model-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-3);
}

.model-card {
  padding: var(--space-4);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition:
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.model-card:hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.08);
  transform: translateY(-2px);
}

.model-card-title {
  padding-bottom: var(--space-2);
  margin: 0 0 var(--space-2);
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 600;
  border-bottom: 1px solid var(--color-divider);
}

.model-card-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 4px 0;
  font-size: var(--text-xs);
}

.model-card-key {
  flex-shrink: 0;
  color: var(--color-text-muted);
  font-weight: 500;
}

.model-card-value {
  color: var(--color-text);
  text-align: right;
  word-break: break-word;
}

/* Installed model list */
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
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.model-name {
  overflow: hidden;
  font-size: var(--text-sm);
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.model-tag {
  padding: 1px 8px;
  color: var(--color-text-muted);
  font-size: 11px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
}

.model-size,
.model-date,
.running-badge {
  color: var(--color-text-muted);
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
  flex-shrink: 0;
  gap: var(--space-2);
}

/* Model search and details */
.models-toolbar {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.search-input {
  min-width: 0;
}

.filter-select {
  flex: 0 0 auto;
}

.model-detail-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.model-detail-card {
  min-width: 0;
  padding: var(--space-4);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition:
    transform 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.model-detail-card:hover {
  border-color: color-mix(in srgb,
      var(--color-primary) 28%,
      var(--color-border));
  box-shadow: 0 8px 20px rgb(0 0 0 / 0.06);
  transform: translateY(-2px);
}

.model-detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-divider);
}

.model-title-group {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.model-detail-name {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--color-text);
  font-family: "JetBrains Mono", "SF Mono", monospace;
  font-size: var(--text-sm);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-family-badge,
.model-size-badge {
  display: inline-flex;
  min-height: 22px;
  align-items: center;
  padding: 2px 8px;
  color: var(--color-text-muted);
  font-family: "JetBrains Mono", "SF Mono", monospace;
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
}

.model-size-badge {
  flex-shrink: 0;
  color: var(--color-primary);
  border-color: color-mix(in srgb,
      var(--color-primary) 25%,
      var(--color-border));
}

.model-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  margin: var(--space-3) 0 0;
}

.model-detail-item {
  min-width: 0;
}

.model-detail-item dt {
  margin-bottom: 3px;
  color: var(--color-text-faint);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.model-detail-item dd {
  margin: 0;
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--text-xs);
  font-weight: 500;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-detail-item .mono-value {
  font-family: "JetBrains Mono", "SF Mono", monospace;
  font-size: 10px;
}

/* Empty states */
.empty-state {
  padding: var(--space-8) 0;
  color: var(--color-text-faint);
  font-size: var(--text-sm);
  text-align: center;
}

/* Chat defaults */
.defaults-form {
  display: grid;
  gap: var(--space-4);
  margin-top: var(--space-4);
}

.default-setting {
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.default-setting:first-child {
  padding-top: 0;
  border-top: 0;
}

.setting-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.setting-label-row label {
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 600;
}

.setting-value,
.setting-optional {
  flex: 0 0 auto;
  color: var(--color-primary);
  font-family: "JetBrains Mono", "SF Mono", monospace;
  font-size: var(--text-xs);
  font-weight: 600;
}

.setting-optional {
  color: var(--color-text-faint);
  font-family: inherit;
  font-weight: 500;
}

.temperature-slider {
  width: 100%;
  height: 5px;
  margin: var(--space-2) 0;
  cursor: pointer;
  appearance: none;
  accent-color: var(--color-primary);
  background: var(--color-border);
  border-radius: var(--radius-full);
}

.temperature-slider::-webkit-slider-thumb {
  width: 16px;
  height: 16px;
  appearance: none;
  background: var(--color-primary);
  border: 2px solid var(--color-surface);
  border-radius: 50%;
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.2);
}

.temperature-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: var(--color-primary);
  border: 2px solid var(--color-surface);
  border-radius: 50%;
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.2);
}

.setting-number-input {
  width: min(100%, 260px);
  font-family: "JetBrains Mono", "SF Mono", monospace;
}

.system-prompt-input {
  display: block;
  width: 100%;
  min-height: 104px;
  resize: vertical;
  font-family: inherit;
  line-height: 1.55;
}

.setting-help {
  margin: var(--space-2) 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  line-height: 1.5;
}

/* Responsive input sizing */
@media (pointer: coarse) {

  .endpoint-input,
  .setting-number-input,
  .system-prompt-input {
    font-size: 16px;
  }
}

/* Mobile layout */
@media (max-width: 620px) {

  /* Page and header */
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

  .header-status {
    display: none;
  }

  .models-content {
    gap: 0.6rem;
    max-width: none;
  }

  /* Cards and controls */
  .card {
    padding: 0.75rem;
    border-radius: var(--radius-md);
  }

  .card h2 {
    margin-bottom: 0.5rem;
    font-size: 12px;
  }

  .card-header-row {
    margin-bottom: 0.4rem;
  }

  .count-badge {
    padding: 2px 8px;
    font-size: 10px;
  }

  .card-hint,
  .link-row a {
    font-size: 10px;
  }

  .link-row {
    gap: 0.5rem;
    margin-bottom: 0.65rem;
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

  /* Download controls */
  .pull-form {
    grid-template-columns: 1fr;
  }

  .pull-form .btn-primary {
    width: 100%;
  }

  .progress-info {
    margin-top: 0.5rem;
  }

  .progress-text,
  .input-error-text {
    font-size: 10px;
  }

  /* Status information */
  .info-row {
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 0.3rem;
    padding: 0.5rem 0;
  }

  .info-label,
  .info-value {
    font-size: 12px;
  }

  .info-value {
    justify-content: flex-start;
    max-width: 100%;
    text-align: left;
  }

  .info-value.mono {
    max-width: none;
    font-size: 10px;
  }

  /* Model actions */
  .select-row {
    align-items: stretch;
    flex-direction: column;
  }

  .select {
    width: 100%;
    min-width: 0;
  }

  .refresh-row {
    gap: 0.35rem;
    margin-top: 0.65rem;
  }

  .refresh-row .btn-ghost {
    min-width: 0;
    flex: 1;
    padding: 0.35rem 0.5rem;
    font-size: 10px;
    text-align: center;
  }

  /* Recommended models */
  .recommended-models {
    gap: 0.4rem;
  }

  .model-recommend-item {
    align-items: stretch;
    flex-direction: column;
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

  /* Model cards and details */
  .model-cards {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .model-card {
    padding: 0.65rem;
  }

  .model-card-title {
    padding-bottom: 0.4rem;
    font-size: 12px;
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

  .models-toolbar {
    flex-direction: column;
  }

  .filter-select {
    width: 100%;
  }

  .empty-state {
    padding: 1.5rem 0;
    font-size: 12px;
  }

  .model-detail-list {
    grid-template-columns: 1fr;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }

  .model-detail-card {
    padding: var(--space-3);
  }

  .model-detail-grid {
    gap: var(--space-2);
  }

  .model-detail-name {
    font-size: 12px;
  }

  /* API endpoint */
  .endpoint-input-row {
    flex-direction: column;
  }

  .endpoint-update-button {
    width: 100%;
  }

  .endpoint-footer {
    align-items: flex-start;
    flex-direction: column-reverse;
  }

  .endpoint-feedback {
    text-align: left;
  }

  /* Debug mode */
  .debug-card-header,
  .debug-card-body {
    align-items: stretch;
    flex-direction: column;
  }

  .debug-state,
  .btn-debug {
    justify-content: center;
    width: 100%;
  }

  /* Chat defaults */
  .card-header-row {
    align-items: stretch;
    flex-direction: column;
  }

  .defaults-saved-badge {
    align-self: flex-start;
  }

  .setting-number-input {
    width: 100%;
  }
}
</style>
