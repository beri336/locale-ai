// src/stores/themeStore.js

/// Manages the active application theme.
/// Persists the selected theme in local storage and applies it
/// as a data-theme attribute on the root document element.

import { ref, watch } from "vue";
import { defineStore } from "pinia";

const STORAGE_KEY = "theme";

const THEMES = {
    DARK: "dark",
    LIGHT: "light",
};

const DEFAULT_THEME = THEMES.LIGHT;

/**
 * Reads the saved theme from local storage.
 *
 * @returns {string} Saved theme or the default theme
 */
function getStoredTheme() {
    try {
        const storedTheme = localStorage.getItem(STORAGE_KEY);

        return Object.values(THEMES).includes(storedTheme)
            ? storedTheme
            : DEFAULT_THEME;
    } catch (error) {
        console.warn("Could not read saved theme:", error);
        return DEFAULT_THEME;
    }
}

/**
 * Applies a theme to the root document element.
 *
 * @param {string} theme Theme to apply
 */
function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
}

/**
 * Manages the application's active color theme.
 */
export const useThemeStore = defineStore("theme", () => {
    const theme = ref(getStoredTheme());

    /**
     * Toggles between the light and dark theme.
     */
    function toggleTheme() {
        theme.value = theme.value === THEMES.LIGHT
            ? THEMES.DARK
            : THEMES.LIGHT;
    }

    watch(
        theme,
        (newTheme) => {
            try {
                localStorage.setItem(STORAGE_KEY, newTheme);
            } catch (error) {
                console.warn("Could not save theme:", error);
            }

            applyTheme(newTheme);
        },
        { immediate: true },
    );

    return {
        theme,
        toggleTheme,
    };
});
