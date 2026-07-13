<!-- src/components/chat/Chat.vue -->

<template>
  <main class="chat-view">
    <aside class="chat-sidebar" :class="{ collapsed: isSidebarCollapsed }">
      <div class="sidebar-top">
        <div v-if="!isSidebarCollapsed" class="sidebar-title">
          <p class="sidebar-eyebrow">Workspace</p>
          <h2>Quick chats</h2>
        </div>

        <button
          class="sidebar-toggle-btn"
          type="button"
          :title="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          :aria-label="
            isSidebarCollapsed ? 'Expand chat sidebar' : 'Collapse chat sidebar'
          "
          @click="toggleSidebar"
        >
          <span aria-hidden="true">{{ isSidebarCollapsed ? "»" : "«" }}</span>
        </button>
      </div>

      <template v-if="!isSidebarCollapsed">
        <button
          class="btn-primary new-chat-btn"
          type="button"
          @click="handleNewChat"
        >
          <span aria-hidden="true">+</span>
          New chat
        </button>

        <button
          class="btn-secondary temporary-chat-btn"
          type="button"
          @click="handleTemporaryChat"
        >
          <span aria-hidden="true">◷</span>
          Temporary chat
        </button>

        <p class="temporary-chat-hint">Automatically deleted after 4 hours.</p>

        <div class="sidebar-divider"></div>

        <div class="chats-heading">
          <span>Recent chats</span>
          <span class="chat-count">{{ visibleChats.length }}</span>
        </div>

        <div class="chat-list">
          <ChatListItem
            v-for="chat in visibleChats"
            :key="chat.id"
            :chat="chat"
            :is-active="chat.id === activeChatId"
            @select="selectChat(chat.id)"
            @delete="handleDeleteChat(chat.id)"
            @rename="(newTitle) => renameChat(chat, newTitle)"
            @toggle-pin="togglePin(chat.id)"
            @archive="archiveChat(chat.id)"
          />

          <div v-if="visibleChats.length === 0" class="sidebar-empty-state">
            <span class="sidebar-empty-icon" aria-hidden="true">◌</span>
            <p>No active chats yet.</p>
          </div>
        </div>
      </template>

      <template v-else>
        <button
          class="collapsed-new-chat-btn"
          type="button"
          title="New chat"
          aria-label="Create new chat"
          @click="handleNewChat"
        >
          +
        </button>

        <button
          class="collapsed-temporary-chat-btn"
          type="button"
          title="Temporary chat — deleted after 4 hours"
          aria-label="Create temporary chat"
          @click="handleTemporaryChat"
        >
          ◷
        </button>
      </template>
    </aside>

    <section class="chat-main">
      <header class="chat-header">
        <div class="chat-header-copy">
          <p class="chat-header-eyebrow">Quick chat</p>
          <h1>{{ activeChat?.title || "Start a conversation" }}</h1>

          <div
            v-if="activeChat?.isTemporary"
            class="temporary-chat-notice"
            role="status"
          >
            <span class="temporary-chat-notice-icon" aria-hidden="true">◷</span>

            <p>
              <strong>Temporary chat</strong>

              <span>
                This chat will be deleted in
                {{ formatRemainingTime(activeChat.expiresAt) }}.
              </span>
            </p>

            <button
              class="extend-temporary-chat-btn"
              type="button"
              title="Extend by one hour"
              aria-label="Extend temporary chat by one hour"
              @click="extendTemporaryChat"
            >
              <span aria-hidden="true">+</span>
              1h
            </button>
          </div>
        </div>

        <select
          v-if="activeChat"
          v-model="selectedModel"
          class="model-select"
          aria-label="Select chat model"
        >
          <option value="" disabled>Select a model</option>

          <option v-for="name in modelNames" :key="name" :value="name">
            {{ name }}
          </option>
        </select>
      </header>

      <div v-if="!activeChat" class="empty-chat-state">
        <div class="empty-chat-icon" aria-hidden="true">◌</div>

        <h2>No chat selected</h2>

        <p>
          Start a new private conversation. It will be saved locally in this
          browser.
        </p>

        <button class="btn-primary" type="button" @click="handleNewChat">
          <span aria-hidden="true">+</span>
          Start new chat
        </button>
      </div>

      <ChatThread
        v-else
        :chat="activeChat"
        :model-names="modelNames"
        empty-hint="Select a model and write your first message."
        @message-sent="saveChats"
      />
    </section>
  </main>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { useOllamaStore } from "@/stores/useOllamaStore";
import ChatListItem from "@/components/chat/ChatListItem.vue";
import ChatThread from "@/components/chat/ChatThread.vue";
import { useSettingsStore } from "@/stores/settingsStore";

