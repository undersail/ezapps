<script setup lang="ts">
import { apps } from './apps.config'
import AppCard from './components/AppCard.vue'
import Hero from './components/Hero.vue'

const buildTime = new Date().toISOString()
const apiBase = import.meta.env.VITE_API_BASE ?? 'https://example.com'
</script>

<template>
  <div class="home">
    <Hero :api-base="apiBase" :build-time="buildTime" />

    <section class="apps">
      <header class="apps__head">
        <h2>应用清单</h2>
        <p>每一款都专注于一件事。点击卡片进入。</p>
      </header>

      <div v-if="apps.length === 0" class="empty">
        <p>🛠 还在打磨中，敬请期待。</p>
      </div>
      <div v-else class="apps__grid">
        <AppCard v-for="app in apps" :key="app.id" :app="app" />
      </div>
    </section>

    <footer class="foot">
      <p>
        EZApps · {{ new Date().getFullYear() }} · by
        <a href="https://github.com/undersail">@undersail</a>
      </p>
      <p class="foot__small">
        添加新应用？只需在 <code>apps/&lt;name&gt;</code> 新建子项目并加一行 <code>apps.config.ts</code>。
      </p>
    </footer>
  </div>
</template>

<style scoped>
.home {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 1.5rem 4rem;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #1a1a2e;
}
.apps {
  margin-top: 3rem;
}
.apps__head {
  margin-bottom: 2rem;
}
.apps__head h2 {
  font-size: 1.75rem;
  margin: 0 0 0.5rem;
  color: #0f172a;
  font-weight: 700;
}
.apps__head p {
  color: #64748b;
  margin: 0;
}
.apps__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}
.empty {
  padding: 3rem;
  text-align: center;
  color: #94a3b8;
  font-size: 1.1rem;
}
.foot {
  margin-top: 6rem;
  padding-top: 2rem;
  border-top: 1px solid #e2e8f0;
  text-align: center;
  color: #94a3b8;
  font-size: 0.9rem;
}
.foot p {
  margin: 0 0 0.5rem;
}
.foot a {
  color: #1565c0;
  text-decoration: none;
  font-weight: 500;
}
.foot a:hover {
  text-decoration: underline;
}
.foot__small {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: #cbd5e1;
}
.foot code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85em;
  background: rgba(21, 101, 192, 0.06);
  color: #475569;
  padding: 2px 6px;
  border-radius: 3px;
  margin: 0 2px;
}
</style>
