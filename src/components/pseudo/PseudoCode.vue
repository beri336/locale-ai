<!-- src/components/pseudo/PseudoCode.vue -->

<template>
  <div class="pseudocode-view">
    <!-- Page header -->
    <header class="page-header">
      <!-- Page title, description and icon -->
      <div class="page-header-title">
        <!-- Page icon -->
        <IconPseudocode :size="22" :stroke-width="1.6" class="page-header-icon" />

        <!-- Page title and description -->
        <div>
          <h1>Pseudocode to Code</h1>
          <p class="page-subtitle">
            Describe your logic in plain language or pseudocode — get clean,
            idiomatic code in any language
          </p>
        </div>
      </div>
    </header>

    <!-- Translator layout -->
    <div class="translator-layout">
      <!-- Input panel -->
      <div class="panel input-panel">
        <!-- Panel toolbar -->
        <div class="panel-toolbar">
          <span class="panel-label">Pseudocode / Description</span>
          <span class="char-count">{{ pseudocodeInput.length }} chars</span>
        </div>

        <!-- Pseudocode input textarea -->
        <textarea v-model="pseudocodeInput" class="input textarea pseudocode-textarea"
          placeholder="e.g. loop through list of numbers, if number is even add to sum, return sum at the end"
          :disabled="isGenerating"></textarea>

        <!-- Controls row -->
        <div class="controls-row">
          <!-- Target language -->
          <div class="field-group">
            <label class="field-label">Target language</label>

            <!-- Target language select -->
            <select v-model="targetLanguage" class="input" :disabled="isGenerating">
              <option v-for="lang in languages" :key="lang" :value="lang">
                {{ lang }}
              </option>
            </select>
          </div>

          <!-- Generation model -->
          <div class="field-group">
            <label class="field-label" for="pseudocode-model">
              Generation model
            </label>

            <!-- Generation model select -->
            <select id="pseudocode-model" v-model="selectedModelId" class="input"
              :disabled="isGenerating || isCheckingProviders">
              <!-- No local model available -->
              <option v-if="!availableModels.length" value="" disabled>
                No local model available
              </option>

              <!-- Available models -->
              <option v-for="model in availableModels" :key="model.id" :value="model.id">
                {{ model.name }} · {{ model.providerLabel }}
                {{
                  model.provider === "lmstudio" && !model.isLoaded
                    ? " (not loaded)"
                    : ""
                }}
              </option>
            </select>
          </div>
        </div>

        <!-- Model warning -->
        <div v-if="!hasValidModel" class="model-warning" role="alert">
          <span class="model-warning-icon" aria-hidden="true">!</span>

          <!-- Model warning content -->
          <div>
            <strong>No local model available</strong>

            <p>
              Start Ollama or LM Studio, then download or load a compatible
              model.
            </p>
          </div>
        </div>

        <!-- Action row -->
        <div class="action-row">
          <!-- Generate button -->
          <button class="btn-primary" type="button" :disabled="isGenerating || !pseudocodeInput.trim() || !hasValidModel
            " @click="handleTranslate">

            <IconPseudocode :size="16" :stroke-width="1.8" aria-hidden="true" />
            {{
              isGenerating ? "Generating…" : `Translate to ${targetLanguage}`
            }}
          </button>
        </div>
      </div>

      <!-- Output panel -->
      <div class="panel output-panel">
        <!-- Panel toolbar -->
        <div class="panel-toolbar">
          <span class="panel-label">Generated code</span>

          <!-- Copy button -->
          <button v-if="outputCode" class="copy-btn toolbar-copy-btn" type="button" @click="handleCopyOutput">
            {{ copied ? "✓ Copied" : "⧉ Copy" }}
          </button>
        </div>

        <!-- Output empty state -->
        <div v-if="!outputCode && !isGenerating" class="output-empty">
          <IconPseudocode :size="30" :stroke-width="1.4" />
          <p>Your generated code will appear here.</p>
        </div>

        <!-- Output code -->
        <div v-else class="output-code markdown-body" v-html="renderMarkdown(outputCode || '…')"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import { useOllamaApi } from "@/services/ollamaApiService";
