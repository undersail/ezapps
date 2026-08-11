<script setup lang="ts">
interface ExperimentCard {
  id: string
  icon: string
  title: string
  desc: string
  accent: string
  badge?: string
}

const experiments: ExperimentCard[] = [
  { id: 'pendulum',  icon: '⏱️', title: '单摆',     desc: '长度、角度、阻尼对周期的影响',     accent: '#a855f7' },
  { id: 'gravity',   icon: '🪐', title: '引力奇点', desc: '模拟引力源，观察轨道如何扭曲',     accent: '#3b82f6' },
  { id: 'light',     icon: '🔆', title: '光学折射', desc: '光从空气进入水的角度变化',         accent: '#f59e0b' },
  { id: 'circuit',   icon: '🔋', title: '电路',     desc: '搭一个闭合回路，看电流怎么流',     accent: '#10b981' },
  { id: 'wave',      icon: '🌊', title: '波叠加',   desc: '两列波相遇会发生什么',             accent: '#06b6d4' },
  { id: 'magnet',    icon: '🧲', title: '磁场',     desc: '磁感线随手画',                     accent: '#ef4444', badge: 'NEW' },
  { id: 'spring',    icon: '🌀', title: '弹簧振子', desc: '虎克定律的可视化探索',             accent: '#14b8a6' },
  { id: 'friction',  icon: '🛷', title: '摩擦力',   desc: '摩擦系数与初速度如何决定滑行距离', accent: '#0ea5e9' },
]
</script>

<template>
  <div class="lab">
    <header class="hero">
      <div class="badge">Lab · Grimphy</div>
      <h1>🔬 物理实验室</h1>
      <p class="tag">Grimphy Lab · 物理实验趣味动画演示</p>
      <p class="intro">
        每个卡片是一个<strong>独立的小实验</strong>。点进去看现象、学原理——不用记公式，看见就知道物理在发生什么。
      </p>
    </header>

    <section class="grid">
      <a
        v-for="e in experiments"
        :key="e.id"
        :href="`#${e.id}`"
        class="card"
        :style="{ '--accent': e.accent }"
        @click.prevent
      >
        <div v-if="e.badge" class="card__badge">{{ e.badge }}</div>
        <div class="card__icon">{{ e.icon }}</div>
        <h3>{{ e.title }}</h3>
        <p>{{ e.desc }}</p>
        <span class="card__cta">▶ 查看演示</span>
      </a>
    </section>

    <footer class="foot">
      <a href="/">← 返回 EZAPPS 主页</a>
    </footer>
  </div>
</template>

<style scoped>
.lab {
  max-width: 1120px;
  margin: 0 auto;
  padding: 4rem 1.5rem;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #1a1a2e;
}
.hero { text-align: center; margin-bottom: 3rem; }
.badge {
  display: inline-block;
  font-size: 0.75rem;
  background: #06b6d4;
  color: white;
  padding: 4px 12px;
  border-radius: 999px;
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
}
.hero h1 { font-size: 2.75rem; margin: 0 0 0.5rem; letter-spacing: -0.03em; }
.tag { font-size: 1.05rem; color: #0891b2; margin: 0 0 1.25rem; font-weight: 500; }
.intro { color: #475569; max-width: 580px; margin: 0 auto; line-height: 1.7; }
.intro strong { color: #0f172a; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.25rem;
}
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: white;
  padding: 1.75rem 1.5rem;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.card:hover {
  transform: translateY(-3px);
  border-color: var(--accent, #06b6d4);
  box-shadow: 0 14px 36px color-mix(in srgb, var(--accent) 18%, transparent);
}
.card__badge {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 0.65rem;
  background: #ef4444;
  color: white;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 700;
  letter-spacing: 0.05em;
}
.card__icon {
  font-size: 2.75rem;
  margin-bottom: 0.75rem;
  filter: drop-shadow(0 6px 12px color-mix(in srgb, var(--accent) 35%, transparent));
}
.card h3 {
  font-size: 1.15rem;
  margin: 0 0 0.4rem;
  color: #0f172a;
}
.card p {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.5;
  flex-grow: 1;
}
.card__cta {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent, #06b6d4);
}

.foot { margin-top: 3rem; text-align: center; }
.foot a { color: #0891b2; text-decoration: none; font-weight: 500; }
</style>
