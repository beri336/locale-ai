// src/stores/settingsStore.js

/// Manages persisted application settings and the Ollama connection state.
/// Synchronizes the configured Ollama URL with the shared API client,
/// stores settings in local storage and provides connection polling.

import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";

import { useOllamaApi } from "@/services/ollamaApiService";
import { useLmStudioApi } from "@/services/lmsApiService";

const STORAGE_KEY = "settings";

const DEFAULT_OLLAMA_API_URL = "http://localhost:11434";
const DEFAULT_LM_STUDIO_API_URL = "http://localhost:1234";

const DEFAULT_OLLAMA_PORT = "11434";
const DEFAULT_LM_STUDIO_PORT = "1234";

const UNKNOWN_HOST = "Unknown";
const CONNECTION_TIMEOUT_MS = 5_000;
const DEFAULT_POLLING_INTERVAL_MS = 5_000;

const CONNECTION_STATUS = {
    CHECKING: "checking",
    CONNECTED: "connected",
    ERROR: "error",
    UNKNOWN: "unknown",
};

const ALLOWED_TEMPORARY_DURATIONS = [1, 2, 4, 8, 12, 24, 48];

export const SETTINGS_DEFAULTS = {
    defaultModel: "",
    temperature: 0.8,
    numCtx: 4_096,
    keepAlive: "5m",
    defaultSystemPrompt: "",
    weatherCity: "Stuttgart",
    temporaryChatDurationHours: 4,
};

/**
 * Reads persisted settings from local storage.
 *
 * @returns {Record<string, unknown>} Stored settings or an empty object
 */
function getStoredSettings() {
    try {
        const storedSettings = localStorage.getItem(STORAGE_KEY);

        return storedSettings ? JSON.parse(storedSettings) : {};
    } catch (error) {
        console.warn("Could not read saved settings:", error);
        return {};
    }
}

/**
 * Creates the settings object persisted in local storage.
 *
 * @param {Object} settings Reactive setting references
 * @returns {Object} Serializable settings data
 */
function createPersistedSettings(settings) {
    return {
        apiUrl: settings.apiUrl.value,
        lmStudioApiUrl: settings.lmStudioApiUrl.value,
        systemPrompt: settings.systemPrompt.value,
        temperature: settings.temperature.value,
        numCtx: settings.numCtx.value,
        defaultModel: settings.defaultModel.value,
        keepAlive: settings.keepAlive.value,
        defaultSystemPrompt: settings.defaultSystemPrompt.value,
        weatherCity: settings.weatherCity.value,
        temporaryChatDurationHours: settings.temporaryChatDurationHours.value,
    };
}

/**
 * Normalizes an Ollama base URL by removing whitespace and trailing slashes.
 *
 * @param {string} url URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeUrl(url = "") {
    return url.trim().replace(/\/+$/, "");
}

/**
 * Extracts a URL property without throwing for invalid URLs.
 *
 * @param {string} url URL to inspect
 * @param {"hostname" | "port"} property URL property to return
 * @param {string} fallback Value returned for invalid URLs
 * @returns {string} Extracted URL value or fallback
 */
function getUrlProperty(url, property, fallback) {
    try {
        return new URL(normalizeUrl(url))[property] || fallback;
    } catch {
        return fallback;
    }
}

/**
 * Manages persisted application settings and Ollama connection state.
 */
