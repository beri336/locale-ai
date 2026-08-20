// src/main.js

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'

import App from './App.vue'
import router from './router'

import './assets/theme.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

router.isReady().then(() => {
    const updateSW = registerSW({
        immediate: true,

        onOfflineReady() {
            console.info("App ist offline verfügbar.");
        },

        onNeedRefresh() {
            const shouldUpdate = window.confirm(
                "Eine neue App-Version ist verfügbar. Jetzt aktualisieren?",
            );

            if (shouldUpdate) {
                updateSW(true);
            }
        },

        onRegisterError(error) {
            console.error("Service Worker registration failed:", error);
        },
    });
});

app.mount('#app')
