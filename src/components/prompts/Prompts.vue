<!-- src/components/prompts/Prompts.vue -->

<template>
  <div class="prompts-view">
    <!-- Page header -->
    <header class="page-header">
      <div class="page-heading">
        <div class="header-icon" aria-hidden="true">
          <IconPrompt :size="22" :stroke-width="1.8" />
        </div>

        <!-- Page title and description -->
        <div>
          <p class="eyebrow">Prompt library</p>
          <h1>Prompts</h1>
          <p class="header-description">
            Save, refine and reuse prompts for your local models.
          </p>
        </div>
      </div>

      <!-- New prompt button -->
      <button class="btn-primary" type="button" @click="startNewPrompt">
        <IconPlus :size="14" :stroke-width="2" aria-hidden="true" />
        New prompt
      </button>
    </header>

    <LocalAiNotice />

    <!-- Provider connection and active generation model -->
    <section class="generation-toolbar" aria-label="Local model connection and selection">
      <!-- Provider statuses -->
      <div class="provider-statuses" role="status" aria-live="polite">
        <!-- Ollama status -->
        <span class="provider-status" :class="{ online: ollamaOnline, offline: !ollamaOnline }">
          <span class="provider-status-dot" aria-hidden="true"></span>
          <span>Ollama</span>
        </span>

        <!-- LM Studio status -->
        <span class="provider-status" :class="{ online: lmStudioOnline, offline: !lmStudioOnline }">
          <span class="provider-status-dot" aria-hidden="true"></span>
          <span>LM Studio</span>
        </span>
      </div>

      <!-- Model selection -->
      <label v-if="availableModels.length" class="model-select-field">
        <span class="model-select-label">Generation model</span>

        <!-- Model options -->
        <select v-model="selectedModelId" :disabled="isCheckingProviders">
          <option v-for="model in availableModels" :key="model.id" :value="model.id">
            {{ model.name }} · {{ model.providerLabel }}
          </option>
        </select>
      </label>

      <!-- Generation toolbar message -->
      <p v-else-if="!isCheckingProviders" class="generation-toolbar-message">
        No local model available. Start Ollama or LM Studio to generate prompts.
      </p>

      <p v-else class="generation-toolbar-message">
        Checking local model providers…
      </p>
    </section>

    <!-- Prompt list and workspace -->
    <div class="prompts-layout">
      <!-- Sidebar with saved prompts -->
      <aside class="prompts-sidebar" aria-label="Saved prompts">
        <!-- Sidebar header -->
        <div class="prompts-sidebar-header">
          <span>Saved prompts</span>
          <span class="prompts-count">{{ prompts.length }}</span>
        </div>

        <!-- Prompt list -->
        <div v-if="prompts.length" class="prompt-list">
          <!-- Prompt list items -->
          <button v-for="prompt in prompts" :key="prompt.id" type="button" class="prompt-list-item"
            :class="{ active: prompt.id === selectedId }" :aria-current="prompt.id === selectedId ? 'true' : undefined"
            @click="selectPrompt(prompt.id)">

            <span class="prompt-list-title">{{ prompt.title }}</span>

            <span v-if="prompt.description" class="prompt-list-desc">
              {{ prompt.description }}
            </span>

            <span v-else class="prompt-list-desc prompt-list-desc-empty">
              No description
            </span>
          </button>
        </div>

        <!-- Empty state -->
        <div v-else class="prompts-sidebar-empty">
          <IconSparkles :size="20" :stroke-width="1.6" aria-hidden="true" />

          <p>No prompts saved yet.</p>

          <button class="btn-secondary" type="button" @click="startNewPrompt">
            Create your first prompt
          </button>
        </div>
      </aside>

      <main class="prompts-main">
        <!-- Prompt editor -->
        <form v-if="isEditing" class="prompt-form" @submit.prevent="savePrompt">
          <!-- AI generation panel -->
          <section class="ai-generate-panel" aria-labelledby="ai-generate-title">
            <!-- Panel heading -->
            <div class="ai-generate-panel-heading">
              <!-- Panel icon -->
              <div class="ai-generate-panel-icon" aria-hidden="true">
                <IconSparkles :size="16" :stroke-width="2" />
              </div>

              <!-- Panel content -->
              <div>
                <h2 id="ai-generate-title">Generate with AI</h2>

                <p v-if="selectedModel">
                  {{ selectedModel.name }} via {{ selectedModel.providerLabel }}
                </p>

                <p v-else>No local model selected</p>
              </div>
            </div>

            <!-- Generation controls -->
            <div class="ai-generate-controls">
              <label class="sr-only" for="ai-prompt-topic"> Prompt goal </label>

              <!-- Prompt topic input -->
              <input id="ai-prompt-topic" v-model="aiTopic" type="text"
                placeholder="For example: Review a TypeScript pull request" :disabled="isGeneratingAI"
                @keydown.enter.prevent="generatePromptWithAI" />

              <!-- Generate button -->
              <button class="btn-secondary" type="button"
                :disabled="isGeneratingAI || !selectedModel || !aiTopic.trim()" :title="!selectedModel
                  ? 'Start Ollama or LM Studio and choose a generation model.'
                  : !aiTopic.trim()
                    ? 'Describe what the prompt should do first.'
                    : `Generate with ${selectedModel.name} via ${selectedModel.providerLabel}`
                  " @click="generatePromptWithAI">

                <IconLoader v-if="isGeneratingAI" :size="14" :stroke-width="2" aria-hidden="true" />
                <IconSparkles v-else :size="14" :stroke-width="2" aria-hidden="true" />
                {{ isGeneratingAI ? "Generating…" : "Generate" }}
              </button>
            </div>
          </section>

          <p v-if="aiError" class="prompt-form-error" role="alert">
            {{ aiError }}
          </p>

          <!-- Prompt details -->
          <div class="prompt-form-section">
            <!-- Section heading -->
            <div class="prompt-form-section-heading">
              <h2>Prompt details</h2>
              <p>Give this prompt a clear name and optional context.</p>
            </div>

            <!-- Title field -->
            <label class="prompt-form-field">
              <span>Title</span>
              <input v-model="draft.title" type="text" placeholder="For example: TypeScript code reviewer" required />
            </label>

            <!-- Description field -->
            <label class="prompt-form-field">
              <span>Description <em>Optional</em></span>

              <textarea v-model="draft.description" rows="3"
                placeholder="When and how should this prompt be used?"></textarea>
            </label>
          </div>

          <!-- Prompt variants editor -->
          <div class="prompt-variants-editor">
            <!-- Section heading -->
            <div class="prompt-form-section-heading">
              <!-- Section icon -->
              <div>
                <h2>Prompt variants</h2>
                <p>Create alternatives for different use cases or models.</p>
              </div>

              <!-- Add variant button -->
              <button class="btn-secondary btn-compact" type="button" @click="addVariant">
                <IconPlus :size="14" :stroke-width="2" aria-hidden="true" />
                Add variant
              </button>
            </div>

            <!-- Variant editors -->
            <section v-for="(variant, index) in draft.variants" :key="index" class="variant-editor"
              :aria-label="`Variant ${index + 1}`">
              <!-- Variant header -->
              <div class="variant-editor-header">
                <!-- Variant name field -->
                <label class="variant-name-field">
                  <span>Variant {{ index + 1 }}</span>
                  <input v-model="variant.label" type="text" placeholder="For example: Concise" />
                </label>

                <!-- Remove variant button -->
                <button v-if="draft.variants.length > 1" class="icon-btn icon-btn-danger" type="button"
                  :aria-label="`Remove variant ${index + 1}`" title="Remove variant" @click="removeVariant(index)">
                  <IconX :size="14" :stroke-width="2" aria-hidden="true" />
                </button>
              </div>

              <!-- Variant content field -->
              <label class="variant-content-field">
                <span class="sr-only">Prompt text</span>
                <textarea v-model="variant.content" rows="8"
                  placeholder="Write the prompt or generate it with AI above…"></textarea>
              </label>
            </section>
          </div>

          <!-- Form actions -->
          <footer class="prompt-form-actions">
            <button class="btn-secondary" type="button" @click="cancelEdit">
              Cancel
            </button>

            <button class="btn-primary" type="submit">Save prompt</button>
          </footer>
        </form>

        <!-- Selected prompt -->
        <article v-else-if="selectedPrompt" class="prompt-detail">
          <!-- Prompt header -->
          <header class="prompt-detail-header">
            <!-- Prompt title and description -->
            <div class="prompt-detail-heading">
              <p class="eyebrow">Saved prompt</p>
              <h2>{{ selectedPrompt.title }}</h2>

              <!-- Prompt description -->
              <p v-if="selectedPrompt.description" class="prompt-detail-desc">
                {{ selectedPrompt.description }}
              </p>
            </div>

            <!-- Prompt actions -->
            <div class="prompt-detail-actions">
              <!-- Edit prompt button -->
              <button class="icon-btn" type="button" aria-label="Edit prompt" title="Edit prompt"
                @click="startEdit(selectedPrompt)">
                <IconEdit :size="14" :stroke-width="2" aria-hidden="true" />
              </button>

              <!-- Delete prompt button -->
              <button class="icon-btn icon-btn-danger" type="button" aria-label="Delete prompt" title="Delete prompt"
                @click="deletePrompt(selectedPrompt.id)">
                <IconX :size="14" :stroke-width="2" aria-hidden="true" />
              </button>
            </div>
          </header>

          <!-- Prompt variants -->
          <section v-for="(variant, index) in selectedPrompt.variants" :key="index" class="prompt-variant">
            <!-- Variant header -->
            <header class="prompt-variant-header">
              <!-- Variant name field -->
              <div>
                <span class="prompt-variant-label">{{ variant.label }}</span>
                <span class="prompt-variant-number">
                  Variant {{ index + 1 }}
                </span>
              </div>

              <!-- Copy variant button -->
              <button class="icon-btn" type="button" :aria-label="copiedPromptIndex === index
                ? 'Prompt copied to clipboard'
                : `Copy ${variant.label} prompt`
                " :title="copiedPromptIndex === index ? 'Copied!' : 'Copy prompt'"
                @click="copyVariant(variant.content, index)">

                <IconCheck v-if="copiedPromptIndex === index" :size="14" :stroke-width="2" aria-hidden="true" />
                <IconCopy v-else :size="14" :stroke-width="2" aria-hidden="true" />
              </button>
            </header>

            <!-- Variant content -->
            <pre class="prompt-variant-content">{{ variant.content }}</pre>
          </section>
        </article>

        <!-- No selection state -->
        <div v-else class="prompts-empty-state">
          <!-- Empty state icon -->
          <div class="prompts-empty-icon" aria-hidden="true">
            <IconSparkles :size="26" :stroke-width="1.6" />
          </div>

          <h2>No prompt selected</h2>

          <p>Select a saved prompt from the left or start a new one.</p>

          <!-- New prompt button -->
          <button class="btn-primary" type="button" @click="startNewPrompt">
            <IconPlus :size="14" :stroke-width="2" aria-hidden="true" />
            New prompt
          </button>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import { useOllamaApi } from "@/services/ollamaApiService";
