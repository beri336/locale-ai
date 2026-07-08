// src/router/index.js

import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import ChatView from '@/views/ChatView.vue'
import ProjectsView from '@/views/ProjectsView.vue'
import ProjectDetailView from '@/views/ProjectDetailView.vue'
import ModelsView from '@/views/ModelsView.vue'
import SettingsView from '@/views/SettingsView.vue'

const routes = [
  { path: '/', name: 'Dashboard', component: DashboardView },
  { path: '/chat', name: 'Chat', component: ChatView },
  { path: '/projects', name: 'Projects', component: () => ProjectsView },
  { path: '/projects/:id', name: 'ProjectDetail', component: () => ProjectDetailView },
  { path: '/models', name: 'Models', component: ModelsView },
  { path: '/settings', name: 'Settings', component: SettingsView },
]

export default createRouter({
  history: createWebHistory(),
  routes
})
