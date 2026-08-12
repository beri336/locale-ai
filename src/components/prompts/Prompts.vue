<!-- src/components/prompts/Prompts.vue -->

<template>
  <div class="prompts-view">
    <div class="prompts-view-header">
      <header class="page-header">
        <div class="page-heading">
          <div class="header-icon" aria-hidden="true">
            <IconPrompt :size="22" :stroke-width="1.8" />
          </div>

          <div>
            <p class="eyebrow">Prompt library</p>
            <h1>Prompts</h1>
            <p class="header-description">
              Save, refine and reuse prompts for your local models.
            </p>
          </div>
        </div>

        <button class="btn-primary" type="button" @click="startNewPrompt">
          <IconPlus :size="12" :stroke-width="2" aria-hidden="true" />
          New prompt
        </button>
      </header>
    </div>

    <div
      class="ollama-status"
      :class="{
        online: ollamaOnline,
        offline: !ollamaOnline,
        checking: isCheckingOllama,
      }"
      role="status"
      aria-live="polite"
    >
      <div class="ollama-status-main">
        <span class="ollama-status-dot" aria-hidden="true"></span>

        <span class="ollama-status-label">Ollama server</span>

        <strong class="ollama-status-value">
          {{
            isCheckingOllama ? "Checking…" : ollamaOnline ? "Online" : "Offline"
          }}
        </strong>

        <span class="ollama-status-description">
          {{
            isCheckingOllama
              ? "Checking connection"
              : ollamaOnline
                ? "Ready for prompt generation"
                : "Check your connection settings"
          }}
        </span>
      </div>

      <div
        v-if="ollamaOnline && availableModels.length"
        class="ollama-model-picker"
        role="radiogroup"
        aria-label="Model for prompt generation"
      >
        <span class="ollama-model-picker-label">Prompt model</span>

        <button
          v-for="model in availableModels"
          :key="model"
          class="ollama-model-option"
          :class="{ selected: model === selectedModel }"
          type="button"
          role="radio"
          :aria-checked="model === selectedModel"
          :title="`Use ${model} for prompt generation`"
          @click="selectedModel = model"
        >
          <span class="ollama-model-checkbox" aria-hidden="true">
            <IconCheck
              v-if="model === selectedModel"
              :size="11"
              :stroke-width="2.5"
            />
          </span>

          <span class="ollama-model-name">{{ model }}</span>
        </button>
      </div>

      <div
        v-else-if="ollamaOnline && !isCheckingOllama"
        class="ollama-no-models"
      >
        No models installed
      </div>
    </div>

    <div class="prompts-layout">
      <aside class="prompts-sidebar">
        <button
          v-for="prompt in prompts"
          :key="prompt.id"
          type="button"
          class="prompt-list-item"
          :class="{ active: prompt.id === selectedId }"
          @click="selectPrompt(prompt.id)"
        >
          <span class="prompt-list-title">{{ prompt.title }}</span>
          <span class="prompt-list-desc">{{ prompt.description }}</span>
        </button>

        <p v-if="prompts.length === 0" class="prompts-sidebar-empty">
          No prompts yet.
        </p>
      </aside>

      <section class="prompts-main">
        <form v-if="isEditing" class="prompt-form" @submit.prevent="savePrompt">
          <div class="ai-generate-row">
            <IconSparkles :size="16" :stroke-width="2" aria-hidden="true" />
            <input
              v-model="aiTopic"
              type="text"
              placeholder="Describe what the prompt should do…"
              @keydown.enter.prevent="generatePromptWithAI"
            />
            <span
              :title="
                !ollamaOnline
                  ? 'Ollama is offline. Check your connection settings.'
                  : !aiTopic.trim()
                    ? 'Describe what the prompt should do first.'
                    : 'Generate a prompt with Ollama'
              "
            >
              <button
                class="btn-secondary"
                type="button"
                :disabled="isGeneratingAI || !ollamaOnline || !aiTopic.trim()"
                @click="generatePromptWithAI"
              >
                <IconLoader
                  v-if="isGeneratingAI"
                  :size="14"
                  :stroke-width="2"
                  aria-hidden="true"
                />
                <span v-else>
                  {{ ollamaOnline ? "Generate" : "Ollama offline" }}
                </span>
              </button>
            </span>
          </div>
          <p v-if="aiError" class="prompt-form-error">{{ aiError }}</p>

          <label class="prompt-form-field">
            <span>Title</span>
            <input
              v-model="draft.title"
              type="text"
              placeholder="Prompt title"
              required
            />
          </label>

          <label class="prompt-form-field">
            <span>Description</span>
            <textarea
              v-model="draft.description"
              rows="2"
              placeholder="What is this prompt for?"
            ></textarea>
          </label>

          <div
            v-for="(variant, index) in draft.variants"
            :key="index"
            class="prompt-form-field"
          >
            <div class="variant-row">
              <input
                v-model="variant.label"
                type="text"
                class="variant-label-input"
              />
              <button
                v-if="draft.variants.length > 1"
                class="icon-btn"
                type="button"
                aria-label="Remove variant"
                @click="removeVariant(index)"
              >
                <IconX :size="14" :stroke-width="2" aria-hidden="true" />
              </button>
            </div>
            <textarea
              v-model="variant.content"
              rows="6"
              placeholder="Prompt text…"
            ></textarea>
          </div>

          <button class="btn-secondary" type="button" @click="addVariant">
            <IconPlus :size="14" :stroke-width="2" aria-hidden="true" />
            Add variant
          </button>

          <div class="prompt-form-actions">
            <button class="btn-secondary" type="button" @click="cancelEdit">
              Cancel
            </button>
            <button class="btn-primary" type="submit">Save prompt</button>
          </div>
        </form>

        <div v-else-if="selectedPrompt" class="prompt-detail">
          <div class="prompt-detail-header">
            <h2>{{ selectedPrompt.title }}</h2>
            <div class="prompt-detail-actions">
              <button
                class="icon-btn"
                type="button"
                aria-label="Edit prompt"
                @click="startEdit(selectedPrompt)"
              >
                <IconEdit :size="14" :stroke-width="2" aria-hidden="true" />
              </button>
              <button
                class="icon-btn"
                type="button"
                aria-label="Delete prompt"
                @click="deletePrompt(selectedPrompt.id)"
              >
                <IconX :size="14" :stroke-width="2" aria-hidden="true" />
              </button>
            </div>
          </div>

          <p v-if="selectedPrompt.description" class="prompt-detail-desc">
            {{ selectedPrompt.description }}
          </p>

          <div
            v-for="(variant, index) in selectedPrompt.variants"
            :key="index"
            class="prompt-variant"
          >
            <div class="prompt-variant-header">
              <span>{{ variant.label }}</span>
              <button
                class="icon-btn"
                type="button"
                :title="copiedPromptIndex === index ? 'Copied!' : 'Copy prompt'"
                @click="copyVariant(variant.content, index)"
              >
                <IconCheck
                  v-if="copiedPromptIndex === index"
                  :size="14"
                  :stroke-width="2"
                  aria-hidden="true"
                />
                <IconCopy
                  v-else
                  :size="14"
                  :stroke-width="2"
                  aria-hidden="true"
                />
              </button>
            </div>
            <pre class="prompt-variant-content">{{ variant.content }}</pre>
          </div>
        </div>

        <div v-else class="prompts-empty-state">
          <IconSparkles :size="32" :stroke-width="1.5" aria-hidden="true" />
          <h3>No prompt selected</h3>
          <p>Select a prompt from the list or create a new one.</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useOllamaApi } from "@/services/ollamaApiService";

