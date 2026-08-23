<!-- src/models/LmStudioModels.vue -->

<template>
    <div class="models-view">
        <!-- Page Header -->
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
                <span class="status-dot" :class="statusBool === true ? 'connected' : 'disconnected'"></span>

                <span>{{ statusBool === true ? "Online" : "Offline" }}</span>

                <button class="btn-ghost small" type="button" :disabled="isRefreshing" @click="handleRefresh">
                    <IconRefresh :size="14" :stroke-width="1.8" />
                    {{ isRefreshing ? "Refreshing…" : "Refresh" }}
                </button>
            </div>
        </header>

        <div class="models-content">
            <!-- Offline Banner -->
            <div v-if="!statusBool" class="offline-banner" role="alert">
                <IconAlertTriangle :size="18" :stroke-width="1.8" />
                <div>
                    <strong>LM Studio is not reachable</strong>
                    <p>
                        Make sure LM Studio is running with the local server enabled, and
                        that
                        <code>{{ baseUrl }}</code> is correct in
                        <RouterLink to="/settings">Settings</RouterLink>.
                    </p>
                </div>
            </div>

            <!-- Debug Mode: nur lokale App-Instanz -->
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
                                : "Connect to a reachable local LM Studio server to use debug mode."
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

            <!-- Card: LMS Status -->
            <section class="card">
                <p class="card-hint">
                    All information about your local LM Studio server.
                </p>

                <!-- Url References -->
                <div class="link-row">
                    <a v-for="link in resourceLinks" :key="link.url" :href="link.url" target="_blank"
                        rel="noopener noreferrer">
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
                            <span class="status-dot" :class="statusBool ? 'connected' : 'disconnected'"
                                aria-hidden="true"></span>
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
                            <span class="status-dot" :class="statusBool ? 'connected' : 'disconnected'"
                                aria-hidden="true"></span>
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
                    <span class="info-value mono">{{ version }}</span>
                    <!--  (currently there no API endpoint available) -->
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
                        <h2>LM Studio API Endpoint</h2>
                        <p class="card-hint">
                            Set the address of the LM Studio server this app should use.
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
                        <input id="base-url-input" v-model="newBaseUrl" class="input endpoint-input" type="url"
                            inputmode="url" autocomplete="url" placeholder="http://localhost:1234"
                            :disabled="isUpdatingBaseUrl" @keyup.enter="updateBaseUrl" />

                        <button type="button" class="btn-primary endpoint-update-button"
                            :disabled="isUpdatingBaseUrl || !newBaseUrl.trim()" @click="updateBaseUrl">
                            {{ isUpdatingBaseUrl ? "Updating…" : "Update" }}
                        </button>
                    </div>

                    <p class="endpoint-help">
                        Example: <code>http://localhost:1234</code> or
                        <code>http://192.168.178.21:1234</code>
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
                            placeholder="e.g. openai/gpt-oss-20b" :disabled="isPulling || !statusBool"
                            @input="validatePullName" @keyup.enter="handlePullCustom" />

                        <button type="button" class="btn-primary" :disabled="!canPull" @click="handlePullCustom">
                            {{ isPulling ? "Downloading…" : "Download" }}
                        </button>
                    </div>

                    <span v-if="pullNameError" class="input-error-text">
                        {{ pullNameError }}
                    </span>

                    <!-- Exactly one status block: "pulling" OR "paused" -->
                    <div v-if="customPullStatus?.state === 'pulling'" class="pull-status" aria-live="polite">
                        <div class="pull-status-header">
                            <span class="pull-status-label">
                                Downloading <strong>{{ activePullName }}</strong>
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
                            {{ customPullStatus.progress?.status ?? "Preparing download…" }}
                        </p>
                    </div>

                    <!-- Error Message -->
                    <p v-else-if="customPullStatus?.state === 'error'" class="pull-message text-error" role="alert">
                        {{ customPullStatus.error }}
                    </p>

                    <!-- Completed Message -->
                    <p v-else-if="customPullStatus?.state === 'completed'" class="pull-message text-success">
                        {{ pullCompletedMessage }}
                    </p>
                </div>
            </section>

            <!-- Card: Recommended Models pulling -->
            <section class="card">
                <h2>Recommended Models</h2>

                <p class="card-hint">
                    Curated models for chat, coding, and embeddings.
                </p>

                <div class="recommended-models">
                    <div v-for="model in recommendedModels" :key="model.name" class="model-recommend-item">
                        <!-- Recommended Model Info -->
                        <div class="model-recommend-info">
                            <p class="model-recommend-name">
                                {{ model.label }}
                            </p>

                            <p class="model-recommend-desc">
                                {{ model.description }} · {{ model.size }} ·
                                <a class="btn-details" :href="model.url" target="_blank" rel="noopener noreferrer">
                                    <span>Details</span>
                                    <IconArrowUpRight class="btn-details-icon" :size="15" :stroke-width="1.75"
                                        aria-hidden="true" />
                                </a>
                            </p>

                            <div v-if="getRecommendedPullState(model.name)?.state === 'pulling'"
                                class="recommended-progress">
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

                            <p v-else-if="getRecommendedPullState(model.name)?.state === 'error'"
                                class="recommended-error text-error">
                                {{ getRecommendedPullState(model.name).error }}
                            </p>
                        </div>

                        <!-- Model Is Installed -->
                        <button v-if="isRecommendedModelInstalled(model)" type="button" class="btn-installed" disabled>
                            Installed
                        </button>

                        <!-- Model Is Not Installed -->
                        <button v-else type="button" class="btn-primary" :disabled="statusBool !== true ||
                            getRecommendedPullState(model.name)?.state === 'pulling'
                            " @click="handlePullRecommended(model)">
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

            <!-- Remove Models: currently no API endpoint to delete models -->

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

                        <option v-for="model in unloadedModels" :key="model.id" :value="model.id">
                            {{ model.displayName }}
                        </option>
                    </select>
                </div>

                <!-- Load Model Button -->
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
                    Remove a loaded model from memory. The downloaded model files remain on disk.
                </p>

                <!-- Unload Model Selection -->
                <div class="select-row">
                    <label for="unload-model-select" class="info-label">
                        Select loaded model
                    </label>

                    <select id="unload-model-select" v-model="selectedInstanceId" class="select"
                        :disabled="isUnloading || loadedModels.length === 0">
                        <option value="" disabled>
                            Select a loaded model
                        </option>

                        <option v-for="model in loadedModels" :key="model.instanceId" :value="model.instanceId">
                            {{ model.displayName }}
                        </option>
                    </select>
                </div>

                <!-- Unload Model Button -->
                <div class="refresh-row">
                    <button type="button" class="btn-danger" :disabled="!selectedInstanceId || isUnloading"
                        @click="handleUnloadModel">
                        {{ isUnloading ? "Unloading…" : "Unload Model" }}
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
                <!-- Card Header -->
                <div class="card-header-row">
                    <div>
                        <h2>All Models with Details</h2>
                        <p class="card-hint">
                            Technical details for every model installed on this device.
                        </p>
                    </div>

                    <span v-if="filteredModels.length >= 0" class="count-badge">
                        {{ filteredModels.length }}
                    </span>
                </div>

                <!-- Models Toolbar with Search and Filter -->
                <div class="models-toolbar">
                    <input v-model="searchQuery" class="input search-input" type="search"
                        placeholder="Search models…" />

                    <select v-model="statusFilter" class="select filter-select">
                        <option value="all">All models</option>
                        <option value="loaded">Loaded only</option>
                        <option value="not-loaded">Not loaded</option>
                    </select>
                </div>

                <!-- Empty State -->
                <div v-if="modelsCounter === 0" class="empty-state">
                    No models available.
                </div>

                <!-- Filtered Empty State -->
                <div v-else-if="filteredModels.length === 0" class="empty-state">
                    <IconPackageOff :size="28" :stroke-width="1.5" />
                    <p>No models match your search or selected status filter.</p>
                </div>

                <div v-else class="model-detail-list">
                    <!-- Model Detail Cards -->
                    <article v-for="model in filteredModels" :key="model.id" class="model-detail-card">
                        <header class="model-detail-header">
                            <div class="model-title-group">
                                <h3 class="model-detail-name">
                                    {{ model.displayName }}
                                </h3>

                                <span v-if="model.architecture" class="model-family-badge">
                                    {{ model.architecture }}
                                </span>
                            </div>

                            <span v-if="model.sizeBytes" class="model-size-badge">
                                {{ formatBytes(model.sizeBytes) }}
                            </span>
                        </header>

                        <dl class="model-detail-grid">
                            <div v-if="model.paramsString" class="model-detail-item">
                                <dt>Parameters</dt>
                                <dd>{{ model.paramsString }}</dd>
                            </div>

                            <div v-if="model.quantization" class="model-detail-item">
                                <dt>Quantization</dt>
                                <dd>{{ model.quantization }}</dd>
                            </div>

                            <div v-if="model.format" class="model-detail-item">
                                <dt>Format</dt>
                                <dd>{{ model.format }}</dd>
                            </div>

                            <div v-if="model.publisher" class="model-detail-item">
                                <dt>Publisher</dt>
                                <dd>{{ model.publisher }}</dd>
                            </div>

                            <div v-if="model.id" class="model-detail-item">
                                <dt>Id</dt>
                                <dd>{{ model.id }}</dd>
                            </div>

                            <div v-if="model.type" class="model-detail-item">
                                <dt>Type</dt>
                                <dd>{{ model.type }}</dd>
                            </div>

                            <div v-if="model.architecture" class="model-detail-item">
                                <dt>Architecture</dt>
                                <dd>{{ model.architecture }}</dd>
                            </div>

                            <div v-if="model.quantization" class="model-detail-item">
                                <dt>Quantization</dt>
                                <dd>{{ model.quantization }}</dd>
                            </div>

                            <div v-if="model.maxContextLength" class="model-detail-item">
                                <dt>Max Context Length</dt>
                                <dd>{{ model.maxContextLength }}</dd>
                            </div>

                            <div v-if="model.sizeBytes" class="model-detail-item">
                                <dt>Size</dt>
                                <dd>{{ formatBytes(model.sizeBytes) }}</dd>
                            </div>

                            <div v-if="model.capabilities" class="model-detail-item">
                                <dt>Capabilities (Vision)</dt>
                                <dd>{{ model.capabilities.vision }}</dd>
                            </div>

                            <div v-if="model.capabilities" class="model-detail-item">
                                <dt>Capabilities (Trained for Tool Use)</dt>
                                <dd>{{ model.capabilities.trained_for_tool_use }}</dd>
                            </div>

                            <div v-if="model.loadedInstances.length > 0" class="model-detail-item">
                                <dt>Loaded Instances</dt>
                                <dd>{{ model.loadedInstances.length }}</dd>
                            </div>

                            <div v-if="model.instanceId" class="model-detail-item">
                                <dt>Instance ID</dt>
                                <dd>{{ model.instanceId }}</dd>
                            </div>

                            <div class="model-detail-item">
                                <dt>Status</dt>
                                <dd>{{ model.isLoaded ? "Loaded" : "Not loaded" }}</dd>
                            </div>
                        </dl>

                        <div class="model-card-actions">
                            <button v-if="!model.isLoaded" class="btn-ghost small model-action-btn" type="button"
                                :disabled="pendingModelId === model.id" @click="handleLoad(model.id)">
                                <IconPlayerPlay :size="14" :stroke-width="1.8" />
                                {{ pendingModelId === model.id ? "Loading…" : "Load" }}
                            </button>

                            <button v-else class="btn-ghost small model-action-btn" type="button"
                                :disabled="pendingModelId === model.id" @click="handleUnload(model.id)">
                                <IconPlayerStop :size="14" :stroke-width="1.8" />
                                {{ pendingModelId === model.id ? "Unloading…" : "Unload" }}
                            </button>

                            <button class="btn-primary small model-action-btn" type="button" :disabled="!model.isLoaded"
                                @click="handleSelect(model.id)">
                                <IconCheck v-if="lmStudioApi.getSelectedModel() === model.id" :size="14"
                                    :stroke-width="1.8" />
                                {{
                                    lmStudioApi.getSelectedModel() === model.id ? "Selected" : "Use model"
                                }}
                            </button>
                        </div>
                    </article>
                </div>
            </section>

            <!-- Card: All Running Models -->
            <section class="card">
                <h2>All Running Models</h2>

                <p class="card-hint">
                    List of all models that are currently loaded in memory.
                </p>

                <span v-if="loadedModelsCounter > 0" class="count-badge">
                    {{ loadedModelsCounter }}
                </span>

                <div v-if="loadedModels.length === 0" class="empty-state">
                    No models are currently loaded.
                </div>

                <div v-else class="running-models-list">
                    <ul>
                        <li v-for="model in loadedModels" :key="model.instanceId">
                            {{ model.displayName }} (Instance ID: {{ model.instanceId }})
                        </li>
                    </ul>
                </div>
            </section>

            <!-- Card: Chat defaults -->
            <section class="card chat-defaults-card">
                <!-- Header -->
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

                <!-- Form -->
                <div class="defaults-form">
                    <!-- Temperature Setting -->
                    <div class="default-setting">
                        <div class="setting-label-row">
                            <label for="default-temperature">Temperature</label>

                            <output class="setting-value">
                                {{ temperatureLabel }}
                            </output>
                        </div>

                        <input id="default-temperature" v-model.number="temperature" class="temperature-slider"
                            type="range" min="0" max="1" step="0.1" />

                        <p class="setting-help">
                            Lower values are more predictable; higher values are more creative.
                        </p>
                    </div>

                    <!-- Context Window Setting -->
                    <div class="default-setting">
                        <div class="setting-label-row">
                            <label for="default-context-window">
                                Context window
                            </label>

                            <span class="setting-value">
                                {{ contextWindow.toLocaleString() }} tokens
                            </span>
                        </div>

                        <input id="default-context-window" v-model.number="contextWindow"
                            class="input setting-number-input" type="number" min="512" step="512" />

                        <p class="setting-help">
                            Maximum amount of conversation context available to the model.
                        </p>
                    </div>

                    <!-- Default System Prompt Setting -->
                    <div class="default-setting">
                        <div class="setting-label-row">
                            <label for="default-system-prompt">
                                Default system prompt
                            </label>

                            <span class="setting-optional">
                                Optional
                            </span>
                        </div>

                        <textarea id="default-system-prompt" v-model="systemPrompt" class="input system-prompt-input"
                            rows="4" placeholder="You are a helpful assistant."></textarea>

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
import { ref, computed, watch, onMounted } from 'vue';

