<script setup lang="ts">
defineProps<{
  apiBase: string
  buildTime: string
}>()
</script>

<template>
  <header class="hero">
    <div class="hero__mark">EZ</div>
    <h1>EZ Apps</h1>
    <p class="tag">小工具合集 · 专注做好每一件小事</p>
    <p class="intro">
      <strong>EZApps</strong> 是一个由 Jack 维护的个人应用集合站。每一款应用都聚焦一个具体的痛点或好玩的想法，做得<strong>足够小、足够专注</strong>。
      工具会持续加入——从互动学习到日常效率，每一款都保持独立、有趣、可点击即用。
    </p>
    <p class="intro intro--meta">
      目前在维护的有物理小游戏合集「<a href="/funphy/">物理实验室</a>」。
      未来的小工具会作为 <code>apps/&lt;name&gt;</code> 子目录独立开发，主页会自动展示。
    </p>
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
  font-size: 3.25rem;
  margin: 0 0 0.6rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, #1565c0 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.tag {
  font-size: 1.15rem;
  color: #475569;
  margin: 0 0 2rem;
}
.intro {
  color: #475569;
  line-height: 1.75;
  font-size: 1rem;
  margin: 0 auto 1.25rem;
  max-width: 640px;
}
.intro strong {
  color: #0f172a;
}
.intro a {
  color: #7c3aed;
  text-decoration: none;
  font-weight: 500;
}
.intro a:hover {
  text-decoration: underline;
}
.intro--meta {
  font-size: 0.9rem;
  color: #64748b;
  border-top: 1px dashed #e2e8f0;
  padding-top: 1.25rem;
  margin-top: 1.5rem;
  margin-bottom: 2rem;
}
.intro--meta code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85em;
  background: rgba(124, 58, 237, 0.1);
  color: #6d28d9;
  padding: 2px 8px;
  border-radius: 4px;
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
