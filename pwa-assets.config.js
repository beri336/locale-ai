// pwa-assets.config.js

/// Configures automatic generation of Progressive Web App icons and assets.
/// Uses the project favicon as the source image and the Vite PWA
/// minimal 2023 asset preset.

import {
    defineConfig,
    minimal2023Preset as preset,
} from "@vite-pwa/assets-generator/config";

const SOURCE_ICON_PATH = "public/favicon.svg";


export default defineConfig({
    preset,
    images: [
        SOURCE_ICON_PATH,
    ],
});
