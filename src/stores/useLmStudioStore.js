// src/stores/useLmStudioStore.js

/// Provides a client for the local LM Studio REST API.
/// Manages the server connection, persisted preferences and chat defaults,
/// installed and running model caches, downloads and chat sessions with SSE streaming.

import { isValidLmStudioModelId } from "@/utils/validation";
import { aiConfig } from "@/config/ai";

const DEFAULT_BASE_URL = "http://localhost:1234";
const BASE_URL_STORAGE_KEY = "lmstudio-api-url";
const DEBUG_STORAGE_KEY = "lmstudio-debug-enabled";
const SELECTED_MODEL_STORAGE_KEY = "selectedModel";
const CHAT_DEFAULTS_STORAGE_KEY = "lmstudio-chat-defaults";
const ACTIVE_PULL_STORAGE_KEY = "localai-active-lmstudio-download";

const DEFAULT_DEBUG_ENABLED = true;
const UNKNOWN_VERSION = "Unknown";
const REQUEST_TIMEOUT_MS = 5_000;
const MODEL_LOAD_TIMEOUT_MS = 120_000;
const MIN_CONTEXT_LENGTH = 512;

const MODEL_UNLOAD_TIMEOUT_MS = 15_000;
const MODEL_DOWNLOAD_TIMEOUT_MS = 15_000;
const DOWNLOAD_STATUS_TIMEOUT_MS = 10_000;
const DOWNLOAD_POLL_INTERVAL_MS = 1_000;
const CHAT_REQUEST_TIMEOUT_MS = 120_000;

const BYTE_UNITS = ["Bytes", "KB", "MB", "GB", "TB"];
const BYTES_PER_KILOBYTE = 1_024;
const DEFAULT_BYTE_DECIMALS = 2;

const SSE_EVENT_TYPES = {
    CHAT_END: "chat.end",
    ERROR: "error",
    MESSAGE_DELTA: "message.delta",
    REASONING_DELTA: "reasoning.delta",
};

const DOWNLOAD_STATUS = {
    ALREADY_DOWNLOADED: "already_downloaded",
    COMPLETED: "completed",
    DOWNLOADING: "downloading",
    FAILED: "failed",
    PAUSED: "paused",
};

const API_PATHS = {
    MODELS: "/api/v1/models",
    LOAD_MODEL: "/api/v1/models/load",
    UNLOAD_MODEL: "/api/v1/models/unload",
    DOWNLOAD_MODEL: "/api/v1/models/download",
    DOWNLOAD_STATUS: "/api/v1/models/download/status",
    CHAT: "/api/v1/chat",
};

const DEFAULT_CHAT_DEFAULTS = {
    temperature: 0.7,
    contextLength: 4_096,
    systemPrompt: "You are a helpful assistant.",
};

const RECOMMENDED_MODELS = [
    {
        name: "openai/gpt-oss-20b",
        label: "GPT-OSS 20B",
        aliases: [
            "openai/gpt-oss-20b",
            "gpt-oss-20b",
            "gpt oss 20b",
            "gpt-oss",
            "openai gpt-oss-20b",
        ],
        description: "Strong general-purpose local model.",
        size: "Large",
        url: "https://lmstudio.ai/models/openai/gpt-oss-20b",
    },
    {
        name: "google/gemma-4-12b-qat",
        label: "Gemma 4 12B QAT",
        aliases: [
            "google/gemma-4-12b-qat",
            "gemma-4-12b-qat",
            "gemma 4 12b qat",
            "google gemma-4-12b-qat",
            "gemma-4-12b",
        ],
        description: "Strong general-purpose local model.",
        size: "Large",
        url: "https://lmstudio.ai/models/google/gemma-4-12b-qat",
    },
    {
        name: "google/gemma-3-12b",
        label: "Gemma 3 12B",
        aliases: [
            "google/gemma-3-12b",
            "gemma-3-12b",
            "gemma 3 12b",
            "google gemma-3-12b",
            "gemma-3",
        ],
        description: "Balanced instruction model with strong quality for its size.",
        size: "Medium",
        url: "https://lmstudio.ai/models/google/gemma-3-12b",
    },
    {
        name: "qwen/qwen3-8b",
        label: "Qwen 3 8B",
        aliases: [
            "qwen/qwen3-8b",
            "qwen3-8b",
            "qwen 3 8b",
            "qwen/qwen-3-8b",
            "qwen3",
        ],
        description: "Compact multilingual assistant model.",
        size: "Medium",
        url: "https://lmstudio.ai/models/qwen/qwen3-8b",
    },
    {
        name: "nomic-ai/text-embedding-nomic-embed-text-v1.5",
        label: "Nomic Embed Text v1.5",
        aliases: [
            "nomic-ai/text-embedding-nomic-embed-text-v1.5",
            "text-embedding-nomic-embed-text-v1.5",
            "nomic-embed-text-v1.5",
            "nomic embed text v1.5",
            "embed-text-v1.5",
            "nomic embed",
        ],
        description: "Embedding model for search and retrieval tasks.",
        size: "Small",
        url: "https://lmstudio.ai/models/nomic-ai/text-embedding-nomic-embed-text-v1-5",
    },
];

const RESOURCE_LINKS = [
    {
        label: "Documentation",
        url: "https://lmstudio.ai/docs",
    },
    {
        label: "REST API Reference",
        url: "https://lmstudio.ai/docs/developer/rest",
    },
    {
        label: "CLI Reference",
        url: "https://lmstudio.ai/docs/cli",
    },
    {
        label: "Model Catalog (Search)",
        url: "https://lmstudio.ai/models",
    },
];


/**
 * Normalizes a server URL by removing whitespace and trailing slashes.
 *
 * @param {string} url URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeUrl(url = "") {
    return String(url).trim().replace(/\/+$/, "");
}

/**
 * Restricts a value to an inclusive numeric range.
 *
 * @param {number} value Value to limit
 * @param {number} minimum Minimum allowed value
 * @param {number} maximum Maximum allowed value
 * @returns {number} Limited value
 */
