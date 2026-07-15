<!-- src/components/chat/ChatListItem.vue -->

<template>
  <div
    class="chat-list-item"
    :class="{ active: isActive }"
    @click="$emit('select')"
  >
    <div class="chat-list-info">
      <input
        v-if="isEditing"
        ref="editInput"
        v-model="editingTitle"
        class="chat-title-input"
        maxlength="40"
        @click.stop
        @keyup.enter="save"
        @keyup.esc="cancel"
        @blur="save"
      />
      <span
        v-else
        class="chat-title"
        @dblclick.stop="startEdit"
        :title="chat.title"
      >
        {{ chat.title }}
      </span>

      <span v-if="showModel && chat.model" class="chat-model-tag">{{
        chat.model
      }}</span>
      <span v-if="isEditing" class="char-count"
        >{{ editingTitle.length }}/40</span
      >
    </div>

    <button
      v-if="!isEditing"
      class="chat-delete-btn"
      @click.stop="$emit('delete')"
    >
      <IconX :size="14" :stroke-width="2" />
    </button>

    <button
      type="button"
      class="chat-action-btn"
      :title="chat.isPinned ? 'Unpin chat' : 'Pin chat'"
      :aria-label="chat.isPinned ? 'Unpin chat' : 'Pin chat'"
      @click.stop="togglePin"
    >
      <component
        :is="chat.isPinned ? IconStarFilled : IconStar"
        :size="14"
        :stroke-width="1.8"
      />
    </button>

    <button
      type="button"
      class="chat-action-btn"
      title="Archive chat"
      aria-label="Archive chat"
      @click.stop="archiveChat"
    >
      <IconDownload :size="14" :stroke-width="1.8" />
    </button>
  </div>
</template>

<script setup>
import { ref, nextTick } from "vue";
import {
  IconX,
  IconStarFilled,
  IconStar,
  IconDownload,
} from "@tabler/icons-vue";

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

async function startEdit() {
  isEditing.value = true;
  editingTitle.value = props.chat.title;
  await nextTick();
  editInput.value?.focus();
  editInput.value?.select();
}

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
</script>

<style scoped>
.chat-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  transition: background 0.15s ease;
}

.chat-list-item:hover {
  background: var(--color-surface-2);
}

.chat-list-item.active {
  background: var(--color-surface-2);
  color: var(--color-text);
  font-weight: 500;
}

.chat-list-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

.chat-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text);
}

.chat-model-tag {
  font-size: 11px;
  color: var(--color-text-faint);
}

.chat-title-input {
  width: 100%;
  background: var(--color-bg);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  padding: 2px 6px;
  font-size: var(--text-sm);
  color: var(--color-text);
  outline: none;
}

.char-count {
  font-size: 10px;
  color: var(--color-text-faint);
}

.chat-delete-btn {
  background: none;
  border: none;
  color: var(--color-text-faint);
  cursor: pointer;
  font-size: var(--text-xs);
  padding: 2px 4px;
  flex-shrink: 0;
}

.chat-delete-btn:hover {
  color: var(--color-error);
}

.chat-delete-btn :deep(svg),
.chat-action-btn :deep(svg) {
  display: block;
}

.chat-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 2px 4px;
  font-size: var(--text-xs);
  color: var(--color-text-faint);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  transition: color 0.15s ease;
}

.chat-action-btn:hover {
  color: var(--color-primary);
  background: var(--color-surface-2);
}

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
