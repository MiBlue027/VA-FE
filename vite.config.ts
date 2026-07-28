import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [
        vue()
    ],

    resolve: {
        dedupe: [
            'pixi.js'
        ]
    },

    optimizeDeps: {
        include: [
            'pixi.js',
            'pixi-live2d-display'
        ]
    }
})