function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
}


/**
 * Provides access to LM Studio's local REST API.
 */
export class LmStudioApi {
    constructor() {
        this.versionCache = UNKNOWN_VERSION;
        this.baseUrl = this.getStoredBaseUrl();
        this.debugEnabled = this.getStoredDebugSetting();

        this.allModelsCache = null;
        this.runningModelCache = null;
        this.selectedModel = this.safeGetStorage(SELECTED_MODEL_STORAGE_KEY);

        this.chatDefaults = this.loadChatDefaults();
    }

    /**
     * Reads the saved API base URL and validates it.
     *
     * @returns {string} Valid saved URL or the default URL
     */
    getStoredBaseUrl() {
        const storedUrl = normalizeUrl(
            this.safeGetStorage(BASE_URL_STORAGE_KEY),
        );

        return this.isValidUrl(storedUrl)
            ? storedUrl
            : DEFAULT_BASE_URL;
    }

    /**
     * Reads the persisted debug preference.
     *
     * @returns {boolean} Whether debug logging is enabled
     */
    getStoredDebugSetting() {
        const storedValue = this.safeGetStorage(DEBUG_STORAGE_KEY);

        if (storedValue === null)
            return DEFAULT_DEBUG_ENABLED;

        return storedValue === "true";
    }

    /**
     * Loads and validates persisted chat defaults.
     *
     * @returns {{
     *     temperature: number,
     *     contextLength: number,
     *     systemPrompt: string
     * }} Validated chat defaults
     */
    loadChatDefaults() {
        const storedDefaults = this.safeGetStorage(CHAT_DEFAULTS_STORAGE_KEY);

        if (!storedDefaults)
            return { ...DEFAULT_CHAT_DEFAULTS };

        try {
            const parsedDefaults = JSON.parse(storedDefaults);

            return {
                temperature: clamp(
                    Number(parsedDefaults.temperature) ||
                    DEFAULT_CHAT_DEFAULTS.temperature,
                    0,
                    1,
                ),
                contextLength: Math.max(
                    MIN_CONTEXT_LENGTH,
                    Math.floor(
                        Number(parsedDefaults.contextLength) ||
                        DEFAULT_CHAT_DEFAULTS.contextLength,
                    ),
                ),
                systemPrompt: typeof parsedDefaults.systemPrompt === "string"
                    ? parsedDefaults.systemPrompt
                    : DEFAULT_CHAT_DEFAULTS.systemPrompt,
            };
        } catch {
            return { ...DEFAULT_CHAT_DEFAULTS };
        }
    }

    /**
     * Saves validated default settings for future chat requests.
     *
     * @param {Partial<{
     *     temperature: number,
     *     contextLength: number,
     *     systemPrompt: string
     * }>} defaults New default values
     * @returns {{
     *     temperature: number,
     *     contextLength: number,
     *     systemPrompt: string
     * }} Updated chat defaults
     */
    saveChatDefaults(defaults = {}) {
        const nextDefaults = {
            ...this.chatDefaults,
            ...defaults,
        };

        this.chatDefaults = {
            temperature: clamp(
                Number(nextDefaults.temperature) ||
                DEFAULT_CHAT_DEFAULTS.temperature,
                0,
                1,
            ),
            contextLength: Math.max(
                MIN_CONTEXT_LENGTH,
                Math.floor(
                    Number(nextDefaults.contextLength) ||
                    DEFAULT_CHAT_DEFAULTS.contextLength,
                ),
            ),
            systemPrompt: String(nextDefaults.systemPrompt ?? ""),
        };

        this.safeSetStorage(
            CHAT_DEFAULTS_STORAGE_KEY,
            JSON.stringify(this.chatDefaults),
        );

        return this.getChatDefaults();
    }

    /**
     * Returns a copy of the configured chat defaults.
     *
     * @returns {{
     *     temperature: number,
     *     contextLength: number,
     *     systemPrompt: string
     * }} Current chat defaults
     */
    getChatDefaults() {
        return { ...this.chatDefaults };
    }

    /**
     * Sends a request with a timeout while preserving an optional abort signal.
     *
     * @param {string} url Request URL
     * @param {RequestInit} [options={}] Fetch options
     * @param {number} [timeoutMs=5000] Request timeout in milliseconds
     * @returns {Promise<Response>} Fetch response
     */
    async fetchWithTimeout(
        url,
        { signal: parentSignal, ...options } = {},
        timeoutMs = REQUEST_TIMEOUT_MS,
    ) {
        if (!aiConfig.localAiEnabled) {
            throw new Error("Local AI is disabled in this build.");
        }

        const timeoutController = new AbortController();
        const timeoutId = window.setTimeout(
            () => timeoutController.abort(),
            timeoutMs,
        );

        const abortRequest = () => timeoutController.abort();
        parentSignal?.addEventListener("abort", abortRequest, { once: true });

        try {
            return await fetch(url, {
                ...options,
                signal: timeoutController.signal,
            });
        } finally {
            window.clearTimeout(timeoutId);
            parentSignal?.removeEventListener("abort", abortRequest);
        }
    }

    /**
     * Returns the cached LM Studio version.
     *
     * @returns {Promise<string>} Cached LM Studio version
     */
    async getVersion() {
        this.debugLog(
            "Returning cached LM Studio version:",
            this.versionCache,
        );

        return this.versionCache;
    }

    /**
     * Returns the curated list of recommended models.
     *
     * @returns {Array<Object>} Recommended model definitions
     */
    getRecommendedModels() {
        return RECOMMENDED_MODELS.map((model) => ({
            ...model,
            aliases: [...model.aliases],
        }));
    }

