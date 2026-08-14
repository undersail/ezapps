import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  base: '/ezchess/',
  build: {
    outDir: fileURLToPath(new URL('../web-app/dist/ezchess', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
  },
  server: { port: 5177, host: '0.0.0.0' },
})
