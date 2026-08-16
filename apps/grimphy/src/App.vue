<script setup lang="ts">
import { ref } from 'vue'
try { fetch('https://api.ezapps.cc/api/stats/hit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app: 'grimphy' }) }).catch(() => {}) } catch { /* 忽略 */ }
interface ExperimentCard {
  id: string
  icon: string
  title: string
  desc: string
  accent: string
  badge?: string
}

import SinglePendulum from './components/demo/SinglePendulum.vue'
import Projectile from './components/demo/Projectile.vue'
import WaveSuperposition from './components/demo/WaveSuperposition.vue'
import Lever from './components/demo/Lever.vue'
import Lens from './components/demo/Lens.vue'
import Momentum from './components/demo/Momentum.vue'
import Pulley from './components/demo/Pulley.vue'
import Buoyancy from './components/demo/Buoyancy.vue'
import Pressure from './components/demo/Pressure.vue'
import Circuit from './components/demo/Circuit.vue'
import StateChange from './components/demo/StateChange.vue'
import Magnet from './components/demo/Magnet.vue'
import Friction from './components/demo/Friction.vue'
import Orbit from './components/demo/Orbit.vue'
import Energy from './components/demo/Energy.vue'
import Field from './components/demo/Field.vue'
import Refraction from './components/demo/Refraction.vue'
import TotalReflection from './components/demo/TotalReflection.vue'

const selectedDemo = ref<string | null>(null)

/** 已实现演示的实验 id → 组件 */
const DEMO_MAP: Record<string, { title: string; component: any }> = {
  pendulum: { title: '单摆 · 简谐运动', component: SinglePendulum },
  projectile: { title: '平抛运动 · 抛物线轨迹', component: Projectile },
  wave: { title: '波的叠加 · 干涉', component: WaveSuperposition },
  lever: { title: '杠杆 · 力矩平衡', component: Lever },
  pulley: { title: '滑轮 · 定滑轮与动滑轮', component: Pulley },
  buoyancy: { title: '浮力 · 阿基米德原理', component: Buoyancy },
  pressure: { title: '压强 · 面积越小越疼', component: Pressure },
  circuit: { title: '电路 · 欧姆定律', component: Circuit },
  state: { title: '物态变化 · 分子运动', component: StateChange },
  magnet: { title: '磁场与电磁铁', component: Magnet },
  friction: { title: '摩擦力 · μN', component: Friction },
  gravity: { title: '引力与轨道', component: Orbit },
  energy: { title: '机械能 · 能量守恒', component: Energy },
  field: { title: '电场与磁场 · 洛伦兹力', component: Field },
  refraction: { title: '光的折射 · 斯涅尔定律', component: Refraction },
  reflection: { title: '全反射 · 临界角', component: TotalReflection },
  lens: { title: '凸透镜 · 成像规律', component: Lens },
  momentum: { title: '动量碰撞 · 动量守恒', component: Momentum },
}

const experiments: ExperimentCard[] = [
  // ===== 初中物理 =====
  { id: 'lever',      icon: '⚖️', title: '杠杆',       desc: '力 × 力臂：撬起地球的支点原理（初中·简单机械）', accent: '#10b981', badge: '初中' },
  { id: 'pulley',     icon: '🪢', title: '滑轮',       desc: '定滑轮不省力、动滑轮省一半力（初中·简单机械）', accent: '#14b8a6', badge: '初中' },
  { id: 'buoyancy',   icon: '🛶', title: '浮力',       desc: '阿基米德原理：排开液体越多浮力越大（初中）', accent: '#0ea5e9', badge: '初中' },
  { id: 'pressure',   icon: '🫗', title: '压强',       desc: '固体压强与液体压强：面积越小压得越疼（初中）', accent: '#f59e0b', badge: '初中' },
  { id: 'circuit',    icon: '🔋', title: '电路',       desc: '串联并联与欧姆定律：电压电流电阻的关系（初中）', accent: '#10b981', badge: '初中' },
  { id: 'lens',       icon: '🔭', title: '凸透镜',     desc: '成像规律：物距变化像怎么变（初中·光学）', accent: '#f59e0b', badge: '初中' },
  { id: 'state',      icon: '🌡️', title: '物态变化',   desc: '熔化凝固汽化液化：水在三态间穿梭（初中·热学）', accent: '#06b6d4', badge: '初中' },
  { id: 'magnet',     icon: '🧲', title: '磁场与电磁铁', desc: '磁感线与通电螺线管：电磁铁为什么能吸铁（初中）', accent: '#ef4444', badge: '初中' },
  { id: 'friction',   icon: '🛷', title: '摩擦力',     desc: '压力与粗糙程度决定滑动摩擦（初中·力学）', accent: '#0ea5e9', badge: '初中' },
  // ===== 高中物理 =====
  { id: 'pendulum',   icon: '⏱️', title: '单摆',       desc: '周期只与摆长有关：简谐运动的节奏（高中）', accent: '#a855f7', badge: '高中' },
  { id: 'gravity',    icon: '🪐', title: '引力与轨道',  desc: '万有引力：卫星为什么不会掉下来（高中）', accent: '#3b82f6', badge: '高中' },
  { id: 'projectile', icon: '🎯', title: '平抛运动',    desc: '水平速度与重力叠加的抛物线轨迹（高中）', accent: '#14b8a6', badge: '高中' },
  { id: 'momentum',   icon: '💥', title: '动量碰撞',    desc: '碰撞前后总动量守恒（高中·动量）', accent: '#ef4444', badge: '高中' },
  { id: 'energy',     icon: '⚡', title: '机械能',      desc: '动能与势能转化：过山车的能量守恒（高中）', accent: '#f59e0b', badge: '高中' },
  { id: 'wave',       icon: '🌊', title: '波的叠加',    desc: '两列波相遇：干涉与衍射（高中·波动）', accent: '#06b6d4', badge: '高中' },
  { id: 'refraction', icon: '🔆', title: '光的折射',   desc: '斯涅尔定律：光进入水向法线靠拢（高中·光学）', accent: '#f59e0b', badge: '高中' },
  { id: 'reflection', icon: '✨', title: '全反射',     desc: '入射角超临界角，光全部弹回（高中·光学）', accent: '#f59e0b', badge: '高中' },
  { id: 'field',      icon: '🌀', title: '电场与磁场',  desc: '电场线与洛伦兹力：带电粒子的偏转（高中）', accent: '#3b82f6', badge: '高中' },
]
</script>

<template>
  <div class="lab">
    <header class="hero">
      <div class="badge">BETA · Grimphy Lab</div>
      <h1>🔬 物理实验室</h1>
      <p class="tag">物理实验趣味动画演示，看现象、学原理。</p>
      <p class="intro">每个卡片是一个独立的小实验，点进去就能看到物理在发生什么。</p>
    </header>

    <h2 class="group-title">🧒 初中物理</h2>
    <section class="grid">
      <a
        v-for="e in experiments.filter(x => x.badge === '初中')"
        :key="e.id"
        :href="`#${e.id}`"
        class="card"
        :style="{ '--accent': e.accent }"
        @click="DEMO_MAP[e.id] && (selectedDemo = e.id)"
      >
        <div v-if="e.badge" class="card__badge">{{ e.badge }}</div>
        <div class="card__icon">{{ e.icon }}</div>
        <h3>{{ e.title }}</h3>
        <p>{{ e.desc }}</p>
        <span class="card__cta">▶ 查看演示</span>
      </a>
    </section>

    <h2 class="group-title">🎓 高中物理</h2>
    <section class="grid">
      <a
        v-for="e in experiments.filter(x => x.badge === '高中')"
        :key="e.id"
        :href="`#${e.id}`"
        class="card"
        :style="{ '--accent': e.accent }"
        @click="DEMO_MAP[e.id] && (selectedDemo = e.id)"
      >
        <div v-if="e.badge" class="card__badge">{{ e.badge }}</div>
        <div class="card__icon">{{ e.icon }}</div>
        <h3>{{ e.title }}</h3>
        <p>{{ e.desc }}</p>
        <span class="card__cta">▶ 查看演示</span>
      </a>
    </section>

    <!-- 实验演示弹窗 -->
    <div v-if="selectedDemo" class="demo-overlay" @click.self="selectedDemo = null">
      <div class="demo-card">
        <button class="demo-close" @click="selectedDemo = null" aria-label="关闭">✕</button>
        <h3>{{ DEMO_MAP[selectedDemo]?.title }}</h3>
        <component :is="DEMO_MAP[selectedDemo]?.component" />
      </div>
    </div>

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
  background: linear-gradient(135deg, #22d3ee, #0891b2);
  color: white;
  padding: 4px 12px;
  border-radius: 999px;
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
  box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3);
}
.hero h1 {
  font-size: 2.8rem;
  margin: 0 0 0.5rem;
  letter-spacing: -0.03em;
  font-weight: 800;
  background: linear-gradient(135deg, #155e75, #0891b2);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.tag { font-size: 1.05rem; color: #0891b2; margin: 0 0 1.25rem; font-weight: 500; }
.intro { color: #475569; max-width: 580px; margin: 0 auto; line-height: 1.7; }
.intro strong { color: #0f172a; }

.group-title {
  margin: 2.5rem 0 1rem;
  font-size: 1.2rem;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
}
.group-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e2e8f0;
}
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

<style>
/* ===== 实验演示弹窗 ===== */
.demo-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
  padding: 20px;
}
.demo-card {
  position: relative;
  background: #fff;
  border-radius: 16px;
  padding: 24px 28px 28px;
  width: min(620px, 96vw);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}
.demo-card h3 {
  margin: 0 0 16px;
  font-size: 1.15rem;
  color: #0f172a;
  text-align: center;
}
.demo-close {
  position: absolute;
  top: 12px;
  right: 14px;
  background: rgba(0, 0, 0, 0.08);
  border: none;
  color: #475569;
  font-size: 0.9rem;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  line-height: 1;
}
.demo-close:hover { background: rgba(0, 0, 0, 0.16); }
.demo__canvas {
  width: 100%;
  height: auto;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}
.demo__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px 18px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed #e2e8f0;
}
.demo__ctl {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  font-size: 0.8rem;
  color: #475569;
  white-space: nowrap;
  flex: 1;
  min-width: 150px;
  max-width: 220px;
}
.demo__ctl > span {
  font-weight: 600;
  color: #334155;
}
.demo__ctl input[type='range'] {
  width: 100%;
  accent-color: #6366f1;
  height: 18px;
  margin: 0;
}
.demo__ctl--inline input[type='range'] { width: 100%; }
.demo__select {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #334155;
  background: #fff;
}
.demo__btn {
  flex: none;
  align-self: flex-end;
  height: 34px;
  min-width: 96px;
  background: #6366f1;
  border: none;
  color: #fff;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
}
.demo__btn:hover { background: #4f46e5; }
</style>
