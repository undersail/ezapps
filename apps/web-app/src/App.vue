<script setup lang="ts">
const title = import.meta.env.VITE_APP_TITLE ?? 'ezapps'
const apiBase = import.meta.env.VITE_API_BASE ?? 'https://example.com'
const buildTime = new Date().toISOString()
</script>

<template>
  <main class="wrap">
    <h1>{{ title }}</h1>
    <p class="lead">已部署到 Cloudflare Pages 🎉</p>

    <div class="info">
      <div class="row">
        <span class="label">VITE_API_BASE</span>
        <code>{{ apiBase }}</code>
      </div>
      <div class="row">
        <span class="label">构建时间</span>
        <code>{{ buildTime }}</code>
      </div>
      <div class="row">
        <span class="label">仓库</span>
        <a href="https://github.com/undersail/ezapps" target="_blank">undersail/ezapps</a>
      </div>
    </div>
  </main>
</template>

<style scoped>
.wrap {
  max-width: 720px;
  margin: 4rem auto;
  padding: 0 1.5rem;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #1a1a2e;
}
h1 { color: #1565c0; font-size: 2.5rem; margin: 0 0 0.5rem; }
.lead { color: #546e7a; font-size: 1.1rem; margin: 0 0 2rem; }
.info { display: grid; gap: 0.75rem; padding: 1.5rem; background: #fff; border: 1px solid #e0e6ed; border-radius: 12px; }
.row { display: flex; align-items: center; gap: 1rem; }
.label { flex-shrink: 0; width: 140px; color: #607d8b; font-weight: 500; }
code { background: #f0f4f8; padding: 4px 10px; border-radius: 6px; font-size: 0.9em; color: #1565c0; }
a { color: #1976d2; text-decoration: none; }
a:hover { text-decoration: underline; }
</style>
