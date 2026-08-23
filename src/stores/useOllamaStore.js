// src/stores/useOllamaStore.js

/// Provides a client for the local Ollama REST API.
/// Manages the server connection, persisted preferences and chat defaults,
/// installed and running model caches, model lifecycle operations, downloads
/// and streaming chat sessions.

import { isValidOllamaModelName } from "@/utils/validation";

const DEFAULT_BASE_URL = "http://localhost:11434";

const BASE_URL_STORAGE_KEY = "ollama-base-url";
const DEBUG_STORAGE_KEY = "ollama-debug-enabled";
const CHAT_DEFAULTS_STORAGE_KEY = "ollama-chat-defaults";

const DEFAULT_DEBUG_ENABLED = false;
const DEFAULT_REQUEST_TIMEOUT_MS = 3_000;
const CONNECTION_TIMEOUT_MS = 5_000;
const MODEL_REQUEST_TIMEOUT_MS = 15_000;
const MODEL_PULL_TIMEOUT_MS = 120_000;

const CHAT_REQUEST_TIMEOUT_MS = 120_000;
const BYTE_UNITS = ["Bytes", "KB", "MB", "GB", "TB"];
const BYTES_PER_KILOBYTE = 1_024;
const DEFAULT_BYTE_DECIMALS = 2;

const DEFAULT_CHAT_DEFAULTS = {
    temperature: 0.7,
    num_ctx: 4_096,
    system: "You are a helpful assistant.",
};

const API_PATHS = {
    CHAT: "/api/chat",
    DELETE_MODEL: "/api/delete",
    GENERATE: "/api/generate",
    INSTALLED_MODELS: "/api/tags",
    PULL_MODEL: "/api/pull",
    RUNNING_MODELS: "/api/ps",
    VERSION: "/api/version",
};

const OLLAMA_RESOURCE_LINKS = [
    {
        label: "Documentation",
        url: "https://docs.ollama.com",
    },
    {
        label: "REST API Reference",
        url: "https://docs.ollama.com/api/introduction",
    },
    {
        label: "CLI Reference",
        url: "https://docs.ollama.com/cli",
    },
    {
        label: "Model Catalog (Search)",
        url: "https://ollama.com/search",
    },
];

const RECOMMENDED_MODELS = [
    {
        name: "llama3.2:3b",
        label: "Llama 3.2 3B",
        description: "Fast, good for chatting",
        size: "~2.0 GB",
        url: "https://ollama.com/library/llama3.2",
    },
    {
        name: "gemma3:2b",
        label: "Gemma 3 2B",
        description: "Very fast, compact",
        size: "~1.7 GB",
        url: "https://ollama.com/library/gemma3",
    },
    {
        name: "phi4-mini",
        label: "Phi-4 Mini",
        description: "Strong reasoning",
        size: "~2.5 GB",
        url: "https://ollama.com/library/phi4-mini",
    },
    {
        name: "mistral",
        label: "Mistral 7B",
        description: "Versatile, higher resource requirement",
        size: "~4.1 GB",
        url: "https://ollama.com/library/mistral",
    },
    {
        name: "qwen2.5-coder:7b",
        label: "Qwen 2.5 Coder 7B",
        description: "Specialized for coding tasks",
        size: "~4.7 GB",
        url: "https://ollama.com/library/qwen2.5-coder",
    },
];

/*
Ensure these storage keys exist with the other storage constants.
*/
const ACTIVE_PULL_STORAGE_KEY = "localai-active-ollama-pull";
const SELECTED_MODEL_STORAGE_KEY = "ollama-selected-model";


/**
 * Restricts a numeric value to an inclusive range.
 *
 * @param {number} value Value to constrain
 * @param {number} minimum Minimum allowed value
 * @param {number} maximum Maximum allowed value
 * @returns {number} Constrained value
 */
function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Normalizes an Ollama API URL by removing whitespace and trailing slashes.
 *
 * @param {string} url URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeUrl(url = "") {
    return String(url).trim().replace(/\/+$/, "");
}

/**
 * Converts an application model ID into an Ollama API model name.
 *
 * UI and persisted chat IDs may be provider-prefixed, for example
 * "ollama:llama3.2:1b". Ollama's REST API expects "llama3.2:1b".
 *
 * @param {unknown} value Model ID or Ollama model name
 * @returns {string} Ollama-compatible model name
 */
function toOllamaModelName(value) {
    return String(value ?? "")
        .trim()
        .replace(/^ollama:/i, "");
}


/**
 * Provides access to Ollama's local REST API.
 */
export class OllamaApi {
    constructor() {
        this.baseUrl = this.getStoredBaseUrl();
        this.versionCache = null;
        this.debugEnabled = this.getStoredDebugSetting();

        this.allModelsCache = null;
        this.runningModelsCache = null;
        this.selectedModel = this.safeGetStorage(SELECTED_MODEL_STORAGE_KEY);

        this.chatDefaults = this.loadChatDefaults();
    }