import { useLmStudioApi } from "@/services/lmsApiService";
import { useSettingsStore } from "@/stores/useSettingsStore";

import IconArrowUpRight from "@/components/icons/IconArrowUpRight.vue";
import IconLmStudio from "@/components/icons/IconLmStudio.vue";
import IconRefresh from "@/components/icons/IconRefresh.vue";
import IconAlertTriangle from "@/components/icons/IconAlertTriangle.vue";
import IconPackageOff from "@/components/icons/IconPackageOff.vue";
import IconPlayerPlay from "@/components/icons/IconPlayerPlay.vue";
import IconPlayerStop from "@/components/icons/IconPlayerStop.vue";
import IconCheck from "@/components/icons/IconCheck.vue";


const lmStudioApi = useLmStudioApi();
const settingsStore = useSettingsStore();

const isInstalled = ref("");
const isConnected = ref("");
const baseUrlMessage = ref("")
const baseUrlError = ref("")
const pullName = ref("")
const pullNameError = ref("")
const activePullName = ref("")
const selectedInstanceId = ref("")
const unloadMessage = ref("")
const unloadError = ref("")
const selectedModelToLoad = ref("")
const loadMessage = ref("")
const loadError = ref("")
const totalSize = ref("")
const searchQuery = ref("")

const statusFilter = ref("all")

