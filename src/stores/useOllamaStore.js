// src/stores/useOllamaStore.js
// Store containing all functionality for interacting with the Ollama API

import { ref } from 'vue'
import { isValidModelName } from '@/utils/validation'

const BASE_URL_STORAGE_KEY = "ollama-base-url";

let baseUrl = localStorage.getItem(BASE_URL_STORAGE_KEY) || "http://localhost:11434";

const RECOMMENDED_MODELS = [
    {
        name: "llama3.2:3b",
        label: "Llama 3.2 3B",
        description: "Fast, good for chatting",
        size: "~2.0 GB",
        link: "https://ollama.com/library/llama3.2",
    },
    {
        name: "gemma3:2b",
        label: "Gemma 3 2B",
        description: "Very fast, compact",
        size: "~1.7 GB",
        link: "https://ollama.com/library/gemma3",
    },
    {
        name: "phi4-mini",
        label: "Phi-4 Mini",
        description: "Strong reasoning",
        size: "~2.5 GB",
        link: "https://ollama.com/library/phi4-mini",
    },
    {
        name: "mistral",
        label: "Mistral 7B",
        description: "Versatile, higher resource requirement",
        size: "~4.1 GB",
        link: "https://ollama.com/library/mistral",
    },
    {
        name: "qwen2.5-coder:7b",
        label: "Qwen 2.5 Coder 7B",
        description: "Specialized for coding tasks",
        size: "~4.7 GB",
        link: "https://ollama.com/library/qwen2.5-coder",
    },
];

function getRecommendedModels() {
    return RECOMMENDED_MODELS;
}

function stripTag(modelName) {
    return modelName.split(":")[0]
}

function isModelInstalled(modelName, installedList) {
    const normalize = (name) => (name.includes(":") ? name : `${name}:latest`)
    const target = normalize(modelName)
    return installedList.map(normalize).includes(target)
}

// Caches to avoid redundant network calls
let detailedModelsCache = null
let modelNamesCache = null
let runningModelsCache = null
let runningModelNamesCache = null

const selectedModel = ref(localStorage.getItem("selectedModel") || "");

function setSelectedModel(name) {
    selectedModel.value = name;
    localStorage.setItem("selectedModel", name);
}

function getSelectedModel() {
    return selectedModel.value;
}

function setBaseUrl(url) {
    baseUrl = url.trim().replace(/\/+$/, "");

    localStorage.setItem(BASE_URL_STORAGE_KEY, baseUrl);

    detailedModelsCache = null;
    modelNamesCache = null;
    runningModelsCache = null;
    runningModelNamesCache = null;
}

function getBaseUrl() {
    return baseUrl
}

// checks whether the Ollama server is reachable at all
async function checkInstallation() {
    try {
        const response = await fetch(`${baseUrl}/`)
        return response.ok
    } catch (error) {
        console.error('checkInstallation failed:', error)
        return false
    }
}

async function checkIsInstalled() {
    const isInstalled = await checkInstallation()
    return isInstalled ? 'Installed' : 'Could not verify installation'
}

// alias-like check specifically for connection health (same root check, kept separate for semantic clarity)
async function checkConnection() {
    try {
        const response = await fetch(`${baseUrl}/`, { method: 'GET' })
        return response.ok
    } catch (error) {
        return false
    }
}

async function checkIsConnected() {
    const isConnected = await checkConnection()
    return isConnected ? 'Connected' : 'Could not verify connection'
}

// retrieves the running Ollama server version
async function getVersion() {
    try {
        const response = await fetch(`${baseUrl}/api/version`)
        if (!response.ok) throw new Error('Failed to fetch version')
        const data = await response.json()
        return data.version
    } catch (error) {
        console.error('getVersion failed:', error)
        return null
    }
}

// fetches the full detailed model list (with size, digest, modified_at, etc.)
async function getDetailedListOfModels() {
    if (detailedModelsCache) return detailedModelsCache
    return refreshDetailedListOfModels()
}