    /**
     * Safely retrieves a value from local storage.
     *
     * @param {string} key Storage key
     * @returns {string | null} Stored value or null
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
     * Safely stores a value in local storage.
     *
     * @param {string} key Storage key
     * @param {string} value Value to store
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
     * Safely removes a local storage entry.
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
     * Reads the saved API URL and falls back to the default URL when invalid.
     *
     * @returns {string} Valid Ollama API base URL
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
     * Reads the persisted debug logging setting.
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
     * Writes an informational message when debug logging is enabled.
     *
     * @param {...unknown} args Log arguments
     */
    infoLog(...args) {
        if (this.debugEnabled)
            console.info("[Ollama]", ...args);
    }

    /**
     * Writes a debug message when debug logging is enabled.
     *
     * @param {...unknown} args Log arguments
     */
    debugLog(...args) {
        if (this.debugEnabled)
            console.debug("[Ollama]", ...args);
    }

    /**
     * Writes an error message for Ollama operations.
     *
     * @param {...unknown} args Log arguments
     */
    errorLog(...args) {
        console.error("[Ollama]", ...args);
    }

    /**
     * Loads and validates saved default chat settings.
     *
     * @returns {{
     *     temperature: number,
     *     num_ctx: number,
     *     system: string
     * }} Chat defaults
     */
    loadChatDefaults() {
        const storedDefaults = this.safeGetStorage(
            CHAT_DEFAULTS_STORAGE_KEY,
        );

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
                num_ctx: Math.max(
                    512,
                    Math.floor(
                        Number(parsedDefaults.num_ctx) ||
                        DEFAULT_CHAT_DEFAULTS.num_ctx,
                    ),
                ),
                system: typeof parsedDefaults.system === "string"
                    ? parsedDefaults.system
                    : DEFAULT_CHAT_DEFAULTS.system,
            };
        } catch {
            return { ...DEFAULT_CHAT_DEFAULTS };
        }
    }

    /**
     * Merges, validates, and persists default chat settings.
     *
     * @param {Partial<{
     *     temperature: number,
     *     num_ctx: number,
     *     system: string
     * }>} defaults Updated default settings
     * @returns {{
     *     temperature: number,
     *     num_ctx: number,
     *     system: string
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
            num_ctx: Math.max(
                512,
                Math.floor(
                    Number(nextDefaults.num_ctx) ||
                    DEFAULT_CHAT_DEFAULTS.num_ctx,
                ),
            ),
            system: String(nextDefaults.system ?? ""),
        };

        this.safeSetStorage(
            CHAT_DEFAULTS_STORAGE_KEY,
            JSON.stringify(this.chatDefaults),
        );

        return { ...this.chatDefaults };
    }

    /**
     * Returns a copy of the current chat defaults.
     *
     * @returns {{
     *     temperature: number,
     *     num_ctx: number,
     *     system: string
     * }} Chat defaults
     */
    getChatDefaults() {
        return { ...this.chatDefaults };
    }

    /**
     * Fetches a resource with a timeout and optional external cancellation.
     *
     * @param {string} url Request URL
     * @param {RequestInit} [options={}] Fetch options
     * @param {number} [timeoutMs=3000] Timeout in milliseconds
     * @returns {Promise<Response>} Fetch response
     */
    async fetchWithTimeout(
        url,
        { signal: parentSignal, ...options } = {},
        timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    ) {
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
     * Returns the cached server version or retrieves it from Ollama.
     *
     * @returns {Promise<string | null>} Ollama version or null on failure
     */
    async getVersion() {
        if (this.versionCache)
            return this.versionCache;

        try {
            const response = await this.fetchWithTimeout(
                `${this.baseUrl}${API_PATHS.VERSION}`,
                {
                    method: "GET",
                },
                CONNECTION_TIMEOUT_MS,
            );

            if (!response.ok) {
                throw new Error(
                    `Could not fetch Ollama version (${response.status} ${response.statusText}).`,
                );
            }

            const data = await response.json();

            this.versionCache = data.version ?? null;

            return this.versionCache;
        } catch (error) {
            this.errorLog("Could not fetch Ollama version:", error);
            this.versionCache = null;

            return null;
        }
    }

    /**
     * Returns a copy of the curated recommended-model list.
     *
     * @returns {Array<Object>} Recommended Ollama models
     */
    getRecommendedModels() {
        return RECOMMENDED_MODELS.map((model) => ({ ...model }));
    }

    /**
     * Checks whether the configured Ollama server is reachable.
     *
     * @returns {Promise<boolean>} True when Ollama is reachable
     */
    async status() {
        try {
            const response = await this.fetchWithTimeout(
                `${this.baseUrl}/`,
                {
                    method: "GET",
                },
                CONNECTION_TIMEOUT_MS,
            );

            return response.ok;
        } catch (error) {
            this.errorLog("Ollama status check failed:", error);
            return false;
        }
    }

    /**
     * Returns a human-readable installation status.
     *
     * @returns {Promise<string>} Installation status
     */
    async isInstalled() {
        return await this.status() ? "Installed" : "Offline";
    }

    /**
     * Returns a human-readable connection status.
     *
     * @returns {Promise<string>} Connection status
     */
    async isConnected() {
        return await this.status() ? "Connected" : "Offline";
    }

    /**
     * Returns the configured Ollama API base URL.
     *
     * @returns {string} Ollama API base URL
     */
    getBaseUrl() {
        return this.baseUrl;
    }

    /**
     * Checks whether a value is an absolute HTTP(S) URL.
     *
     * @param {string} url URL to validate
     * @returns {boolean} True when valid
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
     * Clears cached API data after changing the configured server.
     */
    invalidateCaches() {
        this.versionCache = null;
        this.allModelsCache = null;
        this.runningModelsCache = null;
    }

    /**
     * Updates and persists the Ollama API URL.
     *
     * @param {string} newUrl New Ollama API URL
     * @returns {string} Normalized API URL
     * @throws {Error} When the URL is invalid
     */
    setBaseUrl(newUrl) {
        const baseUrl = normalizeUrl(newUrl);

        if (!this.isValidUrl(baseUrl))
            throw new Error(`Invalid Ollama URL: ${baseUrl}`);

        this.baseUrl = baseUrl;
        this.safeSetStorage(BASE_URL_STORAGE_KEY, baseUrl);
        this.invalidateCaches();

        return baseUrl;
    }

    /**
     * Restores the default Ollama API URL.
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
     * Converts an Ollama API model object into the application's model shape.
     *
     * @param {Object} model Raw Ollama model data
     * @param {boolean} [isLoaded=false] Whether the model is currently loaded
     * @returns {Object} Normalized model data
     */
    mapModel(model, isLoaded = false) {
        const name = model.name ?? model.model ?? "";

        return {
            id: model.digest ?? name,
            name: name,
            modifiedAt: model.modified_at ?? null,
            sizeBytes: model.size ?? 0,
            sizeVramBytes: model.size_vram ?? 0,
            digest: model.digest ?? "",
            expiresAt: model.expires_at
                ? new Date(model.expires_at)
                : null,
            maxContextLength: model.context_length ?? null,
            type: model.details?.format ?? null,
            format: model.details?.format ?? null,
            architecture: model.details?.family ?? null,
            families: model.details?.families ?? [],
            parentModel: model.details?.parent_model ?? null,
            paramsString: model.details?.parameter_size ?? null,
            quantization: model.details?.quantization_level ?? null,
            isLoaded,
        };
    }

    /**
     * Retrieves and caches all installed Ollama models.
     *
     * @returns {Promise<Array<Object>>} Installed models
     */
    async getAllInstalledModels() {
        try {
            const response = await this.fetchWithTimeout(
                `${this.baseUrl}${API_PATHS.INSTALLED_MODELS}`,
                {
                    method: "GET",
                },
                MODEL_REQUEST_TIMEOUT_MS,
            );

            if (!response.ok) {
                throw new Error(
                    `Could not fetch models (${response.status} ${response.statusText}).`,
                );
            }

            const data = await response.json();
            const rawModels = Array.isArray(data.models) ? data.models : [];

            this.allModelsCache = rawModels.map((model) => {
                return this.mapModel(model);
            });

            return this.allModelsCache;
        } catch (error) {
            this.errorLog("Could not fetch installed Ollama models:", error);
            this.allModelsCache = null;

            return [];
        }
    }

    /**
     * Returns detailed installed-model data, fetching it when necessary.
     *
     * @returns {Promise<Array<Object>>} Installed models
     */
    async getAllModelsWithDetails() {
        if (this.allModelsCache === null)
            await this.getAllInstalledModels();

        return this.allModelsCache ?? [];
    }

    /**
     * Returns installed model names.
     *
     * @returns {Promise<string[]>} Installed model names
     */
    async getAllModelsNames() {
        const models = await this.getAllModelsWithDetails();

        return models.map((model) => model.name);
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
     * Refreshes the installed-model cache.
     *
     * @returns {Promise<Array<Object>>} Updated installed models
     */
    async refreshModelsCache() {
        this.allModelsCache = null;

        return this.getAllInstalledModels();
    }

    /**
     * Retrieves and caches all currently running Ollama models.
     *
     * @returns {Promise<Array<Object>>} Running models
     */
    async getAllRunningModels() {
        try {
            const response = await this.fetchWithTimeout(
                `${this.baseUrl}${API_PATHS.RUNNING_MODELS}`,
                {
                    method: "GET",
                },
                MODEL_REQUEST_TIMEOUT_MS,
            );

            if (!response.ok) {
                throw new Error(
                    `Could not fetch running models (${response.status} ${response.statusText}).`,
                );
            }

            const data = await response.json();
            const rawModels = Array.isArray(data.models) ? data.models : [];

            this.runningModelsCache = rawModels.map((model) => {
                return this.mapModel(model, true);
            });

            return this.runningModelsCache;
        } catch (error) {
            this.errorLog("Could not fetch running Ollama models:", error);
            this.runningModelsCache = null;

            return [];
        }
    }

    /**
     * Returns cached running model data, fetching it when necessary.
     *
     * @returns {Promise<Array<Object>>} Running models
     */
    async getRunningModelsWithDetails() {
        if (this.runningModelsCache === null)
            await this.getAllRunningModels();

        return this.runningModelsCache ?? [];
    }

    /**
     * Returns names of currently running models.
     *
     * @returns {Promise<string[]>} Running model names
     */
    async getRunningModelsNames() {
        const models = await this.getRunningModelsWithDetails();

        return models.map((model) => model.name);
    }

    /**
     * Returns the number of currently running models.
     *
     * @returns {Promise<number>} Running model count
     */
    async getRunningModelsTotalCount() {
        const models = await this.getRunningModelsWithDetails();

        return models.length;
    }

    /**
     * Refreshes the running-model cache.
     *
     * @returns {Promise<Array<Object>>} Updated running models
     */
    async refreshRunningModelsCache() {
        this.runningModelsCache = null;

        return this.getAllRunningModels();
    }

    /**
     * Normalizes an Ollama model name for comparisons.
     *
     * Ollama treats a model name without a tag as the `latest` tag.
     *
     * @param {string} modelName Model name to normalize
     * @returns {string} Normalized model name
     */
    normalizeModelName(modelName) {
        const normalizedName = toOllamaModelName(modelName)
            .toLocaleLowerCase();

        if (!normalizedName) {
            return "";
        }

        return normalizedName.includes(":")
            ? normalizedName
            : `${normalizedName}:latest`;
    }

    /**
     * Checks whether a model is installed.
     *
     * @param {string} modelName Model name to check
     * @returns {Promise<boolean>} True when the model is installed
     */
    async isModelInstalled(modelName) {
        const normalizedModelName = this.normalizeModelName(modelName);

        if (!normalizedModelName)
            return false;

        const models = await this.getAllModelsWithDetails();

        return models.some((model) => {
            return this.normalizeModelName(model.name) === normalizedModelName;
        });
    }

    /**
     * Checks whether a model is currently loaded.
     *
     * @param {string} modelName Model name to check
     * @returns {Promise<boolean>} True when the model is loaded
     */
    async isModelLoaded(modelName) {
        const normalizedModelName = this.normalizeModelName(modelName);

        if (!normalizedModelName)
            return false;

        const runningModels = await this.getRunningModelsWithDetails();

        return runningModels.some((model) => {
            return this.normalizeModelName(model.name) === normalizedModelName;
        });
    }

    /**
     * Loads a model by sending an empty non-streaming generate request.
     *
     * @param {string} modelName Installed model name
     * @param {string | number} [keepAlive="5m"] Ollama keep-alive duration
     * @returns {Promise<Object>} Model load result
     */
    async loadModel(modelName, keepAlive = "5m") {
        if (!isValidOllamaModelName(modelName)) {
            return {
                success: false,
                error: "Invalid model name.",
            };
        }

        const normalizedModelName = toOllamaModelName(modelName);

        if (!await this.isModelInstalled(normalizedModelName)) {
            return {
                success: false,
                error: `Model "${normalizedModelName}" is not installed.`,
            };
        }

        if (await this.isModelLoaded(normalizedModelName)) {
            return {
                success: true,
                alreadyLoaded: true,
                message: `Model "${normalizedModelName}" is already loaded.`,
            };
        }

        try {
            const response = await this.fetchWithTimeout(
                `${this.baseUrl}${API_PATHS.GENERATE}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: normalizedModelName,
                        prompt: "",
                        stream: false,
                        keep_alive: keepAlive,
                    }),
                },
                MODEL_REQUEST_TIMEOUT_MS,
            );

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                return {
                    success: false,
                    error: data?.error ??
                        `Could not load model (${response.status} ${response.statusText}).`,
                };
            }

            await this.refreshRunningModelsCache();

            return {
                success: true,
                data,
                message: `Model "${normalizedModelName}" loaded successfully.`,
            };
        } catch (error) {
            this.errorLog("Could not load Ollama model:", error);

            return {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : `Could not load model "${normalizedModelName}".`,
            };
        }
    }

    /**
     * Unloads a model by setting its Ollama keep-alive duration to zero.
     *
     * @param {string} modelName Loaded model name
     * @returns {Promise<Object>} Model unload result
     */
    async unloadModel(modelName) {
        if (!isValidOllamaModelName(modelName)) {
            return {
                success: false,
                error: "Invalid model name.",
            };
        }

        const normalizedModelName = toOllamaModelName(modelName);

        if (!await this.isModelLoaded(normalizedModelName)) {
            return {
                success: true,
                alreadyUnloaded: true,
                message: `Model "${normalizedModelName}" is not loaded.`,
            };
        }

        try {
            const response = await this.fetchWithTimeout(
                `${this.baseUrl}${API_PATHS.GENERATE}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: normalizedModelName,
                        prompt: "",
                        stream: false,
                        keep_alive: 0,
                    }),
                },
                MODEL_REQUEST_TIMEOUT_MS,
            );

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                return {
                    success: false,
                    error: data?.error ??
                        `Could not unload model (${response.status} ${response.statusText}).`,
                };
            }

            await this.refreshRunningModelsCache();

            return {
                success: true,
                data,
                message: `Model "${normalizedModelName}" unloaded successfully.`,
            };
        } catch (error) {
            this.errorLog("Could not unload Ollama model:", error);

            return {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : `Could not unload model "${normalizedModelName}".`,
            };
        }
    }

    /**
     * Deletes an installed model that is not currently loaded.
     *
     * @param {string} modelName Installed model name
     * @returns {Promise<Object>} Model deletion result
     */
    async removeModel(modelName) {
        if (!isValidOllamaModelName(modelName)) {
            return {
                success: false,
                error: "Invalid model name.",
            };
        }

        const normalizedModelName = toOllamaModelName(modelName);

        if (!await this.isModelInstalled(normalizedModelName)) {
            return {
                success: false,
                error: `Model "${normalizedModelName}" was not found.`,
            };
        }

        if (await this.isModelLoaded(normalizedModelName)) {
            return {
                success: false,
                error: `Model "${normalizedModelName}" is loaded. Unload it before deleting it.`,
            };
        }

        try {
            const response = await this.fetchWithTimeout(
                `${this.baseUrl}${API_PATHS.DELETE_MODEL}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: normalizedModelName,
                    }),
                },
                MODEL_REQUEST_TIMEOUT_MS,
            );

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                return {
                    success: false,
                    error: data?.error ??
                        `Could not delete model (${response.status} ${response.statusText}).`,
                };
            }

            await this.refreshModelsCache();

            return {
                success: true,
                data,
                message: `Model "${normalizedModelName}" deleted successfully.`,
            };
        } catch (error) {
            this.errorLog("Could not delete Ollama model:", error);

            return {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : `Could not delete model "${normalizedModelName}".`,
            };
        }
    }

    /**
     * Downloads an Ollama model and forwards NDJSON progress events.
     *
     * @param {string} modelName Model name to download
     * @param {(progress: Object) => void | null} [onProgress=null] Progress callback
     * @param {AbortSignal} [signal] Signal used to cancel the download
     * @returns {Promise<Object>} Pull result
     */
    async pullModel(modelName, onProgress = null, signal) {
        if (!isValidOllamaModelName(modelName)) {
            return {
                success: false,
                error: "Invalid model name.",
            };
        }

        const normalizedModelName = toOllamaModelName(modelName);

        if (await this.isModelInstalled(normalizedModelName)) {
            return {
                success: false,
                error: `Model "${normalizedModelName}" is already installed.`,
            };
        }

        try {
            const response = await this.fetchWithTimeout(
                `${this.baseUrl}${API_PATHS.PULL_MODEL}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: normalizedModelName,
                        stream: true,
                    }),
                    signal,
                },
                MODEL_PULL_TIMEOUT_MS,
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);

                throw new Error(
                    errorData?.error ??
                    `Could not pull model (${response.status} ${response.statusText}).`,
                );
            }

            if (!response.body)
                throw new Error("The model download response has no body.");

            this.setActivePull({
                modelName: normalizedModelName,
                startedAt: new Date().toISOString(),
            });

            const result = await this.readPullStream(
                response.body,
                onProgress,
            );

            await this.refreshModelsCache();
            this.clearActivePull();

            return {
                success: true,
                status: result,
            };
        } catch (error) {
            const wasAborted = error.name === "AbortError";

            this.errorLog("Could not pull Ollama model:", error);

            if (!wasAborted)
                this.clearActivePull();

            return {
                success: false,
                aborted: wasAborted,
                error: wasAborted
                    ? "Model download was cancelled."
                    : error instanceof Error
                        ? error.message
                        : "Could not pull model.",
            };
        }
    }

    /**
     * Parses the NDJSON response body emitted by Ollama model downloads.
     *
     * @param {ReadableStream<Uint8Array>} stream Download response stream
     * @param {(progress: Object) => void | null} [onProgress=null] Progress callback
     * @returns {Promise<Object | null>} Final progress event
     */
    async readPullStream(stream, onProgress = null) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        let buffer = "";
        let lastProgress = null;

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done)
                    break;

                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split(/\r?\n/);
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    const progress = this.parseNdjsonLine(line);

                    if (!progress)
                        continue;

                    if (progress.error)
                        throw new Error(progress.error);

                    lastProgress = progress;

                    if (typeof onProgress === "function")
                        onProgress(progress);
                }
            }

            const finalProgress = this.parseNdjsonLine(buffer);

            if (finalProgress) {
                if (finalProgress.error)
                    throw new Error(finalProgress.error);

                lastProgress = finalProgress;

                if (typeof onProgress === "function")
                    onProgress(finalProgress);
            }

            return lastProgress;
        } finally {
            reader.cancel().catch(() => { });
        }
    }

    /**
     * Parses a single newline-delimited JSON entry.
     *
     * @param {string} line Potential JSON line
     * @returns {Object | null} Parsed object or null when empty or invalid
     */
    parseNdjsonLine(line) {
        const normalizedLine = String(line).trim();

        if (!normalizedLine)
            return null;

        try {
            return JSON.parse(normalizedLine);
        } catch {
            this.debugLog("Could not parse Ollama NDJSON line:", line);

            return null;
        }
    }

    /**
     * Persists the currently active Ollama model download.
     *
     * @param {Object} pull Active pull details
     */
    setActivePull(pull) {
        this.safeSetStorage(
            ACTIVE_PULL_STORAGE_KEY,
            JSON.stringify(pull),
        );
    }

    /**
     * Returns the persisted active model download, if available.
     *
     * @returns {Object | null} Active pull data
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
     * Removes persisted active model-download data.
     */
    clearActivePull() {
        this.safeRemoveStorage(ACTIVE_PULL_STORAGE_KEY);
    }

    /**
     * Sets and persists the selected Ollama model.
     *
     * @param {string | null} modelName Selected model name
     */
    setSelectedModel(modelName) {
        const selectedModel = toOllamaModelName(modelName) || null;

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
     * Returns the currently selected Ollama model.
     *
     * @returns {string | null} Selected model name
     */
    getSelectedModel() {
        return this.selectedModel;
    }

    /**
     * Generates one non-streaming completion without preserving chat history.
     *
     * @param {string} modelName Ollama model name
     * @param {string} prompt Prompt to send to the model
     * @param {Object} [options={}] Ollama generation options
     * @returns {Promise<Object>} Generation result
     */
    async generateResponse(modelName, prompt, options = {}) {
        const normalizedModelName = toOllamaModelName(modelName);
        const normalizedPrompt = typeof prompt === "string"
            ? prompt.trim()
            : "";

        if (!normalizedModelName || !isValidOllamaModelName(normalizedModelName)) {
            return {
                success: false,
                error: "Invalid model name.",
            };
        }

        if (!normalizedPrompt) {
            return {
                success: false,
                error: "Prompt must not be empty.",
            };
        }

        try {
            const response = await this.fetchWithTimeout(
                `${this.baseUrl}${API_PATHS.GENERATE}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: normalizedModelName,
                        prompt: normalizedPrompt,
                        stream: false,
                        options: {
                            ...this.chatDefaults,
                            ...options,
                        },
                    }),
                },
                CHAT_REQUEST_TIMEOUT_MS,
            );

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                return {
                    success: false,
                    error: data?.error ??
                        `Could not generate response (${response.status} ${response.statusText}).`,
                };
            }

            return {
                success: true,
                response: data?.response ?? "",
                raw: data,
                stats: this.createGenerationStats(data),
            };
        } catch (error) {
            this.errorLog("Could not generate Ollama response:", error);

            return {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Could not generate response.",
            };
        }
    }

    /**
     * Creates a stateful Ollama chat session with optional NDJSON streaming.
     *
     * @param {string} modelName Ollama model name
     * @param {Object} [configuration={}] Session configuration
     * @param {Array<{ role: string, content: string }>} [configuration.initialMessages=[]] Initial history
     * @param {Object} [configuration.options={}] Ollama generation options
     * @returns {{
     *     model: string,
     *     readonly options: Object,
     *     readonly history: Array<{ role: string, content: string }>,
     *     send: (
     *         message: string,
     *         onProgress?: ((event: Object) => void) | null,
     *         signal?: AbortSignal
     *     ) => Promise<Object>,
     *     setOptions: (options: Object) => void,
     *     clearHistory: () => void
     * }} Chat session API
     * @throws {Error} When the model name is invalid
     */
    createChatSession(
        modelName,
        {
            initialMessages = [],
            options = {},
        } = {},
    ) {
        const normalizedModelName = toOllamaModelName(modelName);

        if (!normalizedModelName || !isValidOllamaModelName(normalizedModelName)) {
            throw new Error("Cannot create a chat session without a valid model name.");
        }

        const api = this;
        const history = this.normalizeChatMessages(initialMessages);

        let sessionOptions = {
            ...this.chatDefaults,
            ...options,
        };

        /**
         * Returns a copy of the current history for request serialization.
         *
         * @returns {Array<{ role: string, content: string }>} Chat messages
         */
        function getRequestMessages() {
            return history.map((message) => ({ ...message }));
        }

        /**
         * Removes the last user message after an unsuccessful request.
         */
        function removeLatestUserMessage() {
            const lastMessage = history.at(-1);

            if (lastMessage?.role === "user")
                history.pop();
        }

        /**
         * Creates the normalized result returned by a completed chat request.
         *
         * @param {string} content Complete assistant response
         * @param {Object | null} data Final Ollama response data
         * @param {boolean} [aborted=false] Whether the request was aborted
         * @returns {Object} Normalized chat result
         */
        function createChatResult(content, data, aborted = false) {
            if (!aborted) {
                history.push({
                    role: "assistant",
                    content,
                });
            }

            return {
                success: !aborted,
                aborted,
                text: content,
                response: content,
                raw: data,
                stats: api.createGenerationStats(data),
            };
        }

        return {
            model: normalizedModelName,

            /**
             * Returns a copy of the current session generation options.
             *
             * @returns {Object} Session options
             */
            get options() {
                return { ...sessionOptions };
            },

            /**
             * Returns copies of messages stored in the local session history.
             *
             * @returns {Array<{ role: string, content: string }>} Chat history
             */
            get history() {
                return getRequestMessages();
            },

            /**
             * Sends a message in the current chat session.
             *
             * Providing an onProgress callback enables NDJSON streaming.
             *
             * @param {string} message User message
             * @param {(event: Object) => void | null} [onProgress=null] Token callback
             * @param {AbortSignal} [signal] Signal used to cancel the request
             * @returns {Promise<Object>} Chat result
             */
            async send(message, onProgress = null, signal) {
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

                const shouldStream = typeof onProgress === "function";

                try {
                    const response = await api.fetchWithTimeout(
                        `${api.baseUrl}${API_PATHS.CHAT}`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                model: normalizedModelName,
                                messages: getRequestMessages(),
                                stream: shouldStream,
                                options: sessionOptions,
                            }),
                            signal,
                        },
                        CHAT_REQUEST_TIMEOUT_MS,
                    );

                    if (!response.ok) {
                        const errorData = await response.json()
                            .catch(() => null);

                        throw new Error(
                            errorData?.error ??
                            `Chat request failed (${response.status} ${response.statusText}).`,
                        );
                    }

                    if (shouldStream) {
                        if (!response.body)
                            throw new Error("The chat streaming response has no body.");

                        const streamedResult = await api.readChatStream(
                            response.body,
                            onProgress,
                        );

                        return createChatResult(
                            streamedResult.text,
                            streamedResult.data,
                        );
                    }

                    const data = await response.json();
                    const content = data.message?.content ?? "";

                    return createChatResult(content, data);
                } catch (error) {
                    removeLatestUserMessage();

                    const wasAborted = error.name === "AbortError";

                    if (wasAborted) {
                        return {
                            success: false,
                            aborted: true,
                            text: "",
                            response: "",
                            stats: api.createGenerationStats(null),
                        };
                    }

                    api.errorLog("Ollama chat session failed:", error);

                    return {
                        success: false,
                        aborted: false,
                        error: error instanceof Error
                            ? error.message
                            : "Chat request failed.",
                    };
                }
            },

            /**
             * Merges new values into the session-specific generation options.
             *
             * @param {Object} [newOptions={}] Options to update
             */
            setOptions(newOptions = {}) {
                sessionOptions = {
                    ...sessionOptions,
                    ...newOptions,
                };
            },

            /**
             * Clears messages stored only in this local chat session.
             */
            clearHistory() {
                history.length = 0;
            },
        };
    }

    /**
     * Streams a chat response without creating a persistent session object.
     *
     * @param {string} modelName Ollama model name
     * @param {Array<{ role: string, content: string }>} messages Chat messages
     * @param {Object} [options={}] Ollama generation options
     * @param {(event: Object) => void | null} [onToken=null] Token callback
     * @param {AbortSignal} [signal] Signal used to cancel the request
     * @returns {Promise<Object>} Streamed chat result
     */
    async generateStreamingChatAnswer(
        modelName,
        messages,
        options = {},
        onToken = null,
        signal,
    ) {
        const normalizedModelName = toOllamaModelName(modelName);

        if (!normalizedModelName || !isValidOllamaModelName(normalizedModelName)) {
            throw new Error(
                "Cannot generate a streaming response without a valid model name.",
            );
        }

        const normalizedMessages = this.normalizeChatMessages(messages);

        if (normalizedMessages.length === 0)
            throw new Error("At least one valid chat message is required.");

        try {
            const response = await this.fetchWithTimeout(
                `${this.baseUrl}${API_PATHS.CHAT}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: normalizedModelName,
                        messages: normalizedMessages,
                        stream: true,
                        options: {
                            ...this.chatDefaults,
                            ...options,
                        },
                    }),
                    signal,
                },
                CHAT_REQUEST_TIMEOUT_MS,
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);

                throw new Error(
                    errorData?.error ??
                    `Chat request failed (${response.status} ${response.statusText}).`,
                );
            }

            if (!response.body)
                throw new Error("The chat streaming response has no body.");

            const result = await this.readChatStream(response.body, onToken);

            return {
                success: true,
                aborted: false,
                text: result.text,
                response: result.text,
                raw: result.data,
                stats: this.createGenerationStats(result.data),
            };
        } catch (error) {
            const wasAborted = error.name === "AbortError";

            if (!wasAborted)
                this.errorLog("Could not generate streaming Ollama chat:", error);

            return {
                success: false,
                aborted: wasAborted,
                text: "",
                response: "",
                stats: this.createGenerationStats(null),
                error: wasAborted
                    ? "Chat request was cancelled."
                    : error instanceof Error
                        ? error.message
                        : "Chat request failed.",
            };
        }
    }

    /**
     * Reads an Ollama NDJSON chat stream and forwards generated tokens.
     *
     * @param {ReadableStream<Uint8Array>} stream Response stream
     * @param {(event: Object) => void | null} [onToken=null] Token callback
     * @returns {Promise<{ text: string, data: Object | null }>} Stream result
     */
    async readChatStream(stream, onToken = null) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        let buffer = "";
        let text = "";
        let finalData = null;

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done)
                    break;

                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split(/\r?\n/);
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    const chunk = this.parseNdjsonLine(line);

                    if (!chunk)
                        continue;

                    if (chunk.error)
                        throw new Error(chunk.error);

                    const token = chunk.message?.content ?? "";

                    text += token;
                    finalData = chunk;

                    if (typeof onToken === "function") {
                        onToken({
                            response: token,
                            done: chunk.done ?? false,
                            raw: chunk,
                        });
                    }
                }
            }

            const finalChunk = this.parseNdjsonLine(buffer);

            if (finalChunk) {
                if (finalChunk.error)
                    throw new Error(finalChunk.error);

                const token = finalChunk.message?.content ?? "";

                text += token;
                finalData = finalChunk;

                if (typeof onToken === "function") {
                    onToken({
                        response: token,
                        done: finalChunk.done ?? false,
                        raw: finalChunk,
                    });
                }
            }

            return {
                text,
                data: finalData,
            };
        } finally {
            reader.cancel().catch(() => { });
        }
    }

    /**
     * Normalizes chat messages before sending them to Ollama.
     *
     * @param {unknown} messages Candidate chat messages
     * @returns {Array<{ role: string, content: string }>} Valid chat messages
     */
    normalizeChatMessages(messages) {
        if (!Array.isArray(messages))
            return [];

        return messages
            .filter((message) => {
                return typeof message?.role === "string" &&
                    typeof message?.content === "string" &&
                    message.content.trim();
            })
            .map((message) => {
                return {
                    role: message.role.trim(),
                    content: message.content.trim(),
                };
            });
    }

    /**
     * Extracts selected generation statistics from an Ollama response.
     *
     * @param {Object | null} data Ollama response data
     * @returns {{
     *     evalCount: number,
     *     promptEvalCount: number,
     *     totalDuration: number
     * }} Normalized generation statistics
     */
    createGenerationStats(data) {
        return {
            evalCount: data?.eval_count ?? 0,
            promptEvalCount: data?.prompt_eval_count ?? 0,
            totalDuration: data?.total_duration ?? 0,
        };
    }

    /**
     * Formats a byte value using binary size units.
     *
     * @param {number} bytes Number of bytes
     * @param {number} [decimals=2] Decimal places
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

        return `${Number(value.toFixed(precision))} ${BYTE_UNITS[unitIndex]}`;
    }

    /**
     * Calculates the total disk size of installed Ollama models.
     *
     * @returns {Promise<string>} Formatted total size
     */
    async getInstalledModelsTotalSize() {
        const models = await this.getAllModelsWithDetails();

        const totalBytes = models.reduce((sum, model) => {
            return sum + (Number(model.sizeBytes) || 0);
        }, 0);

        const formattedSize = this.formatBytes(totalBytes);

        this.infoLog(
            "Total size of installed Ollama models:",
            formattedSize,
        );

        return formattedSize;
    }

    /**
     * Returns static links to Ollama resources.
     *
     * @returns {Array<{ label: string, url: string }>} Resource links
     */
    getResourceLinks() {
        return OLLAMA_RESOURCE_LINKS.map((link) => ({ ...link }));
    }
}