import { useLmStudioApi } from "@/services/lmsApiService";

import IconPlus from "@/components/icons/IconPlus.vue";
import IconEdit from "@/components/icons/IconEdit.vue";
import IconX from "@/components/icons/IconX.vue";
import IconCopy from "@/components/icons/IconCopy.vue";
import IconCheck from "@/components/icons/IconCheck.vue";
import IconSparkles from "@/components/icons/IconSparkles.vue";
import IconLoader from "@/components/icons/IconLoader.vue";
import IconPrompt from "@/components/icons/IconPrompt.vue";

import LocalAiNotice from "@/components/ui/LocalAiNotice.vue";


const ollama = useOllamaApi();
const lmStudio = useLmStudioApi();

const STORAGE_KEY = "app.prompts.v1";
const SELECTED_MODEL_STORAGE_KEY = "app.prompts.selected-model.v1";
const PROVIDER_POLL_INTERVAL_MS = 15_000;

const prompts = ref(loadPrompts());
const selectedId = ref(prompts.value[0]?.id ?? null);

const isEditing = ref(false);
const draft = ref(createEmptyDraft());

const aiTopic = ref("");
const aiError = ref("");
const isGeneratingAI = ref(false);

const copiedPromptIndex = ref(null);
let copiedPromptTimeoutId = null;