async function refreshDetailedListOfModels() {
    try {
        const response = await fetch(`${baseUrl}/api/tags`)
        if (!response.ok) throw new Error('Failed to fetch models')
        const data = await response.json()
        detailedModelsCache = data.models || []
        return detailedModelsCache
    } catch (error) {
        console.error('refreshDetailedListOfModels failed:', error)
        return []
    }
}

// returns just the model names (derived from the detailed list)
async function getListOfModelsName() {
    if (modelNamesCache) return modelNamesCache
    return refreshListOfModelsName()
}

async function refreshListOfModelsName() {
    const models = await refreshDetailedListOfModels()
    modelNamesCache = models.map((model) => model.name)
    return modelNamesCache
}

// pulls (downloads) a model, streaming progress updates
async function pullModel(modelName, onProgress) {
    if (!isValidModelName(modelName)) {
        throw new Error(`Invalid model name: ${modelName}`)
    }

    const response = await fetch(`${baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, stream: true }),
    })

    if (!response.ok) throw new Error(`Failed to pull model ${modelName}`)

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
            if (!line.trim()) continue
            try {
                const status = JSON.parse(line)
                if (onProgress) onProgress(status)
            } catch (err) {
                console.error('Skipping malformed JSON line:', line, err)
            }
        }
    }

    await refreshDetailedListOfModels()
    await refreshListOfModelsName()
    return true
}

// deletes a model from local storage
async function removeModel(modelName) {
    if (!isValidModelName(modelName)) {
        console.error(`Invalid model name: ${modelName}`)
        return false
    }
    try {
        const response = await fetch(`${baseUrl}/api/delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: modelName }),
        })
        if (!response.ok) throw new Error(`Failed to remove model ${modelName}`)
        await refreshDetailedListOfModels()
        await refreshListOfModelsName()
        return true
    } catch (error) {
        console.error('removeModel failed:', error)
        return false
    }
}

// lists models currently loaded into memory, with details (size_vram, expires_at, etc.)
async function getListOfRunningModelsDetails() {
    if (runningModelsCache) return runningModelsCache
    return refreshListOfRunningModels()
}

async function refreshListOfRunningModels() {
    try {
        const response = await fetch(`${baseUrl}/api/ps`)
        if (!response.ok) throw new Error('Failed to fetch running models')
        const data = await response.json()
        runningModelsCache = data.models || []
        return runningModelsCache
    } catch (error) {
        console.error('refreshListOfRunningModels failed:', error)
        return []
    }
}

// convenience alias returning the same running models list (kept for naming symmetry with getDetailedListOfModels)
async function getListOfRunningModels() {
    return getListOfRunningModelsDetails()
}

// returns just the names of currently running models
async function getRunningModelNames() {
    if (runningModelNamesCache) return runningModelNamesCache
    return refreshRunningModelNames()
}

async function refreshRunningModelNames() {
    const models = await refreshListOfRunningModels()
    runningModelNamesCache = models.map((model) => model.name)
    return runningModelNamesCache
}

// unloads a model from memory immediately (keep_alive: 0)
async function unloadOllamaModel(modelName) {
    if (!isValidModelName(modelName)) {
        console.error(`Invalid model name: ${modelName}`)
        return false
    }
    try {
        const response = await fetch(`${baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: modelName, keep_alive: 0 }),
        })
        if (!response.ok) throw new Error(`Failed to unload model ${modelName}`)
        await refreshListOfRunningModels()
        await refreshRunningModelNames()
        return true
    } catch (error) {
        console.error('unloadOllamaModel failed:', error)
        return false
    }
}

// loads a model into memory by sending an empty-prompt generate request
async function loadOllamaModel(modelName, keepAlive = '5m') {
    if (!isValidModelName(modelName)) {
        console.error(`Invalid model name: ${modelName}`)
        return false
    }
    try {
        const response = await fetch(`${baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: modelName, keep_alive: keepAlive }),
        })
        if (!response.ok) throw new Error(`Failed to load model ${modelName}`)
        await refreshListOfRunningModels()
        await refreshRunningModelNames()
        return true
    } catch (error) {
        console.error('loadOllamaModel failed:', error)
        return false
    }
}

