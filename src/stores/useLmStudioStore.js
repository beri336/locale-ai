// src/stores/useLmStudioStore.js

const DEFAULT_BASE_URL = "http://localhost:1234";
const BASE_URL_STORAGE_KEY = "lmstudio-api-url";
const DEFAULT_DEBUG_ENABLED = true
const ACTIVE_PULL_STORAGE_KEY = "localai-active-lmstudio-download"
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
const CHAT_DEFAULTS_STORAGE_KEY = "lmstudio-chat-defaults"
const DEFAULT_CHAT_DEFAULTS = {
    temperature: 0.7,
    contextLength: 4096,
    systemPrompt: "You are a helpful assistant.",
}
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
]

export class LmStudioApi {
    constructor() {
        this.versionCache = "Unknown"; // currently no API endpoint to get the version, so we cache it as "Unknown" for now

        this.baseUrl = localStorage.getItem(BASE_URL_STORAGE_KEY) || DEFAULT_BASE_URL;
        this.debugEnabled = this.safeGetStorage("lmstudio-debug-enabled") === 'true' || DEFAULT_DEBUG_ENABLED

        this.allModelsCache = null // not loaded yet
        this.runningModelCache = null
        this.selectedModel = this.safeGetStorage("selectedModel") || null

        this.chatDefaults = this.loadChatDefaults()
    }

    loadChatDefaults() {
        const raw = this.safeGetStorage(CHAT_DEFAULTS_STORAGE_KEY)

        if (!raw) {
            return { ...DEFAULT_CHAT_DEFAULTS }
        }

        try {
            const parsed = JSON.parse(raw)

            return {
                temperature: Number.isFinite(parsed.temperature)
                    ? parsed.temperature
                    : DEFAULT_CHAT_DEFAULTS.temperature,

                contextLength: Number.isInteger(parsed.contextLength)
                    ? parsed.contextLength
                    : DEFAULT_CHAT_DEFAULTS.contextLength,

                systemPrompt: typeof parsed.systemPrompt === "string"
                    ? parsed.systemPrompt
                    : DEFAULT_CHAT_DEFAULTS.systemPrompt,
            }
        } catch {
            return { ...DEFAULT_CHAT_DEFAULTS }
        }
    }

    saveChatDefaults(defaults) {
        const nextDefaults = {
            ...this.chatDefaults,
            ...defaults,
        }

        nextDefaults.temperature = Math.min(
            1,
            Math.max(0, Number(nextDefaults.temperature) || 0),
        )

        nextDefaults.contextLength = Math.max(
            512,
            Math.floor(Number(nextDefaults.contextLength) || 4096),
        )

        nextDefaults.systemPrompt = String(nextDefaults.systemPrompt ?? "")

        this.chatDefaults = nextDefaults

        this.safeSetStorage(
            CHAT_DEFAULTS_STORAGE_KEY,
            JSON.stringify(this.chatDefaults),
        )

        return this.chatDefaults
    }

    getChatDefaults() {
        return { ...this.chatDefaults }
    }

