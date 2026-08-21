<script setup lang="ts">
// 人生计算器 · EZLife Calculator —— 光阴有限，算算你还有多少时间可以虚度
try { fetch('https://api.ezapps.cc/api/stats/hit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app: 'ezlife' }) }).catch(() => {}) } catch { /* 忽略 */ }
</script>

<template>
  <div class="life">
    <header class="hero">
      <div class="badge">BETA · EZLife Calculator</div>
      <h1>⏳ 人生计算器</h1>
      <p class="tag">光阴有限，算算你还有多少时间可以虚度。</p>
      <p class="intro">
        功能开发中，敬请期待 —— 很快就能算出你的人生还剩多少「可虚度额度」。
      </p>
    </header>

    <main class="body">
      <div class="coming">🚧 正在建设中…</div>
    </main>

    <footer class="foot">
      <a href="/">← 返回 EZAPPS 主页</a>
    </footer>
  </div>
</template>

<style scoped>
.life {
  max-width: 720px;
  margin: 0 auto;
  padding: 4rem 1.5rem 2rem;
}
.hero { text-align: center; margin-bottom: 2.5rem; }
.badge {
  display: inline-block;
  font-size: 0.75rem;
  background: linear-gradient(135deg, #f59e0b, #ea580c);
  color: white;
  padding: 4px 12px;
  border-radius: 999px;
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
  box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);
}
.hero h1 {
  font-size: 2.8rem;
  margin: 0 0 0.5rem;
  letter-spacing: -0.03em;
  font-weight: 800;
  background: linear-gradient(135deg, #92400e, #f59e0b);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.tag { font-size: 1.05rem; color: #d97706; margin: 0 0 1rem; font-weight: 500; }
.intro { color: #64748b; max-width: 520px; margin: 0 auto; line-height: 1.7; }
.body { min-height: 240px; display: flex; align-items: center; justify-content: center; }
.coming {
  font-size: 1.1rem;
  color: #94a3b8;
  background: #fff;
  border: 2px dashed #e2e8f0;
  border-radius: 16px;
  padding: 3rem 4rem;
}
.foot { text-align: center; margin-top: 3rem; }
.foot a { color: #94a3b8; text-decoration: none; font-size: 0.9rem; }
.foot a:hover { color: #64748b; }
</style>
