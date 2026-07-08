<!-- src/views/DashboardView.vue -->

<template>
  <div class="dashboard-view">
    <header class="page-header">
      <h1>Dashboard</h1>
    </header>

    <div class="quick-actions">
      <button class="btn-primary" @click="$router.push('/chat')">
        + New Chat
      </button>
      <button class="btn-primary" @click="$router.push('/projects')">
        + New Project
      </button>
    </div>

    <section class="dashboard-section">
      <h2>Recent Chats</h2>
      <!-- Liste der letzten 5 Chats aus beiden Quellen -->
    </section>

    <section class="dashboard-section">
      <h2>Active Projects</h2>
      <!-- Kompakte Karten der letzten Projekte -->
    </section>

    <section class="dashboard-section">
      <h2>Model Status</h2>
      <!-- Verfügbare Ollama-Modelle -->
    </section>
  </div>
</template>

<script setup></script>

<style scoped>
.dashboard {
  padding: var(--space-8) var(--space-6);
}

h1 {
  font-size: var(--font-size-xl);
  margin-bottom: var(--space-2);
}

p {
  color: var(--color-text-muted);
}
</style>