import { useLmStudioApi } from "@/services/lmsApiService";

import { renderMarkdown } from "@/utils/markdown";
import { copyToClipboard } from "@/utils/clipboard";

import IconPseudocode from "@/components/icons/IconPseudocode.vue";

import {
  PSEUDOCODE_SYSTEM_PROMPT,
  buildPseudocodeUserPrompt,
} from "@/prompts/pseudocodePrompt";


const ollama = useOllamaApi();
const lmstudio = useLmStudioApi();

const SELECTED_MODEL_STORAGE_KEY = "app.pseudocode.selected-model.v1";
const PROVIDER_POLL_INTERVAL_MS = 15_000;

const languages = [
  "Python",
  "C#",
  "JavaScript",
  "TypeScript",
  "Java",
  "C++",
  "Go",
  "Rust",
  "PHP",
  "Swift",
];

const pseudocodeInput = ref("");
const targetLanguage = ref("Python");

const outputCode = ref("");
const isGenerating = ref(false);
const generationError = ref("");

const copied = ref(false);
let copiedTimeoutId = null;

const ollamaOnline = ref(false);
const lmStudioOnline = ref(false);

const ollamaModels = ref([]);
const lmStudioModels = ref([]);

const isCheckingProviders = ref(true);
const selectedModelId = ref(loadSelectedModelId());

let refreshIntervalId = null;
let isRefreshingProviders = false;


