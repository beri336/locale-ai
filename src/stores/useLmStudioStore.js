// src/stores/useLmStudioStore.js

import { defineStore } from "pinia";
import { ref } from "vue";
import { isValidLmStudioModelId } from "@/utils/validation";

const DEFAULT_BASE_URL = "http://localhost:1234";

export const useLmStudioStore = defineStore("lmstudio", () => {
    const isOnline = ref(false);
    const models = ref([]);
    const loadedModels = ref([]);
    const isLoading = ref(false);
    const selectedModel = ref(localStorage.getItem("lmstudio-selected-model") || "");

    const loadedInstanceIds = ref({}); // speichert die instance_id für jedes geladene Modell

    function getBaseUrl() {
        const stored = localStorage.getItem("lmstudio-api-url");
        return (stored || DEFAULT_BASE_URL).replace(/\/+$/, "");
    }

    async function testConnection() {
        try {
            const response = await fetch(`${getBaseUrl()}/api/v1/models`, {
                signal: AbortSignal.timeout(5000),
            });
            isOnline.value = response.ok;
            return response.ok;
        } catch (error) {
            isOnline.value = false;
            return false;
        }
    }

    async function fetchModels() {
        isLoading.value = true;
        try {
            const response = await fetch(`${getBaseUrl()}/api/v1/models`, {
                signal: AbortSignal.timeout(5000),
            });
            if (!response.ok) throw new Error("Failed to fetch models");

            const data = await response.json();
            const rawModels = data.data || data.models || [];

            models.value = rawModels.map((m) => ({
                id: m.key,
                displayName: m.display_name,
                type: m.type,
                publisher: m.publisher,
                architecture: m.architecture,
                quantization: m.quantization?.name,
                paramsString: m.params_string,
                maxContextLength: m.max_context_length,
                sizeBytes: m.size_bytes,
                format: m.format,
                capabilities: m.capabilities,
                loadedInstances: m.loaded_instances || [],
                isLoaded: (m.loaded_instances || []).length > 0,
                instanceId: m.loaded_instances?.[0]?.id ?? null,
            }));

            loadedModels.value = models.value.filter((m) => m.isLoaded);
            isOnline.value = true;
        } catch (error) {
            console.error("LM Studio fetchModels failed:", error);
            isOnline.value = false;
            models.value = [];
            loadedModels.value = [];
        } finally {
            isLoading.value = false;
        }
    }

    async function loadModel(modelId) {
        if (!isValidLmStudioModelId(modelId)) throw new Error("Invalid model name");

        const response = await fetch(`${getBaseUrl()}/api/v1/models/load`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: modelId }),
        });

        if (!response.ok) throw new Error("Failed to load model");

        const data = await response.json();
        // instance_id zwischenspeichern, um später unloaden zu können
        loadedInstanceIds.value[modelId] = data.instance_id;

        await fetchModels();
    }

    async function unloadModel(modelId) {
        const model = models.value.find((m) => m.id === modelId);
        const instanceId = model?.instanceId;
        if (!instanceId) throw new Error("No active instance found for this model");

        const response = await fetch(`${getBaseUrl()}/api/v1/models/unload`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ instance_id: instanceId }),
        });

        if (!response.ok) throw new Error("Failed to unload model");
        await fetchModels();
    }

    async function generateStreamingChatAnswer(model, messages, options = {}, onChunk, signal) {
        const response = await fetch(`${getBaseUrl()}/api/v1/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model,
                messages,
                stream: true,
                temperature: options.temperature,
                max_tokens: options.num_ctx,
            }),
            signal,
        });

        if (!response.ok || !response.body) {
            throw new Error("LM Studio chat request failed");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const payload = line.slice(6).trim();
                if (payload === "[DONE]") continue;

                try {
                    const parsed = JSON.parse(payload);
                    const delta = parsed.choices?.[0]?.delta?.content || parsed.delta?.content || "";
                    fullText += delta;
                    onChunk({ response: delta });
                } catch {
                    // Skip malformed chunks
                }
            }
        }

        return {
            text: fullText,
            stats: { evalCount: Math.ceil(fullText.length / 4) },
        };
    }

    function setSelectedModel(modelId) {
        selectedModel.value = modelId;
        localStorage.setItem("lmstudio-selected-model", modelId);
    }

    function getSelectedModel() {
        return selectedModel.value;
    }

    function normalizeModelValue(value = "") {
        return String(value).trim().toLowerCase();
    }

    function isModelInstalled(modelId) {
        const normalized = normalizeModelValue(modelId);

        return models.value.some((model) => {
            const id = normalizeModelValue(model.id);
            const displayName = normalizeModelValue(model.displayName);
            const path = normalizeModelValue(model.path);

            return (
                id === normalized ||
                displayName === normalized ||
                path.includes(normalized)
            );
        });
    }

    function getRecommendedModels() {
        return [
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
                link: "https://lmstudio.ai/models/openai/gpt-oss-20b",
            },
            {
                name: "qoogle/gemma-4-12b-qat",
                label: "Gemma 4 12B QAT",
                aliases: [
                    "qoogle/gemma-4-12b-qat",
                    "gemma-4-12b-qat",
                    "gemma 4 12b qat",
                    "qoogle gemma-4-12b-qat",
                    "gemma-4-12b",
                ],
                description: "Strong general-purpose local model.",
                size: "Large",
                link: "https://lmstudio.ai/models/qoogle/gemma-4-12b-qat",
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
                link: "https://lmstudio.ai/models/google/gemma-3-12b",
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
                link: "https://lmstudio.ai/models/qwen/qwen3-8b",
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
                link: "https://lmstudio.ai/models/nomic-ai/text-embedding-nomic-embed-text-v1-5",
            },
        ];
    }

    async function downloadModel(modelId) {
        const response = await fetch(`${getBaseUrl()}/api/v1/models/download`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: modelId }),
        });

        if (!response.ok) {
            throw new Error("Failed to start model download");
        }

        return await response.json();
    }

    async function getDownloadStatus(jobId) {
        const response = await fetch(
            `${getBaseUrl()}/api/v1/models/download/status?job_id=${encodeURIComponent(jobId)}`
        );

        if (!response.ok) {
            throw new Error("Failed to fetch download status");
        }

        return await response.json();
    }

    function isRecommendedModelInstalled(model) {
        const candidates = [
            model.name,
            ...(model.aliases || []),
        ].map(normalizeModelValue);

        return models.value.some((installed) => {
            const values = [
                installed.id,
                installed.displayName,
                installed.path,
            ].map(normalizeModelValue);

            return candidates.some((candidate) =>
                values.some(
                    (value) => value === candidate || value.includes(candidate),
                ),
            );
        });
    }

    return {
        isOnline,
        models,
        loadedModels,
        isLoading,
        selectedModel,
        getBaseUrl,
        testConnection,
        fetchModels,
        loadModel,
        unloadModel,
        generateStreamingChatAnswer,
        setSelectedModel,
        getSelectedModel,
        isModelInstalled,
        getRecommendedModels,
        downloadModel,
        getDownloadStatus,
        isRecommendedModelInstalled,
    };
})