// src/router/index.js

import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import ChatView from '@/views/ChatView.vue'
import SettingsView from '@/views/SettingsView.vue'
import FaqView from '@/views/FaqView.vue'
import PromptsView from '@/views/PromptsView.vue'
import PseudocodeView from '@/views/PseudoCodeView.vue'

const routes = [
  { path: '/', name: 'Dashboard', component: DashboardView },
  { path: '/chat', name: 'Chat', component: ChatView },
  { path: '/projects', name: 'Projects', component: () => import('@/views/ProjectsView.vue') },
  { path: '/projects/:id', name: 'ProjectDetail', component: () => import("@/views/ProjectDetailView.vue") },
  { path: '/ollama-models', name: 'Ollama Models', component: () => import('@/views/OllamaModelsView.vue') },
  { path: '/lms-models', name: 'LM Studio Models', component: () => import('@/views/LmStudioModelsView.vue') },
  { path: '/settings', name: 'Settings', component: SettingsView },
  { path: '/faq', name: 'FAQ', component: FaqView },
  { path: '/archive', name: 'Archive', component: () => import("@/views/ArchiveView.vue") },
  { path: '/prompts', name: 'Prompts', component: PromptsView },
  { path: '/pseudocode', name: 'Pseudocode', component: PseudocodeView },
]

export default createRouter({
  history: createWebHistory(),
  routes
})
