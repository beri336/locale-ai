// src/stores/settingsStore.js

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'settings'

export const useSettingsStore = defineStore('settings', () => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')

    const apiUrl = ref(stored.apiUrl || 'http://localhost:11434')
    const systemPrompt = ref(stored.systemPrompt || '')
    const temperature = ref(stored.temperature ?? 0.7)
    const numCtx = ref(stored.numCtx ?? 4096)

    const connectionStatus = ref('unknown')
    const ollamaVersion = ref(null)

    let pollTimer = null

    watch([apiUrl, systemPrompt, temperature, numCtx], () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            apiUrl: apiUrl.value,
            systemPrompt: systemPrompt.value,
            temperature: temperature.value,
            numCtx: numCtx.value,
        }))
    })

    function normalizeUrl(url) {
        return url.trim().replace(/\/+$/, '')
    }

    async function checkConnection({ silent = false } = {}) {
        if (!silent)
            connectionStatus.value = 'checking'

        const base = normalizeUrl(apiUrl.value)

        try {
            const res = await fetch(`${base}/api/version`)

            if (!res.ok)
                throw new Error(`Status ${res.status}`)

            const data = await res.json()
            ollamaVersion.value = data.version ?? null
            connectionStatus.value = 'connected'
        } catch (err) {
            ollamaVersion.value = null
            connectionStatus.value = 'error'
        }
    }

    // manual test-button
    async function testConnection() {
        await checkConnection({ silent: false })
    }

    // background polling
    function startPolling(intervalMs = 5000) {
        stopPolling()
        checkConnection({ silent: true })

        pollTimer = setInterval(() => {
            checkConnection({ silent: true })
        }, intervalMs)
    }

    function stopPolling() {
        if (pollTimer) {
            clearInterval(pollTimer)
            pollTimer = null
        }
    }

    async function fetchVersion() {
        const base = normalizeUrl(apiUrl.value)
        try {
            const res = await fetch(`${base}/api/version`)

            if (!res.ok)
                throw new Error(`Status ${res.status}`)

            const data = await res.json()
            ollamaVersion.value = data.version ?? null
        } catch (err) {
            ollamaVersion.value = null
        }
    }

    return {
        apiUrl, systemPrompt, temperature, numCtx,
        connectionStatus, ollamaVersion,
        testConnection, normalizeUrl, fetchVersion,
        startPolling, stopPolling,
    }
})