<!-- src/components/chat/ChatListItem.vue -->

<template>
  <div class="chat-list-item" :class="{ active: isActive }" @click="$emit('select')">
    <!-- Chat List Info -->
    <div class="chat-list-info">
      <input v-if="isEditing" ref="editInput" v-model="editingTitle" class="chat-title-input" maxlength="40" @click.stop
        @keyup.enter="save" @keyup.esc="cancel" @blur="save" />
      <span v-else class="chat-title" @dblclick.stop="startEdit" :title="chat.title">
        {{ chat.title }}
      </span>

      <span v-if="showModel && chat.model" class="chat-model-tag">
        {{ formatModelLabel(chat.model) }}
      </span>
      <span v-if="isEditing" class="char-count">{{ editingTitle.length }}/40</span>
    </div>

    <!-- Chat Action Button -->
    <button v-if="!isEditing" class="chat-delete-btn" @click.stop="$emit('delete')">
      <IconX :size="14" :stroke-width="2" />
    </button>

    <!-- Pin/Unpin Button -->
    <button type="button" class="chat-action-btn" :title="chat.isPinned ? 'Unpin chat' : 'Pin chat'"
      :aria-label="chat.isPinned ? 'Unpin chat' : 'Pin chat'" @click.stop="togglePin">
      <component :is="chat.isPinned ? IconStarFilled : IconStar" :size="14" :stroke-width="1.8" />
    </button>

    <!-- Archive Button -->
    <button type="button" class="chat-action-btn" title="Archive chat" aria-label="Archive chat"
      @click.stop="archiveChat">
      <IconDownload :size="14" :stroke-width="1.8" />
    </button>
  </div>
</template>

<script setup>
import { ref, nextTick } from "vue";

import IconX from "@/components/icons/IconX.vue"
import IconStarFilled from "@/components/icons/IconStarFilled.vue"
import IconStar from "@/components/icons/IconStar.vue"
import IconDownload from "@/components/icons/IconDownload.vue"


const props = defineProps({
  chat: { type: Object, required: true },
  isActive: { type: Boolean, default: false },
  showModel: { type: Boolean, default: false },
});

const emit = defineEmits([
  "select",
  "delete",
  "rename",
  "toggle-pin",
  "archive",
]);

const isEditing = ref(false);
const editingTitle = ref("");
const editInput = ref(null);


// async functions
async function startEdit() {
  isEditing.value = true;
  editingTitle.value = props.chat.title;
  await nextTick();
  editInput.value?.focus();
  editInput.value?.select();
}

// functions
function save() {
  if (!isEditing.value) return;
  const trimmed = editingTitle.value.trim().slice(0, 40);
  emit("rename", trimmed || "New Chat");
  isEditing.value = false;
}

function cancel() {
  isEditing.value = false;
  editingTitle.value = "";
}

function togglePin() {
  emit("toggle-pin");
}

function archiveChat() {
  emit("archive");
}

function formatModelLabel(value) {
  if (!value) return "";
  const [source, name] = value.includes(":")
    ? value.split(/:(.+)/)
    : ["ollama", value];

  const label = source === "lmstudio" ? "LM Studio" : "Ollama";
  return `${name} (${label})`;
}
</script>

<style scoped>
/* Chat list item */
.chat-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: background 0.15s ease;
}

.chat-list-item:hover {
  background: var(--color-surface-2);
}

.chat-list-item.active {
  color: var(--color-text);
  font-weight: 500;
  background: var(--color-surface-2);
}

/* Chat information */
.chat-list-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
}

.chat-title {
  overflow: hidden;
  color: var(--color-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-model-tag {
  color: var(--color-text-faint);
  font-size: 11px;
}

/* Inline title editing */
.chat-title-input {
  width: 100%;
  padding: 2px 6px;
  color: var(--color-text);
  font-size: var(--text-sm);
  outline: none;
  background: var(--color-bg);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
}

.char-count {
  color: var(--color-text-faint);
  font-size: 10px;
}

/* Chat actions */
.chat-delete-btn,
.chat-action-btn {
  flex-shrink: 0;
  padding: 2px 4px;
  color: var(--color-text-faint);
  font-size: var(--text-xs);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
}

.chat-delete-btn:hover {
  color: var(--color-error);
}

.chat-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    color 0.15s ease,
    background 0.15s ease;
}

.chat-action-btn:hover {
  color: var(--color-primary);
  background: var(--color-surface-2);
}

/* Mobile layout */
@media (max-width: 620px) {
  .chat-list-item {
    gap: 0.35rem;
    padding: 0.4rem 0.55rem;
    font-size: 12px;
  }

  .chat-title {
    font-size: 12px;
  }

  .chat-model-tag {
    font-size: 9px;
  }

  .chat-title-input {
    padding: 1px 5px;
    font-size: 12px;
  }

  .char-count {
    font-size: 9px;
  }

  .chat-delete-btn,
  .chat-action-btn {
    min-width: 22px;
    min-height: 22px;
    padding: 1px 3px;
    font-size: 11px;
  }
}
</style>