// generates a single, complete (non-streaming) answer
async function generateOneTimeAnswer(modelName, prompt, options = {}) {
    if (!isValidModelName(modelName)) {
        console.error(`Invalid model name: ${modelName}`)
        return null
    }
    try {
        const response = await fetch(`${baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: modelName, prompt, stream: false, options }),
        })
        if (!response.ok) throw new Error('Failed to generate answer')
        const data = await response.json()
        return data.response
    } catch (error) {
        console.error('generateOneTimeAnswer failed:', error)
        return null
    }
}

// generates a streaming answer, invoking onToken for each incoming chunk
async function generateStreamingAnswer(modelName, prompt, options = {}, onToken) { // remove
    if (!isValidModelName(modelName)) {
        throw new Error(`Invalid model name: ${modelName}`)
    }

    const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName, prompt, stream: true, options }),
    })

    if (!response.ok) throw new Error('Failed to generate streaming answer')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''
    let buffer = ''
    let stats = { evalCount: 0, promptEvalCount: 0, totalDuration: 0 }

    while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
            if (!line.trim()) continue

            let parsed
            try {
                parsed = JSON.parse(line)
            } catch (err) {
                console.error('Skipping malformed JSON line:', line, err)
                continue
            }

            if (parsed.error) {
                throw new Error(parsed.error)
            }

            fullText += parsed.response || ''
            if (onToken) onToken(parsed)

            if (parsed.done) {
                stats = {
                    evalCount: parsed.eval_count || 0,
                    promptEvalCount: parsed.prompt_eval_count || 0,
                    totalDuration: parsed.total_duration || 0,
                }
            }
        }
    }

    if (buffer.trim()) {
        try {
            const parsed = JSON.parse(buffer)
            fullText += parsed.response || ''
            if (onToken) onToken(parsed)
        } catch (err) {
            console.error('Trailing buffer not valid JSON:', buffer, err)
        }
    }

    return { text: fullText, stats }
}

async function generateStreamingChatAnswer(modelName, messages, options = {}, onToken, signal) {
    if (!isValidModelName(modelName)) {
        throw new Error(`Invalid model name: ${modelName}`)
    }

    const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: modelName,
            messages,
            stream: true,
            options,
        }),
        signal,
    })

    if (!response.ok) throw new Error('Failed to generate chat answer')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''
    let buffer = ''
    let stats = { evalCount: 0, promptEvalCount: 0, totalDuration: 0 }

    try {
        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop()

            for (const line of lines) {
                if (!line.trim()) continue

                let parsed
                try {
                    parsed = JSON.parse(line)
                } catch (err) {
                    console.error('Skipping malformed JSON line:', line, err)
                    continue
                }

                if (parsed.error) {
                    throw new Error(parsed.error)
                }

                const token = parsed.message?.content || ''
                fullText += token
                if (onToken) onToken({ response: token, done: parsed.done })

                if (parsed.done) {
                    stats = {
                        evalCount: parsed.eval_count || 0,
                        promptEvalCount: parsed.prompt_eval_count || 0,
                        totalDuration: parsed.total_duration || 0,
                    }
                }
            }
        }
    } finally {
        reader.cancel().catch(() => { })
    }

    return { text: fullText, stats, aborted: false }
}

export function useOllamaStore() {
    return {
        setBaseUrl,
        getBaseUrl,
        checkIsInstalled,
        checkConnection,
        checkIsConnected,
        getVersion,
        getDetailedListOfModels,
        refreshDetailedListOfModels,
        getListOfModelsName,
        refreshListOfModelsName,
        pullModel,
        removeModel,
        getListOfRunningModels,
        getListOfRunningModelsDetails,
        refreshListOfRunningModels,
        getRunningModelNames,
        refreshRunningModelNames,
        unloadOllamaModel,
        loadOllamaModel,
        generateOneTimeAnswer,
        generateStreamingAnswer, // remove
        generateStreamingChatAnswer,
        setSelectedModel,
        getSelectedModel,
        getRecommendedModels,
        isModelInstalled,
    }
}