import IconPlus from "@/components/icons/IconPlus.vue";
import IconEdit from "@/components/icons/IconEdit.vue";
import IconX from "@/components/icons/IconX.vue";
import IconCopy from "@/components/icons/IconCopy.vue";
import IconCheck from "@/components/icons/IconCheck.vue";
import IconSparkles from "@/components/icons/IconSparkles.vue";
import IconLoader from "@/components/icons/IconLoader.vue";
import IconPrompt from "@/components/icons/IconPrompt.vue";

const ollama = useOllamaApi();

const STORAGE_KEY = "app.prompts.v1";

const prompts = ref(loadPrompts());
const selectedId = ref(prompts.value[0]?.id ?? null);
const isEditing = ref(false);
const isGeneratingAI = ref(false);
const aiError = ref("");
const aiTopic = ref("");
const copiedPromptIndex = ref(null);
const draft = ref(createEmptyDraft());

const ollamaOnline = ref(false);
const isCheckingOllama = ref(true);
let ollamaStatusInterval = null;
const availableModels = ref([]);
const selectedModel = ref(ollama.getSelectedModel() || "");

const selectedPrompt = computed(
  () => prompts.value.find((p) => p.id === selectedId.value) ?? null,
);

async function refreshOllamaStatus() {
  isCheckingOllama.value = true;

  try {
    ollamaOnline.value = await ollama.statusBool();

    if (ollamaOnline.value) {
      await loadAvailableModels();
    } else {
      availableModels.value = [];
    }
  } catch {
    ollamaOnline.value = false;
    availableModels.value = [];
  } finally {
    isCheckingOllama.value = false;
  }
}

