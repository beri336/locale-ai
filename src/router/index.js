// src/router/index.js

import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import ChatView from '@/views/ChatView.vue'
import ModelsView from '@/views/ModelsView.vue'
import SettingsView from '@/views/SettingsView.vue'
import FaqView from '@/views/FaqView.vue'
import PromptsView from '@/views/PromptsView.vue'

const routes = [
  { path: '/', name: 'Dashboard', component: DashboardView },
  { path: '/chat', name: 'Chat', component: ChatView },
  { path: '/projects', name: 'Projects', component: () => import('@/views/ProjectsView.vue') },
  { path: '/projects/:id', name: 'ProjectDetail', component: () => import("@/views/ProjectDetailView.vue") },
  { path: '/models', name: 'Models', component: ModelsView },
  { path: '/settings', name: 'Settings', component: SettingsView },
  { path: '/faq', name: 'FAQ', component: FaqView },
  { path: '/archive', name: 'Archive', component: () => import("@/views/ArchiveView.vue") },
  { path: '/prompts', name: 'Prompts', component: PromptsView },
]

export default createRouter({
  history: createWebHistory(),
  routes
})
