// src/composables/useWeather.js

import { ref } from "vue";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const REQUEST_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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

function getWeatherDetails(code) {
    return weatherCodeMap[code] ?? {
        label: "Unknown weather",
        icon: "🌡️",
    };
}

async function fetchWithTimeout(url, signal) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    signal?.addEventListener("abort", () => controller.abort());

    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
}

export function useWeather() {
    const weather = ref(null);
    const isLoading = ref(false);
    const error = ref("");

    let currentController = null;

    async function fetchWeather(city) {
        const normalizedCity = city?.trim() || "Stuttgart";
        const cacheKey = normalizedCity.toLowerCase();

        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            weather.value = cached.data;
            error.value = "";
            return;
        }

        currentController?.abort();
        currentController = new AbortController();
        const { signal } = currentController;

        isLoading.value = true;
        error.value = "";

        try {
            const geocodingResponse = await fetchWithTimeout(
                `${GEOCODING_URL}?name=${encodeURIComponent(normalizedCity)}&count=1&language=en&format=json`,
                signal,
            );

            if (!geocodingResponse.ok)
                throw new Error("Could not find the city.");

            const geocodingData = await geocodingResponse.json();
            const location = geocodingData.results?.[0];

            if (!location)
                throw new Error(`No location found for "${normalizedCity}".`);

            const params = new URLSearchParams({
                latitude: location.latitude,
                longitude: location.longitude,
                current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
                timezone: "auto",
            });

            const weatherResponse = await fetchWithTimeout(`${WEATHER_URL}?${params}`, signal);

            if (!weatherResponse.ok)
                throw new Error("Could not load the weather.");

            const weatherData = await weatherResponse.json();
            const current = weatherData.current;
            const details = getWeatherDetails(current.weather_code);

            const result = {
                city: location.name,
                country: location.country,
                temperature: Math.round(current.temperature_2m),
                apparentTemperature: Math.round(current.apparent_temperature),
                windSpeed: Math.round(current.wind_speed_10m),
                updatedAt: current.time,
                ...details,
            };

            if (signal.aborted)
                return;

            cache.set(cacheKey, { data: result, timestamp: Date.now() });
            weather.value = result;
        } catch (fetchError) {
            if (fetchError.name === "AbortError")
                return;

            console.error("Failed to fetch weather:", fetchError);
            weather.value = null;
            error.value = fetchError.message || "Could not load weather.";
        } finally {
            if (!signal.aborted || currentController.signal === signal)
                isLoading.value = false;
        }
    }

    function cancelFetch() {
        currentController?.abort();
        isLoading.value = false;
    }

    return {
        weather,
        isLoading,
        error,
        fetchWeather,
        cancelFetch,
    };
}