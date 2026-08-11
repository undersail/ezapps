<script setup lang="ts">
defineProps<{
  apiBase: string
  buildTime: string
}>()
</script>

<template>
  <header class="hero">
    <div class="hero__mark">EZ</div>
    <h1>EZAPPS</h1>
    <p class="tag">由 Jack 持续打磨的工具游戏合集，简单但好玩儿好用。</p>
    <div class="meta">
      <span><b>VITE_API_BASE</b> <code>{{ apiBase }}</code></span>
      <span><b>构建时间</b> <code>{{ buildTime }}</code></span>
    </div>
  </header>
</template>

<style scoped>
.hero {
  text-align: center;
  padding: 5rem 0 3rem;
  max-width: 760px;
  margin: 0 auto;
}
.hero__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 18px;
  background: linear-gradient(135deg, #1565c0 0%, #7c3aed 100%);
  color: white;
  font-weight: 800;
  font-size: 1.5rem;
  letter-spacing: -0.04em;
  box-shadow: 0 12px 40px rgba(21, 101, 192, 0.32);
  margin-bottom: 1.75rem;
}
.hero h1 {
  font-size: 3.5rem;
  margin: 0 0 0.75rem;
  font-weight: 800;
  letter-spacing: -0.05em;
  background: linear-gradient(135deg, #1565c0 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.tag {
  font-size: 1.1rem;
  color: #475569;
  margin: 0 auto 2.5rem;
  line-height: 1.6;
  max-width: 580px;
}
.meta {
  display: flex;
  justify-content: center;
  gap: 1.25rem;
  flex-wrap: wrap;
  font-size: 0.85rem;
}
.meta b {
  color: #64748b;
  margin-right: 0.5rem;
  font-weight: 500;
}
.meta code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  background: rgba(21, 101, 192, 0.08);
  color: #1565c0;
  padding: 4px 10px;
  border-radius: 6px;
}
</style>