const ollamaOnline = ref(false);
const lmStudioOnline = ref(false);

const isCheckingProviders = ref(true);
const ollamaModels = ref([]);
const lmStudioModels = ref([]);

const selectedModelId = ref(loadSelectedModelId());

let providerStatusIntervalId = null;
let isRefreshingProviders = false;

const META_PROMPT = `You are an expert prompt engineer. Given a short topic or goal description, write a single, well-structured, production-ready prompt for a large language model. The prompt should be clear, specific, include relevant context, constraints, and desired output format. Respond with ONLY the prompt text itself, no explanations, no markdown formatting, no quotes around it.

Topic/goal: `;


// computed property
const selectedPrompt = computed(
  () => prompts.value.find((prompt) => prompt.id === selectedId.value) ?? null,
);

const availableModels = computed(() => [
  /*
    The model object is intentionally normalized.
    “id” contains the provider, since the same model name can exist in both backends,
    such as “qwen2.5:7b”.
  */
  ...ollamaModels.value.map((name) => ({
    id: `ollama:${name}`,
    modelId: name,
    name,
    provider: "ollama",
    providerLabel: "Ollama",
  })),

  ...lmStudioModels.value.map((model) => ({
    id: `lmstudio:${model.id}`,
    modelId: model.id,
    name: model.displayName,
    provider: "lmstudio",
    providerLabel: "LM Studio",
    isLoaded: model.isLoaded,
    instanceId: model.instanceId,
  })),
]);

const selectedModel = computed(
  () =>
    availableModels.value.find((model) => model.id === selectedModelId.value) ??
    null,
);

watch(selectedModelId, persistSelectedModelId);


