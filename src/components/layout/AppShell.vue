<!-- src/components/layout/AppShell.vue -->

<template>
    <div class="shell">
        <aside class="sidebar">
            <div class="logo">LocalAI</div>
            <nav>
                <RouterLink to="/" class="nav-item">Dashboard</RouterLink>
                <RouterLink to="/chat" class="nav-item">Chat</RouterLink>
                <RouterLink to="/models" class="nav-item">Models</RouterLink>
                <RouterLink to="/settings" class="nav-item">Settings</RouterLink>
            </nav>
            <button class="theme-toggle" @click="themeStore.toggle()">
                {{ themeStore.theme === 'light' ? '🌙' : '☀️' }}
            </button>
        </aside>

        <main class="content">
            <RouterView />
        </main>
    </div>
</template>

<script setup>
import { useThemeStore } from "@/stores/themeStore";

const themeStore = useThemeStore();
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
    padding: var(--space-4)
}

.logo {
    font-weight: 700;
    font-size: var(--font-size-lg);
    margin-bottom: var(--space-6);
    padding: 0 var(--space-4);
}

nav {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    flex: 1;
}

.nav-item {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    text-decoration: none;
    font-size: var(--text-sm);
    font-weight: 500;
    transition: background 0.2s, color 0.2s;
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
</style>