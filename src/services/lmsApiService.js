// src/services/lmsApiService.js

/// Provides a shared LM Studio API client instance.
/// Every consumer receives the same client to avoid creating
/// unnecessary API service instances.

import { LmStudioApi } from "@/stores/useLmStudioStore";

const lmStudioApi = new LmStudioApi();

/**
 * Returns the shared LM Studio API client.
 *
 * @returns {LmStudioApi} Shared LM Studio API client instance
 */
export function useLmStudioApi() {
    return lmStudioApi;
}