    /**
     * Checks whether the configured LM Studio server is reachable.
     *
     * @returns {Promise<boolean>} True when the server returned a successful response
     */
    async status() {
        if (!aiConfig.localAiEnabled) {
            this.debugLog("Local AI disabled in this build; skipping status check.");
            return false;
        }

        try {
            const response = await this.fetchWithTimeout(
                `${this.getBaseUrl()}${API_PATHS.MODELS}`,
            );

            this.debugLog("LM Studio status response:", response);

            return response.ok;
        } catch (error) {
            this.errorLog("LM Studio status check failed:", error);
            return false;
        }
    }

    /**
     * Returns a human-readable LM Studio installation status.
     *
     * @returns {Promise<string>} Installation status
     */
    async isInstalled() {
        const isAvailable = await this.status();

        this.debugLog(
            isAvailable
                ? "LM Studio installation verified."
                : "Could not verify LM Studio installation.",
        );

        return isAvailable
            ? "Installed"
            : "Could not verify installation";
    }

    /**
     * Returns a human-readable LM Studio connection status.
     *
     * @returns {Promise<string>} Connection status
     */
    async isConnected() {
        const isAvailable = await this.status();

        this.debugLog(
            isAvailable
                ? "LM Studio connection verified."
                : "Could not verify LM Studio connection.",
        );

        return isAvailable
            ? "Connected"
            : "Could not verify connection";
    }

    /**
     * Returns the configured LM Studio API URL.
     *
     * @returns {string} API base URL
     */
    getBaseUrl() {
        return this.baseUrl;
    }

    /**
     * Checks whether a value is a valid absolute HTTP(S) URL.
     *
     * @param {string} url URL to validate
     * @returns {boolean} True when the URL is valid
     */
    isValidUrl(url) {
        try {
            const parsedUrl = new URL(url);

            return ["http:", "https:"].includes(parsedUrl.protocol);
        } catch {
            return false;
        }
    }

    /**
     * Clears model caches after state-changing operations.
     */
    invalidateCaches() {
        this.allModelsCache = null;
        this.runningModelCache = null;
    }

    /**
     * Updates and persists the LM Studio API URL.
     *
     * @param {string} newUrl New API base URL
     * @returns {string} Updated normalized URL
     * @throws {Error} When the URL is invalid
     */
    setBaseUrl(newUrl) {
        const baseUrl = normalizeUrl(newUrl);

        if (!this.isValidUrl(baseUrl))
            throw new Error(`Invalid LM Studio URL: ${baseUrl}`);

        this.baseUrl = baseUrl;
        this.safeSetStorage(BASE_URL_STORAGE_KEY, baseUrl);
        this.invalidateCaches();

        return baseUrl;
    }

    /**
     * Restores the default LM Studio API URL.
     */
    resetBaseUrl() {
        this.baseUrl = DEFAULT_BASE_URL;
        this.safeSetStorage(BASE_URL_STORAGE_KEY, DEFAULT_BASE_URL);
        this.invalidateCaches();
    }

    /**
     * Toggles and persists debug logging.
     *
     * @returns {boolean} Updated debug setting
     */
    toggleDebug() {
        this.debugEnabled = !this.debugEnabled;
        this.safeSetStorage(DEBUG_STORAGE_KEY, String(this.debugEnabled));

        return this.debugEnabled;
    }

    /**
     * Returns whether debug logging is enabled.
     *
     * @returns {boolean} True when debug logging is enabled
     */
    isDebugEnabled() {
        return this.debugEnabled;
    }

    /**
     * Retrieves and normalizes all models installed in LM Studio.
     *
     * @returns {Promise<Array<Object>>} Normalized installed models
     */
    async getAllInstalledModels() {
        try {
            const response = await this.fetchWithTimeout(
                `${this.getBaseUrl()}${API_PATHS.MODELS}`,
            );

            if (!response.ok)
                throw new Error(
                    `Could not fetch models (${response.status} ${response.statusText}).`,
                );

            const data = await response.json();
            const rawModels = Array.isArray(data.models) ? data.models : [];

            this.allModelsCache = rawModels.map((model) => {
                const loadedInstances = Array.isArray(model.loaded_instances)
                    ? model.loaded_instances
                    : [];

                return {
                    id: model.key,
                    displayName: model.display_name || model.key,
                    path: model.path ?? "",
                    type: model.type,
                    publisher: model.publisher,
                    architecture: model.architecture,
                    quantization: model.quantization?.name,
                    paramsString: model.params_string,
                    maxContextLength: model.max_context_length,
                    sizeBytes: model.size_bytes,
                    format: model.format,
                    capabilities: model.capabilities ?? [],
                    loadedInstances,
                    isLoaded: loadedInstances.length > 0,
                    instanceId: loadedInstances[0]?.id ?? null,
                };
            });

            return this.allModelsCache;
        } catch (error) {
            this.errorLog("Could not fetch LM Studio models:", error);
            this.allModelsCache = null;
            this.runningModelCache = null;

            throw error;
        }
    }

    /**
     * Returns detailed installed-model data, fetching it when necessary.
     *
     * @returns {Promise<Array<Object>>} Installed models
     */
    async getAllModelsWithDetails() {
        if (this.allModelsCache === null) {
            await this.getAllInstalledModels();
            this.debugLog(
                "Fetched detailed LM Studio model data:",
                this.allModelsCache,
            );
        }

        return this.allModelsCache;
    }

    /**
     * Returns installed models formatted for selection controls.
     *
     * @returns {Promise<Array<{ id: string, displayName: string }>>} Selectable models
     */
    async getAllModelsForSelection() {
        const models = await this.getAllModelsWithDetails();

        return models.map((model) => ({
            id: model.id,
            displayName: model.displayName,
        }));
    }

    /**
     * Returns display names of all installed models.
     *
     * @returns {Promise<string[]>} Installed model names
     */
    async getAllModelsNames() {
        const models = await this.getAllModelsWithDetails();

        return models.map((model) => model.displayName);
    }

    /**
     * Returns the number of installed models.
     *
     * @returns {Promise<number>} Installed model count
     */
    async getAllModelsTotalCount() {
        const models = await this.getAllModelsWithDetails();

        return models.length;
    }