async function loadAvailableModels() {
  if (!ollamaOnline.value) {
    availableModels.value = [];
    return;
  }

  try {
    availableModels.value = await ollama.getAllModelsNames();

    if (
      !selectedModel.value ||
      !availableModels.value.includes(selectedModel.value)
    ) {
      selectedModel.value = availableModels.value[0] || "";
    }
  } catch {
    availableModels.value = [];
  }
}

function loadPrompts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
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
    variants: [{ label: "Default", content: "" }],
  };
}

function selectPrompt(id) {
  selectedId.value = id;
  isEditing.value = false;
}

function startNewPrompt() {
  draft.value = createEmptyDraft();
  aiTopic.value = "";
  aiError.value = "";
  selectedId.value = null;
  isEditing.value = true;
}

function startEdit(prompt) {
  draft.value = JSON.parse(JSON.stringify(prompt));
  selectedId.value = prompt.id;
  isEditing.value = true;
}

function cancelEdit() {
  isEditing.value = false;
  aiError.value = "";
}

function addVariant() {
  draft.value.variants.push({
    label: `Variant ${draft.value.variants.length + 1}`,
    content: "",
  });
}

function removeVariant(index) {
  draft.value.variants.splice(index, 1);
}

function savePrompt() {
  if (!draft.value.title.trim()) return;

  if (draft.value.id) {
    const idx = prompts.value.findIndex((p) => p.id === draft.value.id);
    if (idx !== -1) prompts.value[idx] = { ...draft.value };
  } else {
    const newPrompt = {
      ...draft.value,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    prompts.value.unshift(newPrompt);
    selectedId.value = newPrompt.id;
  }

  persistPrompts();
  isEditing.value = false;
}

function deletePrompt(id) {
  prompts.value = prompts.value.filter((p) => p.id !== id);
  if (selectedId.value === id) selectedId.value = prompts.value[0]?.id ?? null;
  persistPrompts();
}

async function copyVariant(content, index) {
  await navigator.clipboard.writeText(content);
  copiedPromptIndex.value = index;
  setTimeout(() => (copiedPromptIndex.value = null), 1500);
}

const META_PROMPT = `You are an expert prompt engineer. Given a short topic or goal description, write a single, well-structured, production-ready prompt for a large language model. The prompt should be clear, specific, include relevant context, constraints, and desired output format. Respond with ONLY the prompt text itself, no explanations, no markdown formatting, no quotes around it.

Topic/goal: `;

async function generatePromptWithAI() {
  const topic = aiTopic.value.trim();

  if (!ollamaOnline.value) {
    aiError.value = "Ollama is offline. Check your connection settings.";
    return;
  }

  const model = selectedModel.value;

  if (!topic) return;

  if (!model) {
    aiError.value = "No Ollama model selected. Pick one in Settings first.";
    return;
  }

  isGeneratingAI.value = true;
  aiError.value = "";

  try {
    const result = await ollama.generateResponse(
      model,
      META_PROMPT + topic,
    );

    if (result === null) throw new Error("Empty response");

    if (!draft.value.title.trim()) {
      draft.value.title = topic;
    }

    draft.value.variants[0].content = result.trim();
  } catch {
    ollamaOnline.value = false;
    aiError.value =
      "Could not reach Ollama. Check the API address in Settings.";
  } finally {
    isGeneratingAI.value = false;
  }
}

onMounted(() => {
  refreshOllamaStatus();

  ollamaStatusInterval = window.setInterval(refreshOllamaStatus, 15_000);
});

onUnmounted(() => {
  if (ollamaStatusInterval) {
    window.clearInterval(ollamaStatusInterval);
  }
});
</script>

<style scoped>
.prompts-view {
  height: 100%;
  overflow-y: auto;
  padding: var(--space-8) var(--space-6);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  max-width: var(--max-width);
  gap: 1rem;
  margin-bottom: 2rem;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.header-icon {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 22%, transparent);
  border-radius: 14px;
}

.eyebrow {
  margin: 0 0 0.25rem;
  color: var(--color-text-faint);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 0;
  color: var(--color-text);
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.header-description {
  margin: 0.5rem 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  line-height: 1.55;
}

.btn-primary,
.btn-secondary,
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-family: inherit;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease,
    transform 0.16s ease;
}

.btn-primary,
.btn-secondary {
  min-height: 38px;
  padding: 0.55rem 0.85rem;
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  white-space: nowrap;
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

.btn-secondary {
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-surface-2);
  border-color: color-mix(
    in srgb,
    var(--color-primary) 35%,
    var(--color-border)
  );
}

.btn-primary:active:not(:disabled),
.btn-secondary:active:not(:disabled),
.icon-btn:active {
  transform: translateY(1px);
}

.btn-primary:disabled,
.btn-secondary:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.btn-primary:focus-visible,
.btn-secondary:focus-visible,
.icon-btn:focus-visible,
.prompt-list-item:focus-visible {
  position: relative;
  z-index: 1;
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.prompts-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  max-width: var(--max-width);
  min-height: 530px;
  gap: 0.85rem;
}

.prompts-sidebar,
.prompts-main {
  min-width: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.025);
}

