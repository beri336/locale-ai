<!-- src/components/settings/Settings.vue -->

<template>
  <main class="settings-view">
    <header class="page-header">
      <div class="page-heading">
        <div class="header-icon" aria-hidden="true">
          <IconSettings />
        </div>

        <div>
          <p class="eyebrow">Configuration</p>
          <h1>Settings</h1>
          <p class="header-description">
            Configure your Ollama connection, model defaults and local data.
          </p>
        </div>
      </div>
    </header>

    <div class="settings-content">
      <!-- Connection -->
      <section class="settings-card connection-card">
        <div class="section-heading">
          <div>
            <p class="section-kicker">Ollama</p>
            <h2>Connection</h2>
            <p class="section-description">
              Set the address of the Ollama server this app should use.
            </p>
          </div>

          <span class="connection-badge" :class="statusClass">
            <span class="status-dot"></span>
            {{ statusLabel }}
          </span>
        </div>

        <label class="field-label" for="api-url">API URL</label>

        <div class="input-row">
          <input
            id="api-url"
            v-model="settingsStore.apiUrl"
            class="input"
            placeholder="http://localhost:11434"
            spellcheck="false"
          />

          <button
            class="btn-primary"
            :disabled="isChecking"
            @click="handleTest"
          >
            {{ isChecking ? "Checking…" : "Test connection" }}
          </button>
        </div>

        <p v-if="settingsStore.ollamaVersion" class="version-note">
          Connected to Ollama
          <strong>v{{ settingsStore.ollamaVersion }}</strong>
        </p>

        <div class="network-panel">
          <div class="network-panel-header">
            <span class="network-panel-icon" aria-hidden="true">⌘</span>
            <div>
              <h3>Network details</h3>
              <p>Useful when connecting from another device.</p>
            </div>
          </div>

          <div class="network-info">
            <div class="info-row">
              <span class="info-label">App host</span>
              <code class="info-value">{{ hostIpLabel }}</code>
            </div>

            <div class="info-row">
              <span class="info-label">App port</span>
              <code class="info-value">{{ hostPort }}</code>
            </div>

            <div class="info-row">
              <span class="info-label">Ollama host</span>
              <code class="info-value">{{ settingsStore.ollamaHost }}</code>
            </div>

            <div class="info-row">
              <span class="info-label">Ollama port</span>
              <code class="info-value">{{ settingsStore.ollamaPort }}</code>
            </div>
          </div>
        </div>
      </section>

      <!-- Appearance -->
      <section class="settings-card">
        <div class="section-heading compact">
          <div>
            <p class="section-kicker">Interface</p>
            <h2>Appearance</h2>
            <p class="section-description">
              Choose the preferred color theme for the app.
            </p>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-copy">
            <span class="setting-label">Color theme</span>
            <span class="setting-hint"
              >Switch between light and dark mode.</span
            >
          </div>

          <button
            class="theme-switch"
            type="button"
            aria-label="Toggle app theme"
            @click="themeStore.toggle()"
          >
            <span :class="{ active: themeStore.theme === 'light' }">Light</span>
            <span :class="{ active: themeStore.theme === 'dark' }">Dark</span>
          </button>
        </div>
      </section>

      <!-- Model Defaults -->
      <section class="settings-card">
        <div class="section-heading compact">
          <div>
            <p class="section-kicker">Generation</p>
            <h2>Model defaults</h2>
            <p class="section-description">
              These values are applied to new chats by default.
            </p>
          </div>

          <button
            class="btn-reset"
            type="button"
            @click="settingsStore.resetModelDefaults()"
          >
            Reset
          </button>
        </div>

        <div class="settings-fields">
          <div class="field-group">
            <label class="field-label" for="default-model">Default model</label>
            <select
              id="default-model"
              v-model="settingsStore.defaultModel"
              class="input"
            >
              <option value="">No default model</option>
              <option v-for="name in modelNames" :key="name" :value="name">
                {{ name }}
              </option>
            </select>
          </div>

          <div class="field-group">
            <div class="label-row">
              <label class="field-label" for="default-temp">Temperature</label>
              <output class="range-value">{{
                settingsStore.temperature
              }}</output>
            </div>

            <input
              id="default-temp"
              v-model.number="settingsStore.temperature"
              class="slider"
              type="range"
              min="0"
              max="2"
              step="0.1"
            />

            <p class="field-hint">
              Lower values are more predictable; higher values are more
              creative.
            </p>
          </div>

          <div class="field-group">
            <label class="field-label" for="context-length">
              Context window
            </label>

            <select
              id="context-length"
              v-model.number="settingsStore.numCtx"
              class="input"
            >
              <option :value="2048">2,048 tokens</option>
              <option :value="4096">4,096 tokens</option>
              <option :value="8192">8,192 tokens</option>
              <option :value="16384">16,384 tokens</option>
            </select>

            <p class="field-hint">
              A larger context preserves more conversation history but needs
              more memory.
            </p>
          </div>
        </div>
      </section>

      <!-- Model Behavior -->
      <section class="settings-card">
        <div class="section-heading compact">
          <div>
            <p class="section-kicker">Performance</p>
            <h2>Model behavior</h2>
            <p class="section-description">
              Control how long Ollama keeps a model loaded in memory.
            </p>
          </div>

          <button
            class="btn-reset"
            type="button"
            @click="settingsStore.resetModelBehavior()"
          >
            Reset
          </button>
        </div>

        <label class="field-label" for="keep-alive">
          Keep model loaded after use
        </label>

        <select id="keep-alive" v-model="settingsStore.keepAlive" class="input">
          <option value="0">Unload immediately</option>
          <option value="5m">Keep loaded for 5 minutes</option>
          <option value="30m">Keep loaded for 30 minutes</option>
          <option value="-1">Keep loaded until manually unloaded</option>
        </select>
      </section>

      <!-- Default System Prompt -->
      <section class="settings-card">
        <div class="section-heading compact">
          <div>
            <p class="section-kicker">Instructions</p>
            <h2>Default system prompt</h2>
            <p class="section-description">
              Add instructions automatically to every new model request.
            </p>
          </div>

          <button
            class="btn-reset"
            type="button"
            @click="settingsStore.resetSystemPrompt()"
          >
            Reset
          </button>
        </div>

        <textarea
          v-model="settingsStore.defaultSystemPrompt"
          class="input textarea"
          placeholder="For example: You are a senior developer. Always answer in German."
          rows="4"
        ></textarea>

        <p class="field-hint">
          The active prompt is shown in the chat toolbar.
        </p>
      </section>

      <!-- Weather -->
      <section class="settings-card">
        <div class="section-heading compact">
          <div>
            <p class="section-kicker">Dashboard</p>
            <h2>Weather</h2>
            <p class="section-description">
              Choose the city shown on your dashboard.
            </p>
          </div>
        </div>

        <div class="field-group">
          <label class="field-label" for="weather-city">Current city</label>

          <div class="input-row weather-city-row">
            <input
              id="weather-city"
              v-model="weatherCityInput"
              class="input"
              type="text"
              placeholder="e.g. Stuttgart"
              autocomplete="address-level2"
              @keyup.enter="saveWeatherCity"
            />

            <button class="btn-primary" type="button" @click="saveWeatherCity">
              Save
            </button>
          </div>

          <p class="field-hint">
            Default: Stuttgart. The city name is only used to load weather data.
          </p>
        </div>
      </section>

      <!-- Temporary chats -->
      <section class="settings-card">
        <div class="section-heading compact">
          <div>
            <p class="section-kicker">Privacy</p>
            <h2>Temporary chats</h2>
            <p class="section-description">
              Set how long new temporary chats remain available.
            </p>
          </div>

          <button
            class="btn-reset"
            type="button"
            :disabled="settingsStore.temporaryChatDurationHours === 4"
            @click="resetTemporaryChatDuration"
          >
            Reset
          </button>
        </div>

        <div class="field-group">
          <label class="field-label" for="temporary-chat-duration">
            Default duration
          </label>

          <select
            id="temporary-chat-duration"
            v-model="temporaryChatDuration"
            class="input temporary-duration-select"
          >
            <option
              v-for="duration in temporaryChatDurations"
              :key="duration"
              :value="duration"
            >
              {{ duration }} {{ duration === 1 ? "hour" : "hours" }}
            </option>
          </select>

          <p class="field-hint">
            Existing temporary chats retain their original expiry time.
          </p>
        </div>
      </section>

      <!-- Data Management -->
      <section class="settings-card">
        <div class="section-heading compact">
          <div>
            <p class="section-kicker">Storage</p>
            <h2>Data management</h2>
            <p class="section-description">
              Create a local backup or restore your chats, projects and
              settings.
            </p>
          </div>
        </div>

        <div class="backup-actions">
          <div class="backup-action">
            <div class="backup-action-copy">
              <h3>Export backup</h3>
              <p>Save chats, projects and settings as one JSON file.</p>
            </div>

            <button
              class="btn-secondary"
              type="button"
              @click="handleExportBackup"
            >
              Export JSON
            </button>
          </div>

          <div class="backup-action">
            <div class="backup-action-copy">
              <h3>Import backup</h3>
              <p>Restore a LocalAI JSON backup on this browser.</p>
            </div>

            <button
              class="btn-secondary"
              type="button"
              @click="triggerImportBackup"
            >
              Import JSON
            </button>

            <input
              ref="backupFileInput"
              class="visually-hidden"
              type="file"
              accept="application/json,.json"
              @change="handleImportBackup"
            />
          </div>
        </div>

        <p v-if="backupStatus" class="backup-feedback success">
          {{ backupStatus }}
        </p>

        <p v-if="backupError" class="backup-feedback error">
          {{ backupError }}
        </p>

        <div class="data-divider"></div>

        <div class="data-danger-heading">
          <div>
            <p class="section-kicker danger-kicker">Danger zone</p>
            <h3>Delete local data</h3>
            <p>
              These actions affect only data saved in this browser. They cannot
              be undone.
            </p>
          </div>
        </div>

        <div class="delete-actions">
          <div class="delete-action">
            <div class="delete-action-copy">
              <h4>Delete quick chats</h4>
              <p>
                Remove all standalone chats. Projects and project chats are
                kept.
              </p>
            </div>

            <button
              class="btn-danger-outline"
              type="button"
              @click="handleDeleteQuickChats"
            >
              Delete chats
            </button>
          </div>

          <div class="delete-action">
            <div class="delete-action-copy">
              <h4>Delete projects</h4>
              <p>
                Remove every project, including all chats stored inside
                projects.
              </p>
            </div>

            <button
              class="btn-danger-outline"
              type="button"
              @click="handleDeleteProjects"
            >
              Delete projects
            </button>
          </div>

          <div class="delete-action delete-action-critical">
            <div class="delete-action-copy">
              <h4>Delete all LocalAI data</h4>
              <p>
                Remove quick chats, projects, settings, theme preferences and
                local UI preferences.
              </p>
            </div>

            <button
              class="btn-danger"
              type="button"
              @click="handleDeleteAllData"
            >
              Delete everything
            </button>
          </div>
        </div>
      </section>

      <!-- About -->
      <section class="settings-card about-card">
        <div class="section-heading compact">
          <div>
            <p class="section-kicker">Locale AI</p>
            <h2>About</h2>
          </div>
        </div>

        <div class="about-list">
          <div class="about-row">
            <span>Version</span>
            <code>1.0.0</code>
          </div>

          <div class="about-row">
            <span>Built with</span>
            <span>Vue 3 · Ollama API</span>
          </div>
        </div>

        <a
          class="github-link"
          href="https://github.com/beri336/locale-ai"
          target="_blank"
          rel="noreferrer"
        >
          View source code
          <span aria-hidden="true"
            ><IconArrowUpRight :size="12" :stroke-width="2"></IconArrowUpRight
          ></span>
        </a>
      </section>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useSettingsStore } from "@/stores/settingsStore";
