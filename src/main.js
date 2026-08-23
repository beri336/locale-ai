// src/main.js

/// Creates and configures the Vue application.
/// Registers Pinia, client-side routing, global theme styles, and the PWA
/// service worker before mounting the application to the root element.

import { createApp } from "vue";
import { createPinia } from "pinia";
import { registerSW } from "virtual:pwa-register";

import App from "@/App.vue";
import router from "@/router";

import "@/assets/theme.css";


const APP_ROOT_SELECTOR = "#app";

const app = createApp(App);

app.use(createPinia());
app.use(router);


/**
 * Registers the PWA service worker after Vue Router has resolved its initial route.
 */
function registerServiceWorker() {
    registerSW({
        immediate: true,

        /**
         * Logs when all required PWA assets are cached for offline usage.
         */
        onOfflineReady() {
            console.info("App is ready for offline use.");
        },

        /**
         * Prompts the user to refresh when a new service-worker version is available.
         *
         * @param {() => void} updateServiceWorker Activates the waiting service worker
         */
        onNeedRefresh(updateServiceWorker) {
            const shouldUpdate = window.confirm(
                "A new app version is available. Update now?",
            );

            if (shouldUpdate)
                updateServiceWorker(true);
        },

        /**
         * Logs service-worker registration failures.
         *
         * @param {unknown} error Registration error
         */
        onRegisterError(error) {
            console.error("Service worker registration failed:", error);
        },
    });
}

router.isReady().then(registerServiceWorker);

app.mount(APP_ROOT_SELECTOR);
