<!-- src/views/SettingsView.vue -->

<template>
  <div class="settings-view">
    <header class="page-header">
      <h1>Settings</h1>
    </header>

    <div class="settings-content">
      <!-- Connection -->
      <section class="card">
        <h2>Connection</h2>

        <label class="field-label" for="api-url">API-URL</label>
        <div class="input-row">
          <input
            id="api-url"
            v-model="settingsStore.apiUrl"
            class="input"
            placeholder="http://localhost:11434"
          />
          <button
            class="btn-primary"
            :disabled="isChecking"
            @click="handleTest"
          >
            {{ isChecking ? "Checking…" : "Test" }}
          </button>
        </div>

        <div class="status-row">
          <span class="status-dot" :class="statusClass"></span>
          <span class="status-text">{{ statusLabel }}</span>
          <span v-if="settingsStore.ollamaVersion" class="version-text">
            v{{ settingsStore.ollamaVersion }}
          </span>
        </div>
      </section>

      <!-- Appearance -->
      <section class="card">
        <h2>Appearance</h2>
        <div class="toggle-row">
          <span class="field-label">Theme</span>
          <button class="theme-switch" @click="themeStore.toggle()">
            <span :class="{ active: themeStore.theme === 'light' }">Light</span>
            <span :class="{ active: themeStore.theme === 'dark' }">Dark</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useSettingsStore } from "@/stores/settingsStore";
import { useThemeStore } from "@/stores/themeStore";

const settingsStore = useSettingsStore();
const themeStore = useThemeStore();

const isChecking = computed( () =>
  settingsStore.connectionStatus === "checking",
);

const statusClass = computed( () => ({
  connected: settingsStore.connectionStatus === "connected",
  error: settingsStore.connectionStatus === "error",
  unknown: settingsStore.connectionStatus === "unknown" || isChecking.value,
}));

const statusLabel = computed(() => {
  switch (settingsStore.connectionStatus) {
    case "connected":
      return "Connected";
    case "error":
      return "Not reachable";
    case "checking":
      return "Checking connection…";
    default:
      return "Not checked yet";
  }
});

async function handleTest() {
  await settingsStore.testConnection();
}

onMounted(() => {
  settingsStore.startPolling();
});

onUnmounted(() => {
  settingsStore.stopPolling();
});
</script>

<style scoped>
.settings-view {
  height: 100%;
  overflow-y: auto;
  padding: var(--space-8) var(--space-6);
}

.page-header {
  margin-bottom: var(--space-6);
}

.page-header h1 {
  font-size: var(--font-size-xl);
  font-weight: 700;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: 560px;
}

.card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

.card h2 {
  font-size: var(--text-sm);
  font-weight: 600;
  margin-bottom: var(--space-3);
}

.field-label {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
}

.input-row {
  display: flex;
  gap: var(--space-2);
}

.input {
  flex: 1;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-text);
  outline: none;
}

.input:focus {
  border-color: var(--color-primary);
}

.btn-primary {
  padding: var(--space-2) var(--space-4);
  background-color: var(--color-primary);
  color: white;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  white-space: nowrap;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
  font-size: var(--text-sm);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text-faint);
}

.status-dot.connected {
  background: #6daa45;
}

.status-dot.error {
  background: var(--color-error);
}

.status-dot.unknown {
  background: var(--color-text-faint);
}

.status-text {
  color: var(--color-text-muted);
}

.version-text {
  color: var(--color-text-faint);
  font-size: var(--text-xs);
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.theme-switch {
  display: flex;
  border: 1px solid var(--color-surface-2);
  border-radius: var(--radius-full);
  padding: 2px;
}

.theme-switch span {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.theme-switch span.active {
  background-color: var(--color-surface);
  color: var(--color-text);
  font-weight: 600;
}
</style>