export const useSettingsStore = defineStore("settings", () => {
    const ollama = useOllamaApi();
    const lmStudio = useLmStudioApi();
    const storedSettings = getStoredSettings();

    const apiUrl = ref(
        storedSettings.apiUrl || DEFAULT_OLLAMA_API_URL,
    );

    const lmStudioApiUrl = ref(
        storedSettings.lmStudioApiUrl || DEFAULT_LM_STUDIO_API_URL,
    );

    const systemPrompt = ref(storedSettings.systemPrompt || "");
    const temperature = ref(
        storedSettings.temperature ?? SETTINGS_DEFAULTS.temperature,
    );
    const numCtx = ref(storedSettings.numCtx ?? SETTINGS_DEFAULTS.numCtx);
    const defaultModel = ref(
        storedSettings.defaultModel || SETTINGS_DEFAULTS.defaultModel,
    );
    const keepAlive = ref(
        storedSettings.keepAlive || SETTINGS_DEFAULTS.keepAlive,
    );
    const defaultSystemPrompt = ref(
        storedSettings.defaultSystemPrompt ||
        SETTINGS_DEFAULTS.defaultSystemPrompt,
    );
    const weatherCity = ref(
        storedSettings.weatherCity || SETTINGS_DEFAULTS.weatherCity,
    );
    const temporaryChatDurationHours = ref(
        storedSettings.temporaryChatDurationHours ??
        SETTINGS_DEFAULTS.temporaryChatDurationHours,
    );

    const connectionStatus = ref(CONNECTION_STATUS.UNKNOWN);
    const ollamaVersion = ref(null);

    const lmStudioConnectionStatus = ref(CONNECTION_STATUS.UNKNOWN);

    let connectionController = null;
    let pollingTimer = null;
    let isCheckingConnection = false;
    let isCheckingLmStudioConnection = false;

    const ollamaHost = computed(() => {
        return getUrlProperty(apiUrl.value, "hostname", UNKNOWN_HOST);
    });

    const ollamaPort = computed(() => {
        return getUrlProperty(
            apiUrl.value,
            "port",
            DEFAULT_OLLAMA_PORT,
        );
    });

    const lmStudioHost = computed(() => {
        return getUrlProperty(
            lmStudioApiUrl.value,
            "hostname",
            UNKNOWN_HOST,
        );
    });

    const lmStudioPort = computed(() => {
        return getUrlProperty(
            lmStudioApiUrl.value,
            "port",
            DEFAULT_LM_STUDIO_PORT,
        );
    });

    /**
     * Sets the city used for weather requests.
     *
     * @param {string} city Weather city name
     */
    function setWeatherCity(city = "") {
        weatherCity.value = city.trim() || SETTINGS_DEFAULTS.weatherCity;
    }

    /**
     * Sets a supported duration for temporary chats.
     *
     * @param {number | string} hours Temporary chat duration in hours
     */
    function setTemporaryChatDurationHours(hours) {
        const duration = Number(hours);

        temporaryChatDurationHours.value =
            ALLOWED_TEMPORARY_DURATIONS.includes(duration)
                ? duration
                : SETTINGS_DEFAULTS.temporaryChatDurationHours;
    }

    /**
     * Resets the temporary chat duration to its default value.
     */
    function resetTemporaryChatDurationHours() {
        temporaryChatDurationHours.value =
            SETTINGS_DEFAULTS.temporaryChatDurationHours;
    }

    /**
     * Aborts the active connection request.
     */
    function cancelConnectionCheck() {
        connectionController?.abort();
        connectionController = null;
    }

    /**
     * Checks whether the configured Ollama server is reachable.
     *
     * @param {Object} options Connection-check configuration
     * @param {boolean} [options.silent=false] Prevents the checking status from being shown
     * @returns {Promise<void>}
     */
    async function checkConnection({ silent = false } = {}) {
        if (isCheckingConnection)
            return;

        const baseUrl = normalizeUrl(apiUrl.value);

        if (!baseUrl) {
            connectionStatus.value = CONNECTION_STATUS.ERROR;
            ollamaVersion.value = null;
            return;
        }

        isCheckingConnection = true;

        if (!silent)
            connectionStatus.value = CONNECTION_STATUS.CHECKING;

        cancelConnectionCheck();

        const controller = new AbortController();
        const timeoutId = window.setTimeout(
            () => controller.abort(),
            CONNECTION_TIMEOUT_MS,
        );

        connectionController = controller;

        try {
            const response = await fetch(`${baseUrl}/api/version`, {
                signal: controller.signal,
            });

            if (!response.ok)
                throw new Error(`Status ${response.status}`);

            const data = await response.json();

            ollamaVersion.value = data.version ?? null;
            connectionStatus.value = CONNECTION_STATUS.CONNECTED;
        } catch (error) {
            if (error.name !== "AbortError")
                console.warn("Ollama connection check failed:", error);

            if (connectionController === controller) {
                ollamaVersion.value = null;
                connectionStatus.value = CONNECTION_STATUS.ERROR;
            }
        } finally {
            window.clearTimeout(timeoutId);

            if (connectionController === controller)
                connectionController = null;

            isCheckingConnection = false;
        }
    }

    /**
     * Checks whether the configured LM Studio server is reachable.
     *
     * @param {Object} options Connection-check configuration
     * @param {boolean} [options.silent=false] Prevents the checking state from showing
     * @returns {Promise<void>}
     */
    async function checkLmStudioConnection({ silent = false } = {}) {
        if (isCheckingLmStudioConnection)
            return;

        const baseUrl = normalizeUrl(lmStudioApiUrl.value);

        if (!baseUrl) {
            lmStudioConnectionStatus.value = CONNECTION_STATUS.ERROR;
            return;
        }

        isCheckingLmStudioConnection = true;

        if (!silent) {
            lmStudioConnectionStatus.value = CONNECTION_STATUS.CHECKING;
        }

        try {
            const isConnected = await lmStudio.status();

            lmStudioConnectionStatus.value = isConnected
                ? CONNECTION_STATUS.CONNECTED
                : CONNECTION_STATUS.ERROR;
        } catch (error) {
            console.warn("LM Studio connection check failed:", error);
            lmStudioConnectionStatus.value = CONNECTION_STATUS.ERROR;
        } finally {
            isCheckingLmStudioConnection = false;
        }
    }

    async function testLmStudioConnection() {
        await checkLmStudioConnection();
    }

    /**
     * Runs a visible Ollama connection check.
     *
     * @returns {Promise<void>}
     */
    async function testConnection() {
        await checkConnection();
    }

    /**
     * Starts periodic silent checks of the Ollama connection.
     *
     * @param {number} [intervalMs=5000] Polling interval in milliseconds
     */
    function startPolling(intervalMs = DEFAULT_POLLING_INTERVAL_MS) {
        stopPolling();

        checkConnection({ silent: true });
        checkLmStudioConnection({ silent: true });

        pollingTimer = window.setInterval(() => {
            checkConnection({ silent: true });
            checkLmStudioConnection({ silent: true });
        }, intervalMs);
    }

    /**
     * Stops connection polling and aborts an active connection check.
     */
    function stopPolling() {
        if (pollingTimer !== null) {
            window.clearInterval(pollingTimer);
            pollingTimer = null;
        }

        cancelConnectionCheck();
    }

    /**
     * Resets default model-related settings.
     */
    function resetModelDefaults() {
        defaultModel.value = SETTINGS_DEFAULTS.defaultModel;
        temperature.value = SETTINGS_DEFAULTS.temperature;
        numCtx.value = SETTINGS_DEFAULTS.numCtx;
    }

    /**
     * Resets model runtime behavior settings.
     */
    function resetModelBehavior() {
        keepAlive.value = SETTINGS_DEFAULTS.keepAlive;
    }

    /**
     * Resets the default system prompt.
     */
    function resetSystemPrompt() {
        defaultSystemPrompt.value = SETTINGS_DEFAULTS.defaultSystemPrompt;
    }

    /**
     * Persists the current settings to local storage.
     */
    function saveSettings() {
        try {
            const settings = createPersistedSettings({
                apiUrl,
                lmStudioApiUrl,
                systemPrompt,
                temperature,
                numCtx,
                defaultModel,
                keepAlive,
                defaultSystemPrompt,
                weatherCity,
                temporaryChatDurationHours,
            });

            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (error) {
            console.warn("Could not save settings:", error);
        }
    }

    ollama.setBaseUrl(normalizeUrl(apiUrl.value));
    lmStudio.setBaseUrl(normalizeUrl(lmStudioApiUrl.value));

    watch(apiUrl, (newUrl) => {
        ollama.setBaseUrl(normalizeUrl(newUrl));
    });

    watch(lmStudioApiUrl, (newUrl) => {
        try {
            lmStudio.setBaseUrl(normalizeUrl(newUrl));
            checkLmStudioConnection({ silent: true });
        } catch (error) {
            console.warn("Invalid LM Studio API URL:", error);
            lmStudioConnectionStatus.value = CONNECTION_STATUS.ERROR;
        }
    });

    watch(
        [
            apiUrl,
            lmStudioApiUrl,
            systemPrompt,
            temperature,
            numCtx,
            defaultModel,
            keepAlive,
            defaultSystemPrompt,
            weatherCity,
            temporaryChatDurationHours,
        ],
        saveSettings,
    );

    return {
        apiUrl,
        lmStudioApiUrl,

        systemPrompt,
        temperature,
        numCtx,
        defaultModel,
        keepAlive,
        defaultSystemPrompt,
        weatherCity,
        temporaryChatDurationHours,

        connectionStatus,
        ollamaVersion,
        ollamaHost,
        ollamaPort,

        lmStudioConnectionStatus,
        lmStudioHost,
        lmStudioPort,

        ALLOWED_TEMPORARY_DURATIONS,

        setWeatherCity,
        setTemporaryChatDurationHours,
        resetTemporaryChatDurationHours,

        testConnection,
        testLmStudioConnection,

        normalizeUrl,
        startPolling,
        stopPolling,

        resetModelDefaults,
        resetModelBehavior,
        resetSystemPrompt,
    };
});