    /**
     * Refreshes and returns the installed-model cache.
     *
     * @returns {Promise<Array<Object>>} Updated installed models
     */
    async refreshModelsCache() {
        this.invalidateCaches();

        return this.getAllInstalledModels();
    }

    /**
     * Returns models that currently have a loaded instance.
     *
     * @returns {Promise<Array<Object>>} Running models
     */
    async getAllRunningModels() {
        const allModels = await this.getAllModelsWithDetails();

        this.runningModelCache = allModels.filter((model) => model.isLoaded);

        return this.runningModelCache;
    }

    /**
     * Returns display names of currently running models.
     *
     * @returns {Promise<string[]>} Running model names
     */
    async getRunningModelsNames() {
        if (this.runningModelCache === null)
            await this.getAllRunningModels();

        return this.runningModelCache.map((model) => model.displayName);
    }

    /**
     * Returns the number of currently running models.
     *
     * @returns {Promise<number>} Running model count
     */
    async getRunningModelsTotalCount() {
        if (this.runningModelCache === null)
            await this.getAllRunningModels();

        return this.runningModelCache.length;
    }

    /**
     * Refreshes and returns the cache of currently running models.
     *
     * @returns {Promise<Array<Object>>} Updated running models
     */
    async refreshRunningModelsCache() {
        const allModels = await this.refreshModelsCache();

        this.runningModelCache = allModels.filter((model) => model.isLoaded);

        return this.runningModelCache;
    }

