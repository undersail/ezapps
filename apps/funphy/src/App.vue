<script setup lang="ts">
try { fetch('https://api.ezapps.cc/api/stats/hit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app: 'funphy' }) }).catch(() => {}) } catch { /* 忽略 */ }
// V2-1 临时入口：直接进入跑酷测试关（V2-5 将替换为正式大厅页）
import RunnerCanvas from './components/RunnerCanvas.vue'
</script>

<template>
  <div class="funphy-app">
    <RunnerCanvas />
  </div>
</template>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  background: #030712;
}
.funphy-app {
  height: 100%;
}
</style>