import { useThemeStore } from "@/stores/themeStore";
import { useOllamaStore } from "@/stores/useOllamaStore";
import IconSettings from "@/components/icons/IconSettings.vue";
import {
  exportAppBackup,
  importAppBackup,
  LOCALAI_STORAGE_KEYS,
} from "@/utils/appBackup";
import IconArrowUpRight from "@/components/icons/IconArrowUpRight.vue";

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

const backupFileInput = ref(null);
const backupStatus = ref("");
const backupError = ref("");

const QUICK_CHATS_KEY = "ollama-chats";
const PROJECTS_KEY = "ollama-projects";

const weatherCityInput = ref(settingsStore.weatherCity);

const temporaryChatDurations = [1, 2, 4, 8, 12, 24, 48]; // TODO durch settingsstore ersetzen

const temporaryChatDuration = computed({
  get: () => settingsStore.temporaryChatDurationHours,
  set: (hours) => settingsStore.setTemporaryChatDurationHours(hours),
});

const temporaryChatDurationInput = ref(
  settingsStore.temporaryChatDurationHours,
);

function resetTemporaryChatDuration() {
  settingsStore.resetTemporaryChatDurationHours();
  temporaryChatDurationInput.value = settingsStore.temporaryChatDurationHours;
}

function saveWeatherCity() {
  settingsStore.setWeatherCity(weatherCityInput.value);
}

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