    /**
     * Loads an installed model into LM Studio.
     *
     * @param {string} modelId Installed model identifier
     * @param {Object} [options={}] Optional LM Studio load settings
     * @param {number} [options.contextLength] Context length
     * @param {number} [options.evalBatchSize] Evaluation batch size
     * @param {boolean} [options.flashAttention] Enables flash attention
     * @param {boolean} [options.offloadKvCacheToGpu] Enables KV-cache GPU offloading
     * @param {number} [options.numExperts] Number of active experts
     * @returns {Promise<Object>} Load result
     */
    async loadModel(modelId, options = {}) {
        if (!isValidLmStudioModelId(modelId)) {
            return {
                success: false,
                error: "Missing or invalid LM Studio model ID.",
            };
        }

        const models = await this.getAllModelsWithDetails();
        const normalizedModelId = this.normalizeModelValue(modelId);

        const model = models.find((item) => {
            return this.normalizeModelValue(item.id) === normalizedModelId;
        });

        if (!model) {
            return {
                success: false,
                error: `Model "${modelId}" is not installed.`,
            };
        }

        if (model.isLoaded) {
            return {
                success: true,
                alreadyLoaded: true,
                instanceId: model.instanceId,
                message: `Model "${model.displayName}" is already loaded.`,
            };
        }

        const body = {
            model: model.id,
            echo_load_config: true,
        };

        if (Number.isInteger(options.contextLength) && options.contextLength > 0)
            body.context_length = options.contextLength;

        if (Number.isInteger(options.evalBatchSize) && options.evalBatchSize > 0)
            body.eval_batch_size = options.evalBatchSize;

        if (typeof options.flashAttention === "boolean")
            body.flash_attention = options.flashAttention;

        if (typeof options.offloadKvCacheToGpu === "boolean") {
            body.offload_kv_cache_to_gpu = options.offloadKvCacheToGpu;
        }

        if (Number.isInteger(options.numExperts) && options.numExperts > 0)
            body.num_experts = options.numExperts;

        try {
            const response = await this.fetchWithTimeout(
                `${this.getBaseUrl()}${API_PATHS.LOAD_MODEL}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                },
                MODEL_LOAD_TIMEOUT_MS,
            );

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                return {
                    success: false,
                    error: data?.error ??
                        data?.message ??
                        `Could not load model (${response.status} ${response.statusText}).`,
                };
            }

            await this.refreshModelsCache();

            return {
                success: true,
                instanceId: data?.instance_id ?? null,
                status: data,
            };
        } catch (error) {
            this.errorLog("Could not load LM Studio model:", error);

            return {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Could not load model.",
            };
        }
    }

    /**
     * Unloads a running model instance from LM Studio.
     *
     * @param {string} instanceId ID of the loaded model instance
     * @returns {Promise<Object>} Unload result
     */
    async unloadModel(instanceId) {
        if (typeof instanceId !== "string" || !instanceId.trim()) {
            return {
                success: false,
                error: "Missing model instance ID.",
            };
        }

        try {
            const response = await this.fetchWithTimeout(
                `${this.getBaseUrl()}${API_PATHS.UNLOAD_MODEL}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        instance_id: instanceId,
                    }),
                },
                MODEL_UNLOAD_TIMEOUT_MS,
            );

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                return {
                    success: false,
                    error: data?.error ??
                        data?.message ??
                        `Could not unload model (${response.status} ${response.statusText}).`,
                };
            }

            await this.refreshModelsCache();

            return {
                success: true,
                data,
            };
        } catch (error) {
            this.errorLog("Could not unload LM Studio model:", error);

            return {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Could not unload model.",
            };
        }
    }

    /**
     * Checks whether an installed model currently has a loaded instance.
     *
     * @param {string} modelId Model identifier or display name
     * @returns {Promise<boolean>} True when the model is loaded
     */
    async isModelLoaded(modelId) {
        const normalizedModelId = this.normalizeModelValue(modelId);

        if (!normalizedModelId)
            return false;

        const models = await this.getAllModelsWithDetails();

        return models.some((model) => {
            const matchesId =
                this.normalizeModelValue(model.id) === normalizedModelId;
            const matchesDisplayName =
                this.normalizeModelValue(model.displayName) ===
                normalizedModelId;

            return model.isLoaded && (matchesId || matchesDisplayName);
        });
    }

    /**
     * Indicates that model deletion is not supported by the LM Studio API.
     *
     * @returns {Promise<{ success: false, error: string }>} Unsupported-operation result
     */
    async removeModel() {
        return {
            success: false,
            error: "Deleting models is not supported by the LM Studio API.",
        };
    }

    /**
     * Normalizes a model identifier for case-insensitive comparisons.
     *
     * @param {unknown} value Model value to normalize
     * @returns {string} Normalized model value
     */
    normalizeModelValue(value = "") {
        return String(value)
            .trim()
            .toLocaleLowerCase()
            .replace(/\\/g, "/");
    }

    /**
     * Escapes special regular-expression characters in a string.
     *
     * @param {string} value Raw string value
     * @returns {string} Regular-expression-safe string
     */
    escapeRegExp(value = "") {
        return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    /**
     * Checks whether an installed model matches an ID or recommendation definition.
     *
     * @param {string | { name?: string, aliases?: string[] }} modelOrDefinition Model to find
     * @returns {Promise<boolean>} True when a matching model is installed
     */
    async isModelInstalled(modelOrDefinition) {
        const modelDefinition = typeof modelOrDefinition === "object" &&
            modelOrDefinition !== null
            ? modelOrDefinition
            : null;

        const valuesToMatch = [
            modelDefinition?.name ?? modelOrDefinition,
            ...(modelDefinition?.aliases ?? []),
        ]
            .map((value) => this.normalizeModelValue(value))
            .filter(Boolean);

        if (valuesToMatch.length === 0)
            return false;

        const installedModels = await this.getAllModelsWithDetails();

        return installedModels.some((installedModel) => {
            const id = this.normalizeModelValue(installedModel.id);
            const displayName = this.normalizeModelValue(
                installedModel.displayName,
            );
            const path = this.normalizeModelValue(installedModel.path);

            return valuesToMatch.some((candidate) => {
                const hasExactMatch =
                    id === candidate || displayName === candidate;

                if (hasExactMatch)
                    return true;

                return candidate.includes("/") && path.includes(candidate);
            });
        });
    }

    /**
     * Starts a model download and waits until it reaches a final state.
     *
     * @param {string} modelSource LM Studio catalog ID or Hugging Face repository URL
     * @param {(status: Object) => void | null} [onProgress=null] Download progress callback
     * @returns {Promise<Object>} Download result
     */
    async pullModel(modelSource, onProgress = null) {
        const startResult = await this.downloadModel(modelSource);

        if (!startResult.success)
            return startResult;

        const initialStatus = startResult.status;

        if (
            initialStatus.status === DOWNLOAD_STATUS.ALREADY_DOWNLOADED ||
            initialStatus.status === DOWNLOAD_STATUS.COMPLETED
        ) {
            await this.refreshModelsCache();

            return {
                success: true,
                status: initialStatus,
            };
        }

        if (!initialStatus.job_id) {
            return {
                success: false,
                error: "LM Studio did not return a download job ID.",
            };
        }

        this.setActivePull({
            jobId: initialStatus.job_id,
            modelSource,
            startedAt: new Date().toISOString(),
        });

        return this.waitForModelDownload(
            initialStatus.job_id,
            onProgress,
        );
    }

    /**
     * Validates an LM Studio catalog ID or Hugging Face repository URL.
     *
     * @param {unknown} value Candidate model source
     * @returns {boolean} True when the source has a supported format
     */
    isValidLmStudioModelSource(value) {
        if (isValidLmStudioModelId(source))
            return false;

        const source = value.trim();

        if (isValidLmStudioModelId(source))
            return true;

        const isCatalogIdentifier =
            /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/
                .test(source);

        if (isCatalogIdentifier)
            return true;

        try {
            const url = new URL(source);
            const isHuggingFaceHost =
                url.hostname === "huggingface.co" ||
                url.hostname === "www.huggingface.co";
            const pathSegments = url.pathname.split("/").filter(Boolean);

            return url.protocol === "https:" &&
                isHuggingFaceHost &&
                pathSegments.length >= 2;
        } catch {
            return false;
        }
    }

    /**
     * Persists the currently active download job.
     *
     * @param {Object} pull Active download data
     */
    setActivePull(pull) {
        this.safeSetStorage(
            ACTIVE_PULL_STORAGE_KEY,
            JSON.stringify(pull),
        );
    }

    /**
     * Reads the persisted active download job.
     *
     * @returns {Object | null} Active download data or null
     */
    getActivePull() {
        try {
            const storedPull = this.safeGetStorage(ACTIVE_PULL_STORAGE_KEY);

            return storedPull ? JSON.parse(storedPull) : null;
        } catch {
            return null;
        }
    }

    /**
     * Removes the persisted active download job.
     */
    clearActivePull() {
        try {
            localStorage.removeItem(ACTIVE_PULL_STORAGE_KEY);
        } catch {
            // localStorage is unavailable.
        }
    }

    /**
     * Starts a model download without polling for completion.
     *
     * @param {string} modelSource LM Studio catalog ID or Hugging Face repository URL
     * @param {string | null} [quantization=null] Optional model quantization
     * @returns {Promise<Object>} Download-start result
     */
    async downloadModel(modelSource, quantization = null) {
        const source = typeof modelSource === "string"
            ? modelSource.trim()
            : "";

        if (!this.isValidLmStudioModelSource(source)) {
            return {
                success: false,
                error: "Use an LM Studio catalog identifier (for example, openai/gpt-oss-20b) or an exact Hugging Face repository URL.",
            };
        }

        const body = {
            model: source,
        };

        if (typeof quantization === "string" && quantization.trim())
            body.quantization = quantization.trim();

        try {
            const response = await this.fetchWithTimeout(
                `${this.getBaseUrl()}${API_PATHS.DOWNLOAD_MODEL}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                },
                MODEL_DOWNLOAD_TIMEOUT_MS,
            );

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                return {
                    success: false,
                    error: data?.error ??
                        data?.message ??
                        `Could not start model download (${response.status} ${response.statusText}).`,
                };
            }

            if (data?.status === DOWNLOAD_STATUS.FAILED) {
                return {
                    success: false,
                    error: data.error ??
                        "LM Studio rejected the model download.",
                    status: data,
                };
            }

            return {
                success: true,
                status: data,
            };
        } catch (error) {
            this.errorLog("Could not start LM Studio model download:", error);

            return {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Could not start model download.",
            };
        }
    }

    /**
     * Retrieves the current status of an LM Studio download job.
     *
     * @param {string} jobId Download job identifier
     * @returns {Promise<Object>} Current download status
     */
    async getModelDownloadStatus(jobId) {
        if (typeof jobId !== "string" || !jobId.trim())
            throw new Error("Missing LM Studio download job ID.");

        const response = await this.fetchWithTimeout(
            `${this.getBaseUrl()}${API_PATHS.DOWNLOAD_STATUS}/${encodeURIComponent(jobId)}`,
            {
                method: "GET",
            },
            DOWNLOAD_STATUS_TIMEOUT_MS,
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(
                data?.error ??
                data?.message ??
                `Could not get download status (${response.status} ${response.statusText}).`,
            );
        }

        return data;
    }

    /**
     * Waits for a model download to complete, fail, or pause.
     *
     * @param {string} jobId Download job identifier
     * @param {(status: Object) => void | null} [onProgress=null] Progress callback
     * @returns {Promise<Object>} Final download result
     */
    async waitForModelDownload(jobId, onProgress = null) {
        try {
            while (true) {
                const status = await this.getModelDownloadStatus(jobId);

                if (typeof onProgress === "function")
                    onProgress(status);

                if (status.status === DOWNLOAD_STATUS.COMPLETED) {
                    await this.refreshModelsCache();
                    this.clearActivePull();

                    return {
                        success: true,
                        status,
                    };
                }

                if (status.status === DOWNLOAD_STATUS.FAILED) {
                    this.clearActivePull();

                    return {
                        success: false,
                        error: status.error ?? "The LM Studio download failed.",
                        status,
                    };
                }

                if (status.status === DOWNLOAD_STATUS.PAUSED) {
                    return {
                        success: false,
                        error: "The LM Studio download is paused.",
                        status,
                    };
                }

                await new Promise((resolve) => {
                    window.setTimeout(resolve, DOWNLOAD_POLL_INTERVAL_MS);
                });
            }
        } catch (error) {
            this.errorLog("Could not monitor LM Studio model download:", error);

            return {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Could not monitor model download.",
            };
        }
    }

    /**
     * Extracts concatenated assistant text from an LM Studio output array.
     *
     * @param {unknown} output LM Studio response output
     * @returns {string} Extracted assistant text
     */
    extractTextFromOutput(output = []) {
        if (!Array.isArray(output))
            return "";

        return output
            .filter((item) => item?.type === "message")
            .map((item) => item.content ?? "")
            .join("");
    }

    /**
     * Merges global chat defaults with request-specific settings.
     *
     * Undefined properties are intentionally omitted by JSON.stringify().
     *
     * @param {Object} [options={}] Request-specific chat settings
     * @returns {Object} LM Studio chat request settings
     */
    buildChatSettings(options = {}) {
        const mergedSettings = {
            ...this.chatDefaults,
            ...options,
        };

        return {
            temperature: mergedSettings.temperature,
            context_length: mergedSettings.contextLength,
            system_prompt: mergedSettings.systemPrompt || undefined,
            top_p: mergedSettings.topP,
            top_k: mergedSettings.topK,
            min_p: mergedSettings.minP,
            repeat_penalty: mergedSettings.repeatPenalty,
            max_output_tokens: mergedSettings.maxOutputTokens,
            reasoning: mergedSettings.reasoning,
        };
    }

    /**
     * Sends a single non-streaming chat request without server-side history.
     *
     * @param {string} modelId Loaded LM Studio model identifier
     * @param {string} prompt User prompt
     * @param {Object} [options={}] Optional generation settings
     * @returns {Promise<Object>} Chat result
     */
    async generateResponse(modelId, prompt, options = {}) {
        if (typeof modelId !== "string" || !modelId.trim()) {
            return {
                success: false,
                error: "Invalid model ID.",
            };
        }

        if (typeof prompt !== "string" || !prompt.trim()) {
            return {
                success: false,
                error: "Invalid prompt.",
            };
        }

        const settings = this.buildChatSettings(options);

        try {
            const response = await this.fetchWithTimeout(
                `${this.getBaseUrl()}${API_PATHS.CHAT}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: modelId.trim(),
                        input: prompt.trim(),
                        stream: false,
                        store: false,
                        ...settings,
                    }),
                },
                CHAT_REQUEST_TIMEOUT_MS,
            );

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(
                    data?.error?.message ??
                    data?.error ??
                    data?.message ??
                    `Chat request failed (${response.status} ${response.statusText}).`,
                );
            }

            const content = this.extractTextFromOutput(data?.output);

            this.debugLog("LM Studio non-streaming response:", data);

            return {
                success: true,
                response: content,
                raw: data,
                stats: data?.stats ?? null,
                modelInstanceId: data?.model_instance_id ?? null,
            };
        } catch (error) {
            this.errorLog("LM Studio chat request failed:", error);

            return {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Chat request failed.",
            };
        }
    }

    /**
     * Creates an in-memory chat session that uses LM Studio's server-side
     * response chain to retain conversation context between requests.
     *
     * @param {string} modelId Loaded LM Studio model identifier
     * @param {Object} [options={}] Initial chat generation settings
     * @returns {{
     *     model: string,
     *     readonly options: Object,
     *     readonly history: Array<{ role: string, content: string }>,
     *     readonly previousResponseId: string | null,
     *     send: (
     *         message: string,
     *         onProgress?: ((event: Object) => void) | null
     *     ) => Promise<Object>,
     *     setOptions: (options: Object) => void,
     *     clearHistory: () => void
     * }} Chat session API
     * @throws {Error} When the model ID is invalid
     */
    createChatSession(modelId, options = {}) {
        const normalizedModelId = typeof modelId === "string"
            ? modelId.trim()
            : "";

        if (!normalizedModelId)
            throw new Error("Cannot create a chat session without a model ID.");

        const api = this;
        const history = [];

        let previousResponseId = null;
        let sessionOptions = {
            ...this.chatDefaults,
            ...options,
        };


        /**
         * Removes the last user message when its corresponding request fails.
         */
        function removeLatestUserMessage() {
            const lastHistoryEntry = history.at(-1);

            if (lastHistoryEntry?.role === "user")
                history.pop();
        }


        /**
         * Adds a completed assistant message to the local session history.
         *
         * @param {string} content Assistant message content
         */
        function addAssistantMessage(content) {
            history.push({
                role: "assistant",
                content,
            });
        }


        /**
         * Builds the request body for an LM Studio chat request.
         *
         * @param {string} userMessage Normalized user message
         * @param {boolean} shouldStream Whether the request should use SSE streaming
         * @returns {Object} LM Studio chat request body
         */
        function createChatRequest(userMessage, shouldStream) {
            const settings = api.buildChatSettings(sessionOptions);

            const requestBody = {
                model: normalizedModelId,
                input: userMessage,
                stream: shouldStream,
                store: true,
                temperature: settings.temperature,
                context_length: settings.context_length,
                top_p: settings.top_p,
                top_k: settings.top_k,
                min_p: settings.min_p,
                repeat_penalty: settings.repeat_penalty,
                max_output_tokens: settings.max_output_tokens,
                reasoning: settings.reasoning,
            };

            if (!previousResponseId && settings.system_prompt)
                requestBody.system_prompt = settings.system_prompt;

            if (previousResponseId)
                requestBody.previous_response_id = previousResponseId;

            return requestBody;
        }


        /**
         * Converts a completed LM Studio response into a session result.
         *
         * @param {Object | null} data LM Studio response payload
         * @param {string} [fallbackContent=""] Fallback text for streamed responses
         * @returns {Object} Normalized chat result
         */
        function createChatResult(data, fallbackContent = "") {
            const content = api.extractTextFromOutput(data?.output) ||
                fallbackContent;

            previousResponseId = data?.response_id ?? previousResponseId;
            addAssistantMessage(content);

            return {
                success: true,
                response: content,
                raw: data,
                stats: data?.stats ?? null,
                responseId: previousResponseId,
                modelInstanceId: data?.model_instance_id ?? null,
            };
        }


        /**
         * Parses and processes an SSE stream returned by LM Studio.
         *
         * @param {Response} response Streaming API response
         * @param {(event: Object) => void} onProgress UI progress callback
         * @returns {Promise<Object>} Completed chat result
         */
        async function handleStream(response, onProgress) {
            if (!response.body)
                throw new Error("The LM Studio streaming response has no body.");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let buffer = "";
            let fullContent = "";
            let finalResult = null;

            try {
                while (true) {
                    const { done, value } = await reader.read();

                    if (done)
                        break;

                    buffer += decoder.decode(value, { stream: true });

                    const rawEvents = buffer.split(/\r?\n\r?\n/);
                    buffer = rawEvents.pop() ?? "";

                    for (const rawEvent of rawEvents) {
                        const event = api.parseSseEvent(rawEvent);

                        if (!event)
                            continue;

                        const { name, data } = event;

                        if (name === SSE_EVENT_TYPES.MESSAGE_DELTA) {
                            const token = data.content ?? "";

                            fullContent += token;

                            onProgress({
                                type: SSE_EVENT_TYPES.MESSAGE_DELTA,
                                content: token,
                                response: fullContent,
                                raw: data,
                            });

                            continue;
                        }

                        if (name === SSE_EVENT_TYPES.REASONING_DELTA) {
                            onProgress({
                                type: SSE_EVENT_TYPES.REASONING_DELTA,
                                content: data.content ?? "",
                                raw: data,
                            });

                            continue;
                        }

                        if (name === SSE_EVENT_TYPES.ERROR) {
                            throw new Error(
                                data?.error?.message ??
                                data?.message ??
                                "LM Studio streaming error.",
                            );
                        }

                        if (name === SSE_EVENT_TYPES.CHAT_END)
                            finalResult = data.result ?? null;
                    }
                }

                return createChatResult(finalResult, fullContent);
            } finally {
                reader.cancel().catch(() => { });
            }
        }


        return {
            model: normalizedModelId,


            /**
             * Returns a copy of the current session settings.
             *
             * @returns {Object} Session-specific settings
             */
            get options() {
                return { ...sessionOptions };
            },


            /**
             * Returns a copy of the messages exchanged in this session.
             *
             * @returns {Array<{ role: string, content: string }>} Chat history
             */
            get history() {
                return history.map((message) => ({ ...message }));
            },


            /**
             * Returns the LM Studio response ID used to retain server-side context.
             *
             * @returns {string | null} Previous LM Studio response ID
             */
            get previousResponseId() {
                return previousResponseId;
            },


            /**
             * Sends a message in this session.
             *
             * Supplying an onProgress callback enables SSE streaming. The session
             * automatically uses the previous response ID after the first request.
             *
             * @param {string} message User message
             * @param {(event: Object) => void | null} [onProgress=null] Streaming callback
             * @returns {Promise<Object>} Chat result
             */
            async send(message, onProgress = null) {
                const userMessage = typeof message === "string"
                    ? message.trim()
                    : "";

                if (!userMessage) {
                    return {
                        success: false,
                        error: "Message must not be empty.",
                    };
                }

                history.push({
                    role: "user",
                    content: userMessage,
                });

                try {
                    const shouldStream = typeof onProgress === "function";
                    const requestBody = createChatRequest(
                        userMessage,
                        shouldStream,
                    );

                    const response = await api.fetchWithTimeout(
                        `${api.getBaseUrl()}${API_PATHS.CHAT}`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(requestBody),
                        },
                        CHAT_REQUEST_TIMEOUT_MS,
                    );

                    if (!response.ok) {
                        const errorData = await response.json()
                            .catch(() => null);

                        throw new Error(
                            errorData?.error?.message ??
                            errorData?.error ??
                            errorData?.message ??
                            `Chat request failed (${response.status} ${response.statusText}).`,
                        );
                    }

                    if (shouldStream)
                        return handleStream(response, onProgress);

                    const data = await response.json();

                    return createChatResult(data);
                } catch (error) {
                    removeLatestUserMessage();
                    api.errorLog("LM Studio chat session failed:", error);

                    return {
                        success: false,
                        error: error instanceof Error
                            ? error.message
                            : "Chat request failed.",
                    };
                }
            },


            /**
             * Merges new values into the session-specific generation settings.
             *
             * @param {Object} [newOptions={}] Settings to update
             */
            setOptions(newOptions = {}) {
                sessionOptions = {
                    ...sessionOptions,
                    ...newOptions,
                };
            },


            /**
             * Clears the local history and server-side response-chain reference.
             */
            clearHistory() {
                history.length = 0;
                previousResponseId = null;
            },
        };
    }

    /**
     * Parses a single Server-Sent Event block.
     *
     * @param {string} rawEvent Raw SSE event text
     * @returns {{ name: string, data: Object } | null} Parsed event or null
     */
    parseSseEvent(rawEvent) {
        const lines = rawEvent.split(/\r?\n/);
        const eventName = lines
            .find((line) => line.startsWith("event:"))
            ?.slice("event:".length)
            .trim();

        const data = lines
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice("data:".length).trim())
            .join("\n");

        if (!eventName || !data)
            return null;

        try {
            return {
                name: eventName,
                data: JSON.parse(data),
            };
        } catch {
            return null;
        }
    }

    /**
     * Safely retrieves a value from local storage.
     *
     * @param {string} key Storage key
     * @returns {string | null} Stored value or null when unavailable
     */
    safeGetStorage(key) {
        try {
            return typeof localStorage === "undefined"
                ? null
                : localStorage.getItem(key);
        } catch {
            return null;
        }
    }

    /**
     * Safely saves a value in local storage.
     *
     * @param {string} key Storage key
     * @param {string} value Value to persist
     */
    safeSetStorage(key, value) {
        try {
            if (typeof localStorage !== "undefined")
                localStorage.setItem(key, value);
        } catch {
            // localStorage is unavailable
        }
    }

    /**
     * Safely removes a value from local storage.
     *
     * @param {string} key Storage key
     */
    safeRemoveStorage(key) {
        try {
            if (typeof localStorage !== "undefined")
                localStorage.removeItem(key);
        } catch {
            // localStorage is unavailable
        }
    }

    /**
     * Returns static links to LM Studio resources.
     *
     * @returns {Array<{ label: string, url: string }>} Resource links
     */
    getResourceLinks() {
        return RESOURCE_LINKS.map((link) => ({ ...link }));
    }

    /**
     * Writes a debug message when debug logging is enabled.
     *
     * @param {...unknown} args Log arguments
     */
    debugLog(...args) {
        if (this.debugEnabled)
            console.debug("[LM Studio]", ...args);
    }

    /**
     * Writes an informational message when debug logging is enabled.
     *
     * @param {...unknown} args Log arguments
     */
    infoLog(...args) {
        if (this.debugEnabled)
            console.info("[LM Studio]", ...args);
    }

    /**
     * Writes an error message for LM Studio operations.
     *
     * @param {...unknown} args Log arguments
     */
    errorLog(...args) {
        console.error("[LM Studio]", ...args);
    }

    /**
     * Formats a byte value using an appropriate binary unit.
     *
     * @param {number} bytes Number of bytes
     * @param {number} [decimals=2] Number of decimal places
     * @returns {string} Formatted size
     */
    formatBytes(bytes, decimals = DEFAULT_BYTE_DECIMALS) {
        const normalizedBytes = Number(bytes);

        if (!Number.isFinite(normalizedBytes) || normalizedBytes <= 0)
            return "0 Bytes";

        const unitIndex = Math.min(
            Math.floor(
                Math.log(normalizedBytes) / Math.log(BYTES_PER_KILOBYTE),
            ),
            BYTE_UNITS.length - 1,
        );

        const value = normalizedBytes /
            BYTES_PER_KILOBYTE ** unitIndex;
        const precision = Math.max(0, Number(decimals) || 0);
        const formattedValue = Number(value.toFixed(precision));

        return `${formattedValue} ${BYTE_UNITS[unitIndex]}`;
    }

    /**
     * Calculates the total size of installed models.
     *
     * @returns {Promise<string>} Formatted total model size
     */
    async getInstalledModelsTotalSize() {
        const models = await this.getAllModelsWithDetails();

        const totalBytes = models.reduce((sum, model) => {
            return sum + (Number(model.sizeBytes) || 0);
        }, 0);

        const formattedSize = this.formatBytes(totalBytes);

        this.infoLog(
            "Total size of installed LM Studio models:",
            formattedSize,
        );

        return formattedSize;
    }

    /**
     * Sets and persists the selected model identifier.
     *
     * @param {string | null} modelId Selected model ID
     */
    setSelectedModel(modelId) {
        const selectedModel = typeof modelId === "string" && modelId.trim()
            ? modelId.trim()
            : null;

        this.selectedModel = selectedModel;

        if (selectedModel) {
            this.safeSetStorage(
                SELECTED_MODEL_STORAGE_KEY,
                selectedModel,
            );
            return;
        }

        this.safeRemoveStorage(SELECTED_MODEL_STORAGE_KEY);
    }

    /**
     * Returns the currently selected model identifier.
     *
     * @returns {string | null} Selected model ID
     */
    getSelectedModel() {
        return this.selectedModel;
    }
}