// async functions
async function refreshProviderStatus() {
  /*
    Prevents overlapping requests. This can otherwise occur if a
    slow request takes longer than the polling interval.
  */
  if (isRefreshingProviders) return;

  isRefreshingProviders = true;
  isCheckingProviders.value = true;

  try {
    const [ollamaResult, lmStudioResult] = await Promise.allSettled([
      ollama.status(),
      lmStudio.status(),
    ]);

    ollamaOnline.value =
      ollamaResult.status === "fulfilled" && ollamaResult.value === true;

    lmStudioOnline.value =
      lmStudioResult.status === "fulfilled" && lmStudioResult.value === true;

    await Promise.all([loadOllamaModels(), loadLmStudioModels()]);

    ensureSelectedModel();
  } finally {
    isCheckingProviders.value = false;
    isRefreshingProviders = false;
  }
}

async function loadOllamaModels() {
  if (!ollamaOnline.value) {
    ollamaModels.value = [];
    return;
  }

  try {
    const models = await ollama.getAllModelsNames();

    ollamaModels.value = normalizeModelNames(models);
  } catch {
    ollamaOnline.value = false;
    ollamaModels.value = [];
  }
}

async function loadLmStudioModels() {
  if (!lmStudioOnline.value) {
    lmStudioModels.value = [];
    return;
  }

  try {
    const models = await lmStudio.getAllModelsWithDetails();

    lmStudioModels.value = models
      .filter(
        (model) =>
          model?.type === "llm" &&
          typeof model.id === "string" &&
          model.id.trim().length > 0,
      )
      .map((model) => ({
        id: model.id,
        displayName: model.displayName || model.id,
        isLoaded: model.isLoaded,
        instanceId: model.instanceId,
      }))
      .sort((a, b) => {
        if (a.isLoaded !== b.isLoaded) {
          return a.isLoaded ? -1 : 1;
        }

        return a.displayName.localeCompare(b.displayName);
      });
  } catch (error) {
    console.error("Could not load LM Studio models:", error);

    lmStudioOnline.value = false;
    lmStudioModels.value = [];
  }
}

async function generatePromptWithAI() {
  const topic = aiTopic.value.trim();
  const model = selectedModel.value;

  if (!topic || isGeneratingAI.value) return;

  if (!model) {
    aiError.value =
      "No model selected. Start Ollama or LM Studio and select a model.";
    return;
  }

  isGeneratingAI.value = true;
  aiError.value = "";

  try {
    const result = await generateWithSelectedProvider(
      model,
      `${META_PROMPT}${topic}`,
    );

    if (!result?.success) {
      throw new Error(result?.error || "The generation failed.");
    }

    if (!isNonEmptyString(result.response)) {
      throw new Error("The model did not return any text.");
    }

    if (!draft.value.title.trim()) {
      draft.value.title = topic;
    }

    draft.value.variants[0].content = result.response.trim();
  } catch (error) {
    console.error(`[Prompt generation / ${model.providerLabel}]`, error);

    const message =
      error instanceof Error ? error.message : "Unknown error";

    aiError.value = `The request to ${model.providerLabel} failed: ${message}`;
  } finally {
    isGeneratingAI.value = false;
  }
}

async function generateWithSelectedProvider(model, prompt) {
  if (model.provider === "ollama") {
    return ollama.generateResponse(model.modelId, prompt);
  }

  if (model.provider === "lmstudio") {
    return lmStudio.generateResponse(model.modelId, prompt);
  }

  throw new Error(`Unsupported provider: ${model.provider}`);
}

async function copyVariant(content, index) {
  try {
    await navigator.clipboard.writeText(content);

    copiedPromptIndex.value = index;

    if (copiedPromptTimeoutId) {
      window.clearTimeout(copiedPromptTimeoutId);
    }

    copiedPromptTimeoutId = window.setTimeout(() => {
      copiedPromptIndex.value = null;
      copiedPromptTimeoutId = null;
    }, 1_500);
  } catch {
    aiError.value =
      "The prompt could not be copied to the clipboard.";
  }
}


// functions
function normalizeModelNames(models) {
  if (!Array.isArray(models)) return [];

  return [...new Set(models.filter(isNonEmptyString))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function ensureSelectedModel() {
  /*
    A previously saved selection is retained as long as the model
    is available. If it is not, the first available model is automatically
    selected, or the selection is reset.
  */
  const hasSelectedModel = availableModels.value.some(
    (model) => model.id === selectedModelId.value,
  );

  if (!hasSelectedModel) {
    selectedModelId.value = availableModels.value[0]?.id ?? "";
  }

  persistSelectedModelId();
}

function markProviderOffline(provider) {
  if (provider === "ollama") {
    ollamaOnline.value = false;
    ollamaModels.value = [];
    return;
  }

  if (provider === "lmstudio") {
    lmStudioOnline.value = false;
    lmStudioModels.value = [];
  }
}

function loadPrompts() {
  try {
    const rawPrompts = localStorage.getItem(STORAGE_KEY);

    if (!rawPrompts) return [];

    const parsedPrompts = JSON.parse(rawPrompts);

    return Array.isArray(parsedPrompts) ? parsedPrompts : [];
  } catch {
    return [];
  }
}

function persistPrompts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts.value));
}

