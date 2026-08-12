// src/services/ollamaApiService.js

import { OllamaApi } from "@/stores/useOllamaStore";

const ollamaApiInstance = new OllamaApi();

export function useOllamaApi() {
    return ollamaApiInstance;
}