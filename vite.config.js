// vite.config.js

/// Configures the Vite development and production build pipeline.
/// Registers Vue tooling and PWA support, defines the app version at build time,
/// and configures the @ alias for source-directory imports.

import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import vueDevTools from "vite-plugin-vue-devtools";
import { VitePWA } from "vite-plugin-pwa";


const APP_NAME = "LocalAI";
const APP_SHORT_NAME = "LocalAI";
const APP_DESCRIPTION =
  "A local AI workspace for chats, projects, prompts, and model management.";

const APP_THEME_COLOR = "#0f172a";
const APP_BACKGROUND_COLOR = "#0f172a";

const APP_START_URL = "/";
const APP_SCOPE = "/";

const SOURCE_DIRECTORY = "./src";
const PACKAGE_JSON_PATH = "./package.json";

const PWA_ICONS = [
  {
    src: "/pwa-192x192.png",
    sizes: "192x192",
    type: "image/png",
  },
  {
    src: "/pwa-512x512.png",
    sizes: "512x512",
    type: "image/png",
  },
  {
    src: "/maskable-icon-512x512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
];

const WORKBOX_GLOB_PATTERNS = [
  "**/*.{js,css,html,ico,png,svg,webp,woff2}",
];

const packageJson = JSON.parse(
  readFileSync(
    new URL(PACKAGE_JSON_PATH, import.meta.url),
    "utf-8",
  ),
);

/**
 * Configures Vite, Vue, and Progressive Web App build integration.
 */
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),

    VitePWA({
      registerType: "prompt",
      injectRegister: null,

      manifest: {
        name: APP_NAME,
        short_name: APP_SHORT_NAME,
        description: APP_DESCRIPTION,
        theme_color: APP_THEME_COLOR,
        background_color: APP_BACKGROUND_COLOR,
        display: "standalone",
        start_url: APP_START_URL,
        scope: APP_SCOPE,
        icons: PWA_ICONS,
      },

      workbox: {
        navigateFallback: "/index.html",
        globPatterns: WORKBOX_GLOB_PATTERNS,
      },
    }),
  ],

  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },

  resolve: {
    alias: {
      "@": fileURLToPath(
        new URL(SOURCE_DIRECTORY, import.meta.url),
      ),
    },
  },
});