function createEmptyDraft() {
  return {
    id: null,
    title: "",
    description: "",
    variants: [
      {
        label: "Default",
        content: "",
      },
    ],
  };
}

function selectPrompt(id) {
  selectedId.value = id;
  isEditing.value = false;
  aiError.value = "";
}

function startNewPrompt() {
  draft.value = createEmptyDraft();
  selectedId.value = null;

  aiTopic.value = "";
  aiError.value = "";
  isEditing.value = true;
}

function startEdit(prompt) {
  draft.value = {
    id: prompt.id,
    title: prompt.title ?? "",
    description: prompt.description ?? "",
    createdAt: prompt.createdAt ?? null,
    updatedAt: prompt.updatedAt ?? null,
    variants: (prompt.variants ?? []).map((variant, index) => ({
      label: variant.label ?? `Variant ${index + 1}`,
      content: variant.content ?? "",
    })),
  };

  selectedId.value = prompt.id;
  aiTopic.value = "";
  aiError.value = "";
  isEditing.value = true;
}

function cancelEdit() {
  /*
    If a new draft has been canceled, 'selectedId' is already null.
    An existing prompt, however, remains selected.
  */
  isEditing.value = false;
  aiError.value = "";
  aiTopic.value = "";
}

function addVariant() {
  draft.value.variants.push({
    label: `Variant ${draft.value.variants.length + 1}`,
    content: "",
  });
}

function removeVariant(index) {
  if (draft.value.variants.length <= 1) return;

  draft.value.variants.splice(index, 1);
}

function savePrompt() {
  const title = draft.value.title.trim();

  if (!title) return;

  const normalizedDraft = {
    ...draft.value,
    title,
    description: draft.value.description.trim(),
    variants: draft.value.variants.map((variant, index) => ({
      label: variant.label.trim() || `Variant ${index + 1}`,
      content: variant.content.trim(),
    })),
  };

  if (normalizedDraft.id) {
    const promptIndex = prompts.value.findIndex(
      (prompt) => prompt.id === normalizedDraft.id,
    );

    if (promptIndex !== -1) {
      prompts.value[promptIndex] = {
        ...normalizedDraft,
        updatedAt: Date.now(),
      };
    }
  } else {
    const timestamp = Date.now();

    const newPrompt = {
      ...normalizedDraft,
      id: crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    prompts.value.unshift(newPrompt);
    selectedId.value = newPrompt.id;
  }

  persistPrompts();
  isEditing.value = false;
  aiError.value = "";
  aiTopic.value = "";
}

function deletePrompt(id) {
  const prompt = prompts.value.find((item) => item.id === id);

  if (!prompt) return;

  const confirmed = window.confirm(
    `Delete "${prompt.title}"?\n\nThis permanently removes the prompt and all of its variants.`,
  );

  if (!confirmed) return;

  const deletedPromptIndex = prompts.value.findIndex(
    (item) => item.id === id,
  );

  prompts.value.splice(deletedPromptIndex, 1);

  if (selectedId.value === id) {
    selectedId.value = prompts.value[0]?.id ?? null;
  }

  persistPrompts();
}

function loadSelectedModelId() {
  try {
    return localStorage.getItem(SELECTED_MODEL_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function persistSelectedModelId() {
  try {
    if (selectedModelId.value) {
      localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, selectedModelId.value);
    } else {
      localStorage.removeItem(SELECTED_MODEL_STORAGE_KEY);
    }
  } catch {
    /*
      Local storage can be unavailable in restrictive browser contexts.
      The current in-memory selection continues to work.
    */
  }
}


// mounted/ unmounted lifecycle hooks
onMounted(() => {
  refreshProviderStatus();

  providerStatusIntervalId = window.setInterval(
    refreshProviderStatus,
    PROVIDER_POLL_INTERVAL_MS,
  );
});

onUnmounted(() => {
  if (providerStatusIntervalId) {
    window.clearInterval(providerStatusIntervalId);
  }

  if (copiedPromptTimeoutId) {
    window.clearTimeout(copiedPromptTimeoutId);
  }
});
</script>

<style scoped>
/* Foundation */
.prompts-view {
  height: 100%;
  overflow-y: auto;
  padding: var(--space-8) var(--space-6);
  overscroll-behavior: contain;
}

.page-header,
.generation-toolbar,
.prompts-layout {
  width: 100%;
  max-width: var(--max-width);
  margin-inline: 0;
}

/* Header */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.25rem;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  min-width: 0;
  gap: 0.65rem;
}

.header-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 22%, transparent);
  border-radius: 13px;
}

