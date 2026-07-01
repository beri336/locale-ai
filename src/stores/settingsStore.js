// src/stores/settingsStore.js

import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const STORAGE_KEY = 'settings';

export const useSettingsStore = defineStore('settings', () => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')

    const apiUrl = ref(stored.apiUrl || 'http://localhost:11434')
    const systemPrompt = ref(stored.systemPrompt || '')
    const temperature = ref(stored.temperature ?? 0.7)
    const numCtx = ref(stored.numCtx ?? 4096)

    const conStatus = ref('unkown') // 'unkown' | 'checking' | 'connected' | 'disconnected' | 'error'
    const ollamaVersion = ref(null)

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

    async function testConnection() {
        conStatus.value = 'checking'
        ollamaVersion.value = null
        const base = normalizeUrl(apiUrl.value)

        try {
            const res = await fetch('${base}/api/version')

            if (!res.ok)
                throw new Error('Status ${res.status}')

            const data = await res.json()

            ollamaVersion.value = data.version ?? null
            conStatus.value = 'connected'
        } catch (err) {
            conStatus.value = 'error'
        }
    }

    return {
        apiUrl, systemPrompt, temperature, numCtx,
        conStatus, ollamaVersion,
        testConnection, normalizeUrl,
    }
})