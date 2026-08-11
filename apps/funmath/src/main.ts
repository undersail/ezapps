import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

const app = createApp(App)

// 全局错误处理：捕获 Vue 组件渲染/事件错误
app.config.errorHandler = (err, _instance, info) => {
  console.error('[Vue Error]', err, info)
  // 在 window 上标记，App.vue 会读取并显示降级 UI
  ;(window as any).__funmathLastError = err
  // 错误上报到 localStorage（用于排查 + 触发降级）
  try {
    const key = 'funmath:lastError'
    localStorage.setItem(key, String((err as Error)?.message ?? err))
    // 6 秒后自动清除（避免长期占用）
    setTimeout(() => localStorage.removeItem(key), 6000)
  } catch {}
}

// 全局 Promise 异常捕获（异步 chunk 加载失败等）
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Rejection]', e.reason)
  ;(window as any).__funmathLastError = e.reason
  try {
    localStorage.setItem('funmath:lastError', String((e.reason as Error)?.message ?? e.reason))
    setTimeout(() => localStorage.removeItem('funmath:lastError'), 6000)
  } catch {}
})

// 全局 JS 错误捕获
window.addEventListener('error', (e) => {
  // 只处理真正的运行时错误（e.error 存在），忽略资源加载错误
  if (e.error) {
    console.error('[Window Error]', e.error)
    ;(window as any).__funmathLastError = e.error
    try {
      localStorage.setItem('funmath:lastError', String(e.error.message ?? e.error))
      setTimeout(() => localStorage.removeItem('funmath:lastError'), 6000)
    } catch {}
  }
})

app.mount('#app')