const statusBool = ref(null);
const version = ref(null);
const errorInstalled = ref(null);
const errorConnection = ref(null);
const customPullStatus = ref(null)
const pendingModelId = ref(null);

const resourceLinks = lmStudioApi.getResourceLinks()
const defaults = lmStudioApi.getChatDefaults()

const baseUrl = computed(() => settingsStore.lmStudioApiUrl);
const newBaseUrl = ref(settingsStore.lmStudioApiUrl);
const recommendedModels = ref(lmStudioApi.getRecommendedModels());
const debugEnabled = ref(lmStudioApi.isDebugEnabled());
const temperature = ref(defaults.temperature)
const contextWindow = ref(defaults.contextLength)
const systemPrompt = ref(defaults.systemPrompt)

const allModelsWithDetails = ref([])
const installedNames = ref([])

const modelsCounter = ref(0)
const runningModelsCounter = ref(0)

const isUpdatingBaseUrl = ref(false)
const isUnloading = ref(false)
const isLoadingModel = ref(false)
const isRefreshing = ref(false);

const recommendedPullStatus = ref({}) // key: model.name, value: { state: string, progress: number }

const loadedModels = computed(() => {
    return allModelsWithDetails.value.filter(model => model.isLoaded)
})
const unloadedModels = computed(() => {
    return allModelsWithDetails.value.filter(model => !model.isLoaded)
})
const loadedModelsCounter = computed(() => {
    return allModelsWithDetails.value.filter(model => model.isLoaded).length
}) // getRunningModelsTotalCount() is async and returns a Promise (and not a number), so using a computed property to get the count synchronously