// Export & Import
function handleExportBackup() {
  backupStatus.value = "";
  backupError.value = "";

  try {
    exportAppBackup();
    backupStatus.value = "Backup downloaded successfully.";
  } catch (error) {
    console.error("Backup export failed:", error);
    backupError.value = "Could not create the backup.";
  }
}

function triggerImportBackup() {
  backupStatus.value = "";
  backupError.value = "";
  backupFileInput.value?.click();
}

async function handleImportBackup(event) {
  const [file] = event.target.files;

  if (!file) return;

  backupStatus.value = "";
  backupError.value = "";

  const confirmed = confirm(
    "Importing replaces your current chats, projects and settings. Continue?",
  );

  if (!confirmed) {
    event.target.value = "";
    return;
  }

  try {
    const backup = await importAppBackup(file);

    backupStatus.value = `Backup from ${new Date(backup.exportedAt).toLocaleString()} imported. Reloading…`;

    setTimeout(() => {
      window.location.reload();
    }, 800);
  } catch (error) {
    console.error("Backup import failed:", error);
    backupError.value = error.message || "Could not import the backup.";
  } finally {
    event.target.value = "";
  }
}

// Delete
function handleDeleteAllData() {
  const confirmed = confirm(
    "Delete all LocalAI chats, projects and settings? This cannot be undone.",
  );

  if (!confirmed) return;

  removeLocalData(LOCALAI_STORAGE_KEYS);
  reloadAfterDataChange();
}

