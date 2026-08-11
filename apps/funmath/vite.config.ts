import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  base: '/funmath/',
  build: {
    outDir: fileURLToPath(new URL('../web-app/dist/funmath', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
  },
  server: { port: 5176, host: '0.0.0.0' },
})
