<!-- src/views/SettingsView.vue -->

<template>
  <div class="settings-view">
    <header class="page-header">
      <h1>
        <span class="nav-icon"><IconSettings /></span> Settings
      </h1>
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

        <div class="network-info">
          <div class="info-row">
            <span class="info-label">App Host-IP</span>
            <span class="info-value mono">{{ hostIpLabel }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">App Host-Port</span>
            <span class="info-value mono">{{ hostPort }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Ollama Host</span>
            <span class="info-value mono">{{ settingsStore.ollamaHost }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Ollama Serve Port</span>
            <span class="info-value mono">{{ settingsStore.ollamaPort }}</span>
          </div>
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

      <!-- Model Defaults -->
      <section class="card">
        <div class="card-header">
          <h2>Model Defaults</h2>
          <button class="btn-reset" @click="settingsStore.resetModelDefaults()">
            Reset to Default
          </button>
        </div>

        <label class="field-label" for="default-model">Default Model</label>
        <select
          id="default-model"
          v-model="settingsStore.defaultModel"
          class="input"
        >
          <option value="">None</option>
          <option v-for="name in modelNames" :key="name" :value="name">
            {{ name }}
          </option>
        </select>

        <label class="field-label" for="default-temp"
          >Temperature ({{ settingsStore.temperature }})</label
        >
        <input
          id="default-temp"
          type="range"
          min="0"
          max="2"
          step="0.1"
          v-model.number="settingsStore.temperature"
          class="slider"
        />

        <label class="field-label" for="context-length"
          >Context Window (num_ctx)</label
        >
        <select
          id="context-length"
          v-model.number="settingsStore.numCtx"
          class="input"
        >
          <option :value="2048">2048</option>
          <option :value="4096">4096</option>
          <option :value="8192">8192</option>
          <option :value="16384">16384</option>
        </select>
      </section>

      <!-- Data Management -->
      <section class="card">
        <h2>Data Management</h2>

        <div class="toggle-row">
          <span class="field-label">Export all chats & projects</span>
          <button class="btn-secondary" @click="handleExportAllData">
            Export JSON
          </button>
        </div>

        <div class="toggle-row">
          <span class="field-label">Storage used</span>
          <span class="status-text">{{ storageUsedLabel }}</span>
        </div>

        <div class="toggle-row">
          <span class="field-label">Clear all chats</span>
          <button class="btn-danger" @click="handleClearAllData">
            Delete Everything
          </button>
        </div>
      </section>

      <!-- Model Behavior -->
      <section class="card">
        <div class="card-header">
          <h2>Model Behavior</h2>
          <button class="btn-reset" @click="settingsStore.resetModelBehavior()">
            Reset to Default
          </button>
        </div>

        <label class="field-label" for="keep-alive"
          >Keep model loaded after use</label
        >
        <select id="keep-alive" v-model="settingsStore.keepAlive" class="input">
          <option value="0">Unload immediately</option>
          <option value="5m">5 minutes</option>
          <option value="30m">30 minutes</option>
          <option value="-1">Keep loaded forever</option>
        </select>
      </section>

      <!-- Default System Prompt -->
      <section class="card">
        <div class="card-header">
          <h2>Default System Prompt</h2>
          <button class="btn-reset" @click="settingsStore.resetSystemPrompt()">
            Reset to Default
          </button>
        </div>

        <textarea
          v-model="settingsStore.defaultSystemPrompt"
          class="input textarea"
          placeholder="e.g. You are a senior developer. Always answer in German."
          rows="3"
        ></textarea>
      </section>

      <!-- About -->
      <section class="card about-card">
        <h2>About</h2>

        <p class="status-text">App Version 1.0.0</p>
        <p class="status-text">Built with Vue 3</p>
        <p class="status-link">
          <a href="https://github.com/beri336/locale-ai" target="_blank"
            >Link Source Code on GitHub</a
          >
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useSettingsStore } from "@/stores/settingsStore";
import { useThemeStore } from "@/stores/themeStore";
import { useOllamaStore } from "@/stores/useOllamaStore";
import IconSettings from "@/components/icons/IconSettings.vue";

const settingsStore = useSettingsStore();
const themeStore = useThemeStore();
const ollama = useOllamaStore();

const modelNames = ref([]);

const localIp = ref(null);
const hostIp = ref(window.location.hostname);
const hostPort = ref(
  window.location.port ||
    (window.location.protocol === "https:" ? "443" : "80"),
);

const isChecking = computed(
  () => settingsStore.connectionStatus === "checking",
);

const statusClass = computed(() => ({
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

onMounted(async () => {
  settingsStore.startPolling();
  modelNames.value = await ollama.getListOfModelsName();
  if (hostIp.value === "localhost") detectLocalIp();
});

onUnmounted(() => {
  settingsStore.stopPolling();
});

// Data Management
function calculateStorageUsage() {
  let total = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length;
    }
  }
  return (total / 1024).toFixed(1);
}

const storageUsedLabel = computed(() => `${calculateStorageUsage()} KB`);

function handleExportAllData() {
  const data = {
    chats: JSON.parse(localStorage.getItem("ollama-chats") || "[]"),
    projects: JSON.parse(localStorage.getItem("ollama-projects") || "[]"),
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ollama-backup-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function handleClearAllData() {
  if (
    !confirm(
      "Delete ALL chats and projects permanently? This cannot be undone.",
    )
  )
    return;
  localStorage.removeItem("ollama-chats");
  localStorage.removeItem("ollama-projects");
  location.reload();
}

function detectLocalIp() {
  try {
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel("");
    pc.createOffer().then((offer) => pc.setLocalDescription(offer));

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const match = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/.exec(
        event.candidate.candidate,
      );
      if (match && !match[1].startsWith("0.")) {
        localIp.value = match[1];
        pc.close();
      }
    };

    setTimeout(() => pc.close(), 1500);
  } catch (error) {
    console.warn("Local IP detection failed:", error);
    localIp.value = null;
  }
}

const hostIpLabel = computed(() => {
  if (hostIp.value !== "localhost") return hostIp.value;
  return localIp.value ? `localhost (${localIp.value})` : "localhost";
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
  padding: var(--space-1);
}

.status-link {
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}

.status-link a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-primary);
  font-size: var(--text-xs);
  font-weight: 500;
  text-decoration: none;
  transition: color 0.15s ease;
}

.status-link a::after {
  content: "↗";
  font-size: 11px;
  opacity: 0.7;
}

.status-link a:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
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

/* Page header styling */
.page-header h1 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* Nav icon SVG styling */
.nav-icon svg {
  width: 20px;
  height: 20px;
  display: block;
}

.slider {
  width: 100%;
  margin: var(--space-2) 0 var(--space-4) 0;
  accent-color: var(--color-primary);
}

select.input {
  cursor: pointer;
}

textarea.input.textarea {
  display: block;
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  min-height: 80px;
  max-width: 100%;
  font-family: inherit;
  line-height: 1.5;
}

.card > .field-label:not(:first-of-type) {
  margin-top: var(--space-4);
}

.btn-secondary {
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-2);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  cursor: pointer;
}

.btn-secondary:hover {
  background: var(--color-bg);
}

.btn-danger {
  padding: var(--space-2) var(--space-3);
  background: transparent;
  color: var(--color-error);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  cursor: pointer;
}

.btn-danger:hover {
  background: var(--color-error);
  color: white;
}

.about-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.about-card .status-text {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

/* Reset to Default button styling */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.card-header h2 {
  margin-bottom: 0;
}

.btn-reset {
  background: none;
  border: none;
  color: var(--color-text-faint);
  font-size: var(--text-xs);
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

.btn-reset:hover {
  color: var(--color-text-muted);
}

.network-info {
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

.network-info .info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-divider, var(--color-border));
  gap: var(--space-3);
}

.network-info .info-row:last-child {
  border-bottom: none;
}

.network-info .info-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-weight: 500;
  flex-shrink: 0;
}

.network-info .info-value {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text);
  text-align: right;
}

.network-info .info-value.mono {
  font-family: "JetBrains Mono", "SF Mono", monospace;
  font-weight: 500;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}
</style>
