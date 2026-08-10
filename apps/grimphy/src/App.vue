<script setup lang="ts">
interface GameCard {
  id: string
  icon: string
  title: string
  desc: string
  accent: string
  badge?: string
}

const games: GameCard[] = [
  { id: 'gravity',   icon: '🪐', title: '引力奇点', desc: '操控引力源，观察轨道如何扭曲',       accent: '#3b82f6' },
  { id: 'light',     icon: '🔆', title: '光学迷宫', desc: '折射与反射的逻辑谜题',             accent: '#f59e0b' },
  { id: 'circuit',   icon: '🔋', title: '电路作坊', desc: '搭建你的闭合电路，看电压与电流起舞', accent: '#10b981' },
  { id: 'wave',      icon: '🌊', title: '波动工坊', desc: '叠加、干涉、驻波的互动可视化',     accent: '#06b6d4' },
  { id: 'pendulum',  icon: '⏱️', title: '单摆画廊', desc: '长度、角度、阻尼对周期的影响实验',   accent: '#a855f7' },
  { id: 'magnet',    icon: '🧲', title: '磁场沙盘', desc: '磁感线随手画，磁极配对有惊喜',       accent: '#ef4444' },
  { id: 'friction',  icon: '🛷', title: '滑块与摩擦', desc: '摩擦系数与初速度如何决定滑行距离', accent: '#0ea5e9', badge: 'NEW' },
  { id: 'spring',    icon: '🌀', title: '弹簧振子', desc: '虎克定律的可视化探索',             accent: '#14b8a6' },
]
</script>

<template>
  <div class="gallery">
    <header class="hero">
      <div class="badge">DEMO · Grimphy</div>
      <h1>🖼️ 物理画廊</h1>
      <p class="tag">二级卡片展示 Demo · 每个卡片都是一个独立的可玩模块</p>
      <p class="intro">
        这是个<strong>二级页面</strong>的演示：主页点击「物理画廊」进入这里，再点单个卡片进入游戏。
        用来测试多层级路由 + 多子应用的工作流是否流畅。
      </p>
    </header>

    <section class="grid">
      <a
        v-for="g in games"
        :key="g.id"
        :href="`#${g.id}`"
        class="card"
        :style="{ '--accent': g.accent }"
        @click.prevent
      >
        <div v-if="g.badge" class="card__badge">{{ g.badge }}</div>
        <div class="card__icon">{{ g.icon }}</div>
        <h3>{{ g.title }}</h3>
        <p>{{ g.desc }}</p>
        <span class="card__cta">了解更多 →</span>
      </a>
    </section>

    <footer class="foot">
      <a href="/">← 返回 EZAPPS 主页</a>
    </footer>
  </div>
</template>

<style scoped>
.gallery {
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
.tag { font-size: 1.1rem; color: #0891b2; margin: 0 0 1.25rem; font-weight: 500; }
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
  font-size: 2.5rem;
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
  font-weight: 500;
  color: var(--accent, #06b6d4);
}

.foot { margin-top: 3rem; text-align: center; }
.foot a { color: #0891b2; text-decoration: none; font-weight: 500; }
</style>
