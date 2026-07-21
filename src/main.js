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
    registerSW({
        immediate: true,

        onOfflineReady() {
            console.info("App ist offline verfügbar.");
        },

        onNeedRefresh() {
            console.info("Neue App-Version verfügbar.");
        },
    });
});

app.mount('#app')
