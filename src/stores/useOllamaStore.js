// src/stores/useOllamaStore.js
// Store containing all functionality for interacting with the Ollama API

import { isValidModelName } from '@/utils/validation'

const BASE_URL_STORAGE_KEY = "ollama-base-url";
const DEFAULT_BASE_URL = 'http://localhost:11434'
const DEFAULT_DEBUG_ENABLED = false

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
]

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


// Class as Named Export
export class OllamaApi {
    constructor() {
        this.baseUrl = this.safeGetStorage(BASE_URL_STORAGE_KEY) || DEFAULT_BASE_URL;
        this.versionCache = null
        this.debugEnabled = this.safeGetStorage('ollama-debug-enabled') === 'true' || DEFAULT_DEBUG_ENABLED
        this.allModelsCache = []
        this.runningModelsCache = [];
        this.selectedModel = this.safeGetStorage("selectedModel") || null

        // optional: Chat-Defaults
        this.chatDefaults = this.loadChatDefaults();
    }

    // log helpers
    infoLog(...args) {
        if (this.debugEnabled) {
            console.info("[Ollama]", ...args);
        }
    }

    debugLog(...args) {
        if (this.debugEnabled) {
            console.debug("[Ollama]", ...args);
        }
    }

    errorLog(...args) {
        // Später ggf. zusätzlich an Sentry, OpenTelemetry etc. senden
        console.error("[Ollama]", ...args);
    }

    // Default Methods
    loadChatDefaults() {
        const raw = this.safeGetStorage("ollama-chat-defaults");
        if (!raw) {
            return {
                temperature: 0.7,
                num_ctx: 4096,
                system: "You are a helpful assistant.",
            };
        }

        try {
            const parsed = JSON.parse(raw);
            return {
                temperature: parsed.temperature ?? 0.7,
                num_ctx: parsed.num_ctx ?? 4096,
                system: parsed.system ?? "You are a helpful assistant.",
            };
        } catch {
            return {
                temperature: 0.7,
                num_ctx: 4096,
                system: "You are a helpful assistant.",
            };
        }
    }

    saveChatDefaults(defaults) {
        this.chatDefaults = {
            ...this.chatDefaults,
            ...defaults,
        };
        this.safeSetStorage("ollama-chat-defaults", JSON.stringify(this.chatDefaults));
    }

