// src/composables/useSearchModal.js

/// Manages the globally shared search modal state and its keyboard shortcuts.

import { onMounted, onUnmounted, ref } from "vue";

const SEARCH_SHORTCUT_KEY = "k";
const ESCAPE_KEY = "Escape";

// Module-level singleton state: every useSearchModal() call shares this value.
const isOpen = ref(false);

/**
 * Opens the global search modal.
 */
function openSearchModal() {
    isOpen.value = true;
}

/**
 * Closes the global search modal.
 */
function closeSearchModal() {
    isOpen.value = false;
}

/**
 * Toggles the global search modal visibility.
 */
function toggleSearchModal() {
    isOpen.value = !isOpen.value;
}

/**
 * Checks whether the keyboard event represents Cmd/Ctrl+K.
 *
 * @param {KeyboardEvent} event Keyboard event to evaluate
 * @returns {boolean} True when the search shortcut was pressed
 */
function isSearchShortcut(event) {
    const usesCommandKey = event.metaKey || event.ctrlKey;
    const pressedKey = event.key.toLocaleLowerCase();

    return usesCommandKey && pressedKey === SEARCH_SHORTCUT_KEY;
}

/**
 * Handles global search modal keyboard shortcuts.
 *
 * @param {KeyboardEvent} event Triggered keyboard event
 */
function handleKeydown(event) {
    if (isSearchShortcut(event)) {
        event.preventDefault();
        toggleSearchModal();
        return;
    }

    if (event.key === ESCAPE_KEY && isOpen.value)
        closeSearchModal();
}

/**
 * Provides access to the globally shared search modal state.
 *
 * @param {Object} options Composable configuration
 * @param {boolean} [options.enableShortcut=true] Enables Cmd/Ctrl+K and Escape shortcuts
 * @returns {{
 *     isOpen: import("vue").Ref<boolean>,
 *     openSearchModal: () => void,
 *     closeSearchModal: () => void,
 *     toggleSearchModal: () => void
 * }} Search modal state and actions
 */
export function useSearchModal({ enableShortcut = true } = {}) {
    if (enableShortcut) {
        onMounted(() => {
            window.addEventListener("keydown", handleKeydown);
        });

        onUnmounted(() => {
            window.removeEventListener("keydown", handleKeydown);
        });
    }

    return {
        isOpen,
        openSearchModal,
        closeSearchModal,
        toggleSearchModal,
    };
}