const temperatureLabel = computed(() => {
    return Number(temperature.value).toFixed(1)
})


// async functions
async function reloadStatus() {
    errorInstalled.value = null
    errorConnection.value = null

    try {
        await lmStudioApi.getAllInstalledModels()
        isInstalled.value = await lmStudioApi.isInstalled();
        statusBool.value = await lmStudioApi.status();
        isConnected.value = await lmStudioApi.isConnected();
        version.value = await lmStudioApi.getVersion(); // no API endpoint available

        installedNames.value = await lmStudioApi.getAllModelsNames()
        allModelsWithDetails.value = await lmStudioApi.getAllModelsWithDetails()
        modelsCounter.value = await lmStudioApi.getAllModelsTotalCount()
        totalSize.value = await lmStudioApi.getInstalledModelsTotalSize()
        runningModelsCounter.value = await lmStudioApi.getRunningModelsTotalCount();
    } catch (err) {
        errorInstalled.value = err.message ?? "Error checking installation status.";
        errorConnection.value = err.message ?? "Error checking connection status.";

        isInstalled.value = "Error while checking installation status";
        isConnected.value = "Error while checking connection status";
        version.value = "Error while checking version";
        totalSize.value = "Error while checking total size"

        statusBool.value = null;
        installedNames.value = []
        allModelsWithDetails.value = []
        modelsCounter.value = 0
        runningModelsCounter.value = 0;
    }
}