function removeLocalData(keys) {
  for (const key of keys) {
    localStorage.removeItem(key);
  }
}

function reloadAfterDataChange() {
  window.location.reload();
}

function handleDeleteQuickChats() {
  const confirmed = confirm(
    "Delete all quick chats? Project chats and settings will be kept.",
  );

  if (!confirmed) return;

  removeLocalData([QUICK_CHATS_KEY]);
  reloadAfterDataChange();
}

function handleDeleteProjects() {
  const confirmed = confirm(
    "Delete all projects and their chats? Quick chats and settings will be kept.",
  );

  if (!confirmed) return;

  removeLocalData([PROJECTS_KEY]);
  reloadAfterDataChange();
}
</script>

<style scoped>
.settings-view {
  box-sizing: border-box;
  min-height: 100%;
  overflow-y: auto;
  padding: clamp(1.5rem, 4vw, 3rem);
  transform: translateZ(0); /* prevents twice scrolling */
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  max-width: 1100px;
  margin-bottom: 2rem;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
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

.header-icon :deep(svg) {
  width: 22px;
  height: 22px;
}

.eyebrow,
.section-kicker {
  margin: 0 0 0.25rem;
  color: var(--color-text-faint);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.settings-content {
  display: grid;
  max-width: 760px;
  gap: 0.85rem;
  padding-bottom: 2rem;
}

.settings-card {
  padding: clamp(1rem, 2.5vw, 1.35rem);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.025);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.settings-card:hover {
  border-color: color-mix(
    in srgb,
    var(--color-primary) 26%,
    var(--color-border)
  );
  box-shadow: 0 8px 26px rgb(0 0 0 / 0.035);
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.section-heading.compact {
  margin-bottom: 1rem;
}

.section-heading h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 1rem;
  font-weight: 650;
  letter-spacing: -0.015em;
}

.section-description {
  max-width: 540px;
  margin: 0.35rem 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  line-height: 1.5;
}

.field-group + .field-group {
  margin-top: 1.25rem;
}

.field-label {
  display: block;
  margin-bottom: 0.45rem;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: 600;
}

.field-hint {
  margin: 0.45rem 0 0;
  color: var(--color-text-faint);
  font-size: 11px;
  line-height: 1.45;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.range-value,
.storage-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 0.45rem;
  color: var(--color-text-muted);
  font-family: "Fira Code", ui-monospace, SFMono-Regular, monospace;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.input-row {
  display: flex;
  gap: 0.6rem;
}

.input {
  display: block;
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

.input:hover {
  border-color: color-mix(
    in srgb,
    var(--color-text-faint) 40%,
    var(--color-border)
  );
}

.input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--color-primary) 15%, transparent);
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

textarea.input.textarea {
  box-sizing: border-box;
  min-height: 100px;
  resize: vertical;
  line-height: 1.55;
}

.btn-primary,
.btn-secondary,
.btn-danger {
  min-height: 38px;
  padding: 0.55rem 0.85rem;
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease,
    transform 0.16s ease;
}

.btn-primary:active,
.btn-secondary:active,
.btn-danger:active {
  transform: translateY(1px);
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

.btn-secondary {
  color: var(--color-text);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-bg);
  border-color: color-mix(
    in srgb,
    var(--color-primary) 35%,
    var(--color-border)
  );
}

.btn-danger {
  color: var(--color-error);
  background: transparent;
  border: 1px solid
    color-mix(in srgb, var(--color-error) 60%, var(--color-border));
}

.btn-danger:hover {
  color: #fff;
  background: var(--color-error);
  border-color: var(--color-error);
}

.connection-badge {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.55rem;
  color: var(--color-text-faint);
  font-size: 11px;
  font-weight: 600;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
}

.connection-badge.connected {
  color: #4d8d2a;
  background: rgb(109 170 69 / 0.1);
  border-color: rgb(109 170 69 / 0.25);
}

.connection-badge.error {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, var(--color-surface));
  border-color: color-mix(in srgb, var(--color-error) 28%, var(--color-border));
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.version-note {
  margin: 0.65rem 0 0;
  color: var(--color-text-faint);
  font-size: 11px;
}

.version-note strong {
  color: var(--color-text-muted);
  font-family: "Fira Code", ui-monospace, SFMono-Regular, monospace;
  font-weight: 500;
}

.network-panel {
  padding: 0.9rem;
  margin-top: 1.25rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.network-panel-header {
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.network-panel-icon {
  display: grid;
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--color-primary);
  font-size: 0.85rem;
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  border-radius: 8px;
}

.network-panel h3 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-xs);
  font-weight: 650;
}

.network-panel-header p {
  margin: 0.15rem 0 0;
  color: var(--color-text-faint);
  font-size: 10px;
}

.network-info {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem 0.75rem;
  padding-top: 0.85rem;
}

.info-row {
  display: grid;
  gap: 0.2rem;
  min-width: 0;
}

.info-label {
  color: var(--color-text-faint);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.info-value {
  display: block;
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-muted);
  font-family: "Fira Code", ui-monospace, SFMono-Regular, monospace;
  font-size: 11px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.setting-row,
.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.setting-copy {
  display: grid;
  gap: 0.2rem;
  min-width: 0;
}

.setting-label {
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 600;
}

.setting-hint {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  line-height: 1.45;
}

.theme-switch {
  display: flex;
  flex-shrink: 0;
  padding: 2px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  cursor: pointer;
}

.theme-switch span {
  padding: 0.32rem 0.65rem;
  color: var(--color-text-muted);
  font-size: 11px;
  border-radius: var(--radius-full);
  transition:
    color 0.16s ease,
    background 0.16s ease,
    box-shadow 0.16s ease;
}

.theme-switch span.active {
  color: var(--color-text);
  font-weight: 600;
  background: var(--color-surface);
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
}

.slider {
  display: block;
  width: 100%;
  height: 4px;
  margin: 0.75rem 0 0;
  cursor: pointer;
  accent-color: var(--color-primary);
}

.btn-reset {
  padding: 0.3rem 0;
  color: var(--color-text-faint);
  font-family: inherit;
  font-size: 11px;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.btn-reset:hover {
  color: var(--color-primary);
}

.action-list {
  display: grid;
  border-top: 1px solid var(--color-border);
}

.action-row {
  min-height: 68px;
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--color-border);
}

.action-row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.danger-row .setting-label {
  color: var(--color-error);
}

.about-card {
  margin-bottom: 1rem;
}

.about-list {
  display: grid;
  margin-bottom: 1rem;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.about-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 0.65rem 0.75rem;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  border-bottom: 1px solid var(--color-border);
}

.about-row:last-child {
  border-bottom: 0;
}

.about-row code {
  color: var(--color-text);
  font-family: "Fira Code", ui-monospace, SFMono-Regular, monospace;
  font-size: 11px;
}

.github-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--color-primary);
  font-size: var(--text-xs);
  font-weight: 600;
  text-decoration: none;
}

