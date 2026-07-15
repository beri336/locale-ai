<!-- src/components/layout/AppShell.vue -->

<template>
  <div class="shell">
    <!-- Desktop navigation -->
    <aside class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-top">
        <div v-if="!isCollapsed" class="logo">
          <span class="logo-mark">L</span>
          <span>LocalAI</span>
        </div>

        <button
          class="collapse-toggle"
          type="button"
          :title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          :aria-label="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          @click="toggleSidebar"
        >
          {{ isCollapsed ? "»" : "«" }}
        </button>
      </div>

      <button
        class="global-search-btn"
        type="button"
        :title="isCollapsed ? 'Search chats' : ''"
        @click="openSearchModal"
      >
        <span class="search-icon" aria-hidden="true">⌕</span>
        <span v-if="!isCollapsed">Search chats…</span>
        <kbd v-if="!isCollapsed">⌘ K</kbd>
      </button>

      <nav class="desktop-nav" aria-label="Main navigation">
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

        <div class="nav-spacer"></div>

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

      <button
        class="theme-toggle"
        type="button"
        :title="
          themeStore.theme === 'light'
            ? 'Enable dark mode'
            : 'Enable light mode'
        "
        @click="themeStore.toggle()"
      >
        <IconMoon v-if="themeStore.theme === 'light'" />
        <IconSun v-else class="sun-icon" />
        <span v-if="!isCollapsed">
          {{ themeStore.theme === "light" ? "Dark mode" : "Light mode" }}
        </span>
      </button>
    </aside>

    <!-- Main content -->
    <main class="content">
      <RouterView />
    </main>

    <!-- Mobile: backdrop for More sheet -->
    <Transition name="fade">
      <button
        v-if="isMobileMenuOpen"
        class="mobile-menu-backdrop"
        type="button"
        aria-label="Close navigation menu"
        @click="closeMobileMenu"
      ></button>
    </Transition>

    <!-- Mobile: More bottom sheet -->
    <Transition name="sheet">
      <section
        v-if="isMobileMenuOpen"
        class="mobile-more-sheet"
        aria-label="More navigation options"
      >
        <div class="sheet-handle"></div>

        <div class="sheet-header">
          <div>
            <p class="sheet-eyebrow">LocalAI</p>
            <h2>More</h2>
          </div>

          <button
            class="sheet-close-btn"
            type="button"
            aria-label="Close navigation menu"
            @click="closeMobileMenu"
          >
            ×
          </button>
        </div>

        <button
          class="mobile-search-btn"
          type="button"
          @click="handleMobileSearch"
        >
          <span class="sheet-item-icon" aria-hidden="true">⌕</span>
          <span>Search all chats</span>
          <span class="sheet-item-hint">⌘ K</span>
        </button>

        <div class="sheet-divider"></div>

        <RouterLink
          to="/models"
          class="sheet-nav-item"
          @click="closeMobileMenu"
        >
          <span class="sheet-item-icon"><IconPackage /></span>
          <span>Models</span>
          <span class="sheet-arrow" aria-hidden="true">›</span>
        </RouterLink>

        <RouterLink to="/faq" class="sheet-nav-item" @click="closeMobileMenu">
          <span class="sheet-item-icon"><IconFaq /></span>
          <span>FAQ & connection help</span>
          <span class="sheet-arrow" aria-hidden="true">›</span>
        </RouterLink>

        <RouterLink
          to="/settings"
          class="sheet-nav-item"
          @click="closeMobileMenu"
        >
          <span class="sheet-item-icon"><IconSettings /></span>
          <span>Settings</span>
          <span class="sheet-arrow" aria-hidden="true">›</span>
        </RouterLink>

        <div class="sheet-divider"></div>

        <button
          class="sheet-theme-btn"
          type="button"
          @click="themeStore.toggle()"
        >
          <span class="sheet-item-icon">
            <IconMoon v-if="themeStore.theme === 'light'" />
            <IconSun v-else class="sun-icon" />
          </span>

          <span>
            {{
              themeStore.theme === "light"
                ? "Switch to dark mode"
                : "Switch to light mode"
            }}
          </span>

          <span class="theme-state">
            {{ themeStore.theme === "light" ? "Light" : "Dark" }}
          </span>
        </button>
      </section>
    </Transition>

    <!-- Mobile bottom navigation -->
    <nav class="bottom-nav" aria-label="Mobile main navigation">
      <RouterLink to="/" class="bottom-nav-item">
        <span class="bottom-nav-icon"><IconHome /></span>
        <span>Home</span>
      </RouterLink>

      <RouterLink to="/chat" class="bottom-nav-item">
        <span class="bottom-nav-icon"><IconChat /></span>
        <span>Chat</span>
      </RouterLink>

      <RouterLink to="/projects" class="bottom-nav-item">
        <span class="bottom-nav-icon"><IconFolder /></span>
        <span>Projects</span>
      </RouterLink>

      <button
        class="bottom-nav-item"
        :class="{ active: isMobileMenuOpen }"
        type="button"
        @click="toggleMobileMenu"
      >
        <span class="bottom-nav-icon more-icon" aria-hidden="true">•••</span>
        <span>More</span>
      </button>
    </nav>

    <SearchModal />
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { useThemeStore } from "@/stores/themeStore";
import { useSearchModal } from "@/composables/useSearchModal";
import SearchModal from "@/components/search/SearchModal.vue";

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

