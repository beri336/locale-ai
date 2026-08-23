// src/composables/useWeather.js

/// Loads current weather data for a city via the Open-Meteo APIs.
/// Resolves city names to coordinates, caches successful requests,
/// supports request cancellation and exposes loading and error state.

import { onScopeDispose, ref } from "vue";

const DEFAULT_CITY = "Stuttgart";
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const REQUEST_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 10 * 60 * 1_000;
const GEOCODING_RESULT_COUNT = "1";

const SEARCH_LANGUAGE = "en";
const TIMEZONE = "auto";
const ABORT_ERROR_NAME = "AbortError";
const UNKNOWN_WEATHER = {
    label: "Unknown weather",
    icon: "🌡️",
};

// Maps Open-Meteo WMO weather codes to UI labels and icons.
const weatherCodeMap = {
    0: { label: "Clear sky", icon: "☀️" },
    1: { label: "Mainly clear", icon: "🌤️" },
    2: { label: "Partly cloudy", icon: "⛅" },
    3: { label: "Overcast", icon: "☁️" },
    45: { label: "Fog", icon: "🌫️" },
    48: { label: "Rime fog", icon: "🌫️" },
    51: { label: "Light drizzle", icon: "🌦️" },
    53: { label: "Drizzle", icon: "🌦️" },
    55: { label: "Heavy drizzle", icon: "🌧️" },
    61: { label: "Light rain", icon: "🌧️" },
    63: { label: "Rain", icon: "🌧️" },
    65: { label: "Heavy rain", icon: "🌧️" },
    71: { label: "Light snow", icon: "🌨️" },
    73: { label: "Snow", icon: "🌨️" },
    75: { label: "Heavy snow", icon: "❄️" },
    80: { label: "Rain showers", icon: "🌦️" },
    81: { label: "Rain showers", icon: "🌧️" },
    82: { label: "Heavy rain showers", icon: "⛈️" },
    95: { label: "Thunderstorm", icon: "⛈️" },
    96: { label: "Thunderstorm with hail", icon: "⛈️" },
    99: { label: "Thunderstorm with hail", icon: "⛈️" },
};

const cache = new Map();

/**
 * Returns the display details for an Open-Meteo WMO weather code.
 *
 * @param {number} weatherCode Open-Meteo weather code
 * @returns {{ label: string, icon: string }} Weather label and icon
 */
function getWeatherDetails(weatherCode) {
    return weatherCodeMap[weatherCode] ?? UNKNOWN_WEATHER;
}

/**
 * Creates a request URL with query parameters.
 *
 * @param {string} baseUrl API endpoint
 * @param {Record<string, string | number>} parameters Query parameters
 * @returns {string} Complete request URL
 */
function createUrl(baseUrl, parameters) {
    const searchParameters = new URLSearchParams(parameters);

    return `${baseUrl}?${searchParameters}`;
}

/**
 * Fetches a URL and aborts it after the configured timeout.
 *
 * @param {string} url Request URL
 * @param {AbortSignal} parentSignal Signal used to cancel the active request
 * @returns {Promise<Response>} API response
 */
async function fetchWithTimeout(url, parentSignal) {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(
        () => timeoutController.abort(),
        REQUEST_TIMEOUT_MS,
    );

    const abortRequest = () => timeoutController.abort();
    parentSignal?.addEventListener("abort", abortRequest, { once: true });

    try {
        return await fetch(url, { signal: timeoutController.signal });
    } finally {
        clearTimeout(timeoutId);
        parentSignal?.removeEventListener("abort", abortRequest);
    }
}

/**
 * Throws an error when an API response was unsuccessful.
 *
 * @param {Response} response API response to validate
 * @param {string} errorMessage Message used when the request failed
 */
function ensureSuccessfulResponse(response, errorMessage) {
    if (!response.ok)
        throw new Error(errorMessage);
}

/**
 * Resolves a city name to its most relevant location result.
 *
 * @param {string} city City name to resolve
 * @param {AbortSignal} signal Signal used to cancel the request
 * @returns {Promise<Object>} Geocoded location
 */
