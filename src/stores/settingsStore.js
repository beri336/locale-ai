// src/stores/settingsStore.js

import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import { useOllamaStore } from "@/stores/useOllamaStore"

const STORAGE_KEY = 'settings'

export const SETTINGS_DEFAULTS = {
    defaultModel: "",
    temperature: 0.8,
    numCtx: 4096,
    keepAlive: "5m",
    defaultSystemPrompt: "",
}

export const useSettingsStore = defineStore('settings', () => {
    const ollama = useOllamaStore()

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')

    const apiUrl = ref(stored.apiUrl || 'http://localhost:11434')
    const systemPrompt = ref(stored.systemPrompt || '')
    const temperature = ref(stored.temperature ?? SETTINGS_DEFAULTS.temperature)
    const numCtx = ref(stored.numCtx ?? SETTINGS_DEFAULTS.numCtx)
    const defaultModel = ref(stored.defaultModel || SETTINGS_DEFAULTS.defaultModel)
    const keepAlive = ref(stored.keepAlive || SETTINGS_DEFAULTS.keepAlive)
    const defaultSystemPrompt = ref(stored.defaultSystemPrompt || SETTINGS_DEFAULTS.defaultSystemPrompt)

    const connectionStatus = ref('unknown')
    const ollamaVersion = ref(null)

    let pollTimer = null

    // WICHTIG: baseUrl im ollama-store beim Store-Init sofort setzen
    ollama.setBaseUrl(normalizeUrl(apiUrl.value))

    // WICHTIG: bei jeder Änderung von apiUrl den ollama-store synchronisieren
    watch(apiUrl, (newUrl) => {
        ollama.setBaseUrl(normalizeUrl(newUrl))
    })

    watch([apiUrl, systemPrompt, temperature, numCtx, defaultModel, keepAlive, defaultSystemPrompt], () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            apiUrl: apiUrl.value,
            systemPrompt: systemPrompt.value,
            temperature: temperature.value,
            numCtx: numCtx.value,
            defaultModel: defaultModel.value,
            keepAlive: keepAlive.value,
            defaultSystemPrompt: defaultSystemPrompt.value,
        }))
    })

    function normalizeUrl(url) {
        return url.trim().replace(/\/+$/, '')
    }

    async function checkConnection({ silent = false } = {}) {
        if (!silent) connectionStatus.value = 'checking'

        const base = normalizeUrl(apiUrl.value)

        try {
            const res = await fetch(`${base}/api/version`)
            if (!res.ok) throw new Error(`Status ${res.status}`)
            const data = await res.json()
            ollamaVersion.value = data.version ?? null
            connectionStatus.value = 'connected'
        } catch (err) {
            ollamaVersion.value = null
            connectionStatus.value = 'error'
        }
    }

    async function testConnection() {
        await checkConnection({ silent: false })
    }

    function startPolling(intervalMs = 5000) {
        stopPolling()
        checkConnection({ silent: true })
        pollTimer = setInterval(() => checkConnection({ silent: true }), intervalMs)
    }

    function stopPolling() {
        if (pollTimer) {
            clearInterval(pollTimer)
            pollTimer = null
        }
    }

    function resetModelDefaults() {
        defaultModel.value = SETTINGS_DEFAULTS.defaultModel
        temperature.value = SETTINGS_DEFAULTS.temperature
        numCtx.value = SETTINGS_DEFAULTS.numCtx
    }

    function resetModelBehavior() {
        keepAlive.value = SETTINGS_DEFAULTS.keepAlive
    }

    function resetSystemPrompt() {
        defaultSystemPrompt.value = SETTINGS_DEFAULTS.defaultSystemPrompt
    }

    // Computed properties for Ollama
    const ollamaPort = computed(() => {
        try {
            return new URL(normalizeUrl(apiUrl.value)).port || '11434'
        } catch {
            return 'Unknown'
        }
    })

    const ollamaHost = computed(() => {
        try {
            return new URL(normalizeUrl(apiUrl.value)).hostname
        } catch {
            return 'Unknown'
        }
    })

    return {
        apiUrl, systemPrompt, temperature, numCtx,
        connectionStatus, ollamaVersion,
        testConnection, normalizeUrl,
        startPolling, stopPolling,
        defaultModel, keepAlive, defaultSystemPrompt,
        resetModelDefaults, resetModelBehavior, resetSystemPrompt,
        ollamaPort, ollamaHost,
    }
})