.eyebrow {
  margin: 0 0 0.2rem;
  color: var(--color-text-faint);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 0;
  color: var(--color-text);
  font-size: clamp(1.65rem, 3vw, 2.2rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.header-description {
  margin: 0.45rem 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  line-height: 1.5;
}

/* Buttons and keyboard focus */
.btn-primary,
.btn-secondary,
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 34px;
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 650;
  line-height: 1;
  cursor: pointer;
  border-radius: 8px;
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    box-shadow 140ms ease,
    color 140ms ease,
    transform 100ms ease;
}

.btn-primary,
.btn-secondary {
  padding: 0.5rem 0.75rem;
  white-space: nowrap;
}

.btn-primary {
  color: #fff;
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
  box-shadow: 0 1px 1px rgb(0 0 0 / 0.08);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.btn-secondary {
  color: var(--color-text);
  background: color-mix(in srgb,
      var(--color-surface) 92%,
      var(--color-surface-2));
  border: 1px solid var(--color-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-surface-2);
  border-color: color-mix(in srgb,
      var(--color-text-muted) 34%,
      var(--color-border));
}

.btn-compact {
  min-height: 30px;
  padding: 0.38rem 0.6rem;
}

.icon-btn {
  width: 30px;
  min-width: 30px;
  height: 30px;
  padding: 0;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid transparent;
}

.icon-btn:hover {
  color: var(--color-text);
  background: var(--color-surface-2);
  border-color: var(--color-border);
}

.icon-btn-danger:hover {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 8%, transparent);
  border-color: color-mix(in srgb, var(--color-error) 22%, var(--color-border));
}

.btn-primary:active:not(:disabled),
.btn-secondary:active:not(:disabled),
.icon-btn:active {
  transform: translateY(1px);
}

.btn-primary:disabled,
.btn-secondary:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btn-primary:focus-visible,
.btn-secondary:focus-visible,
.icon-btn:focus-visible,
.prompt-list-item:focus-visible,
.model-select-field select:focus-visible {
  position: relative;
  z-index: 1;
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Provider toolbar and model selection */
.generation-toolbar {
  display: flex;
  align-items: center;
  min-height: 50px;
  gap: 1rem;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.85rem;
  background: color-mix(in srgb,
      var(--color-surface) 94%,
      var(--color-surface-2));
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.provider-statuses {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 0.45rem;
}

.provider-status {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 28px;
  padding: 0.2rem 0.45rem;
  color: var(--color-text-muted);
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1;
  border-radius: 6px;
}

.provider-status-dot {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  background: var(--color-error);
  border-radius: 50%;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-error) 12%, transparent);
}

.provider-status.online .provider-status-dot {
  background: var(--color-success, #34c759);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-success, #34c759) 13%, transparent);
}

.provider-status.online {
  color: var(--color-text);
}

.model-select-field {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 0.55rem;
  padding-left: 1rem;
  margin-left: auto;
  border-left: 1px solid var(--color-border);
}

.model-select-label {
  flex: 0 0 auto;
  color: var(--color-text-faint);
  font-size: 0.67rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.model-select-field select {
  width: min(260px, 38vw);
  min-height: 30px;
  padding: 0.35rem 1.8rem 0.35rem 0.55rem;
  overflow: hidden;
  color: var(--color-text);
  font: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  appearance: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 7px;
}

.model-select-field select:hover:not(:disabled) {
  border-color: color-mix(in srgb,
      var(--color-text-muted) 38%,
      var(--color-border));
}

.model-select-field select:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.generation-toolbar-message {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--color-text-faint);
  font-size: var(--text-xs);
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Prompt workspace */
.prompts-layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  min-height: 540px;
  gap: 0.85rem;
}

.prompts-sidebar,
.prompts-main {
  min-width: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.prompts-sidebar {
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: 680px;
  overflow: hidden;
}

.prompts-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 42px;
  padding: 0 0.75rem;
  color: var(--color-text);
  font-size: var(--text-xs);
  font-weight: 650;
  border-bottom: 1px solid var(--color-border);
}

.prompts-count {
  min-width: 20px;
  padding: 0.15rem 0.35rem;
  color: var(--color-text-faint);
  font-size: 0.65rem;
  font-variant-numeric: tabular-nums;
  text-align: center;
  background: var(--color-surface-2);
  border-radius: var(--radius-full, 999px);
}

.prompt-list {
  display: grid;
  align-content: start;
  gap: 0.2rem;
  padding: 0.4rem;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.prompt-list-item {
  display: grid;
  width: 100%;
  min-width: 0;
  gap: 0.2rem;
  padding: 0.65rem 0.65rem;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  transition:
    background-color 140ms ease,
    border-color 140ms ease;
}

.prompt-list-item:hover {
  background: var(--color-surface-2);
}

.prompt-list-item.active {
  background: color-mix(in srgb, var(--color-primary) 9%, transparent);
  border-color: color-mix(in srgb,
      var(--color-primary) 20%,
      var(--color-border));
}

.prompt-list-title {
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--text-xs);
  font-weight: 650;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prompt-list-desc {
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: 0.68rem;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prompt-list-desc-empty {
  color: var(--color-text-faint);
  font-style: italic;
}

.prompts-sidebar-empty {
  display: grid;
  justify-items: center;
  gap: 0.65rem;
  padding: 1.5rem 1rem;
  margin: auto 0;
  color: var(--color-text-faint);
  font-size: var(--text-xs);
  line-height: 1.45;
  text-align: center;
}

.prompts-sidebar-empty p {
  margin: 0;
}

.prompts-main {
  min-height: 540px;
  padding: 1.25rem;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.prompt-form,
.prompt-detail {
  display: grid;
  width: min(100%, 780px);
  gap: 1.25rem;
  margin: 0 auto;
}

/* Editor: AI generation panel */
.ai-generate-panel {
  display: grid;
  gap: 0.85rem;
  padding: 0.9rem;
  background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--color-primary) 16%, var(--color-border));
  border-radius: 10px;
}

.ai-generate-panel-heading {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.ai-generate-panel-icon {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 11%, transparent);
  border-radius: 8px;
}

.ai-generate-panel h2,
.prompt-form-section-heading h2 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 680;
  letter-spacing: -0.01em;
  line-height: 1.25;
}

.ai-generate-panel-heading p,
.prompt-form-section-heading p {
  margin: 0.15rem 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  line-height: 1.4;
}

.ai-generate-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.5rem;
}

.ai-generate-controls input,
.prompt-form input,
.prompt-form textarea {
  box-sizing: border-box;
  width: 100%;
  color: var(--color-text);
  font: inherit;
  font-size: var(--text-sm);
  line-height: 1.45;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  outline: none;
  transition:
    border-color 140ms ease,
    box-shadow 140ms ease,
    background-color 140ms ease;
}

.ai-generate-controls input {
  min-height: 34px;
  padding: 0.45rem 0.65rem;
}

.ai-generate-controls input::placeholder,
.prompt-form input::placeholder,
.prompt-form textarea::placeholder {
  color: var(--color-text-faint);
}

.ai-generate-controls input:hover,
.prompt-form input:hover,
.prompt-form textarea:hover {
  border-color: color-mix(in srgb,
      var(--color-text-muted) 36%,
      var(--color-border));
}

.ai-generate-controls input:focus,
.prompt-form input:focus,
.prompt-form textarea:focus {
  background: color-mix(in srgb, var(--color-primary) 2%, var(--color-surface));
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 14%, transparent);
}