.prompts-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 650px;
  padding: 0.45rem;
  overflow-y: auto;
}

.prompt-list-item {
  display: grid;
  gap: 0.2rem;
  width: 100%;
  min-width: 0;
  padding: 0.7rem 0.75rem;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  transition:
    background 0.16s ease,
    border-color 0.16s ease;
}

.prompt-list-item:hover {
  background: var(--color-surface-2);
}

.prompt-list-item.active {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-color: color-mix(
    in srgb,
    var(--color-primary) 24%,
    var(--color-border)
  );
}

.prompt-list-title {
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prompt-list-desc {
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prompts-sidebar-empty {
  margin: auto 0;
  padding: 1rem;
  color: var(--color-text-faint);
  font-size: var(--text-xs);
  text-align: center;
}

.prompts-main {
  min-height: 530px;
  padding: 1.25rem;
  overflow-y: auto;
}

.prompt-form,
.prompt-detail {
  display: grid;
  width: min(100%, 820px);
  gap: 1rem;
  margin: 0 auto;
}

.ai-generate-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
  border: 1px solid
    color-mix(in srgb, var(--color-primary) 24%, var(--color-border));
  border-radius: var(--radius-md);
}

.ai-generate-row input {
  min-width: 0;
  padding: 0.45rem 0;
  color: var(--color-text);
  font: inherit;
  font-size: var(--text-xs);
  background: transparent;
  border: 0;
  outline: none;
}

.ai-generate-row input::placeholder {
  color: var(--color-text-faint);
}

.ai-generate-row .btn-secondary {
  min-height: 30px;
  padding: 0.4rem 0.65rem;
}

.prompt-form-error {
  margin: -0.35rem 0 0;
  color: var(--color-error);
  font-size: var(--text-xs);
  line-height: 1.45;
}

.prompt-form-field {
  display: grid;
  gap: 0.4rem;
}

.prompt-form-field > span {
  color: var(--color-text);
  font-size: var(--text-xs);
  font-weight: 650;
}

.prompt-form input,
.prompt-form textarea {
  box-sizing: border-box;
  width: 100%;
  color: var(--color-text);
  font: inherit;
  font-size: var(--text-sm);
  line-height: 1.5;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease;
}

.prompt-form input {
  min-height: 38px;
  padding: 0.55rem 0.7rem;
}

.prompt-form textarea {
  display: block;
  min-height: 90px;
  padding: 0.65rem 0.7rem;
  resize: vertical;
}

.prompt-form input::placeholder,
.prompt-form textarea::placeholder {
  color: var(--color-text-faint);
}

.prompt-form input:focus,
.prompt-form textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--color-primary) 14%, transparent);
}