const isMobileMenuOpen = ref(false);

function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value;
  localStorage.setItem("app-sidebar-collapsed", isCollapsed.value);
}

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false;
}

function handleMobileSearch() {
  closeMobileMenu();
  openSearchModal();
}

watch(isMobileMenuOpen, (isOpen) => {
  document.body.style.overflow = isOpen ? "hidden" : "";
});
</script>

<style scoped>
.shell {
  display: flex;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  background: var(--color-bg);
}

/* Desktop sidebar */
.sidebar {
  display: flex;
  width: 228px;
  flex: 0 0 auto;
  flex-direction: column;
  min-height: 0;
  padding: 1rem;
  overflow: hidden;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  transition:
    width 0.2s ease,
    padding 0.2s ease;
}

.sidebar.collapsed {
  width: 60px;
  padding: 1rem 0.55rem;
  align-items: center;
}

.sidebar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  margin-bottom: 1rem;
}

.sidebar.collapsed .sidebar-top {
  flex-direction: column;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  color: var(--color-text);
  font-size: var(--text-md);
  font-weight: 700;
  letter-spacing: -0.025em;
  white-space: nowrap;
}

.logo-mark {
  display: grid;
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  place-items: center;
  color: #fff;
  font-size: 11px;
  background: var(--color-primary);
  border-radius: 8px;
}

.collapse-toggle {
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
}

.collapse-toggle:hover {
  color: var(--color-text);
  background: var(--color-bg);
}

.global-search-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 36px;
  padding: 0.45rem 0.6rem;
  margin-bottom: 1rem;
  color: var(--color-text-muted);
  font-family: inherit;
  font-size: var(--text-xs);
  text-align: left;
  cursor: pointer;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.global-search-btn:hover {
  color: var(--color-text);
  border-color: color-mix(
    in srgb,
    var(--color-primary) 30%,
    var(--color-border)
  );
}

.search-icon {
  flex: 0 0 auto;
  font-size: 1rem;
}

.global-search-btn kbd {
  padding: 0.15rem 0.3rem;
  margin-left: auto;
  color: var(--color-text-faint);
  font-family: inherit;
  font-size: 9px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.sidebar.collapsed .global-search-btn {
  justify-content: center;
  padding: 0.45rem;
}

.desktop-nav {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.2rem;
  width: 100%;
  min-height: 0;
}

.nav-spacer {
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-height: 36px;
  padding: 0.45rem 0.6rem;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: 600;
  text-decoration: none;
  border-radius: var(--radius-md);
  transition:
    color 0.16s ease,
    background 0.16s ease;
}

.nav-item:hover {
  color: var(--color-text);
  background: var(--color-surface-2);
}

.nav-item.router-link-exact-active {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 0.45rem;
}

.nav-icon {
  display: grid;
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  place-items: center;
}

.nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  width: 100%;
  min-height: 36px;
  padding: 0.45rem 0.6rem;
  margin-top: 0.75rem;
  color: var(--color-text-muted);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
}

.theme-toggle:hover {
  color: var(--color-text);
  background: var(--color-surface-2);
  border-color: var(--color-border);
}

.sidebar.collapsed .theme-toggle {
  width: 36px;
  padding: 0.45rem;
}

/* Main content */
.content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

/* Shared icon sizing */
.nav-icon :deep(svg),
.theme-toggle :deep(svg),
.sheet-item-icon :deep(svg),
.bottom-nav-icon :deep(svg) {
  width: 20px;
  height: 20px;
  display: block;
}

.sun-icon {
  stroke: currentColor;
  fill: none;
}

/* Mobile UI hidden on desktop */
.bottom-nav,
.mobile-menu-backdrop,
.mobile-more-sheet {
  display: none;
}