.prompt-form-error {
  padding: 0.6rem 0.7rem;
  margin: -0.55rem 0 0;
  color: var(--color-error);
  font-size: var(--text-xs);
  line-height: 1.45;
  background: color-mix(in srgb, var(--color-error) 7%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--color-error) 20%, var(--color-border));
  border-radius: 8px;
}

/* Editor: form sections and variants */
.prompt-form-section,
.prompt-variants-editor {
  display: grid;
  gap: 0.85rem;
}

.prompt-form-section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.prompt-form-field {
  display: grid;
  gap: 0.4rem;
}

.prompt-form-field>span,
.variant-name-field>span {
  color: var(--color-text);
  font-size: var(--text-xs);
  font-weight: 650;
  line-height: 1.25;
}

.prompt-form-field em {
  margin-left: 0.2rem;
  color: var(--color-text-faint);
  font-size: 0.68rem;
  font-style: normal;
  font-weight: 500;
}

.prompt-form input {
  min-height: 36px;
  padding: 0.5rem 0.65rem;
}

.prompt-form textarea {
  display: block;
  min-height: 90px;
  padding: 0.6rem 0.65rem;
  resize: vertical;
}

.variant-editor {
  display: grid;
  gap: 0.65rem;
  padding: 0.8rem;
  background: color-mix(in srgb,
      var(--color-surface) 88%,
      var(--color-surface-2));
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.variant-editor-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.65rem;
}

.variant-name-field {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 0.35rem;
}

.variant-name-field input {
  font-weight: 600;
}

.variant-content-field {
  display: block;
}

.variant-content-field textarea {
  min-height: 170px;
  font-family: "Fira Code", ui-monospace, SFMono-Regular, monospace;
  font-size: 0.78rem;
  line-height: 1.6;
}

.prompt-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

/* Prompt detail */
.prompt-detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.prompt-detail-heading {
  min-width: 0;
}

