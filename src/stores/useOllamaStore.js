// src/stores/useOllamaStore.js
// Store containing all functionality for interacting with the Ollama API

import { ref } from 'vue'
import { isValidModelName } from '@/utils/validation'

let baseUrl = 'http://localhost:11434'

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
    baseUrl = url.replace(/\/$/, '') // strip trailing slash
}

function getBaseUrl() {
    return baseUrl
}

// Checks whether the Ollama server is reachable at all
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

// Alias-like check specifically for connection health (same root check, kept separate for semantic clarity)
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

// Retrieves the running Ollama server version
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

// Fetches the full detailed model list (with size, digest, modified_at, etc.)
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

// Returns just the model names (derived from the detailed list)
async function getListOfModelsName() {
    if (modelNamesCache) return modelNamesCache
    return refreshListOfModelsName()
}

async function refreshListOfModelsName() {
    const models = await refreshDetailedListOfModels()
    modelNamesCache = models.map((model) => model.name)
    return modelNamesCache
}

// Pulls (downloads) a model, streaming progress updates
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

// Deletes a model from local storage
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

// Lists models currently loaded into memory, with details (size_vram, expires_at, etc.)
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

// Convenience alias returning the same running models list (kept for naming symmetry with getDetailedListOfModels)
async function getListOfRunningModels() {
    return getListOfRunningModelsDetails()
}

// Returns just the names of currently running models
async function getRunningModelNames() {
    if (runningModelNamesCache) return runningModelNamesCache
    return refreshRunningModelNames()
}

async function refreshRunningModelNames() {
    const models = await refreshListOfRunningModels()
    runningModelNamesCache = models.map((model) => model.name)
    return runningModelNamesCache
}

// Unloads a model from memory immediately (keep_alive: 0)
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

// Loads a model into memory by sending an empty-prompt generate request
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

// Generates a single, complete (non-streaming) answer
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

// Generates a streaming answer, invoking onToken for each incoming chunk
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

async function generateStreamingChatAnswer(modelName, messages, options = {}, onToken) {
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
    })

    if (!response.ok) throw new Error('Failed to generate chat answer')

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

    if (buffer.trim()) {
        try {
            const parsed = JSON.parse(buffer)
            fullText += parsed.message?.content || ''
        } catch (err) {
            console.error('Trailing buffer not valid JSON:', buffer, err)
        }
    }

    return { text: fullText, stats }
}

export function useOllamaStore() {
    return {
        setBaseUrl,
        getBaseUrl,
        checkIsInstalled,
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
    }
}
