// src/composables/useSearchModal.js

import { ref, onMounted, onUnmounted } from "vue"

// module-level singleton state — shared across the entire app,
// so the modal's open state stays in sync everywhere it's used.
const isOpen = ref(false)

function openSearchModal() {
    isOpen.value = true
}

function closeSearchModal() {
    isOpen.value = false
}

function toggleSearchModal() {
    isOpen.value = !isOpen.value
}

function handleKeydown(event) {
    const isSearchShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"

    if (isSearchShortcut) {
        event.preventDefault()
        toggleSearchModal()
        return
    }

    if (event.key === "Escape" && isOpen.value)
        closeSearchModal()
}

export function useSearchModal({ enableShortcut = true } = {}) {
    if (enableShortcut) {
        onMounted(() => {
            window.addEventListener("keydown", handleKeydown)
        })

        onUnmounted(() => {
            window.removeEventListener("keydown", handleKeydown)
        })
    }

    return {
        isOpen,
        openSearchModal,
        closeSearchModal,
        toggleSearchModal,
    }
}