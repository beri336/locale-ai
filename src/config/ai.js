// src/config/ai.js

/// Central config for local AI in production build.

/**
 * Local AI configuration, driven by Vite env variables.
 */
const localAiEnabled = import.meta.env.VITE_LOCAL_AI_ENABLED === "true";

export const aiConfig = {
    localAiEnabled,
    ollamaBaseUrl: import.meta.env.VITE_OLLAMA_BASE_URL ?? "http://localhost:11434",
    lmStudioBaseUrl: import.meta.env.VITE_LMSTUDIO_BASE_URL ?? "http://localhost:1234",
};
