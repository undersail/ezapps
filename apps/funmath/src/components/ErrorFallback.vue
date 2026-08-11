<script setup lang="ts">
// 全局错误降级 UI
// 监听 window.__funmathLastError，一旦有错误就显示
// 用户可点"清缓存重试"按钮彻底恢复

import { ref, onMounted, onUnmounted } from 'vue'

const error = ref<string | null>(null)
let timer: number | null = null

function checkError() {
  // 1. 检查 window 全局变量
  const w = window as any
  if (w.__funmathLastError) {
    error.value = String(w.__funmathLastError?.message ?? w.__funmathLastError)
  }
  // 2. 检查 localStorage（main.ts 也会写）
  try {
    const stored = localStorage.getItem('funmath:lastError')
    if (stored && !error.value) {
      error.value = stored
    }
  } catch {}
}

onMounted(() => {
  checkError()
  // 每 1 秒检查一次（覆盖 main.ts 设置后再发生错误的情况）
  timer = window.setInterval(checkError, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})

function clearAndReload() {
  // 彻底清理：localStorage + sessionStorage + cache
  try {
    localStorage.clear()
    sessionStorage.clear()
  } catch {}
  // 清掉触发标记
  try {
    ;(window as any).__funmathLastError = null
  } catch {}
  // 强制刷新（避免缓存）
  window.location.reload()
}
</script>

<template>
  <div v-if="error" class="error-fallback">
    <div class="error-fallback__card">
      <div class="error-fallback__emoji">😅</div>
      <h2>页面出了点小问题</h2>
      <p class="error-fallback__hint">
        可能是浏览器缓存了旧版本数据。<br />
        点击下方按钮可以一键清理并刷新。
      </p>
      <details v-if="error" class="error-fallback__details">
        <summary>查看错误信息</summary>
        <pre>{{ error }}</pre>
      </details>
      <button class="error-fallback__btn" @click="clearAndReload">
        🧹 清缓存并刷新
      </button>
      <a href="https://ezapps.pages.dev/funmath/" class="error-fallback__link">
        或直接访问首页
      </a>
    </div>
  </div>
</template>

<style scoped>
.error-fallback {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 9999;
}

.error-fallback__card {
  background: white;
  border-radius: 16px;
  padding: 2rem 1.5rem;
  max-width: 480px;
  width: 100%;
  text-align: center;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.1);
  font-family: system-ui, -apple-system, "PingFang SC", sans-serif;
}

.error-fallback__emoji {
  font-size: 3.5rem;
  margin-bottom: 0.5rem;
}

.error-fallback__card h2 {
  margin: 0 0 0.75rem;
  font-size: 1.4rem;
  color: #92400e;
}

.error-fallback__hint {
  color: #78350f;
  margin: 0 0 1rem;
  line-height: 1.6;
}

.error-fallback__details {
  text-align: left;
  margin-bottom: 1rem;
  font-size: 0.8rem;
  color: #94a3b8;
}
.error-fallback__details summary {
  cursor: pointer;
  padding: 0.25rem 0;
}
.error-fallback__details pre {
  background: #f1f5f9;
  padding: 0.5rem;
  border-radius: 6px;
  overflow-x: auto;
  max-height: 120px;
  font-size: 0.7rem;
  margin: 0.5rem 0 0;
}

.error-fallback__btn {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border: none;
  padding: 0.85rem 1.5rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  margin-top: 0.5rem;
  box-shadow: 0 8px 24px rgba(245, 158, 11, 0.3);
  transition: transform 0.15s;
  font-family: inherit;
}
.error-fallback__btn:hover {
  transform: translateY(-2px);
}

.error-fallback__link {
  display: inline-block;
  margin-top: 1rem;
  color: #047857;
  font-size: 0.85rem;
  text-decoration: none;
}
.error-fallback__link:hover {
  text-decoration: underline;
}
</style>