// computed properties
const availableModels = computed(() => [
  ...ollamaModels.value.map((name) => ({
    id: `ollama:${name}`,
    modelId: name,
    name,
    provider: "ollama",
    providerLabel: "Ollama",
    isLoaded: true,
  })),

  ...lmStudioModels.value.map((model) => ({
    id: `lmstudio:${model.id}`,
    modelId: model.id,
    name: model.displayName || model.id,
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

const hasValidModel = computed(() => selectedModel.value !== null);

watch(selectedModelId, persistSelectedModelId);


// async functions
async function refreshProviders() {
  if (isRefreshingProviders) return;

  isRefreshingProviders = true;
  isCheckingProviders.value = true;

  try {
    const [ollamaResult, lmStudioResult] = await Promise.allSettled([
      ollama.status(),
      lmstudio.status(),
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
  } catch (error) {
    console.error("Could not load Ollama models:", error);

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
    const models = await lmstudio.getAllModelsWithDetails();

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
        isLoaded: Boolean(model.isLoaded),
        instanceId: model.instanceId ?? null,
      }))
      .sort((left, right) => {
        if (left.isLoaded !== right.isLoaded) {
          return left.isLoaded ? -1 : 1;
        }

        return left.displayName.localeCompare(right.displayName);
      });
  } catch (error) {
    console.error("Could not load LM Studio models:", error);

    lmStudioOnline.value = false;
    lmStudioModels.value = [];
  }
}

async function handleTranslate() {
  const model = selectedModel.value;
  const source = pseudocodeInput.value.trim();

  if (!source || !model || isGenerating.value) return;

  isGenerating.value = true;
  generationError.value = "";
  outputCode.value = "";

  const userPrompt = buildPseudocodeUserPrompt(source, targetLanguage.value);

  try {
    /*
      Intentionally use the existing “one-shot” service methods.
      They return the same contract in Ollama and LM Studio:
      { success, response, error }.

      This is more robust than forcing a non-shared streaming method.
    */
    const result = await generateCode(model, userPrompt);

    if (!result?.success) {
      throw new Error(result?.error || "The model could not generate code.");
    }

    if (!isNonEmptyString(result.response)) {
      throw new Error("The model returned no code.");
    }

    outputCode.value = formatAsCodeBlock(
      extractCodeBlock(result.response),
      targetLanguage.value,
    );
  } catch (error) {
    console.error(`[Pseudocode translation / ${model.providerLabel}]`, error);

    const message = error instanceof Error ? error.message : "Unknown error.";

    generationError.value = `${model.providerLabel}: ${message}`;
  } finally {
    isGenerating.value = false;
  }
}

async function generateCode(model, userPrompt) {
  const prompt = `${PSEUDOCODE_SYSTEM_PROMPT}\n\n${userPrompt}`;

  if (model.provider === "ollama") {
    return ollama.generateResponse(model.modelId, prompt, {
      temperature: 0.2,
    });
  }

  if (model.provider === "lmstudio") {
    return lmstudio.generateResponse(model.modelId, userPrompt, {
      temperature: 0.2,
      system_prompt: PSEUDOCODE_SYSTEM_PROMPT,
    });
  }

  throw new Error(`Unsupported provider: ${model.provider}`);
}

async function handleCopyOutput() {
  const success = await copyToClipboard(extractCodeBlock(outputCode.value));

  if (!success) return;

  copied.value = true;

  if (copiedTimeoutId) {
    window.clearTimeout(copiedTimeoutId);
  }

  copiedTimeoutId = window.setTimeout(() => {
    copied.value = false;
    copiedTimeoutId = null;
  }, 1_500);
}


// functions
function normalizeModelNames(models) {
  if (!Array.isArray(models)) return [];

  return [...new Set(models.filter(isNonEmptyString))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function ensureSelectedModel() {
  const modelStillAvailable = availableModels.value.some(
    (model) => model.id === selectedModelId.value,
  );

  if (!modelStillAvailable) {
    selectedModelId.value = availableModels.value[0]?.id ?? "";
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function handleStop() {
  /*
    The one-shot methods currently in use do not provide a cancel signal.
    To be implemented in the future.
  */
}

function extractCodeBlock(text) {
  const match = text.match(/```[\w+#-]*\s*\n([\s\S]*?)```/);

  return match ? match[1].trim() : text.trim();
}

function formatAsCodeBlock(code, language) {
  const markdownLanguage = getMarkdownLanguage(language);

  return `\`\`\`${markdownLanguage}\n${code}\n\`\`\``;
}

function getMarkdownLanguage(language) {
  const languageMap = {
    Python: "python",
    "C#": "csharp",
    JavaScript: "javascript",
    TypeScript: "typescript",
    Java: "java",
    "C++": "cpp",
    Go: "go",
    Rust: "rust",
    PHP: "php",
    Swift: "swift",
  };

  return languageMap[language] ?? "";
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
    /* A restrictive browser context may deny localStorage access. */
  }
}


// mounted/ unmounted lifecycle hooks
onMounted(() => {
  refreshProviders();

  refreshIntervalId = window.setInterval(
    refreshProviders,
    PROVIDER_POLL_INTERVAL_MS,
  );
});

onUnmounted(() => {
  if (refreshIntervalId) {
    window.clearInterval(refreshIntervalId);
  }

  if (copiedTimeoutId) {
    window.clearTimeout(copiedTimeoutId);
  }
});
</script>

<style scoped>
/* Page layout and header */
.pseudocode-view {
  box-sizing: border-box;
  height: 100%;
  min-height: 0;
  padding: var(--space-8) var(--space-6);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  max-width: var(--max-width);
  gap: 1rem;
  margin-bottom: 1rem;
}

.page-header-title {
  display: flex;
  align-items: flex-start;
  min-width: 0;
  gap: 0.65rem;
}

.page-header-icon {
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

.page-header h1 {
  margin: 0;
  color: var(--color-text);
  font-size: clamp(1.65rem, 3vw, 2.2rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.page-subtitle {
  max-width: 620px;
  margin: 0.45rem 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  line-height: 1.5;
}

/* Translator workspace */
.translator-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 100%;
  max-width: var(--max-width);
  height: min(680px, calc(100dvh - 190px));
  min-height: 530px;
  gap: 0.85rem;
}

.panel {
  display: grid;
  min-width: 0;
  min-height: 0;
  gap: 1rem;
  padding: clamp(1rem, 2.5vw, 1.35rem);
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.025);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.panel:hover {
  border-color: color-mix(in srgb,
      var(--color-primary) 26%,
      var(--color-border));
  box-shadow: 0 8px 26px rgb(0 0 0 / 0.035);
}

.input-panel {
  grid-template-rows: auto minmax(0, 1fr) auto auto auto;
}

.output-panel {
  grid-template-rows: auto minmax(0, 1fr);
}

/* Panel toolbar */
.panel-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  gap: 0.75rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid var(--color-border);
}

.panel-label {
  color: var(--color-text);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.char-count {
  flex: 0 0 auto;
  padding: 0.2rem 0.45rem;
  color: var(--color-text-faint);
  font-family: "Fira Code", ui-monospace, SFMono-Regular, monospace;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

/* Inputs and selectors */
.input {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 0.65rem 0.75rem;
  color: var(--color-text);
  font-family: inherit;
  font-size: var(--text-sm);
  line-height: 1.35;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    background 0.16s ease;
}

.input:hover:not(:disabled) {
  border-color: color-mix(in srgb,
      var(--color-text-faint) 40%,
      var(--color-border));
}

.input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent);
}

.input:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

select.input {
  appearance: none;
  padding-right: 2.5rem;
  cursor: pointer;
  background-image:
    linear-gradient(45deg, transparent 50%, currentColor 50%),
    linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position:
    calc(100% - 15px) 50%,
    calc(100% - 10px) 50%;
  background-repeat: no-repeat;
  background-size:
    5px 5px,
    5px 5px;
}

.pseudocode-textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 0;
  height: 100%;
  padding: 0.75rem 0.85rem;
  color: var(--color-text);
  font-family: "Fira Code", ui-monospace, SFMono-Regular, monospace;
  font-size: var(--text-sm);
  line-height: 1.65;
  resize: none;
}

.pseudocode-textarea::placeholder {
  color: var(--color-text-faint);
}

.controls-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.field-group {
  display: grid;
  min-width: 0;
  gap: 0.4rem;
}

.field-label {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: 600;
}

/* Buttons and actions */
.action-row {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.1rem;
}

.btn-primary,
.btn-stop,
.copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  gap: 0.4rem;
  padding: 0.55rem 0.85rem;
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease,
    transform 0.16s ease;
}

.btn-primary {
  color: #fff;
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.btn-primary:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.btn-stop {
  color: var(--color-error, #ef4444);
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--color-error, #ef4444) 48%, var(--color-border));
}

.btn-stop:hover {
  color: #fff;
  background: var(--color-error, #ef4444);
  border-color: var(--color-error, #ef4444);
}

.copy-btn {
  min-height: 30px;
  padding: 0.4rem 0.65rem;
  color: var(--color-text-muted);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
}

.copy-btn:hover {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 9%, var(--color-surface));
  border-color: color-mix(in srgb,
      var(--color-primary) 30%,
      var(--color-border));
}

.btn-primary:active:not(:disabled),
.btn-stop:active,
.copy-btn:active {
  transform: translateY(1px);
}

.btn-primary:focus-visible,
.btn-stop:focus-visible,
.copy-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Model warning */
.model-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.75rem 0.85rem;
  color: var(--color-warning, #a16207);
  background: color-mix(in srgb,
      var(--color-warning, #f59e0b) 10%,
      var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--color-warning, #f59e0b) 28%, var(--color-border));
  border-radius: var(--radius-md);
}

.model-warning-icon {
  display: grid;
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  place-items: center;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  background: var(--color-warning, #f59e0b);
  border-radius: 50%;
}

.model-warning strong {
  display: block;
  color: inherit;
  font-size: var(--text-xs);
  font-weight: 700;
}

.model-warning p {
  margin: 0.2rem 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  line-height: 1.45;
}

.model-warning a {
  color: var(--color-primary);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Output and code-block scrolling */
/*
  The output wrapper does not scroll. It only provides the available grid size.
  The nested <pre> is the single scrollable area for both axes.
*/
.output-code {
  min-width: 0;
  min-height: 0;
  padding: 0.25rem;
  overflow: hidden;
}

.output-code :deep(.code-block) {
  height: 100%;
  min-width: 0;
  margin: 0;
}

.output-code :deep(pre) {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding: 0.9rem 1rem;
  margin: 0;

  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-color: var(--color-border) transparent;
  scrollbar-width: thin;

  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.output-code :deep(code) {
  display: block;
  width: max-content;
  min-width: 100%;
  color: var(--color-text);
  font-family: "Fira Code", ui-monospace, SFMono-Regular, monospace;
  font-size: 0.76rem;
  line-height: 1.65;

  /* Preserve code formatting and allow horizontal scrolling for long lines. */
  white-space: pre;
}

.output-empty {
  display: grid;
  min-width: 0;
  min-height: 0;
  place-content: center;
  justify-items: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--color-text-faint);
  font-size: var(--text-sm);
  text-align: center;
}

.output-empty :deep(svg) {
  color: var(--color-primary);
}

.output-empty p {
  max-width: 250px;
  margin: 0;
  line-height: 1.5;
}

/* Tablet layout */
@media (max-width: 900px) {
  .translator-layout {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 0;
  }

  .panel {
    overflow: visible;
  }

  .input-panel {
    grid-template-rows: auto auto auto auto auto;
  }

  .pseudocode-textarea {
    min-height: 250px;
    height: auto;
    resize: vertical;
  }

  .output-panel {
    grid-template-rows: auto auto;
  }

  .output-code {
    height: 440px;
    min-height: 250px;
  }
}

/* Mobile layout */
@media (max-width: 620px) {
  .pseudocode-view {
    padding: 0.85rem 0.75rem 1.5rem;
  }

  .page-header {
    gap: 0.55rem;
    margin-bottom: 1rem;
  }

  .page-header-title {
    gap: 0.6rem;
  }

  .page-header-icon {
    width: 34px;
    height: 34px;
    border-radius: 11px;
  }

  .page-header-icon :deep(svg) {
    width: 18px;
    height: 18px;
  }

  .page-header h1 {
    font-size: 1.4rem;
  }

  .page-subtitle {
    margin-top: 0.3rem;
    font-size: 12px;
  }

  .translator-layout {
    gap: 0.6rem;
  }

  .panel {
    gap: 0.85rem;
    padding: 0.85rem;
    border-radius: var(--radius-md);
  }

  .panel-toolbar {
    padding-bottom: 0.65rem;
  }

  .panel-label {
    font-size: 0.62rem;
  }

  .char-count {
    font-size: 9px;
  }

  .controls-row {
    grid-template-columns: 1fr;
    gap: 0.6rem;
  }

  .field-group {
    gap: 0.3rem;
  }

  .field-label {
    font-size: 11px;
  }

  .input {
    padding: 0.5rem 0.6rem;
    font-size: 16px;
  }

  .pseudocode-textarea {
    min-height: 210px;
    padding: 0.65rem;
    font-size: 16px;
  }

  .btn-primary,
  .btn-stop {
    width: 100%;
    min-height: 34px;
    padding: 0.45rem 0.65rem;
    font-size: 11px;
  }

  .action-row {
    display: block;
  }

  .copy-btn {
    min-height: 28px;
    padding: 0.35rem 0.55rem;
    font-size: 10px;
  }

  .model-warning {
    gap: 0.55rem;
    padding: 0.65rem;
  }

  .model-warning strong,
  .model-warning p {
    font-size: 11px;
  }

  .output-code {
    height: 360px;
    min-height: 210px;
  }

  .output-code :deep(pre) {
    padding: 0.7rem;
  }

  .output-code :deep(code) {
    font-size: 11px;
  }

  .output-empty {
    min-height: 210px;
    padding: 1.5rem;
    font-size: 11px;
  }
}

/* Touch devices */
@media (pointer: coarse) {

  .input,
  .pseudocode-textarea {
    font-size: 16px;
  }
}
</style>
