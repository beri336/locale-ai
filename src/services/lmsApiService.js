// src/services/lmsApiService.js

import { LmStudioApi } from "@/stores/useLmStudioStore";

const lmStudioApiInstance = new LmStudioApi();

export function useLmStudioApi() {
    return lmStudioApiInstance;
}