    async fetchWithTimeout(url, options = {}, timeoutMs = 3_000) {
        return fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) })
    }

    async getVersion() {
        if (this.versionCache) {
            this.infoLog('[getVersion]: cached version:', this.versionCache)
            return this.versionCache
        }

        try {
            const response = await this.fetchWithTimeout(`${this.baseUrl}/api/version`, { method: 'GET' }, 5000)
            this.infoLog('[getVersion] response:', response)

            if (!response.ok)
                throw new Error(`Failed to fetch version: ${response.status} ${response.statusText}`)

            const data = await response.json()
            this.infoLog('getVersion data:', data)

            this.versionCache = data.version
            this.infoLog('[getVersion]: fetched and cached version:', this.versionCache)
            return this.versionCache
        } catch (err) {
            this.errorLog('[getVersion] failed:', err)
            this.versionCache = null

            return this.versionCache
        }
    }

    getRecommendedModels() {
        return RECOMMENDED_MODELS
    }

    async status() {
        try {
            const response = await this.fetchWithTimeout(`${this.baseUrl}/`, { method: 'GET' })
            this.infoLog('[status] response:', response)

            return response.ok
        } catch (err) {
            this.errorLog('[status] check failed:', err)
            return false
        }
    }

    async statusBool() {
        const installed = await this.status()
        this.infoLog('[statusBool] Ollama installation status:', installed)
        return installed
    }

    async isInstalled() {
        const installed = await this.status()
        this.infoLog(`[isInstalled] Ollama installation status: ${installed ? 'Ollama is installed.' : 'Could not verify installation status.'}`)

        return installed ? 'Installed' : 'Offline'
    }

    async isConnected() {
        const connected = await this.status()
        this.infoLog(`[isConnected] Ollama connection status: ${connected ? 'Ollama is connected.' : 'Could not verify connection status.'}`)

        return connected ? 'Connected' : 'Offline'
    }

    getBaseUrl() {
        return this.baseUrl
    }

    isValidUrl(url) {
        try {
            new URL(url)
            this.infoLog(`[isValidUrl] Valid URL: ${url}`)

            return true
        } catch {
            this.errorLog(`[isValidUrl] Invalid URL: ${url}`)
            return false
        }
    }

    invalidateCaches() {
        this.versionCache = null
        this.allModelsCache = []
        this.runningModelCache = []
        this.infoLog('[invalidateCaches] All caches invalidated.')
    }

    /**
     * Kurzbeschreibung der Methode (ein Satz).
     *
     * Optional: längere Beschreibung, Seitenwirkungen, Beispiele.
     *
     * @param {string} baseUrl - New base URL for the Ollama API.
     * @returns {boolean} True if the URL was updated successfully.
    */
    setBaseUrl(newUrl) {
        const trimmedUrl = newUrl.trim().replace(/\/+$/, "");
        if (!this.isValidUrl(trimmedUrl)) {
            throw new Error(`[setBaseUrl] Invalid URL: ${trimmedUrl}`);
        }

        this.baseUrl = trimmedUrl;
        this.safeSetStorage(BASE_URL_STORAGE_KEY, trimmedUrl);
        this.invalidateCaches();
        this.infoLog(`[setBaseUrl] Base URL updated to: ${trimmedUrl}`);
        return true;
    }

    /**
     * Reset the Ollama base URL to the default value and clear related caches.
     *
     * Sets `this.baseUrl` to `DEFAULT_BASE_URL`, persists it in localStorage,
     * and invalidates all cached API results that depend on the base URL.
    */
    resetBaseUrl() {
        this.baseUrl = DEFAULT_BASE_URL;
        this.safeSetStorage(BASE_URL_STORAGE_KEY, DEFAULT_BASE_URL);
        this.invalidateCaches();
        this.infoLog(`[resetBaseUrl] Base URL reset to default: ${DEFAULT_BASE_URL}`);
    }

    toggleDebug() {
        this.debugEnabled = !this.debugEnabled;
        this.safeSetStorage("ollama-debug-enabled", this.debugEnabled ? "true" : "false");
        this.infoLog(`[toggleDebug] Debug mode is now ${this.debugEnabled ? "enabled" : "disabled"}.`);

        return this.debugEnabled;
    }

    isDebugEnabled() {
        return this.debugEnabled
    }

    async getAllInstalledModels() { // private
        try {
            const response = await this.fetchWithTimeout(`${this.baseUrl}/api/tags`, { method: 'GET' })
            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`)
            }
            this.infoLog('[getAllInstalledModels] response:', response)

            const data = await response.json()
            const rawModels = data.models || []

            this.allModelsCache = rawModels.map((model) => ({
                id: model.digest ?? model.name,
                name: model.name,
                modified_at: model.modified_at ?? null,

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

                isLoaded: false,
            }));

            this.infoLog('[getAllInstalledModels] Fetched and cached all models with details:', this.allModelsCache)
            return this.allModelsCache
        } catch (err) {
            this.errorLog('[getAllInstalledModels] Error fetching all models with details:', err)
            this.allModelsCache = []

            return []
        }
    }

    async getAllModelsWithDetails() {
        if (!this.allModelsCache || this.allModelsCache.length === 0) {
            this.infoLog('[getAllModelsWithDetails] Cache empty, fetching all installed models...')
            await this.getAllInstalledModels()
        }

        this.infoLog('[getAllModelsWithDetails] Returning cached models with details:', this.allModelsCache)
        return this.allModelsCache
    }

    async getAllModelsNames() {
        const models = await this.getAllInstalledModels()
        const names = models.map(model => model.name)

        this.infoLog('[getAllModelsNames] Returning model names:', names)
        return names
    }

    async getAllModelsTotalCount() {
        const models = await this.getAllInstalledModels()
        const counter = models.length

        this.infoLog('[getAllModelsTotalCount] Returning total count:', counter)
        return counter
    }

    async refreshModelsCache() {
        this.infoLog('[refreshModelsCache] Refreshing models cache...')
        return this.getAllInstalledModels()
    }

    async getAllRunningModels() { // private
        try {
            const response = await this.fetchWithTimeout(
                `${this.baseUrl}/api/ps`,
                { method: "GET" }
            );
            this.infoLog("[getAllRunningModels] response:", response);

            if (!response.ok) {
                throw new Error(
                    `Failed to fetch running models: ${response.status} ${response.statusText}`
                );
            }

            const data = await response.json();
            const rawModels = data.models ?? [];

            this.runningModelsCache = rawModels.map((model) => ({
                id: model.digest ?? model.name,
                name: model.name,

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

                isLoaded: true,
            }));

            this.infoLog("[getAllRunningModels] Returning running models:", this.runningModelsCache);
            return this.runningModelsCache;
        } catch (error) {
            this.errorLog("[getAllRunningModels] failed:", error);

            this.runningModelsCache = [];
            return [];
        }
    }

    async getRunningModelsNames() {
        const models = await this.getAllRunningModels()
        const names = models.map(model => model.name)

        this.infoLog("[getRunningModelsNames] Returning model names:", names);
        return names
    }

    async getRunningModelsTotalCount() {
        const models = await this.getAllRunningModels()
        const counter = models.length

        this.infoLog("[getRunningModelsTotalCount] Returning total count:", counter);
        return counter
    }

    async getRunningModelsWithDetails() {
        if (!this.runningModelsCache || this.runningModelsCache.length === 0) {
            this.infoLog("[getRunningModelsWithDetails] Cache empty, fetching all running models...");
            await this.getAllRunningModels()
        }

        this.infoLog("[getRunningModelsWithDetails] Returning cached running models with details:", this.runningModelsCache);
        return this.runningModelsCache
    }

    async refreshRunningModelsCache() {
        this.infoLog("[refreshRunningModelsCache] Refreshing running models cache...");
        return this.getAllRunningModels()
    }

    async loadModel(name, keepAlive = '5m') {
        if (!isValidModelName(name)) {
            this.errorLog("[loadModel] Invalid model name:", name);
            throw new Error(`Invalid model name: ${name}`)
        }

        if (!name || typeof name !== 'string') {
            this.infoLog("[loadModel] Invalid model name provided:", name);
            return { success: false, message: 'Invalid model name' }
        }

        try {
            const response = await this.fetchWithTimeout(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: name, keep_alive: keepAlive }),
            }, 15_000)
            this.infoLog("[loadModel] response:", response);

            if (!response.ok) {
                const errorText = await response.text().catch(() => response.statusText)
                throw new Error(`Failed to load model ${name}: ${response.status} ${response.statusText} - ${errorText}`)
            }

            await response.json().catch(() => null) // consume response to avoid memory leaks
            await this.refreshRunningModelsCache() // update cache

            this.infoLog(`[loadModel] Model ${name} loaded successfully with keep_alive=${keepAlive}.`);
            return { success: true, message: `Model ${name} loaded successfully` }
        } catch (err) {
            this.errorLog("[loadModel] Error loading model:", err)
            return { success: false, error: `Failed to load model ${name}: ${err.message}` }
        }
    }

    async unloadModel(name) {
        if (!isValidModelName(name)) {
            this.errorLog("[unloadModel] Invalid model name:", name);
            throw new Error(`Invalid model name: ${name}`)
        }

        if (!name || typeof name !== 'string') {
            this.errorLog("[unloadModel] Invalid model name provided:", name);
            return { success: false, message: 'Invalid model name' }
        }

        try {
            const response = await this.fetchWithTimeout(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: name, prompt: '', keep_alive: 0 })
            }, 15000)
            this.infoLog("[unloadModel] response:", response);

            if (!response.ok) {
                const errorText = await response.text().catch(() => response.statusText)
                throw new Error(`Failed to unload model: ${response.status} ${errorText}`)
            }

            await response.json().catch(() => null)
            await this.refreshRunningModelsCache() // update cache

            this.infoLog(`[unloadModel] Model ${name} unloaded successfully.`);
            return { success: true }
        } catch (err) {
            this.errorLog("[unloadModel] Error unloading model:", err)
            return { success: false, error: `Failed to unload model ${name}: ${err.message}` }
        }
    }

    async isModelLoaded(name) {
        const allRunningModels = await this.getAllRunningModels()
        const loaded = allRunningModels.includes(name)
        this.infoLog(`[isModelLoaded] Checking if model ${name} is ${loaded ? 'loaded' : 'not loaded'}.`)

        return loaded
    }

    async removeModel(name) {
        if (!isValidModelName(name)) {
            this.errorLog("[removeModel] Invalid model name:", name);
            throw new Error(`Invalid model name: ${name}`)
        }

        if (await this.isModelLoaded(name)) {
            this.infoLog(`[removeModel] Model ${name} is currently loaded, cannot remove. Please unload it first.`)
            return { success: false, message: 'Model is currently loaded, please unload it first' }
        }

        if (!name || typeof name !== 'string') {
            this.infoLog("[removeModel] Invalid model name provided:", name);
            return { success: false, message: 'Invalid model name' }
        }

        const installedNames = await this.getAllModelsNames()
        if (!this.isModelInstalled(name, installedNames)) {
            this.infoLog(`[removeModel] Model ${name} not found.`);
            return { success: false, error: 'Model not found' }
        }

        try {
            const response = await this.fetchWithTimeout(`${this.baseUrl}/api/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name })
            })
            this.infoLog("[removeModel] response:", response);

            if (!response.ok) {
                const errorText = await response.text().catch(() => response.statusText)
                throw new Error(`Failed to remove model: ${response.status} ${errorText}`)
            }

            await this.refreshModelsCache()
            this.infoLog(`[removeModel] Model ${name} removed successfully.`);
            return { success: true }
        } catch (err) {
            this.errorLog("[removeModel] failed:", err)
            return { success: false, error: err.message }
        }
    }

    isModelInstalled(modelName, installedList) {
        const normalize = (name) => (name.includes(":") ? name : `${name}:latest`)
        const target = normalize(modelName)
        const installed = installedList.map(normalize).includes(target)

        this.infoLog(`[isModelInstalled] Checking if model ${target} is ${installed ? 'installed' : 'not installed'}.`);
        return installed
    }

    async pullModel(name, onProgress = null) {
        if (!name || typeof name !== 'string') {
            this.errorLog("[pullModel] Invalid model name:", name)
            return { success: false, error: 'Invalid model name' }
        }

        const installedNames = await this.getAllModelsNames()
        if (this.isModelInstalled(name, installedNames)) {
            this.infoLog(`[pullModel] Model ${name} already exists.`);
            return { success: false, error: 'Model already exists' }
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/pull`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, stream: true })
            })
            this.infoLog("[pullModel] response:", response);

            if (!response.ok)
                throw new Error(`Failed to pull model: ${response.status} ${response.statusText}`)
            if (!response.body)
                throw new Error('No response body for streaming pull')

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let lastStatus = null

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop()

                for (const line of lines) {
                    if (!line.trim()) {
                        continue
                    }

                    let progress

                    try {
                        progress = JSON.parse(line)
                    } catch {
                        this.infoLog("[pullModel] failed to parse line:", line)
                        continue
                    }

                    lastStatus = progress
                    this.infoLog("[pullModel] pull progress:", progress)

                    if (typeof onProgress === "function") {
                        onProgress(progress)
                    }

                    if (progress.error) {
                        throw new Error(progress.error)
                    }
                }
            }

            await this.refreshModelsCache()
            return { success: true, status: lastStatus }
        } catch (err) {
            this.errorLog("[pullModel] failed:", err)
            return { success: false, error: err.message }
        }
    }

    setActivePull(pull) {
        localStorage.setItem(
            "localai-active-ollama-pull",
            JSON.stringify(pull),
        )
    }

    getActivePull() {
        try {
            const raw = localStorage.getItem("localai-active-ollama-pull")
            return raw ? JSON.parse(raw) : null
        } catch {
            return null
        }
    }

    clearActivePull() {
        localStorage.removeItem("localai-active-ollama-pull")
    }

    setSelectedModel(name) {
        this.selectedModel = name;
        this.safeSetStorage("selectedModel", name ?? "");
    }

    getSelectedModel() {
        return this.selectedModel;
    }

    // create one time answer
    async generateResponse(modelName, prompt, options = {}) {
        if (!modelName || typeof modelName !== 'string') {
            this.errorLog("[generateResponse] Invalid model name:", modelName)
            return { success: false, error: 'Invalid model name' }
        }
        if (!prompt || typeof prompt !== 'string') {
            this.infoLog("[generateResponse] Invalid prompt:", prompt)
            return { success: false, error: 'Invalid prompt' }
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelName,
                    prompt,
                    stream: false,
                    options
                })
            })
            this.infoLog("[generateResponse] response:", response)

            if (!response.ok) {
                const errorText = await response.text().catch(() => response.statusText)
                throw new Error(`Failed to generate response: ${response.status} ${errorText}`)
            }

            const data = await response.json()
            return { success: true, response: data.response, raw: data }
        } catch (err) {
            this.errorLog("[generateResponse] failed:", err)
            return { success: false, error: err.message }
        }
    }

    // create complex streaming answer
    createChatSession(
        modelName,
        {
            initialMessages = [],
            options = {},
        } = {},
    ) {
        if (!modelName || typeof modelName !== "string") {
            throw new Error("createChatSession: invalid model name");
        }

        const api = this;

        const history = initialMessages.map((message) => ({
            role: message.role,
            content: message.content,
        }));

        const mergedOptions = {
            ...(this.chatDefaults ?? {}),
            ...options,
        };

        return {
            model: modelName,
            options: mergedOptions,

            get history() {
                return history;
            },

            async send(message, onProgress = null, signal = undefined) {
                if (!message || typeof message !== "string") {
                    return { success: false, error: "Invalid message" };
                }

                history.push({ role: "user", content: message });

                try {
                    const response = await fetch(`${api.baseUrl}/api/chat`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            model: modelName,
                            messages: history,
                            stream: Boolean(onProgress),
                            options: this.options,
                        }),
                        signal,
                    });

                    if (!response.ok) {
                        const errorText = await response
                            .text()
                            .catch(() => response.statusText);

                        throw new Error(
                            `Chat request failed: ${response.status} ${errorText}`,
                        );
                    }

                    if (!response.body) {
                        throw new Error("Chat request has no response body.");
                    }

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();

                    let buffer = "";
                    let text = "";
                    let stats = {
                        evalCount: 0,
                        promptEvalCount: 0,
                        totalDuration: 0,
                    };

                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            buffer += decoder.decode(value, { stream: true });

                            const lines = buffer.split("\n");
                            buffer = lines.pop() ?? "";

                            for (const line of lines) {
                                if (!line.trim()) continue;

                                const chunk = JSON.parse(line);

                                if (chunk.error) {
                                    throw new Error(chunk.error);
                                }

                                const token = chunk.message?.content ?? "";
                                text += token;

                                onProgress?.({
                                    response: token,
                                    done: chunk.done ?? false,
                                });

                                if (chunk.done) {
                                    stats = {
                                        evalCount: chunk.eval_count ?? 0,
                                        promptEvalCount: chunk.prompt_eval_count ?? 0,
                                        totalDuration: chunk.total_duration ?? 0,
                                    };
                                }
                            }
                        }
                    } finally {
                        reader.cancel().catch(() => { });
                    }

                    history.push({
                        role: "assistant",
                        content: text,
                    });

                    return {
                        success: true,
                        text,
                        response: text,
                        stats,
                        aborted: false,
                    };
                } catch (error) {
                    history.pop();

                    if (error.name === "AbortError") {
                        return {
                            success: false,
                            aborted: true,
                            text,
                            response: text,
                            stats,
                        };
                    }

                    api.errorLog("[createChatSession] chat send failed:", error);

                    throw error;
                }
            },

            setOptions(newOptions) {
                this.options = {
                    ...this.options,
                    ...newOptions,
                };
            },

            clearHistory() {
                history.length = 0;
            },
        };
    }

    // Wrapper
    async generateStreamingChatAnswer(
        modelName,
        messages,
        options = {},
        onToken = null,
        signal = undefined,
    ) {
        if (!modelName || typeof modelName !== "string") {
            throw new Error("generateStreamingChatAnswer: invalid model name");
        }

        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: modelName,
                messages,
                stream: true,
                options: {
                    ...(this.chatDefaults ?? {}),
                    ...options,
                },
            }),
            signal,
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            throw new Error(
                `Chat request failed: ${response.status} ${errorText}`,
            );
        }

        if (!response.body) {
            throw new Error("Chat request has no response body.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = "";
        let text = "";
        let stats = {
            evalCount: 0,
            promptEvalCount: 0,
            totalDuration: 0,
        };

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    if (!line.trim()) continue;

                    const chunk = JSON.parse(line);

                    if (chunk.error) {
                        throw new Error(chunk.error);
                    }

                    const token = chunk.message?.content ?? "";
                    text += token;

                    onToken?.({
                        response: token,
                        done: chunk.done ?? false,
                    });

                    if (chunk.done) {
                        stats = {
                            evalCount: chunk.eval_count ?? 0,
                            promptEvalCount: chunk.prompt_eval_count ?? 0,
                            totalDuration: chunk.total_duration ?? 0,
                        };
                    }
                }
            }
        } finally {
            reader.cancel().catch(() => { });
        }

        return {
            text,
            stats,
            aborted: false,
        };
    }

    safeGetStorage(key) {
        try {
            return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
        } catch {
            return null
        }
    }

    safeSetStorage(key, value) {
        try {
            if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
        } catch {
            // ignore (e.g. Node.js without --localstorage-file)
        }
    }

    getResourceLinks() {
        return OLLAMA_RESOURCE_LINKS
    }

    formatBytes(bytes, decimals = 2) {
        if (!bytes) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const formattedSize = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i]

        this.infoLog(`formatBytes: ${bytes} bytes = ${formattedSize}`);

        return (
            formattedSize
        );
    }

    getInstalledModelsTotalSize() {
        const totalBytes = this.allModelsCache.reduce(
            (sum, { size = 0 }) => sum + size,
            0,
        )
        const formattedSize = this.formatBytes(totalBytes)
        this.infoLog(`[getInstalledModelsTotalSize] Total size of installed models: ${formattedSize}`);

        return formattedSize
    }
}
