<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apps, type AppEntry } from './apps.config'
import AppCard from './components/AppCard.vue'
import Hero from './components/Hero.vue'
import { usePinnedApps } from './composables/usePinnedApps'

const { sortedIds, isPinned, togglePin, MAX } = usePinnedApps()
const buildTime = new Date().toISOString()

// ===== 访问统计（页脚） =====
const API_BASE = 'https://api.ezapps.cc'
const stats = ref<Record<string, number>>({})
const statsLoaded = ref(false)
const appMeta: Record<string, { emoji: string; name: string }> = {
  funphy: { emoji: '✈️', name: '飞飞历险记' },
  funmath: { emoji: '🧮', name: '曼曼闯天涯' },
  ezchess: { emoji: '♟️', name: '一起来下棋' },
  grimphy: { emoji: '🔬', name: '物理实验室' },
}
const fmt = (n: number) => (n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n))
onMounted(async () => {
  // 主页访问打点 + 拉取统计
  try { fetch(`${API_BASE}/api/stats/hit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app: 'home' }) }).catch(() => {}) } catch { /* 忽略 */ }
  try {
    const res = await fetch(`${API_BASE}/api/stats`)
    if (res.ok) { stats.value = await res.json(); statsLoaded.value = true }
  } catch { /* 统计不可用则不显示 */ }
})

/** 按置顶时间倒序的 app（最多 MAX 个） */
const pinnedApps = computed<AppEntry[]>(() => {
  const map = new Map(apps.map((a) => [a.id, a]))
  return sortedIds.value.map((id) => map.get(id)).filter((a): a is AppEntry => !!a)
})

/** 未置顶的 app，保持原顺序 */
const otherApps = computed<AppEntry[]>(() => {
  const pinnedSet = new Set(sortedIds.value)
  return apps.filter((a) => !pinnedSet.has(a.id))
})

/** 排序后的完整列表（置顶优先 + 其他在后面） */
const orderedApps = computed<AppEntry[]>(() => [...pinnedApps.value, ...otherApps.value])
</script>

<template>
  <div class="home">
    <Hero />

    <!-- 置顶分组 -->
    <section v-if="pinnedApps.length > 0" class="apps apps--pinned">
      <header class="apps__head">
        <h2>
          <span class="apps__emoji">⭐</span> 已置顶
          <span class="apps__count">{{ pinnedApps.length }} / {{ MAX }}</span>
        </h2>
      </header>
      <div class="apps__grid">
        <AppCard
          v-for="app in pinnedApps"
          :key="`pin-${app.id}`"
          :app="app"
          :pinned="true"
          @toggle-pin="togglePin"
        />
      </div>
    </section>

    <!-- 全部应用 -->
    <section class="apps">
      <header class="apps__head">
        <h2>
          <span class="apps__emoji">📦</span> 应用清单
          <span class="apps__count">{{ otherApps.length }} 个</span>
        </h2>
        <p>
          点击左下角
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
               stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
               style="display:inline-block;vertical-align:-2px;color:#94a3b8"
               aria-hidden="true">
            <path d="M12 17v5" />
            <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z" />
          </svg>
          可置顶（最多 {{ MAX }} 个，超出时自动覆盖最早置顶的）。
        </p>
      </header>

      <div v-if="otherApps.length === 0" class="empty">
        <p>✨ 所有应用都已置顶，再加新应用就会自动出现。</p>
      </div>
      <div v-else class="apps__grid">
        <AppCard
          v-for="app in otherApps"
          :key="app.id"
          :app="app"
          :pinned="false"
          @toggle-pin="togglePin"
        />
      </div>
    </section>

    <footer class="foot">
      <div v-if="statsLoaded" class="foot__stats" aria-label="访问统计">
        <div class="foot__stats-total">
          <span class="foot__stats-icon">👀</span>
          <span class="foot__stats-label">总访问</span>
          <b>{{ fmt(stats.home) }}</b>
        </div>
        <span class="foot__stats-sep"></span>
        <div v-for="(meta, id) in appMeta" :key="id" class="foot__stats-item">
          <span class="foot__stats-icon">{{ meta.emoji }}</span>
          <span class="foot__stats-label">{{ meta.name }}</span>
          <b>{{ fmt(stats[id] || 0) }}</b>
        </div>
      </div>

      <div class="foot__wechat" aria-label="科普狮公众号">
        <img src="/kepushi-qrcode.jpg" alt="科普狮公众号二维码" class="foot__wechat-qr" />
        <div class="foot__wechat-info">
          <b>科普狮</b>
          <span>码农视角看世界</span>
          <span class="foot__wechat-id">公众号 ID：scilion</span>
        </div>
      </div>

      <p class="foot__copy">
        EZAPPS · {{ new Date().getFullYear() }} · by
        <a href="https://github.com/undersail">@undersail</a>
      </p>

      <div class="foot__meta" aria-label="build metadata">
        <span class="foot__meta-item">
          <span class="foot__meta-label">构建时间</span>
          <code>{{ buildTime }}</code>
        </span>
      </div>
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
  margin-top: 2.5rem;
}
.apps__head {
  margin-bottom: 1.25rem;
}
.apps__head h2 {
  font-size: 1.5rem;
  margin: 0 0 0.4rem;
  color: #0f172a;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.apps__emoji {
  font-size: 1.3rem;
}
.apps__count {
  margin-left: 0.4rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 10px;
  border-radius: 999px;
}
.apps__head p {
  color: #64748b;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
}
.apps--pinned .apps__head h2 {
  color: #b45309;
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
  font-size: 1.05rem;
  background: #fafafa;
  border-radius: 12px;
}
.foot {
  margin-top: 5rem;
  padding: 2.5rem 1rem 2rem;
  border-top: 1px solid #e2e8f0;
  text-align: center;
  color: #94a3b8;
  font-size: 0.9rem;
}
.foot__stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem 1.25rem;
  margin-bottom: 1.5rem;
  padding: 0.8rem 1.25rem;
  background: linear-gradient(135deg, #f8fafc, #eef2ff);
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  font-size: 0.85rem;
  color: #475569;
}
.foot__stats-total {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding-right: 1.25rem;
  border-right: 1px dashed #cbd5e1;
  font-weight: 600;
}
.foot__stats-total b {
  font-size: 1.05rem;
  color: #4f46e5;
  font-variant-numeric: tabular-nums;
}
.foot__stats-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.foot__stats-icon {
  font-size: 0.95rem;
}
.foot__stats-label {
  color: #64748b;
}
.foot__stats-item b {
  color: #1e293b;
  font-variant-numeric: tabular-nums;
}
.foot__stats-sep {
  display: none;
}
@media (max-width: 560px) {
  .foot__stats {
    gap: 0.4rem 0.9rem;
    font-size: 0.78rem;
  }
  .foot__stats-total {
    padding-right: 0.9rem;
  }
}
.foot__wechat {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin: 0 auto 1.5rem;
  padding: 0.9rem 1.4rem;
  max-width: 420px;
  background: linear-gradient(135deg, #f8fafc, #eef2ff);
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}
.foot__wechat-qr {
  width: 76px;
  height: 76px;
  border-radius: 8px;
  flex: none;
}
.foot__wechat-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  font-size: 0.85rem;
  color: #475569;
}
.foot__wechat-info b {
  font-size: 1rem;
  color: #0f172a;
}
.foot__wechat-id {
  font-size: 0.75rem;
  color: #94a3b8;
}
.foot__copy {
  margin: 0 0 0.5rem;
}
.foot__small {
  margin: 0 0 1.5rem;
  font-size: 0.8rem;
  color: #cbd5e1;
}

/* footer 底部技术 meta：横排、灰阶 */
.foot__meta {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem 1.5rem;
  margin-top: 0.5rem;
  padding-top: 1.25rem;
  border-top: 1px dashed #e2e8f0;
}
.foot__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.78rem;
}
.foot__meta-label {
  color: #94a3b8;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.foot__meta code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85em;
  color: #64748b;
  background: #f8fafc;
  border: 1px solid #eef2f6;
  padding: 3px 10px;
  border-radius: 6px;
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
</style>
