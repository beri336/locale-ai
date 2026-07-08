// src/composables/useSearchModal.js

import { ref } from "vue"

const isOpen = ref(false)

function openSearchModal() {
    isOpen.value = true
}

function closeSearchModal() {
    isOpen.value = false
}

export function useSearchModal() {
    return { isOpen, openSearchModal, closeSearchModal }
}
