<!-- src/components/ui/LocalAiNotice.vue -->

<template>
    <section v-if="showLocalAiNotice" class="local-ai-notice" role="status">
        <span class="local-ai-notice-icon" aria-hidden="true">ⓘ</span>

        <div class="local-ai-notice-copy">
            <strong>Local AI unavailable in this build</strong>
            <span>
                Ollama and LM Studio require a local connection. Run Locale AI on
                your own machine to use local models.
            </span>
        </div>
    </section>
</template>

<script setup>
import { useLocalAiNotice } from "@/composables/useLocalAiNotice";

const { showLocalAiNotice } = useLocalAiNotice();
</script>

<style scoped>
.local-ai-notice {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    background: var(--color-warning-bg);
    border: 1px solid var(--color-warning-border, #f0d58c);
    margin-bottom: 1rem;
    color: var(--color-primary, #7a4f00);
}

.local-ai-notice-icon {
    font-size: 1.1rem;
    line-height: 1.4;
}

.local-ai-notice-copy {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    font-size: 0.85rem;
}
</style>
