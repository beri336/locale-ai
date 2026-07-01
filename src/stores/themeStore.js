// src/stores/themeStore.js

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
    const theme = ref(localStorage.getItem('theme') || 'light')

    function apply(value) {
        document.documentElement.setAttribute('data-theme', value)
    }

    function toggle() {
        theme.value = theme.value === 'light' ? 'dark' : 'light'
    }

    watch(theme, (value) => {
        localStorage.setItem('theme', value)
        apply(value)
    }, { immediate: true })

    return {
        theme,
        toggle
    }
})