/* Mobile navigation */
@media (max-width: 767px) {
  .shell {
    display: block;
    height: 100dvh;
    overflow: hidden;
  }

  .sidebar {
    display: none;
  }

  .content {
    height: 100%;
    min-height: 0;
    padding-bottom: calc(58px + env(safe-area-inset-bottom));
    overflow-y: auto;
    overflow-x: hidden;
  }

  .bottom-nav {
    position: fixed;
    z-index: 40;
    right: 0;
    bottom: 0;
    left: 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    min-height: calc(56px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    background: color-mix(in srgb, var(--color-surface) 92%, transparent);
    border-top: 1px solid var(--color-border);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .bottom-nav-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.15rem;
    min-width: 0;
    min-height: 52px;
    padding: 0.3rem 0.2rem;
    color: var(--color-text-faint);
    font-family: inherit;
    font-size: 9px;
    font-weight: 600;
    line-height: 1.1;
    text-decoration: none;
    cursor: pointer;
    background: transparent;
    border: 0;
    -webkit-tap-highlight-color: transparent;
  }

  .bottom-nav-icon {
    display: grid;
    width: 19px;
    height: 19px;
    place-items: center;
  }

  .more-icon {
    font-size: 0.75rem;
    letter-spacing: 1px;
  }

  .bottom-nav-item.router-link-exact-active,
  .bottom-nav-item.active {
    color: var(--color-primary);
  }

  .bottom-nav-item.router-link-exact-active .bottom-nav-icon {
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
    border-radius: 8px;
  }

  .mobile-menu-backdrop {
    position: fixed;
    z-index: 50;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    cursor: default;
    background: rgb(0 0 0 / 0.38);
    border: 0;
    backdrop-filter: blur(2px);
  }

  .mobile-more-sheet {
    position: fixed;
    z-index: 60;
    right: 0;
    bottom: 0;
    left: 0;
    display: block;
    max-height: min(72dvh, 520px);
    padding: 0.4rem 0.85rem calc(0.85rem + env(safe-area-inset-bottom));
    overflow-y: auto;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-bottom: 0;
    border-radius: 18px 18px 0 0;
    box-shadow: 0 -18px 44px rgb(0 0 0 / 0.16);
    -webkit-overflow-scrolling: touch;
  }

  .sheet-handle {
    width: 32px;
    height: 3px;
    margin: 0 auto 0.75rem;
    background: var(--color-border);
    border-radius: var(--radius-full);
  }

  .sheet-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 0 0.25rem 0.65rem;
  }

  .sheet-eyebrow {
    margin: 0 0 0.15rem;
    color: var(--color-text-faint);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .sheet-header h2 {
    margin: 0;
    color: var(--color-text);
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: -0.025em;
  }

  .sheet-close-btn {
    display: grid;
    width: 26px;
    height: 26px;
    place-items: center;
    padding: 0;
    color: var(--color-text-muted);
    font-family: inherit;
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: 50%;
  }

  .mobile-search-btn,
  .sheet-nav-item,
  .sheet-theme-btn {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    width: 100%;
    min-height: 44px;
    padding: 0.55rem;
    color: var(--color-text);
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: var(--radius-md);
    -webkit-tap-highlight-color: transparent;
  }

  .mobile-search-btn {
    color: var(--color-text-muted);
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
  }

  .mobile-search-btn:active,
  .sheet-nav-item:active,
  .sheet-theme-btn:active {
    background: var(--color-surface-2);
  }

  .sheet-item-icon {
    display: grid;
    width: 24px;
    height: 24px;
    flex: 0 0 auto;
    place-items: center;
    color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
    border-radius: 7px;
  }

  .sheet-item-hint,
  .theme-state {
    padding: 0.15rem 0.35rem;
    margin-left: auto;
    color: var(--color-text-faint);
    font-size: 9px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
  }

  .sheet-arrow {
    margin-left: auto;
    color: var(--color-text-faint);
    font-size: 1.1rem;
    line-height: 1;
  }

  .sheet-divider {
    height: 1px;
    margin: 0.4rem 0;
    background: var(--color-border);
  }

  .nav-icon :deep(svg),
  .theme-toggle :deep(svg),
  .sheet-item-icon :deep(svg),
  .bottom-nav-icon :deep(svg) {
    width: 18px;
    height: 18px;
    display: block;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.2s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }

  .sheet-enter-active,
  .sheet-leave-active {
    transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .sheet-enter-from,
  .sheet-leave-to {
    transform: translateY(100%);
  }
}
</style>