async function fetchLocation(city, signal) {
    const url = createUrl(GEOCODING_URL, {
        name: city,
        count: GEOCODING_RESULT_COUNT,
        language: SEARCH_LANGUAGE,
        format: "json",
    });

    const response = await fetchWithTimeout(url, signal);
    ensureSuccessfulResponse(response, "Could not find the city.");

    const data = await response.json();
    const location = data.results?.[0];

    if (!location)
        throw new Error(`No location found for "${city}".`);

    return location;
}

/**
 * Fetches current weather data for a geographical location.
 *
 * @param {{ latitude: number, longitude: number }} location Resolved location
 * @param {AbortSignal} signal Signal used to cancel the request
 * @returns {Promise<Object>} Current weather response data
 */
async function fetchCurrentWeather(location, signal) {
    const url = createUrl(WEATHER_URL, {
        latitude: location.latitude,
        longitude: location.longitude,
        current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
        timezone: TIMEZONE,
    });

    const response = await fetchWithTimeout(url, signal);
    ensureSuccessfulResponse(response, "Could not load the weather.");

    return response.json();
}

/**
 * Converts Open-Meteo API responses into weather data for the UI.
 *
 * @param {Object} location Resolved location data
 * @param {Object} weatherData Current weather API response
 * @returns {{
 *     city: string,
 *     country: string,
 *     temperature: number,
 *     apparentTemperature: number,
 *     windSpeed: number,
 *     updatedAt: string,
 *     label: string,
 *     icon: string
 * }} Weather data for presentation
 */
function createWeatherResult(location, weatherData) {
    const current = weatherData.current;
    const details = getWeatherDetails(current.weather_code);

    return {
        city: location.name,
        country: location.country,
        temperature: Math.round(current.temperature_2m),
        apparentTemperature: Math.round(current.apparent_temperature),
        windSpeed: Math.round(current.wind_speed_10m),
        updatedAt: current.time,
        ...details,
    };
}

/**
 * Checks whether a cache entry is still valid.
 *
 * @param {{ timestamp: number }} cachedEntry Cached weather result
 * @returns {boolean} True when the cached entry is within its TTL
 */
function isCacheValid(cachedEntry) {
    return Date.now() - cachedEntry.timestamp < CACHE_TTL_MS;
}

/**
 * Provides reactive current-weather data for a selected city.
 *
 * @returns {{
 *     weather: import("vue").Ref<Object | null>,
 *     isLoading: import("vue").Ref<boolean>,
 *     error: import("vue").Ref<string>,
 *     fetchWeather: (city?: string) => Promise<void>,
 *     cancelFetch: () => void
 * }} Reactive weather state and request actions
 */
export function useWeather() {
    const weather = ref(null);
    const isLoading = ref(false);
    const error = ref("");

    let currentController = null;

    /**
     * Cancels the currently active weather request, if one exists.
     */
    function cancelFetch() {
        currentController?.abort();
        currentController = null;
        isLoading.value = false;
    }

    /**
     * Loads current weather information for a city.
     *
     * @param {string} [city] City name to look up
     * @returns {Promise<void>}
     */
    async function fetchWeather(city) {
        const normalizedCity = city?.trim() || DEFAULT_CITY;
        const cacheKey = normalizedCity.toLocaleLowerCase();
        const cachedEntry = cache.get(cacheKey);

        if (cachedEntry && isCacheValid(cachedEntry)) {
            weather.value = cachedEntry.data;
            error.value = "";
            return;
        }

        cancelFetch();

        const controller = new AbortController();
        const { signal } = controller;

        currentController = controller;
        isLoading.value = true;
        error.value = "";

        try {
            const location = await fetchLocation(normalizedCity, signal);
            const weatherData = await fetchCurrentWeather(location, signal);
            const result = createWeatherResult(location, weatherData);

            if (signal.aborted)
                return;

            cache.set(cacheKey, {
                data: result,
                timestamp: Date.now(),
            });

            weather.value = result;
        } catch (fetchError) {
            if (fetchError.name === ABORT_ERROR_NAME)
                return;

            console.error("Failed to fetch weather:", fetchError);
            weather.value = null;
            error.value = fetchError.message || "Could not load weather.";
        } finally {
            if (currentController === controller) {
                currentController = null;
                isLoading.value = false;
            }
        }
    }

    onScopeDispose(cancelFetch);

    return {
        weather,
        isLoading,
        error,
        fetchWeather,
        cancelFetch,
    };
}