async function updateBaseUrl() {
    const nextUrl = newBaseUrl.value.trim()

    baseUrlMessage.value = ""
    baseUrlError.value = ""

    if (!nextUrl) {
        baseUrlError.value = "Please enter an LM Studio base URL."
        return
    }

    isUpdatingBaseUrl.value = true

    try {
        settingsStore.lmStudioApiUrl = nextUrl;
        newBaseUrl.value = settingsStore.lmStudioApiUrl;

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
        settingsStore.lmStudioApiUrl = "http://localhost:1234";
        newBaseUrl.value = settingsStore.lmStudioApiUrl;

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

    lmStudioApi.setActivePull(initialPull)

    customPullStatus.value = {
        state: "pulling",
        progress: null,
    }

    try {
        const result = await lmStudioApi.pullModel(name, (progress) => {
            customPullStatus.value = {
                state: toPullUiState(progress.status),
                progress,
            }

            lmStudioApi.setActivePull({
                name,
                jobId: progress.job_id,
                progress,
                startedAt: initialPull.startedAt,
                updatedAt: Date.now(),
            })
        })

        if (!result.success) {
            lmStudioApi.clearActivePull()

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

        lmStudioApi.clearActivePull()
        await reloadStatus()
    } catch (err) {
        const wasPageReloaded = err?.name === "AbortError"

        if (!wasPageReloaded) {
            lmStudioApi.clearActivePull()
        }

        customPullStatus.value = {
            state: "error",
            error: err?.message ?? "Could not download the model.",
        }
    }
}

async function restoreActivePull() {
    const savedPull = lmStudioApi.getActivePull()

    if (!savedPull?.jobId || !savedPull?.name) {
        return
    }

    activePullName.value = savedPull.name

    customPullStatus.value = {
        state: "pulling",
        progress: savedPull.progress ?? null,
    }

    try {
        const result = await lmStudioApi.waitForModelDownload(
            savedPull.jobId,
            progress => {
                customPullStatus.value = {
                    state: toPullUiState(progress.status),
                    progress,
                }

                lmStudioApi.setActivePull({
                    ...savedPull,
                    progress,
                    updatedAt: Date.now(),
                })
            },
        )

        if (!result.success) {
            customPullStatus.value = {
                state: "error",
                error: result.error ?? "Could not resume download status.",
            }
            return
        }

        customPullStatus.value = {
            state: "completed",
            progress: result.status,
        }

        lmStudioApi.clearActivePull()
        await reloadStatus()
    } catch (err) {
        customPullStatus.value = {
            state: "error",
            error: err?.message ?? "Could not retrieve download status.",
        }
    }
}

async function handlePullRecommended(model) {
    const name = model.name

    if (recommendedPullStatus.value[name]?.state === "pulling") {
        return
    }

    if (isPulling.value) {
        return
    }

    recommendedPullStatus.value[name] = {
        state: "pulling",
        progress: null,
        error: null,
    }

    try {
        const result = await lmStudioApi.pullModel(name, (progress) => {
            recommendedPullStatus.value[name] = {
                state: toPullUiState(progress.status),
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
            state: toPullUiState(result.status?.status),
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

async function handleUnloadModel() {
    if (!selectedInstanceId.value || isUnloading.value) {
        return
    }

    unloadMessage.value = ""
    unloadError.value = ""
    isUnloading.value = true

    try {
        const result = await lmStudioApi.unloadModel(selectedInstanceId.value)

        if (!result.success) {
            unloadError.value = result.error ?? "Could not unload model."
            return
        }

        unloadMessage.value = "Model unloaded successfully."
        selectedInstanceId.value = ""

        await reloadStatus()
    } catch (err) {
        unloadError.value = err?.message ?? "Could not unload model."
    } finally {
        isUnloading.value = false
    }
}

async function handleLoadModel() {
    if (!selectedModelToLoad.value || isLoadingModel.value) {
        return
    }

    loadMessage.value = ""
    loadError.value = ""
    isLoadingModel.value = true

    try {
        const result = await lmStudioApi.loadModel(
            selectedModelToLoad.value,
            {
                // TODO: get these values from the chat defaults settings
            },
        )

        if (!result.success) {
            loadError.value = result.error ?? "Could not load model."
            return
        }

        loadMessage.value = result.alreadyLoaded
            ? "Model is already loaded."
            : "Model loaded successfully."

        selectedModelToLoad.value = ""

        await reloadStatus()
    } catch (err) {
        loadError.value = err?.message ?? "Could not load model."
    } finally {
        isLoadingModel.value = false
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

async function handleLoad(modelId) {
    pendingModelId.value = modelId;
    try {
        await lmStudioApi.loadModel(modelId);
        await reloadStatus()
    } catch (error) {
        console.error("Failed to load model:", error);
    } finally {
        pendingModelId.value = null;
    }
}

async function handleUnload(modelId) {
    pendingModelId.value = modelId;
    try {
        await lmStudioApi.unloadModel(modelId);
        await reloadStatus()
    } catch (error) {
        console.error("Failed to unload model:", error);
    } finally {
        pendingModelId.value = null;
    }
}


// helpers
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function toPullUiState(downloadStatus) {
    if (downloadStatus === "downloading") return "pulling"
    if (downloadStatus === "completed") return "completed"
    if (downloadStatus === "already_downloaded") return "completed"
    if (downloadStatus === "paused") return "paused"

    return "error"
}

function getPullProgressPercent(progress) {
    const downloaded = progress?.downloaded_bytes
    const total = progress?.total_size_bytes

    if (!Number.isFinite(downloaded) || !Number.isFinite(total) || total <= 0) {
        return 0
    }

    return Math.min(100, Math.round((downloaded / total) * 100))
}

function validatePullName() {
    const source = pullName.value.trim()

    if (!source) {
        pullNameError.value = ""
        return
    }

    if (!lmStudioApi.isValidLmStudioModelSource(source)) {
        pullNameError.value =
            "Enter a catalog ID (e.g. openai/gpt-oss-20b) or an exact Hugging Face URL."
        return
    }

    pullNameError.value = ""
}

function getRecommendedPullState(name) {
    return recommendedPullStatus.value[name] ?? null
}

function formatModelCount(count) {
    if (!statusBool.value)
        return "Unknown"

    if (count === 0)
        return "No models"

    if (count === 1)
        return "1 model"

    return `${count} models`
}

function formatRunningModelCount(count) {
    if (!statusBool.value)
        return "Unknown"
    if (count === 0) return "No models running"
    if (count === 1) return "1 model running"

    return `${count} models running`
}

function isRecommendedModelInstalled(recommendedModel) {
    const candidates = [
        recommendedModel.name,
        ...(recommendedModel.aliases ?? []),
    ]
        .map((value) => lmStudioApi.normalizeModelValue(value))
        .filter(Boolean);

    if (!candidates.length) {
        return false;
    }

    return allModelsWithDetails.value.some((installedModel) => {
        const installedValues = [
            installedModel.id,
            installedModel.displayName,
            installedModel.path,
        ]
            .map((value) => lmStudioApi.normalizeModelValue(value))
            .filter(Boolean);

        return candidates.some((candidate) => {
            return installedValues.includes(candidate);
        });
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
    return getPullProgressPercent(customPullStatus.value?.progress)
})

const pullCompletedMessage = computed(() => {
    const status = customPullStatus.value?.progress?.status

    if (status === "already_downloaded") {
        return `${activePullName.value} is already installed.`
    }

    return `${activePullName.value} was installed successfully.`
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

const filteredModels = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()

    return allModelsWithDetails.value.filter((model) => {
        const matchesStatus =
            statusFilter.value === "all" ||
            (statusFilter.value === "loaded" && model.isLoaded) ||
            (statusFilter.value === "not-loaded" && !model.isLoaded)

        if (!matchesStatus) {
            return false
        }

        if (!query) {
            return true
        }

        const searchableValues = [
            model.displayName,
            model.id,
            model.publisher,
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


// watchers
watch(
    [temperature, contextWindow, systemPrompt],
    ([nextTemperature, nextContextWindow, nextSystemPrompt]) => {
        lmStudioApi.saveChatDefaults({
            temperature: nextTemperature,
            contextLength: nextContextWindow,
            systemPrompt: nextSystemPrompt,
        })
    },
)


// mounted lifecycle hooks
onMounted(async () => {
    await restoreActivePull()
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
    max-width: var(--max-width);
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
    align-items: center;
    gap: 0.5rem;
    max-width: var(--max-width);
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
    background: var(--color-error, #ef4444);
    border-radius: 50%;
}

.status-dot.connected,
.status-dot.online {
    background: #6daa45;
    box-shadow: 0 0 0 3px oklch(from #6daa45 l c h / 0.15);
}

.status-dot.disconnected {
    background: var(--color-error);
    box-shadow: 0 0 0 3px oklch(from var(--color-error) l c h / 0.15);
}

/* Offline state */
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

/* General information */
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
    display: flex;
    flex-direction: column;
}

.info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--color-divider);
}

.info-row:last-child {
    border-bottom: none;
}

.info-label {
    flex-shrink: 0;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    font-weight: 500;
}

.info-value {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text);
    font-size: var(--text-sm);
    font-weight: 600;
    text-align: right;
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

/* Model downloading */
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

/* Model load and unload controls */
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

/* Model detail cards */
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

.model-card-actions {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-4);
}

.model-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    flex: 1;
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

/* Shared navigation icon */
.nav-icon svg {
    display: block;
    width: 20px;
    height: 20px;
}

/* Touch-device input sizing */
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

    .header-status {
        display: none;
    }

    .models-content {
        gap: 0.6rem;
        max-width: none;
    }

    /* Cards and generic controls */
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

    /* Download form */
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

    /* Information rows */
    .info-row {
        flex-wrap: wrap;
        gap: 0.3rem;
        padding: 0.5rem 0;
    }

    .info-label,
    .info-value {
        font-size: 12px;
    }

    .info-value.mono {
        max-width: none;
        font-size: 10px;
    }

    /* Load and unload controls */
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

    .select-row {
        align-items: stretch;
        flex-direction: column;
    }

    .select {
        width: 100%;
        min-width: 0;
    }

    /* Legacy model cards */
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

    /* Model detail cards */
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

    .model-card-actions {
        flex-direction: column;
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