.prompt-detail-header h2 {
  margin: 0;
  overflow: hidden;
  color: var(--color-text);
  font-size: clamp(1.25rem, 2vw, 1.55rem);
  font-weight: 720;
  letter-spacing: -0.035em;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prompt-detail-desc {
  margin: 0.45rem 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  line-height: 1.5;
}

.prompt-detail-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 0.3rem;
}

.prompt-variant {
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.prompt-variant-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 42px;
  padding: 0.35rem 0.45rem 0.35rem 0.75rem;
  background: color-mix(in srgb,
      var(--color-surface-2) 82%,
      var(--color-surface));
  border-bottom: 1px solid var(--color-border);
}

.prompt-variant-header>div {
  display: grid;
  min-width: 0;
  gap: 0.1rem;
}

.prompt-variant-label {
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--text-xs);
  font-weight: 650;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prompt-variant-number {
  color: var(--color-text-faint);
  font-size: 0.65rem;
  line-height: 1.2;
}

.prompt-variant-content {
  max-height: 380px;
  padding: 0.9rem 1rem;
  margin: 0;
  overflow: auto;
  color: var(--color-text);
  font-family: "Fira Code", ui-monospace, SFMono-Regular, monospace;
  font-size: 0.78rem;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--color-surface);
  scrollbar-color: var(--color-border) transparent;
  scrollbar-width: thin;
}

/* Empty state and screen-reader helper */
.prompts-empty-state {
  display: grid;
  justify-items: center;
  align-content: center;
  min-height: 100%;
  padding: 2rem;
  color: var(--color-text-muted);
  text-align: center;
}

.prompts-empty-icon {
  display: grid;
  width: 48px;
  height: 48px;
  margin-bottom: 0.85rem;
  place-items: center;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 9%, transparent);
  border-radius: 14px;
}

.prompts-empty-state h2 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 680;
}

.prompts-empty-state p {
  max-width: 290px;
  margin: 0.35rem 0 1rem;
  font-size: var(--text-xs);
  line-height: 1.5;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Responsive layout */
@media (max-width: 760px) {
  .prompts-view {
    padding: 1rem 0.75rem 1.5rem;
  }

  .page-header {
    flex-direction: column;
    gap: 0.9rem;
    margin-bottom: 1rem;
  }

  .page-heading {
    gap: 0.55rem;
  }

  .header-icon {
    width: 34px;
    height: 34px;
    border-radius: 11px;
  }

  .eyebrow {
    font-size: 0.6rem;
  }

  .page-header h1 {
    font-size: 1.4rem;
  }

  .header-description {
    margin-top: 0.3rem;
    font-size: 12px;
  }

  .page-header>.btn-primary {
    width: 100%;
  }

  .generation-toolbar {
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 0.55rem;
    padding: 0.6rem;
  }

  .model-select-field {
    flex: 1 1 100%;
    justify-content: space-between;
    padding-top: 0.55rem;
    padding-left: 0;
    margin-left: 0;
    border-top: 1px solid var(--color-border);
    border-left: 0;
  }

  .model-select-field select {
    width: min(240px, 65vw);
  }

  .generation-toolbar-message {
    flex-basis: 100%;
    padding-top: 0.55rem;
    border-top: 1px solid var(--color-border);
    white-space: normal;
  }

  .prompts-layout {
    grid-template-columns: 1fr;
    min-height: 0;
    gap: 0.65rem;
  }

  .prompts-sidebar {
    max-height: 220px;
  }

  .prompts-main {
    min-height: 440px;
    padding: 1rem;
    overflow: visible;
  }

  .prompt-form,
  .prompt-detail {
    gap: 1rem;
  }

  .prompt-variant-content {
    max-height: 280px;
  }
}

@media (max-width: 430px) {
  .provider-statuses {
    width: 100%;
  }

  .provider-status {
    flex: 1;
    justify-content: center;
  }

  .model-select-field {
    display: grid;
    gap: 0.35rem;
  }

  .model-select-field select {
    width: 100%;
  }

  .ai-generate-controls {
    grid-template-columns: 1fr;
  }

  .ai-generate-controls .btn-secondary {
    width: 100%;
  }

  .prompt-form-section-heading {
    flex-direction: column;
    gap: 0.65rem;
  }

  .prompt-form-section-heading .btn-secondary {
    width: 100%;
  }

  .variant-editor-header {
    align-items: flex-start;
  }

  .prompt-form-actions {
    flex-direction: column-reverse;
  }

  .prompt-form-actions .btn-primary,
  .prompt-form-actions .btn-secondary {
    width: 100%;
  }
}

/* Touch devices: avoid iOS automatic input zoom */
@media (pointer: coarse) {

  .ai-generate-controls input,
  .prompt-form input,
  .prompt-form textarea,
  .model-select-field select {
    font-size: 16px;
  }

  .icon-btn {
    width: 36px;
    min-width: 36px;
    height: 36px;
  }
}
</style>