const ollama = useOllamaStore();
const settingsStore = useSettingsStore();
const route = useRoute();

const STORAGE_KEY = "ollama-chats";

const modelNames = ref([]);
const chats = ref([]);
const activeChatId = ref(null);

const currentTime = ref(Date.now());

const activeChat = computed(
  () => chats.value.find((c) => c.id === activeChatId.value) || null,
);

const visibleChats = computed(() =>
  chats.value
    .filter((chat) => !chat.isArchived)
    .sort((a, b) => {
      if (Boolean(b.isPinned) !== Boolean(a.isPinned)) {
        return Number(b.isPinned) - Number(a.isPinned);
      }

      return (
        new Date(b.updatedAt ?? b.createdAt) -
        new Date(a.updatedAt ?? a.createdAt)
      );
    }),
);

// const archivedChats = computed(() =>
//   chats.value.filter((chat) => chat.isArchived),
// );

const selectedModel = computed({
  get: () => activeChat.value?.model ?? "",
  set: (name) => {
    if (activeChat.value) {
      activeChat.value.model = name;
      ollama.setSelectedModel(name);
    }
  },
});

let temporaryChatTimer = null;

function getChat(id) {
  return chats.value.find((chat) => chat.id === id);
}

function togglePin(id) {
  const chat = getChat(id);

  if (!chat) return;

  chat.isPinned = !chat.isPinned;
  chat.updatedAt = new Date().toISOString();
}

function archiveChat(id) {
  const chat = getChat(id);

  if (!chat) return;

  chat.isArchived = true;
  chat.isPinned = false;
  chat.updatedAt = new Date().toISOString();

  if (activeChatId.value === id) {
    activeChatId.value = visibleChats.value[0]?.id ?? null;
  }
}

function loadChats() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];

    chats.value = parsed.map((chat) => ({
      systemPrompt: null,
      temperature: null,
      numCtx: null,
      ...chat,
    }));
  } catch (error) {
    console.error("Failed to load chats:", error);
    chats.value = [];
  }
}

function removeExpiredChats() {
  const now = Date.now();

  const activeChatExpired = chats.value.some(
    (chat) =>
      chat.id === activeChatId.value &&
      chat.isTemporary &&
      chat.expiresAt &&
      new Date(chat.expiresAt).getTime() <= now,
  );

  chats.value = chats.value.filter((chat) => {
    if (!chat.isTemporary || !chat.expiresAt) return true;

    return new Date(chat.expiresAt).getTime() > now;
  });

  if (activeChatExpired) {
    activeChatId.value = chats.value[0]?.id ?? null;
  }
}

function saveChats() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats.value));
  } catch (error) {
    console.error("Failed to save chats:", error);
  }
}

watch(chats, saveChats, { deep: true });

function createChat({ temporary = false } = {}) {
  const now = new Date();

  const temporaryDurationMs =
    Number(settingsStore.temporaryChatDurationHours || 4) * 60 * 60 * 1000;

  const expiresAt = temporary
    ? new Date(now.getTime() + temporaryDurationMs).toISOString()
    : null;

  const newChat = {
    id: `chat_${Date.now()}`,
    title: temporary ? "Temporary Chat" : "New Chat",
    model: settingsStore.defaultModel || "",
    messages: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),

    isPinned: false,
    isArchived: false,

    isTemporary: temporary,
    expiresAt,

    systemPrompt: null,
    temperature: null,
    numCtx: null,
  };

  chats.value.unshift(newChat);
  activeChatId.value = newChat.id;

  return newChat;
}

function handleNewChat() {
  createChat();
}

function handleTemporaryChat() {
  createChat({ temporary: true });
}

function selectChat(id) {
  activeChatId.value = id;
}

function handleDeleteChat(id) {
  if (!confirm("Delete this chat?")) return;

  const index = chats.value.findIndex((c) => c.id === id);
  if (index === -1) return;

  chats.value.splice(index, 1);

  if (activeChatId.value === id) {
    activeChatId.value = chats.value[0]?.id || null;
  }
}

function renameChat(chat, newTitle) {
  chat.title = newTitle;
}

const isSidebarCollapsed = ref(
  localStorage.getItem("chat-sidebar-collapsed") === "true",
);

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  localStorage.setItem("chat-sidebar-collapsed", isSidebarCollapsed.value);
}

