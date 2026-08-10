import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  base: '/funphy/',
  build: {
    outDir: fileURLToPath(new URL('../web-app/dist/funphy', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    host: '0.0.0.0',
  },
})
