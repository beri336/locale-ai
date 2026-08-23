// src/composables/useLocalAiNotice.js

/// Provides a reactive flag indicating whether local AI (Ollama/LM Studio)
/// is disabled in the current build, for showing a UI hint.

import { computed } from "vue";
import { aiConfig } from "@/config/ai";

/**
 * Returns whether to show a "local AI disabled" notice in the UI.
 *
 * @returns {{ showLocalAiNotice: import('vue').ComputedRef<boolean> }}
 */
export function useLocalAiNotice() {
    const showLocalAiNotice = computed(() => !aiConfig.localAiEnabled);

    return { showLocalAiNotice };
}