.variant-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.variant-label-input {
  flex: 1;
  min-width: 0;
  font-weight: 600;
}

.icon-btn {
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  padding: 0;
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 9px;
}

.icon-btn:hover {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 9%, var(--color-surface));
  border-color: color-mix(
    in srgb,
    var(--color-primary) 30%,
    var(--color-border)
  );
}

.prompt-form > .btn-secondary {
  justify-self: start;
}

.prompt-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.55rem;
  padding-top: 1rem;
  margin-top: 0.1rem;
  border-top: 1px solid var(--color-border);
}

.prompt-detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.prompt-detail-header h2 {
  margin: 0;
  overflow: hidden;
  color: var(--color-text);
  font-size: clamp(1.2rem, 2vw, 1.5rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prompt-detail-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 0.4rem;
}

.prompt-detail-actions .icon-btn:last-child:hover {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 8%, var(--color-surface));
  border-color: color-mix(in srgb, var(--color-error) 28%, var(--color-border));
}

.prompt-detail-desc {
  margin: -0.35rem 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  line-height: 1.55;
}

.prompt-variant {
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.prompt-variant-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 42px;
  padding: 0.35rem 0.45rem 0.35rem 0.85rem;
  background: var(--color-surface-2);
  border-bottom: 1px solid var(--color-border);
}

.prompt-variant-header > span {
  overflow: hidden;
  color: var(--color-text);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.prompt-variant-content {
  max-height: 340px;
  padding: 0.85rem 1rem;
  margin: 0;
  overflow: auto;
  color: var(--color-text);
  font-family: "Fira Code", ui-monospace, SFMono-Regular, monospace;
  font-size: 0.76rem;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--color-surface);
}

.prompts-empty-state {
  display: grid;
  place-content: center;
  min-height: 100%;
  padding: 2rem;
  color: var(--color-text-muted);
  text-align: center;
}

.prompts-empty-state h3 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 650;
}

.prompts-empty-state p {
  max-width: 280px;
  margin: 0.3rem 0 0;
  font-size: var(--text-xs);
  line-height: 1.5;
}

.ollama-status {
  display: grid;
  max-width: var(--max-width);
  gap: 0.6rem;
  padding: 0.65rem 0.75rem;
  margin: -1rem 0 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.ollama-status-main {
  display: grid;
  grid-template-columns: auto auto auto minmax(0, 1fr);
  align-items: center;
  gap: 0.45rem;
  min-height: 24px;
}

.ollama-status-dot {
  width: 7px;
  height: 7px;
  background: var(--color-error);
  border-radius: 50%;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-error) 13%, transparent);
}

