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
    let connectionRequest = null;
    let isCheckingConnection = false;

    // IMPORTANT: set `baseUrl` in `ollama-store` immediately during store initialization
    ollama.setBaseUrl(normalizeUrl(apiUrl.value))

    // IMPORTANT: synchronize the ollama-store with any changes to apiUrl
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
            weatherCity: localStorage.getItem("weather-city") || "Stuttgart",
        }))
    })

    function setWeatherCity(city) {
        weatherCity.value = city.trim() || "Stuttgart";
        localStorage.setItem("weather-city", weatherCity.value);
    }

    function normalizeUrl(url) {
        return url.trim().replace(/\/+$/, '')
    }

    async function checkConnection({ silent = false } = {}) {
        if (isCheckingConnection) return;

        isCheckingConnection = true;

        if (!silent) {
            connectionStatus.value = "checking";
        }

        const base = normalizeUrl(apiUrl.value);

        if (!base) {
            connectionStatus.value = "error";
            ollamaVersion.value = null;
            isCheckingConnection = false;
            return;
        }

        connectionRequest?.abort();
        connectionRequest = new AbortController();

        const timeoutId = window.setTimeout(() => {
            connectionRequest?.abort();
        }, 5000);

        try {
            const response = await fetch(`${base}/api/version`, {
                signal: connectionRequest.signal,
            });

            if (!response.ok) {
                throw new Error(`Status ${response.status}`);
            }

            const data = await response.json();

            ollamaVersion.value = data.version ?? null;
            connectionStatus.value = "connected";
        } catch (error) {
            if (error.name !== "AbortError") {
                console.warn("Ollama connection check failed:", error);
            }

            ollamaVersion.value = null;
            connectionStatus.value = "error";
        } finally {
            window.clearTimeout(timeoutId);
            connectionRequest = null;
            isCheckingConnection = false;
        }
    }

    async function testConnection() {
        await checkConnection({ silent: false })
    }

    function startPolling(intervalMs = 5000) {
        stopPolling();

        checkConnection({ silent: true });

        pollTimer = window.setInterval(() => {
            checkConnection({ silent: true });
        }, intervalMs);
    }

    function stopPolling() {
        if (pollTimer !== null) {
            window.clearInterval(pollTimer);
            pollTimer = null;
        }

        connectionRequest?.abort();
        connectionRequest = null;
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
        setWeatherCity,
    }
})