<!-- src/components/layout/AppShell.vue -->

<template>
  <div class="shell">
    <aside class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-top">
        <div v-if="!isCollapsed" class="logo">LocalAI</div>
        <button
          class="collapse-toggle"
          @click="toggleSidebar"
          :title="isCollapsed ? 'Expand' : 'Collapse'"
        >
          {{ isCollapsed ? "»" : "«" }}
        </button>
      </div>

      <button class="global-search-btn" @click="openSearchModal">
        🔍 <span v-if="!isCollapsed">Search chats…</span>
      </button>

      <nav>
        <RouterLink
          to="/"
          class="nav-item"
          :title="isCollapsed ? 'Dashboard' : ''"
        >
          <span class="nav-icon"><IconHome /></span>
          <span v-if="!isCollapsed" class="nav-label">Dashboard</span>
        </RouterLink>

        <RouterLink
          to="/chat"
          class="nav-item"
          :title="isCollapsed ? 'Chat' : ''"
        >
          <span class="nav-icon"><IconChat /></span>
          <span v-if="!isCollapsed" class="nav-label">Chat</span>
        </RouterLink>

        <RouterLink
          to="/projects"
          class="nav-item"
          :title="isCollapsed ? 'Projects' : ''"
        >
          <span class="nav-icon"><IconFolder /></span>
          <span v-if="!isCollapsed" class="nav-label">Projects</span>
        </RouterLink>

        <RouterLink
          to="/models"
          class="nav-item"
          :title="isCollapsed ? 'Models' : ''"
        >
          <span class="nav-icon"><IconPackage /></span>
          <span v-if="!isCollapsed" class="nav-label">Models</span>
        </RouterLink>

        <RouterLink
          to="/faq"
          class="nav-item"
          :title="isCollapsed ? 'FAQ' : ''"
        >
          <span class="nav-icon"><IconFaq /></span>
          <span v-if="!isCollapsed" class="nav-label">FAQ</span>
        </RouterLink>

        <RouterLink
          to="/settings"
          class="nav-item"
          :title="isCollapsed ? 'Settings' : ''"
        >
          <span class="nav-icon"><IconSettings /></span>
          <span v-if="!isCollapsed" class="nav-label">Settings</span>
        </RouterLink>
      </nav>

      <button class="theme-toggle" @click="themeStore.toggle()">
        <IconMoon v-if="themeStore.theme === 'light'" />
        <IconSun class="sun-icon" v-else />
      </button>
    </aside>

    <main class="content">
      <RouterView />
    </main>

    <SearchModal />
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useThemeStore } from "@/stores/themeStore";
import { useSearchModal } from "@/composables/useSearchModal";
import SearchModal from "@/components/search/SearchModal.vue";

// Embedded Icons
import IconHome from "@/components/icons/IconHome.vue";
import IconChat from "@/components/icons/IconChat.vue";
import IconFolder from "@/components/icons/IconFolder.vue";
import IconPackage from "@/components/icons/IconPackage.vue";
import IconSettings from "@/components/icons/IconSettings.vue";
import IconMoon from "@/components/icons/IconMoon.vue";
import IconSun from "@/components/icons/IconSun.vue";
import IconFaq from "@/components/icons/IconFaq.vue";

const themeStore = useThemeStore();
const { openSearchModal } = useSearchModal();

const isCollapsed = ref(
  localStorage.getItem("app-sidebar-collapsed") === "true",
);

function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value;
  localStorage.setItem("app-sidebar-collapsed", isCollapsed.value);
}
</script>

<style scoped>
.shell {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  padding: var(--space-4);
  transition:
    width 0.2s ease,
    padding 0.2s ease;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 64px;
  padding: var(--space-4) var(--space-2);
  align-items: center;
}

.sidebar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
  width: 100%;
}

.sidebar.collapsed .sidebar-top {
  flex-direction: column;
  gap: var(--space-2);
}

.logo {
  font-weight: 700;
  font-size: var(--font-size-lg);
  padding: 0 var(--space-4);
  white-space: nowrap;
}

.collapse-toggle {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: var(--text-xs);
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.collapse-toggle:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
}

.global-search-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-5);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.sidebar.collapsed .global-search-btn {
  justify-content: center;
  padding: var(--space-2);
}

.global-search-btn:hover {
  background: var(--color-surface);
  color: var(--color-text);
}

nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
  width: 100%;
  padding-top: var(--space-1);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: var(--text-sm);
  font-weight: 500;
  white-space: nowrap;
  transition:
    background 0.2s,
    color 0.2s;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: var(--space-2);
}

.nav-icon {
  flex-shrink: 0;
  font-size: 1rem;
  line-height: 1;
}

.nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-item:hover {
  background: var(--color-surface);
  color: var(--color-text);
}

.nav-item.router-link-exact-active {
  background: var(--color-surface-2);
  color: var(--color-text);
}

.theme-toggle {
  align-self: center;
  padding: var(--space-2);
  border-radius: var(--radius-md);
}

.theme-toggle:hover {
  background: var(--color-surface-2);
}

.content {
  flex: 1;
  overflow-y: auto;
}

/* Nav icon SVG styling */
.nav-icon svg,
.theme-toggle svg {
  width: 20px;
  height: 20px;
  display: block;
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sun-icon {
  stroke: white;
  fill: none;
}
</style>