.ollama-status.online .ollama-status-dot {
  background: var(--color-success, #22c55e);
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--color-success, #22c55e) 13%, transparent);
}

.ollama-status.checking .ollama-status-dot {
  background: var(--color-primary);
  animation: status-pulse 1.2s ease-in-out infinite;
}

.ollama-status-label {
  color: var(--color-text-faint);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.ollama-status-value {
  color: var(--color-error);
  font-size: var(--text-xs);
  font-weight: 650;
}

.ollama-status.online .ollama-status-value {
  color: var(--color-success, #22c55e);
}

.ollama-status.checking .ollama-status-value {
  color: var(--color-primary);
}

.ollama-status-description {
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: 10px;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ollama-model-label {
  max-width: 220px;
  padding: 0.2rem 0.45rem;
  overflow: hidden;
  color: var(--color-primary);
  font-family: "Fira Code", ui-monospace, SFMono-Regular, monospace;
  font-size: 10px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border: 1px solid
    color-mix(in srgb, var(--color-primary) 24%, var(--color-border));
  border-radius: var(--radius-full, 999px);
}

.ollama-model-selected {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 220px;
  gap: 0.35rem;
  padding: 0.2rem 0.45rem 0.2rem 0.25rem;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border: 1px solid
    color-mix(in srgb, var(--color-primary) 24%, var(--color-border));
  border-radius: var(--radius-full, 999px);
}

.ollama-model-check {
  display: grid;
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  place-items: center;
  color: #fff;
  background: var(--color-primary);
  border-radius: 5px;
}

.ollama-model-name {
  min-width: 0;
  overflow: hidden;
  font-family: "Fira Code", ui-monospace, SFMono-Regular, monospace;
  font-size: 10px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ollama-model-picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  max-height: 112px;
  gap: 0.4rem;
  padding-top: 0.6rem;
  overflow-y: auto;
  border-top: 1px solid var(--color-border);
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}

.ollama-model-option {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 180px;
  gap: 0.35rem;
  padding: 0.2rem 0.45rem 0.2rem 0.25rem;
  color: var(--color-text-muted);
  font: inherit;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full, 999px);
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease;
}

.ollama-model-option:hover {
  color: var(--color-primary);
  border-color: color-mix(
    in srgb,
    var(--color-primary) 30%,
    var(--color-border)
  );
}

.ollama-model-option.selected {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-color: color-mix(
    in srgb,
    var(--color-primary) 28%,
    var(--color-border)
  );
}

.ollama-model-checkbox {
  display: grid;
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
  place-items: center;
  color: transparent;
  border: 1px solid var(--color-text-faint);
  border-radius: 4px;
}

.ollama-model-option.selected .ollama-model-checkbox {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.ollama-model-name {
  min-width: 0;
  overflow: hidden;
  font-family: "Fira Code", ui-monospace, SFMono-Regular, monospace;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ollama-model-option:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.ollama-model-picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--color-border);
}

.ollama-model-picker-label {
  margin-right: 0.15rem;
  color: var(--color-text-faint);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.ollama-model-option {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 190px;
  gap: 0.4rem;
  padding: 0.3rem 0.55rem 0.3rem 0.35rem;
  color: var(--color-text-muted);
  font: inherit;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full, 999px);
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease,
    transform 0.16s ease;
}

.ollama-model-option:hover {
  color: var(--color-primary);
  border-color: color-mix(
    in srgb,
    var(--color-primary) 30%,
    var(--color-border)
  );
}

.ollama-model-option:active {
  transform: translateY(1px);
}

.ollama-model-option.selected {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-color: color-mix(
    in srgb,
    var(--color-primary) 30%,
    var(--color-border)
  );
}

.ollama-model-option:focus-visible {
  position: relative;
  z-index: 1;
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.ollama-model-checkbox {
  display: grid;
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
  place-items: center;
  color: transparent;
  border: 1px solid var(--color-text-faint);
  border-radius: 4px;
}

.ollama-model-option.selected .ollama-model-checkbox {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.ollama-model-name {
  min-width: 0;
  overflow: hidden;
  font-family: "Fira Code", ui-monospace, SFMono-Regular, monospace;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ollama-no-models {
  padding-top: 0.6rem;
  color: var(--color-text-faint);
  font-size: var(--text-xs);
  border-top: 1px solid var(--color-border);
}

@media (max-width: 760px) {
  .prompts-view {
    padding: 0.85rem 0.75rem 1.5rem;
  }

  .page-header {
    flex-direction: column;
    gap: 0.85rem;
    margin-bottom: 1rem;
  }

  .page-heading {
    gap: 0.6rem;
  }

  .header-icon {
    width: 34px;
    height: 34px;
    border-radius: 11px;
  }

  .eyebrow {
    font-size: 0.62rem;
  }

  .page-header h1 {
    font-size: 1.4rem;
  }

  .header-description {
    margin-top: 0.3rem;
    font-size: 12px;
  }

  .page-header .btn-primary {
    width: 100%;
    min-height: 34px;
    font-size: 11px;
  }

  .prompts-layout {
    grid-template-columns: 1fr;
    min-height: 0;
    gap: 0.6rem;
  }

  .prompts-sidebar {
    max-height: 185px;
    padding: 0.35rem;
    border-radius: var(--radius-md);
  }

  .prompt-list-item {
    padding: 0.55rem 0.65rem;
  }

  .prompt-list-title {
    font-size: 12px;
  }

  .prompt-list-desc {
    font-size: 10px;
  }

  .prompts-main {
    min-height: 420px;
    padding: 0.85rem;
    overflow: visible;
    border-radius: var(--radius-md);
  }

  .prompt-form,
  .prompt-detail {
    gap: 0.75rem;
  }

  .ai-generate-row {
    gap: 0.45rem;
    padding: 0.4rem;
  }

  .ai-generate-row input {
    font-size: 11px;
  }

  .ai-generate-row .btn-secondary {
    min-height: 28px;
    padding: 0.35rem 0.5rem;
    font-size: 10px;
  }

  .prompt-form-field {
    gap: 0.3rem;
  }

  .prompt-form-field > span {
    font-size: 11px;
  }

  .prompt-form input {
    min-height: 34px;
    padding: 0.45rem 0.55rem;
    font-size: 12px;
  }

  .prompt-form textarea {
    min-height: 78px;
    padding: 0.55rem;
    font-size: 12px;
  }

  .btn-primary,
  .btn-secondary {
    min-height: 34px;
    padding: 0.45rem 0.65rem;
    font-size: 11px;
  }

  .icon-btn {
    width: 28px;
    height: 28px;
    border-radius: 8px;
  }

  .prompt-form-actions {
    gap: 0.45rem;
    padding-top: 0.75rem;
  }

  .prompt-detail-header {
    padding-bottom: 0.75rem;
  }

  .prompt-detail-header h2 {
    font-size: 1.1rem;
  }

  .prompt-detail-desc {
    font-size: 12px;
  }

  .prompt-variant-header {
    min-height: 36px;
    padding-left: 0.7rem;
  }

  .prompt-variant-header > span {
    font-size: 0.6rem;
  }

  .prompt-variant-content {
    max-height: 250px;
    padding: 0.7rem;
    font-size: 11px;
  }

  .prompts-empty-state {
    min-height: 300px;
    padding: 1.5rem;
  }

  .prompts-empty-state h3 {
    font-size: 12px;
  }

  .prompts-empty-state p {
    font-size: 11px;
  }

  .ollama-status {
    gap: 0.45rem;
    padding: 0.5rem 0.6rem;
    margin: -0.35rem 0 0.6rem;
  }

  .ollama-status-main {
    grid-template-columns: auto auto 1fr;
    gap: 0.35rem;
  }

  .ollama-status-description {
    display: none;
  }

  .ollama-status-label {
    font-size: 0.58rem;
  }

  .ollama-status-value {
    font-size: 10px;
  }

  .ollama-model-picker {
    max-height: 138px;
    gap: 0.3rem;
    padding-top: 0.5rem;
  }

  .ollama-model-picker-label {
    width: 100%;
    margin-bottom: 0.05rem;
    font-size: 0.58rem;
  }

  .ollama-model-option {
    max-width: 100%;
    padding: 0.28rem 0.45rem 0.28rem 0.3rem;
  }
}

@media (max-width: 420px) {
  .ai-generate-row {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .ai-generate-row .btn-secondary {
    grid-column: 1 / -1;
    width: 100%;
  }

  .prompt-form-actions {
    flex-direction: column-reverse;
  }

  .prompt-form-actions .btn-primary,
  .prompt-form-actions .btn-secondary {
    width: 100%;
  }

  .ollama-status {
    grid-template-columns: auto auto 1fr;
    min-height: 32px;
    padding: 0.35rem 0.5rem;
    margin: -0.35rem 0 0.6rem;
  }

  .ollama-status-label {
    font-size: 0.58rem;
  }

  .ollama-status-value {
    font-size: 10px;
  }

  .ollama-status-description {
    display: none;
  }
}

/* iOS Safari: at least 16px prevents input auto-zoom */
@media (pointer: coarse) {
  .ai-generate-row input,
  .prompt-form input,
  .prompt-form textarea {
    font-size: 16px;
  }
}
</style>