.github-link:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.backup-actions {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.backup-action,
.danger-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.backup-action-copy,
.danger-row > div {
  min-width: 0;
}

.backup-action h3,
.danger-row h3 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 650;
}

.backup-action p,
.danger-row p {
  margin: 0.25rem 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  line-height: 1.45;
}

.backup-action .btn-secondary,
.danger-row .btn-danger {
  flex: 0 0 auto;
}

.backup-feedback {
  padding: 0.7rem 0.8rem;
  margin: 0.75rem 0 0;
  font-size: var(--text-xs);
  line-height: 1.45;
  border-radius: var(--radius-md);
}

.backup-feedback.success {
  color: var(--color-success, #22c55e);
  background: color-mix(
    in srgb,
    var(--color-success, #22c55e) 10%,
    transparent
  );
  border: 1px solid
    color-mix(in srgb, var(--color-success, #22c55e) 25%, transparent);
}

.backup-feedback.error {
  color: var(--color-error, #ef4444);
  background: color-mix(in srgb, var(--color-error, #ef4444) 10%, transparent);
  border: 1px solid
    color-mix(in srgb, var(--color-error, #ef4444) 25%, transparent);
}

.data-divider {
  height: 1px;
  margin: 1rem 0;
  background: var(--color-border);
}

.danger-row {
  background: color-mix(
    in srgb,
    var(--color-error, #ef4444) 5%,
    var(--color-surface)
  );
  border-color: color-mix(
    in srgb,
    var(--color-error, #ef4444) 22%,
    var(--color-border)
  );
}

.data-danger-heading {
  margin-bottom: 0.75rem;
}

.danger-kicker {
  color: var(--color-error, #ef4444);
}

.data-danger-heading h3 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 650;
}

.data-danger-heading p {
  margin: 0.25rem 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  line-height: 1.45;
}

.delete-actions {
  display: grid;
  gap: 0.7rem;
}

.delete-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 0.9rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.delete-action-critical {
  background: color-mix(
    in srgb,
    var(--color-error, #ef4444) 5%,
    var(--color-surface)
  );
  border-color: color-mix(
    in srgb,
    var(--color-error, #ef4444) 26%,
    var(--color-border)
  );
}

.delete-action-copy {
  min-width: 0;
}

.delete-action h4 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 650;
}

.delete-action p {
  margin: 0.25rem 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  line-height: 1.45;
}

.btn-danger-outline,
.btn-danger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  flex: 0 0 auto;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease;
}

.btn-danger-outline {
  color: var(--color-error, #ef4444);
  background: transparent;
  border: 1px solid
    color-mix(in srgb, var(--color-error, #ef4444) 42%, var(--color-border));
}

.btn-danger-outline:hover {
  color: #fff;
  background: var(--color-error, #ef4444);
  border-color: var(--color-error, #ef4444);
}

.btn-danger {
  color: #fff;
  background: var(--color-error, #ef4444);
  border: 1px solid var(--color-error, #ef4444);
}

.btn-danger:hover {
  filter: brightness(0.94);
}

.visually-hidden {
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

/* Weather city input row */
.weather-city-row {
  max-width: 480px;
}

.weather-city-row .input {
  flex: 1;
}

.weather-city-row .btn-primary {
  flex: 0 0 auto;
}

.temporary-duration-select {
  width: min(100%, 320px);
}

.btn-reset:disabled {
  color: var(--color-text-faint);
  cursor: default;
  opacity: 0.55;
  text-decoration: none;
}

/* iOS Safari: at least 16px prevents input auto-zoom */
@media (pointer: coarse) {
  .input {
    font-size: 16px;
  }
}

@media (max-width: 620px) {
  .settings-view {
    padding: 0.85rem 0.75rem 1.5rem;
  }

  .page-header {
    gap: 0.55rem;
    margin-bottom: 1rem;
  }

  .page-heading {
    gap: 0.5rem;
  }

  .header-icon {
    width: 34px;
    height: 34px;
    border-radius: 11px;
  }

  .header-icon :deep(svg) {
    width: 17px;
    height: 17px;
  }

  .eyebrow,
  .section-kicker {
    font-size: 0.6rem;
  }

  .page-header h1 {
    font-size: 1.4rem;
  }

  .header-description {
    margin-top: 0.3rem;
    font-size: 12px;
  }

  .settings-content {
    gap: 0.55rem;
    padding-bottom: 1.25rem;
  }

  .settings-card {
    padding: 0.75rem;
    border-radius: var(--radius-md);
  }

  .section-heading {
    gap: 0.55rem;
    margin-bottom: 0.85rem;
  }

  .section-heading.compact {
    margin-bottom: 0.65rem;
  }

  .section-heading h2 {
    font-size: 0.9rem;
  }

  .section-description {
    font-size: 11px;
  }

  .field-group + .field-group {
    margin-top: 0.85rem;
  }

  .field-label {
    font-size: 11px;
  }

  .field-hint {
    font-size: 10px;
  }

  .range-value,
  .storage-badge {
    font-size: 9px;
  }

  .input-row,
  .setting-row,
  .action-row {
    align-items: stretch;
    flex-direction: column;
    gap: 0.5rem;
  }

  .input {
    padding: 0.5rem 0.6rem;
    font-size: 13px;
  }

  .btn-primary,
  .btn-secondary,
  .btn-danger {
    width: 100%;
    min-height: 34px;
    padding: 0.45rem 0.6rem;
    font-size: 11px;
  }

  .connection-badge {
    align-self: flex-start;
    padding: 0.3rem 0.5rem;
    font-size: 10px;
  }

  .version-note {
    font-size: 10px;
  }

  .network-panel {
    padding: 0.65rem;
    margin-top: 0.85rem;
  }

  .network-panel-icon {
    width: 22px;
    height: 22px;
    font-size: 0.7rem;
  }

  .network-panel h3 {
    font-size: 11px;
  }

  .network-panel-header p {
    font-size: 9px;
  }

  .network-info {
    grid-template-columns: 1fr;
    gap: 0.45rem;
    padding-top: 0.65rem;
  }

  .info-label {
    font-size: 9px;
  }

  .info-value {
    font-size: 10px;
  }

  .theme-switch {
    align-self: flex-start;
  }

  .theme-switch span {
    padding: 0.28rem 0.55rem;
    font-size: 10px;
  }

  .setting-label {
    font-size: 12px;
  }

  .setting-hint {
    font-size: 11px;
  }

  .slider {
    margin-top: 0.55rem;
  }

  .btn-reset {
    font-size: 10px;
  }

  .storage-badge {
    align-self: flex-start;
  }

  .backup-actions {
    gap: 0.55rem;
    margin-top: 0.75rem;
  }

  .backup-action,
  .danger-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.65rem;
  }

  .backup-action h3,
  .danger-row h3 {
    font-size: 12px;
  }

  .backup-action p,
  .danger-row p {
    font-size: 11px;
  }

  .backup-action .btn-secondary,
  .danger-row .btn-danger {
    width: 100%;
  }

  .backup-feedback {
    padding: 0.5rem 0.6rem;
    font-size: 11px;
  }

  .data-divider {
    margin: 0.75rem 0;
  }

  .data-danger-heading {
    margin-bottom: 0.55rem;
  }

  .data-danger-heading h3 {
    font-size: 12px;
  }

  .data-danger-heading p {
    font-size: 11px;
  }

  .delete-actions {
    gap: 0.5rem;
  }

  .delete-action {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.55rem;
    padding: 0.65rem;
  }

  .delete-action h4 {
    font-size: 12px;
  }

  .delete-action p {
    font-size: 11px;
  }

  .btn-danger-outline,
  .btn-danger {
    width: 100%;
    min-height: 34px;
    font-size: 11px;
  }

  .about-row {
    padding: 0.5rem 0.6rem;
    font-size: 11px;
  }

  .about-row code {
    font-size: 10px;
  }

  .github-link {
    font-size: 11px;
  }

  .weather-city-row {
    flex-direction: column;
    max-width: none;
  }

  .weather-city-row .btn-primary {
    width: 100%;
  }

  .temporary-duration-select {
    width: 100%;
  }
}
</style>
