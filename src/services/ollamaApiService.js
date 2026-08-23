// src/services/ollamaApiService.js

/// Provides a shared Ollama API client instance.
/// Every consumer receives the same client to avoid creating
/// unnecessary API service instances.

import { OllamaApi } from "@/stores/useOllamaStore";

const ollamaApi = new OllamaApi();

/**
 * Returns the shared Ollama API client.
 *
 * @returns {OllamaApi} Shared Ollama API client instance
 */
export function useOllamaApi() {
    return ollamaApi;
}