function formatRemainingTime(expiresAt) {
  if (!expiresAt) return "soon";

  const remainingMs = new Date(expiresAt).getTime() - currentTime.value;

  if (remainingMs <= 0) {
    return "less than a minute";
  }

  const totalMinutes = Math.ceil(remainingMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} minutes`;
  }

  if (minutes === 0) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  return `${hours}h ${minutes}m`;
}

function extendTemporaryChat() {
  if (!activeChat.value?.isTemporary) return;

  const currentExpiry = new Date(activeChat.value.expiresAt).getTime();
  const baseTime = Math.max(currentExpiry, Date.now());

  activeChat.value.expiresAt = new Date(
    baseTime + 60 * 60 * 1000,
  ).toISOString();

  activeChat.value.updatedAt = new Date().toISOString();
}

onMounted(async () => {
  loadChats();
  removeExpiredChats();

  try {
    modelNames.value = await ollama.getListOfModelsName();
  } catch (error) {
    console.error("Failed to load models in Chat.vue:", error);
    modelNames.value = [];
  }

  const hasStoredChats = localStorage.getItem(STORAGE_KEY) !== null;

  if (route.query.new === "true") {
    createChat();
    return;
  }

  if (chats.value.length > 0) {
    const requestedChatId = route.query.chat;

    const requestedChatExists = chats.value.some(
      (chat) => chat.id === requestedChatId,
    );

    activeChatId.value = requestedChatExists
      ? requestedChatId
      : chats.value[0].id;
  } else if (!hasStoredChats) {
    createChat();
  }
});

onUnmounted(() => {
  if (temporaryChatTimer) {
    window.clearInterval(temporaryChatTimer);
  }
});
</script>

<style scoped>
.chat-view {
  display: flex;
  height: 100%;
  min-height: 0;
  background: var(--color-bg);
}

.chat-sidebar {
  display: flex;
  width: 272px;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 0.9rem;
  min-height: 0;
  padding: 1rem;
  overflow: hidden;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  transition:
    width 0.2s ease,
    padding 0.2s ease;
}

.chat-sidebar.collapsed {
  width: 56px;
  padding: 1rem 0.55rem;
  align-items: center;
}

.sidebar-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.chat-sidebar.collapsed .sidebar-top {
  flex-direction: column;
}

.sidebar-title {
  min-width: 0;
}

.sidebar-eyebrow,
.chat-header-eyebrow {
  margin: 0 0 0.15rem;
  overflow: hidden;
  color: var(--color-text-faint);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.sidebar-title h2 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-md);
  font-weight: 650;
  letter-spacing: -0.02em;
}

.sidebar-toggle-btn {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  padding: 0;
  color: var(--color-text-faint);
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition:
    color 0.16s ease,
    background 0.16s ease,
    border-color 0.16s ease;
}

.sidebar-toggle-btn:hover {
  color: var(--color-text);
  background: var(--color-bg);
  border-color: color-mix(
    in srgb,
    var(--color-primary) 35%,
    var(--color-border)
  );
}

.btn-primary,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 36px;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease,
    transform 0.16s ease;
}

.btn-primary:active {
  transform: translateY(1px);
}

.btn-primary {
  color: #fff;
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
}

.btn-primary:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.new-chat-btn {
  width: 100%;
}

.sidebar-divider {
  height: 1px;
  margin: 0.1rem 0;
  background: var(--color-border);
}

.chats-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--color-text-faint);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.chat-count {
  display: inline-grid;
  min-width: 18px;
  height: 18px;
  place-items: center;
  padding: 0 0.3rem;
  color: var(--color-text-muted);
  font-family: "Fira Code", ui-monospace, monospace;
  font-size: 10px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
}

.chat-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
  padding-right: 0.1rem;
  overflow-y: auto;
}

.sidebar-empty-state {
  display: grid;
  justify-items: center;
  gap: 0.45rem;
  padding: 1.4rem 0.75rem;
  margin: auto 0;
  color: var(--color-text-faint);
  text-align: center;
}

.sidebar-empty-state p {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
}

.sidebar-empty-icon {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  color: var(--color-primary);
  font-size: 1rem;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-radius: 9px;
}

.collapsed-new-chat-btn {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  padding: 0;
  color: #fff;
  font-family: inherit;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  background: var(--color-primary);
  border: 0;
  border-radius: 9px;
}

.collapsed-new-chat-btn:hover {
  background: var(--color-primary-hover);
}

.chat-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
  min-height: 0;
  padding: clamp(1rem, 3vw, 2rem);
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.chat-header-copy {
  min-width: 0;
}

.chat-header h1 {
  margin: 0;
  overflow: hidden;
  color: var(--color-text);
  font-size: clamp(1.1rem, 2vw, 1.35rem);
  font-weight: 650;
  letter-spacing: -0.025em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-select {
  min-width: 180px;
  max-width: min(38vw, 280px);
  padding: 0.55rem 2.25rem 0.55rem 0.75rem;
  overflow: hidden;
  color: var(--color-text);
  font-family: inherit;
  font-size: var(--text-xs);
  text-overflow: ellipsis;
  cursor: pointer;
  appearance: none;
  background-color: var(--color-surface);
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
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
}

.model-select:hover {
  border-color: color-mix(
    in srgb,
    var(--color-primary) 35%,
    var(--color-border)
  );
}

.model-select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--color-primary) 14%, transparent);
}

.empty-chat-state {
  display: grid;
  flex: 1;
  justify-items: center;
  align-content: center;
  gap: 0.65rem;
  min-height: 0;
  padding: 2rem;
  text-align: center;
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
}

.empty-chat-icon {
  display: grid;
  width: 46px;
  height: 46px;
  margin-bottom: 0.2rem;
  place-items: center;
  color: var(--color-primary);
  font-size: 1.5rem;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-radius: 14px;
}

.empty-chat-state h2 {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-md);
  font-weight: 650;
}

.empty-chat-state p {
  max-width: 330px;
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  line-height: 1.55;
}

.empty-chat-state .btn-primary {
  margin-top: 0.4rem;
}

@media (max-width: 760px) {
  .chat-sidebar {
    width: 224px;
  }

  .chat-main {
    padding: 1rem;
  }

  .model-select {
    min-width: 150px;
  }
}

@media (max-width: 620px) {
  .chat-view {
    position: relative;
  }

  .chat-sidebar {
    position: absolute;
    z-index: 10;
    top: 0;
    bottom: 0;
    left: 0;
    width: min(82vw, 290px);
    box-shadow: 12px 0 28px rgb(0 0 0 / 0.12);
  }

  .chat-sidebar.collapsed {
    width: 48px;
    padding: 0.75rem 0.45rem;
    box-shadow: 4px 0 14px rgb(0 0 0 / 0.07);
  }

  .chat-main {
    padding: 1rem 1rem 1rem 3.9rem;
  }

  .chat-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.7rem;
  }

  .model-select {
    width: 100%;
    max-width: none;
  }

  .chat-sidebar:not(.collapsed) + .chat-main {
    pointer-events: none;
    filter: brightness(0.82);
  }

  input,
  textarea,
  select {
    font-size: 16px !important;
  }

  .chat-input,
  .input,
  .model-select {
    font-size: 16px;
  }

  .temporary-chat-notice {
    max-width: none;
    padding: 0.55rem 0.6rem;
  }
}

/* Temporary chat button */
.temporary-chat-btn {
  width: 100%;
  min-height: 32px;
  padding-block: 0.4rem;
  color: var(--color-text-muted);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
}

.temporary-chat-btn:hover {
  color: var(--color-primary);
  border-color: color-mix(
    in srgb,
    var(--color-primary) 35%,
    var(--color-border)
  );
}

.temporary-chat-hint {
  margin: -0.35rem 0 0;
  color: var(--color-text-faint);
  font-size: 10px;
  line-height: 1.35;
  text-align: center;
}

.collapsed-temporary-chat-btn {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  padding: 0;
  color: var(--color-text-muted);
  font-family: inherit;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 9px;
}

.collapsed-temporary-chat-btn:hover {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 9%, var(--color-surface));
  border-color: color-mix(
    in srgb,
    var(--color-primary) 35%,
    var(--color-border)
  );
}

.temporary-chat-notice {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  max-width: 460px;
  padding: 0.5rem 0.65rem;
  margin-top: 0.65rem;
  color: var(--color-text-muted);
  background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
  border: 1px solid
    color-mix(in srgb, var(--color-primary) 22%, var(--color-border));
  border-radius: var(--radius-md);
}

.temporary-chat-notice-icon {
  display: grid;
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--color-primary);
  font-size: 0.85rem;
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  border-radius: 7px;
}

.temporary-chat-notice p {
  display: grid;
  gap: 0.1rem;
  margin: 0;
  font-size: 10px;
  line-height: 1.4;
}

.temporary-chat-notice strong {
  color: var(--color-text);
  font-size: var(--text-xs);
  font-weight: 650;
}

.temporary-chat-notice p span {
  color: var(--color-text-muted);
}

.extend-temporary-chat-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  min-height: 26px;
  flex: 0 0 auto;
  padding: 0.3rem 0.45rem;
  margin-left: auto;
  color: var(--color-primary);
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid
    color-mix(in srgb, var(--color-primary) 25%, var(--color-border));
  border-radius: 7px;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    transform 0.16s ease;
}

.extend-temporary-chat-btn:hover {
  background: color-mix(in srgb, var(--color-primary) 9%, var(--color-surface));
  border-color: var(--color-primary);
}

.extend-temporary-chat-btn:active {
  transform: translateY(1px);
}

.extend-temporary-chat-btn span {
  font-size: 0.9rem;
  line-height: 0.8;
}
</style>