    async fetchWithTimeout(url, options = {}, timeoutMs = 3_000) {
        return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(timeoutMs),
        })
    }

    async getVersion() {
        this.debugLog("getVersion: returning cached version:", this.versionCache)
        return this.versionCache
    }

    getRecommendedModels() {
        return RECOMMENDED_MODELS;
    }

    async status() {
        try {
            const response = await fetch(`${this.getBaseUrl()}/api/v1/models`, {
                signal: AbortSignal.timeout(5000),
            });

            if (this.debugEnabled) {
                console.log('response:', response)
            }

            return response.ok;
        } catch (error) {
            console.error("LM Studio status check failed:", error);
            return false;
        }
    }

    async statusBool() {
        const status = await this.status();
        return status; // return this.status();
    }

    async isInstalled() {
        const installed = await this.status();
        if (this.debugEnabled) {
            console.log(installed ? 'LM Studio is installed.' : 'Could not verify LM Studio installation status.')
        }

        return installed ? 'Installed' : 'Could not verify installation'
    }

    async isConnected() {
        const connected = await this.status();
        if (this.debugEnabled) {
            console.log(connected ? 'LM Studio is connected.' : 'Could not verify LM Studioconnection status.')
        }

        return connected ? 'Connected' : 'Could not verify connection'
    }

    getBaseUrl() {
        return this.baseUrl
    }

    isValidUrl(url) {
        try {
            new URL(url)

            return true
        } catch {
            return false
        }
    }

    invalidateCaches() {
        //this.versionCache = null
        this.allModelsCache = null
        this.runningModelCache = null
    }

    setBaseUrl(newUrl) {
        const trimmedUrl = newUrl.trim().replace(/\/+$/, "");
        if (!this.isValidUrl(trimmedUrl)) {
            throw new Error(`setBaseUrl: Invalid URL: ${trimmedUrl}`);
        }

        this.baseUrl = trimmedUrl;
        this.safeSetStorage(BASE_URL_STORAGE_KEY, trimmedUrl);
        this.invalidateCaches();
        return true;
    }

    resetBaseUrl() {
        this.baseUrl = DEFAULT_BASE_URL;
        this.safeSetStorage(BASE_URL_STORAGE_KEY, DEFAULT_BASE_URL);
        this.invalidateCaches();
    }

    toggleDebug() {
        this.debugEnabled = !this.debugEnabled

        this.safeSetStorage(
            "lmstudio-debug-enabled",
            String(this.debugEnabled),
        )

        return this.debugEnabled
    }

    isDebugEnabled() {
        return this.debugEnabled
    }

    async getAllInstalledModels() { // private
        try {
            const response = await fetch(`${this.getBaseUrl()}/api/v1/models`, {
                signal: AbortSignal.timeout(5000),
            });
            if (!response.ok)
                throw new Error("Failed to fetch models");

            const data = await response.json();
            const rawModels = data.models || [];

            this.allModelsCache = rawModels.map((model) => ({
                id: model.key,
                displayName: model.display_name,
                path: model.path ?? "",
                type: model.type,
                publisher: model.publisher,
                architecture: model.architecture,
                quantization: model.quantization?.name,
                paramsString: model.params_string,
                maxContextLength: model.max_context_length,
                sizeBytes: model.size_bytes,
                format: model.format,
                capabilities: model.capabilities,
                loadedInstances: model.loaded_instances || [],
                isLoaded: (model.loaded_instances || []).length > 0,
                instanceId: model.loaded_instances?.[0]?.id ?? null,
            }));

            //loadedModels.value = models.value.filter((m) => m.isLoaded);
        } catch (error) {
            console.error("LM Studio fetchModels failed:", error);
            this.allModelsCache = null
            //loadedModels.value = [];
            throw error
        }
    }

    async getAllModelsWithDetails() {
        if (this.allModelsCache === null) {
            await this.getAllInstalledModels()
            if (this.debugEnabled) {
                console.info("Fetched all models with details:", this.allModelsCache)
            }
        }
        if (this.debugEnabled) {
            console.info("Returning all models with details:", this.allModelsCache)
        }

        return this.allModelsCache
    }

    async getAllModelsForSelection() { // only for Chat.vue Models
        const models = await this.getAllModelsWithDetails();

        return models.map((model) => ({
            id: model.id,
            displayName: model.displayName || model.id,
        }));
    }

    async getAllModelsNames() {
        const models = await this.getAllModelsWithDetails();
        return models.map((model) => model.displayName);
    }

    async getAllModelsTotalCount() {
        const models = await this.getAllModelsWithDetails();
        return models.length;
    }

    async refreshModelsCache() {
        this.allModelsCache = null
        return this.getAllInstalledModels()
    }

    async getAllRunningModels() {
        const allModels = await this.getAllModelsWithDetails();
        const runningModels = allModels.filter((model) => model.isLoaded);
        this.runningModelCache = runningModels

        return runningModels
    } // private

    async getRunningModelsNames() {
        if (this.runningModelCache === null) {
            await this.getAllRunningModels()
        }

        return this.runningModelCache.map((model) => model.displayName);
    }

    async getRunningModelsTotalCount() {
        if (this.runningModelCache === null) {
            await this.getAllRunningModels()
        }

        return this.runningModelCache.length;
    }

    async refreshRunningModelsCache() {
        await this.refreshModelsCache()

        this.runningModelCache = this.allModelsCache.filter(
            model => model.isLoaded,
        )

        return this.runningModelCache
    }

    async loadModel(modelId, options = {}) {
        if (!modelId || typeof modelId !== "string") {
            return {
                success: false,
                error: "Missing or invalid model ID.",
            }
        }

        const installed = this.isModelInstalled(modelId)

        if (!installed) {
            return {
                success: false,
                error: `Model "${modelId}" is not installed.`,
            }
        }

        const model = this.allModelsCache.find(
            item => this.normalizeModelValue(item.id) ===
                this.normalizeModelValue(modelId),
        )

        if (model?.isLoaded) {
            return {
                success: true,
                alreadyLoaded: true,
                instanceId: model.instanceId,
                message: `Model "${model.displayName}" is already loaded.`,
            }
        }

        try {
            const body = {
                model: modelId,
                echo_load_config: true,
            }

            if (Number.isInteger(options.contextLength) && options.contextLength > 0) {
                body.context_length = options.contextLength
            }

            if (Number.isInteger(options.evalBatchSize) && options.evalBatchSize > 0) {
                body.eval_batch_size = options.evalBatchSize
            }

            if (typeof options.flashAttention === "boolean") {
                body.flash_attention = options.flashAttention
            }

            if (typeof options.offloadKvCacheToGpu === "boolean") {
                body.offload_kv_cache_to_gpu = options.offloadKvCacheToGpu
            }

            if (Number.isInteger(options.numExperts) && options.numExperts > 0) {
                body.num_experts = options.numExperts
            }

            const response = await this.fetchWithTimeout(
                `${this.getBaseUrl()}/api/v1/models/load`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                },
                120_000,
            )

            const data = await response.json().catch(() => null)

            if (!response.ok) {
                return {
                    success: false,
                    error:
                        data?.error ??
                        data?.message ??
                        `Could not load model (${response.status} ${response.statusText}).`,
                }
            }

            await this.refreshModelsCache()

            return {
                success: true,
                instanceId: data?.instance_id ?? null,
                status: data,
            }
        } catch (err) {
            console.error("LM Studio loadModel failed:", err)

            return {
                success: false,
                error: err instanceof Error
                    ? err.message
                    : "Could not load model.",
            }
        }
    }

    async unloadModel(instanceId) {
        if (!instanceId || typeof instanceId !== "string") {
            return {
                success: false,
                error: "Missing model instance ID.",
            }
        }

        try {
            const response = await this.fetchWithTimeout(
                `${this.getBaseUrl()}/api/v1/models/unload`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        instance_id: instanceId,
                    }),
                },
                15_000,
            )

            const data = await response.json().catch(() => null)

            if (!response.ok) {
                return {
                    success: false,
                    error:
                        data?.error ??
                        data?.message ??
                        `Could not unload model (${response.status}).`,
                }
            }

            await this.refreshModelsCache()

            return {
                success: true,
                data,
            }
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error
                    ? err.message
                    : "Could not unload model.",
            }
        }
    }

    async isModelLoaded(name) { }

    async removeModel() {
        // currently no API endpoint to delete models
        return false
    }

    normalizeModelValue(value = "") {
        return String(value)
            .trim()
            .toLowerCase()
            .replace(/\\/g, "/")
    }

    escapeRegExp(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    }

    async isModelInstalled(modelOrId) {
        const modelDefinition =
            typeof modelOrId === "object" && modelOrId !== null
                ? modelOrId
                : null

        const valuesToMatch = [
            modelDefinition?.name ?? modelOrId,
            ...(modelDefinition?.aliases ?? []),
        ]
            .map(value => this.normalizeModelValue(value))
            .filter(Boolean)

        if (valuesToMatch.length === 0 || !Array.isArray(this.allModelsCache)) {
            return false
        }

        return this.allModelsCache.some(installedModel => {
            const id = this.normalizeModelValue(installedModel.id)
            const displayName = this.normalizeModelValue(installedModel.displayName)
            const path = this.normalizeModelValue(installedModel.path)

            return valuesToMatch.some(candidate => {
                if (id === candidate || displayName === candidate) {
                    return true
                }

                // Nur vollständige Katalog-IDs im Pfad suchen.
                return candidate.includes("/") && path.includes(candidate)
            })
        })
    }

    // download new models
    async pullModel(modelSource, onProgress = null) {
        const startResult = await this.downloadModel(modelSource)

        if (!startResult.success) {
            return startResult
        }

        const initialStatus = startResult.status

        // Kein Fehler: Modell liegt schon lokal vor.
        if (initialStatus.status === "already_downloaded") {
            await this.refreshModelsCache()

            return {
                success: true,
                status: initialStatus,
            }
        }

        if (initialStatus.status === "completed") {
            await this.refreshModelsCache()

            return {
                success: true,
                status: initialStatus,
            }
        }

        if (!initialStatus.job_id) {
            return {
                success: false,
                error: "LM Studio did not return a download job ID.",
            }
        }

        return this.waitForModelDownload(initialStatus.job_id, onProgress)
    }

    isValidLmStudioModelSource(value) {
        if (typeof value !== "string") {
            return false
        }

        const source = value.trim()

        // LM-Studio-Katalog-Identifier, z. B. "openai/gpt-oss-20b"
        const isCatalogId =
            /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(source)

        // Exakte Hugging-Face-Repository-URL
        let isHuggingFaceUrl = false

        try {
            const url = new URL(source)
            isHuggingFaceUrl =
                url.protocol === "https:" &&
                (url.hostname === "huggingface.co" ||
                    url.hostname === "www.huggingface.co") &&
                url.pathname.split("/").filter(Boolean).length >= 2
        } catch {
            // Kein valides URL-Format; der Katalog-Identifier wird oben geprüft.
        }

        return isCatalogId || isHuggingFaceUrl
    }

    setActivePull(pull) {
        this.safeSetStorage(
            ACTIVE_PULL_STORAGE_KEY,
            JSON.stringify(pull),
        )
    }

    getActivePull() {
        try {
            const raw = this.safeGetStorage(ACTIVE_PULL_STORAGE_KEY)
            return raw ? JSON.parse(raw) : null
        } catch {
            return null
        }
    }

    clearActivePull() {
        try {
            localStorage.removeItem(ACTIVE_PULL_STORAGE_KEY)
        } catch {
            // localStorage is unavailable.
        }
    }

    async downloadModel(model, quantization = null) {
        const source = model?.trim()

        if (!this.isValidLmStudioModelSource(source)) {
            return {
                success: false,
                error:
                    "Use an LM Studio catalog identifier (e.g. openai/gpt-oss-20b) or an exact Hugging Face URL.",
            }
        }

        try {
            const body = { model: source }

            if (quantization) {
                body.quantization = quantization
            }

            const response = await this.fetchWithTimeout(
                `${this.getBaseUrl()}/api/v1/models/download`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                },
                15_000,
            )

            const data = await response.json().catch(() => null)

            if (!response.ok) {
                throw new Error(
                    data?.error ??
                    data?.message ??
                    `Could not start model download (${response.status} ${response.statusText}).`,
                )
            }

            // status: downloading | paused | completed | failed | already_downloaded
            if (data?.status === "failed") {
                return {
                    success: false,
                    error: data?.error ?? "LM Studio rejected the model download.",
                }
            }

            return {
                success: true,
                status: data,
            }
        } catch (err) {
            console.error("LM Studio downloadModel failed:", err)

            return {
                success: false,
                error: err instanceof Error ? err.message : "Could not start model download.",
            }
        }
    }

    async getModelDownloadStatus(jobId) {
        if (!jobId) {
            throw new Error("Missing LM Studio download job ID.")
        }

        const response = await this.fetchWithTimeout(
            `${this.getBaseUrl()}/api/v1/models/download/status/${encodeURIComponent(jobId)}`,
            { method: "GET" },
            10_000,
        )

        const data = await response.json().catch(() => null)

        if (!response.ok) {
            throw new Error(
                data?.error ??
                data?.message ??
                `Could not get download status (${response.status}).`,
            )
        }

        return data
    }

    async waitForModelDownload(jobId, onProgress = null) {
        while (true) {
            const status = await this.getModelDownloadStatus(jobId)

            if (typeof onProgress === "function") {
                onProgress(status)
            }

            if (status.status === "completed") {
                await this.refreshModelsCache()

                return {
                    success: true,
                    status,
                }
            }

            if (status.status === "failed") {
                return {
                    success: false,
                    error: status.error ?? "The LM Studio download failed.",
                    status,
                }
            }

            if (status.status === "paused") {
                return {
                    success: false,
                    error: "The LM Studio download is paused.",
                    status,
                }
            }

            await new Promise(resolve => window.setTimeout(resolve, 1_000))
        }
    }

    // end download new models

    // ai chat
    extractTextFromOutput(output = []) {
        if (!Array.isArray(output)) {
            return ""
        }

        return output
            .filter(item => item?.type === "message")
            .map(item => item.content ?? "")
            .join("")
    }

    buildChatSettings(options = {}) {
        const merged = {
            ...(this.chatDefaults ?? {}),
            ...options,
        }

        return { // Die optionalen Werte mit undefined werden von JSON.stringify() nicht übertragen. Das ist erwünscht.
            temperature: merged.temperature,
            context_length: merged.contextLength,
            system_prompt: merged.systemPrompt || undefined,
            top_p: merged.topP,
            top_k: merged.topK,
            min_p: merged.minP,
            repeat_penalty: merged.repeatPenalty,
            max_output_tokens: merged.maxOutputTokens,
            reasoning: merged.reasoning,
        }
    }

    async generateResponse(modelId, prompt, options = {}) {
        /* Example
        const result = await lmStudioApi.generateResponse(
            "qwen/qwen3-8b",
            "Explain dependency injection in three sentences.",
        )

        if (result.success) {
            console.log(result.response)
        }
        */
        if (!modelId || typeof modelId !== "string") {
            return {
                success: false,
                error: "Invalid model ID.",
            }
        }

        if (!prompt || typeof prompt !== "string") {
            return {
                success: false,
                error: "Invalid prompt.",
            }
        }

        const settings = this.buildChatSettings(options)

        try {
            const response = await this.fetchWithTimeout(
                `${this.getBaseUrl()}/api/v1/chat`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: modelId,
                        input: prompt.trim(),
                        stream: false,

                        // Keine serverseitige Chat-History speichern.
                        store: false,

                        temperature: settings.temperature,
                        context_length: settings.context_length,
                        system_prompt: settings.system_prompt,
                        top_p: settings.top_p,
                        top_k: settings.top_k,
                        min_p: settings.min_p,
                        repeat_penalty: settings.repeat_penalty,
                        max_output_tokens: settings.max_output_tokens,
                        reasoning: settings.reasoning,
                    }),
                },
                120_000,
            )

            const data = await response.json().catch(() => null)

            if (!response.ok) {
                throw new Error(
                    data?.error?.message ??
                    data?.error ??
                    data?.message ??
                    `Chat request failed (${response.status} ${response.statusText}).`,
                )
            }

            const content = this.extractTextFromOutput(data?.output)

            if (this.debugEnabled) {
                console.info("LM Studio generateResponse data:", data)
            }

            return {
                success: true,
                response: content,
                raw: data,
                stats: data?.stats ?? null,
                modelInstanceId: data?.model_instance_id ?? null,
            }
        } catch (err) {
            console.error("LM Studio generateResponse failed:", err)

            return {
                success: false,
                error: err instanceof Error
                    ? err.message
                    : "Chat request failed.",
            }
        }
    }

    createChatSession(modelId, options = {}) {
        /* Verwendung
        const session = lmStudioApi.createChatSession(
            "qwen/qwen3-8b",
            {
                temperature: 0.7,
                contextLength: 8192,
                systemPrompt: "You are a concise programming assistant.",
            },
        )
        
        // normale Antwort
        const firstResult = await session.send(
            "Explain the repository pattern.",
        )

        // Kontext wird automatisch übernommen:
        const secondResult = await session.send(
            "Show a small TypeScript example for it.",
        )

        Streaming:
        const result = await session.send(
            "Explain the example step by step.",
            event => {
                if (event.type === "message.delta") {
                    console.log(event.content)
                }
            },
        )
        */
        if (!modelId || typeof modelId !== "string") {
            throw new Error("createChatSession: invalid model ID.")
        }

        const api = this
        const history = []

        let sessionOptions = {
            ...(this.chatDefaults ?? {}),
            ...options,
        }

        let previousResponseId = null

        return {
            model: modelId,

            get options() {
                return { ...sessionOptions }
            },

            get history() {
                return [...history]
            },

            get previousResponseId() {
                return previousResponseId
            },

            async send(message, onProgress = null) {
                if (!message || typeof message !== "string") {
                    return {
                        success: false,
                        error: "Invalid message.",
                    }
                }

                const userMessage = message.trim()

                if (!userMessage) {
                    return {
                        success: false,
                        error: "Message must not be empty.",
                    }
                }

                history.push({
                    role: "user",
                    content: userMessage,
                })

                const settings = api.buildChatSettings(sessionOptions)

                const body = {
                    model: modelId,
                    input: userMessage,

                    // Bei onProgress: SSE-Stream; sonst normale JSON-Response.
                    stream: typeof onProgress === "function",

                    // Wichtig: Aktiviert LM Studios serverseitigen Kontext.
                    store: true,

                    temperature: settings.temperature,
                    context_length: settings.context_length,
                    top_p: settings.top_p,
                    top_k: settings.top_k,
                    min_p: settings.min_p,
                    repeat_penalty: settings.repeat_penalty,
                    max_output_tokens: settings.max_output_tokens,
                    reasoning: settings.reasoning,
                }

                // Der System Prompt ist beim ersten Request relevant.
                if (!previousResponseId && settings.system_prompt) {
                    body.system_prompt = settings.system_prompt
                }

                // Ab der zweiten Nachricht wird der bisherige Kontext fortgesetzt.
                if (previousResponseId) {
                    body.previous_response_id = previousResponseId
                }

                try {
                    const response = await api.fetchWithTimeout(
                        `${api.getBaseUrl()}/api/v1/chat`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(body),
                        },
                        120_000,
                    )

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => null)

                        throw new Error(
                            errorData?.error?.message ??
                            errorData?.error ??
                            errorData?.message ??
                            `Chat request failed (${response.status} ${response.statusText}).`,
                        )
                    }

                    if (typeof onProgress === "function" && response.body) {
                        return await this.handleStream(response, onProgress)
                    }

                    const data = await response.json()
                    const content = api.extractTextFromOutput(data?.output)

                    previousResponseId = data?.response_id ?? previousResponseId

                    history.push({
                        role: "assistant",
                        content,
                    })

                    return {
                        success: true,
                        response: content,
                        raw: data,
                        stats: data?.stats ?? null,
                        responseId: previousResponseId,
                        modelInstanceId: data?.model_instance_id ?? null,
                    }
                } catch (err) {
                    history.pop()

                    console.error("LM Studio chat session failed:", err)

                    return {
                        success: false,
                        error: err instanceof Error
                            ? err.message
                            : "Chat request failed.",
                    }
                }
            },

            async handleStream(response, onProgress) {
                /*
                LM Studio streamt nicht wie Ollama zeilenweise JSON, sondern über SSE mit Events wie message.delta, reasoning.delta, error und dem finalen chat.end. Deshalb ist für den Streaming-Code ein SSE-Parser nötig.
                */
                const reader = response.body.getReader()
                const decoder = new TextDecoder()

                let buffer = ""
                let fullContent = ""
                let finalResult = null

                try {
                    while (true) {
                        const { done, value } = await reader.read()

                        if (done) {
                            break
                        }

                        buffer += decoder.decode(value, { stream: true })

                        // SSE-Events sind durch eine Leerzeile getrennt.
                        const events = buffer.split("\n\n")
                        buffer = events.pop() ?? ""

                        for (const rawEvent of events) {
                            const eventName = rawEvent
                                .split("\n")
                                .find(line => line.startsWith("event:"))
                                ?.replace("event:", "")
                                .trim()

                            const dataLine = rawEvent
                                .split("\n")
                                .find(line => line.startsWith("data:"))

                            if (!dataLine) {
                                continue
                            }

                            let eventData

                            try {
                                eventData = JSON.parse(
                                    dataLine.replace("data:", "").trim(),
                                )
                            } catch {
                                continue
                            }

                            // Laufender Antwort-Text.
                            if (eventName === "message.delta") {
                                const token = eventData.content ?? ""

                                fullContent += token

                                onProgress({
                                    type: "message.delta",
                                    content: token,
                                    response: fullContent,
                                    raw: eventData,
                                })
                            }

                            // Optional: Reasoning separat an das UI geben.
                            if (eventName === "reasoning.delta") {
                                onProgress({
                                    type: "reasoning.delta",
                                    content: eventData.content ?? "",
                                    raw: eventData,
                                })
                            }

                            if (eventName === "error") {
                                throw new Error(
                                    eventData?.error?.message ??
                                    eventData?.message ??
                                    "LM Studio streaming error.",
                                )
                            }

                            // Enthält die finale Response wie beim non-streaming Request.
                            if (eventName === "chat.end") {
                                finalResult = eventData.result ?? null
                            }
                        }
                    }

                    const finalText =
                        api.extractTextFromOutput(finalResult?.output) ||
                        fullContent

                    previousResponseId =
                        finalResult?.response_id ??
                        previousResponseId

                    history.push({
                        role: "assistant",
                        content: finalText,
                    })

                    return {
                        success: true,
                        response: finalText,
                        raw: finalResult,
                        stats: finalResult?.stats ?? null,
                        responseId: previousResponseId,
                        modelInstanceId:
                            finalResult?.model_instance_id ?? null,
                    }
                } finally {
                    reader.cancel().catch(() => { })
                }
            },

            setOptions(newOptions = {}) {
                sessionOptions = {
                    ...sessionOptions,
                    ...newOptions,
                }
            },

            clearHistory() {
                history.length = 0
                previousResponseId = null
            },
        }
    }

    // end ai chat

    safeGetStorage(key) {
        try {
            return typeof localStorage !== "undefined"
                ? localStorage.getItem(key)
                : null
        } catch {
            return null
        }
    }

    safeSetStorage(key, value) {
        try {
            if (typeof localStorage !== "undefined") {
                localStorage.setItem(key, value)
            }
        } catch {
            // localStorage is unavailable.
        }
    }

    getResourceLinks() {
        return RESOURCE_LINKS
    }

    // log helpers
    debugLog(...args) {
        if (this.debugEnabled) {
            console.debug("[LM Studio]", ...args);
        }
    }

    infoLog(...args) {
        if (this.debugEnabled) {
            console.info("[LM Studio]", ...args);
        }
    }

    errorLog(...args) {
        // Später ggf. zusätzlich an Sentry, OpenTelemetry etc. senden
        console.error("[LM Studio]", ...args);
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

    async getInstalledModelsTotalSize() {
        if (!this.allModelsCache) {
            await this.getAllInstalledModels();
        }

        const totalBytes = this.allModelsCache.reduce(
            (sum, { sizeBytes = 0 }) => sum + (Number(sizeBytes) || 0),
            0,
        );
        const formattedSize = this.formatBytes(totalBytes);

        this.infoLog(`[getInstalledModelsTotalSize] Total size of installed models: ${formattedSize}`);

        return formattedSize;
    }

    // not implemented yet
    setSelectedModel(name) {
        this.selectedModel = name;
        this.safeSetStorage("selectedModel", name ?? "")
    }

    getSelectedModel() {
        return this.selectedModel;
    }
}
