// src/router/index.js

/// Configures the application's client-side routes.
/// Loads core views eagerly and feature-specific views lazily
/// to reduce the initial bundle size.

import { createRouter, createWebHistory } from "vue-router";

import ChatView from "@/views/ChatView.vue";
import DashboardView from "@/views/DashboardView.vue";
import FaqView from "@/views/FaqView.vue";
import PromptsView from "@/views/PromptsView.vue";
import PseudocodeView from "@/views/PseudoCodeView.vue";
import SettingsView from "@/views/SettingsView.vue";

const ROUTE_NAMES = {
  ARCHIVE: "Archive",
  CHAT: "Chat",
  DASHBOARD: "Dashboard",
  FAQ: "FAQ",
  LM_STUDIO_MODELS: "LM Studio Models",
  OLLAMA_MODELS: "Ollama Models",
  PROJECT_DETAIL: "ProjectDetail",
  PROJECTS: "Projects",
  PROMPTS: "Prompts",
  PSEUDOCODE: "Pseudocode",
  SETTINGS: "Settings",
};

const routes = [
  {
    path: "/",
    name: ROUTE_NAMES.DASHBOARD,
    component: DashboardView,
  },
  {
    path: "/chat",
    name: ROUTE_NAMES.CHAT,
    component: ChatView,
  },
  {
    path: "/projects",
    name: ROUTE_NAMES.PROJECTS,
    component: () => import("@/views/ProjectsView.vue"),
  },
  {
    path: "/projects/:id",
    name: ROUTE_NAMES.PROJECT_DETAIL,
    component: () => import("@/views/ProjectDetailView.vue"),
    props: true,
  },
  {
    path: "/ollama-models",
    name: ROUTE_NAMES.OLLAMA_MODELS,
    component: () => import("@/views/OllamaModelsView.vue"),
  },
  {
    path: "/lms-models",
    name: ROUTE_NAMES.LM_STUDIO_MODELS,
    component: () => import("@/views/LmStudioModelsView.vue"),
  },
  {
    path: "/settings",
    name: ROUTE_NAMES.SETTINGS,
    component: SettingsView,
  },
  {
    path: "/faq",
    name: ROUTE_NAMES.FAQ,
    component: FaqView,
  },
  {
    path: "/archive",
    name: ROUTE_NAMES.ARCHIVE,
    component: () => import("@/views/ArchiveView.vue"),
  },
  {
    path: "/prompts",
    name: ROUTE_NAMES.PROMPTS,
    component: PromptsView,
  },
  {
    path: "/pseudocode",
    name: ROUTE_NAMES.PSEUDOCODE,
    component: PseudocodeView,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});


export default router;
