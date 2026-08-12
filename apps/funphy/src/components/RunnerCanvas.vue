<template>
  <div class="runner-root">
    <div class="canvas-area" ref="canvasAreaRef">
      <canvas ref="canvasRef"></canvas>

      <!-- 大厅界面（V2-5 前极简版） -->
      <div class="menu-overlay" v-if="gameState === 'menu'">
        <div class="menu-card">
          <h1>🚀 飞飞历险记</h1>
          <p class="menu-story">驾驶全能飞船，从海洋出发，穿越大陆与天空，冲向广袤宇宙！</p>
          <div class="menu-legend">
            <div class="legend-item"><span class="legend-dot white"></span> 宝石（升级装备）</div>
            <div class="legend-item"><span class="legend-dot green"></span> 能量块（补充能量）</div>
            <div class="legend-item"><span class="legend-dot gold"></span> 太阳能区（持续充能）</div>
          </div>
          <!-- 飞船库：装备升级 -->
          <div class="shipyard">
            <div class="shipyard-title">🛠 飞船库 · 💎 {{ totalGems }}</div>
            <div class="upgrade-row" v-for="k in (['engine', 'armor', 'battery'] as const)" :key="k">
              <div class="upgrade-info">
                <div class="upgrade-name">{{ UPGRADE_NAME[k] }} {{ upgradeState(k) }}</div>
                <div class="upgrade-desc">{{ upgradeDesc[k] }}</div>
              </div>
              <button class="upgrade-btn" @click="doUpgrade(k)" :disabled="upgrades.progress.upgrades[k] >= UPGRADE_COST[k].length || upgrades.progress.gems < UPGRADE_COST[k][upgrades.progress.upgrades[k]]">
                ⬆
              </button>
            </div>
          </div>
          <button class="btn-primary" @click="handleStart">🚀 开始探险</button>
        </div>
      </div>

      <!-- HUD 顶部：三栏卡片布局 -->
      <div class="runner-hud" v-if="gameState === 'playing' || gameState === 'paused' || gameState === 'won' || gameState === 'lost'">
        <!-- 左：护甲 + 宝石 -->
        <div class="hud-group hud-left">
          <span class="armor-display">
            <span v-for="i in 3" :key="i" class="armor-heart" :class="{ empty: i > armor }">❤️</span>
          </span>
          <span class="gem-display">💎 {{ gems }}</span>
        </div>
        <!-- 中：时间 + 里程 -->
        <div class="hud-group hud-center">
          <span class="stat">⏱ {{ fmtTime }}</span>
          <div class="progress-wrap">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
            </div>
            <span class="progress-num">{{ progressPct }}%</span>
          </div>
          <div class="energy-wrap">
            <div class="energy-bar">
              <div class="energy-fill" :class="{ low: energy <= 15 }" :style="{ width: energy + '%', background: energyColor }"></div>
            </div>
            <span class="energy-num" :class="{ low: energy <= 15 }">⚡{{ energy }}%</span>
          </div>
        </div>
        <!-- 右：暂停 + 声音 -->
        <div class="hud-group hud-right">
          <button class="hud-btn" @click="toggleSound" aria-label="声音">{{ soundEnabled ? '🔊' : '🔇' }}</button>
          <button class="hud-btn" @click="togglePause" aria-label="暂停">⏸</button>
        </div>
      </div>

      <!-- 过场卡片（探险模式开场介绍，3s 自动消失/点击跳过） -->
      <div class="intro-card" v-if="showIntro && gameState === 'playing'" @click="dismissIntro">
        <div class="intro-text">{{ introText }}</div>
        <div class="intro-skip">点击跳过</div>
      </div>

      <!-- 悬浮教学提示 -->
      <div class="runner-tip" v-if="gameState === 'playing' && runtime && runtime.progress < 30">
        🕹 摇杆：←→ 移动 · ↑ 加速 · ↓ 刹车 · ⚪宝石 ⚢能量
      </div>

      <!-- 暂停界面 -->
      <div class="overlay" v-if="gameState === 'paused'">
        <div class="overlay-card">
          <h2>⏸ 已暂停</h2>
          <button class="btn-primary" @click="resumeGame">继续</button>
          <button class="btn-secondary" @click="handleBack">返回大厅</button>
        </div>
      </div>

      <!-- 失败界面 -->
      <div class="overlay" v-if="gameState === 'lost'">
        <div class="overlay-card lose-card">
          <h2>{{ failText }}</h2>
          <button class="btn-primary" @click="handleRetry">再试一次</button>
          <button class="btn-secondary" @click="handleBack">返回大厅</button>
        </div>
      </div>

      <!-- 胜利界面 -->
      <div class="overlay" v-if="gameState === 'won'">
        <div class="overlay-card win-card">
          <h2>🎉 通关！</h2>
          <p class="result-line">💎 本关宝石 {{ gems }}（累计 {{ totalGems }}）</p>
          <p class="result-line">⚡ 剩余能量 {{ energy }}%</p>
          <p class="result-line">⏱ 用时 {{ fmtTime }}</p>
          <button class="btn-primary" @click="handleNext">返回大厅</button>
        </div>
      </div>
    </div>

    <!-- 单摇杆控制区 -->
    <div class="controls-area" v-if="gameState === 'playing'">
      <div class="stick-wrap">
        <div
          ref="joystickBase"
          class="joystick-base"
          @touchstart.prevent="onStickStart"
          @touchmove.prevent="onStickMove"
          @touchend.prevent="onStickEnd"
          @touchcancel.prevent="onStickEnd"
          @mousedown.prevent="onStickMouseDown"
        >
          <!-- 方向指示 -->
          <div class="joy-arrow up">▲</div>
          <div class="joy-arrow down">▼</div>
          <div class="joy-arrow left">◀</div>
          <div class="joy-arrow right">▶</div>
          <div class="joystick-knob" :style="{ transform: `translate(${knobX}px, ${knobY}px)` }"></div>
        </div>
        <div class="stick-hint">上=加速 · 下=刹车 · 左右=移动</div>
      </div>
    </div>

    <div class="keyboard-hint-desktop" v-if="gameState === 'playing'">
      ←→ 移动 · ↑ 加速 · ↓ 刹车 · ESC 暂停
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRunnerLoop } from '../composables/useRunnerLoop'
import { useUpgrades, UPGRADE_COST, UPGRADE_NAME } from '../composables/useUpgrades'
import { SceneRenderer } from '../scenes/SceneRenderer'
import { skins } from '../data/skins'
import { runnerLevels } from '../data/runner/ocean'

const {
  canvasRef, gameState, runtime, failText,
  stickX, stickY,
  armor, energy, gems, progressPct, elapsedTime,
  soundEnabled, toggleSound,
  startLevel, retryLevel, backToMenu,
  togglePause, resumeGame,
  setStickTouch, setViewSize, upgrades,
} = useRunnerLoop()

const totalGems = computed(() => upgrades.progress.gems)

// 升级状态文案
function upgradeState(kind: 'engine' | 'armor' | 'battery') {
  const lv = upgrades.progress.upgrades[kind]
  const costs = UPGRADE_COST[kind]
  if (lv >= costs.length) return `Lv${lv}（满级）`
  return `Lv${lv} → Lv${lv + 1}（💎${costs[lv]}）`
}
function doUpgrade(kind: 'engine' | 'armor' | 'battery') {
  upgrades.upgrade(kind)
}
const upgradeDesc: Record<'engine' | 'armor' | 'battery', string> = {
  engine: '推力+8% / 能耗-6%',
  armor: '护甲+1',
  battery: '能量上限+10',
}

const fmtTime = computed(() => {
  const t = elapsedTime.value
  const m = Math.floor(t / 60)
  const s = t % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
})

const energyColor = computed(() => energy.value > 40 ? '#4ade80' : energy.value > 15 ? '#facc15' : '#ef4444')

// ===== 过场卡片（探险模式开场介绍） =====
const showIntro = ref(false)
const introText = ref('')
let introTimer = 0
watch(gameState, (s) => {
  if (s === 'playing' && runtime.value?.level.introCard) {
    introText.value = runtime.value.level.introCard
    showIntro.value = true
    // 3 秒自动消失
    clearTimeout(introTimer)
    introTimer = window.setTimeout(() => { showIntro.value = false }, 3000)
  } else {
    showIntro.value = false
  }
})
function dismissIntro() {
  clearTimeout(introTimer)
  showIntro.value = false
}
onUnmounted(() => clearTimeout(introTimer))

// ===== 画布自适应（ResizeObserver） =====
const canvasAreaRef = ref<HTMLElement | null>(null)
let renderer: SceneRenderer | null = null
let renderRaf = 0
let resizeObserver: ResizeObserver | null = null

function setupCanvas() {
  const canvas = canvasRef.value
  const area = canvasAreaRef.value
  if (!canvas || !area) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const w = Math.max(1, area.clientWidth)
  const h = Math.max(1, area.clientHeight)
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  if (!renderer) {
    renderer = new SceneRenderer(ctx, canvas.width, canvas.height)
  } else {
    renderer.resize(canvas.width, canvas.height)
  }
  // 同步物理边界（视口世界尺寸，防飞船飞出可视区）
  const vs = renderer.getRunnerViewSize()
  setViewSize(vs.width, vs.height)
}

function renderLoop() {
  const canvas = canvasRef.value
  const rt = runtime.value
  if (canvas && renderer) {
    if (rt) {
      renderer.renderRunner(rt, skins[0])
    } else {
      // 大厅背景（深蓝渐变 + 星空感）
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height)
        grad.addColorStop(0, '#0a0a2e')
        grad.addColorStop(1, '#1a1a4e')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
    }
  }
  renderRaf = requestAnimationFrame(renderLoop)
}

onMounted(() => {
  setupCanvas()
  // 监听容器尺寸变化（旋转/窗口调整/布局稳定）
  const area = canvasAreaRef.value
  if (area && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      setupCanvas()
    })
    resizeObserver.observe(area)
  }
  renderRaf = requestAnimationFrame(renderLoop)
  // 显示大厅（不再自动开局，点"开始探险"进入）
})

onUnmounted(() => {
  cancelAnimationFrame(renderRaf)
  resizeObserver?.disconnect()
})

// ===== 单摇杆（左右移动 + 上下加速/刹车） =====
const knobX = ref(0)
const knobY = ref(0)
const JOY_RADIUS = 52
const KNOB_R = 22
let stickTouchId: number | null = null
let stickCenterX = 0
let stickCenterY = 0

function setStickFromOffset(dx: number, dy: number) {
  const maxDist = JOY_RADIUS - KNOB_R
  let nx = dx / maxDist
  let ny = dy / maxDist
  const mag = Math.sqrt(nx * nx + ny * ny)
  if (mag > 1) { nx /= mag; ny /= mag }
  // 死区 0.15 + 重映射
  const active = mag > 0.15
  const remap = active ? (mag - 0.15) / 0.85 : 0
  const norm = active ? remap / mag : 0
  stickX.value = nx * norm
  stickY.value = -ny * norm   // 上推(dy<0) → 正（加速），下拉 → 负（刹车）
  knobX.value = nx * maxDist
  knobY.value = ny * maxDist
  setStickTouch(active)
}

function onStickStart(e: TouchEvent) {
  const t = e.touches[0]
  const el = joystickBase.value?.getBoundingClientRect()
  if (!el) return
  stickTouchId = t.identifier
  stickCenterX = t.clientX - el.left
  stickCenterY = t.clientY - el.top
  setStickFromOffset(0, 0)
}
function onStickMove(e: TouchEvent) {
  if (stickTouchId === null) return
  const t = Array.from(e.touches).find(tt => tt.identifier === stickTouchId)
  const el = joystickBase.value?.getBoundingClientRect()
  if (!t || !el) return
  setStickFromOffset(t.clientX - el.left - stickCenterX, t.clientY - el.top - stickCenterY)
}
function onStickEnd() {
  stickTouchId = null
  stickX.value = 0
  stickY.value = 0
  knobX.value = 0
  knobY.value = 0
  setStickTouch(false)
}
function onStickMouseDown(e: MouseEvent) {
  const el = joystickBase.value?.getBoundingClientRect()
  if (!el) return
  stickCenterX = el.width / 2
  stickCenterY = el.height / 2
  const move = (ev: MouseEvent) => {
    setStickFromOffset(ev.clientX - el.left - stickCenterX, ev.clientY - el.top - stickCenterY)
  }
  const up = () => {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
    onStickEnd()
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}
const joystickBase = ref<HTMLElement | null>(null)

function handleRetry() {
  retryLevel()
}
function handleNext() {
  backToMenu()
}
function handleBack() {
  backToMenu()
}
function handleStart() {
  startLevel(runnerLevels[0])
}
</script>

<style scoped>
.runner-root {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background: #030712;
  color: #fff;
  overflow: hidden;
}
.canvas-area {
  position: relative;
  flex: 1;
  min-height: 0;
}
canvas {
  width: 100%;
  height: 100%;
  display: block;
}

/* ==== HUD（三栏卡片） ==== */
.runner-hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(rgba(2, 6, 23, 0.55), rgba(2, 6, 23, 0));
  z-index: 5;
  pointer-events: none;
}
.hud-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 10px;
  padding: 4px 10px;
  backdrop-filter: blur(4px);
  pointer-events: auto;
}
.armor-heart { font-size: 0.95rem; }
.armor-heart.empty { opacity: 0.25; filter: grayscale(1); }
.gem-display { font-size: 0.9rem; font-weight: 600; }
.hud-center { gap: 10px; }
.stat { font-size: 0.85rem; font-variant-numeric: tabular-nums; color: #e2e8f0; min-width: 44px; }
.progress-wrap { display: flex; align-items: center; gap: 6px; }
.progress-bar {
  width: 90px;
  height: 7px;
  border-radius: 4px;
  background: rgba(255,255,255,0.12);
  overflow: hidden;
}
.progress-fill { height: 100%; background: linear-gradient(90deg, #38bdf8, #818cf8); border-radius: 4px; transition: width 0.15s; }
.progress-num { font-size: 0.7rem; color: rgba(255,255,255,0.6); min-width: 30px; }
.energy-wrap { display: flex; align-items: center; gap: 6px; }
.energy-bar {
  width: 70px;
  height: 7px;
  border-radius: 4px;
  background: rgba(255,255,255,0.12);
  overflow: hidden;
}
.energy-fill { height: 100%; border-radius: 4px; transition: width 0.1s, background 0.3s; }
.energy-num { font-size: 0.7rem; min-width: 40px; }
.hud-btn {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  padding: 3px 8px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #fff;
}

/* 窄屏 HUD 紧凑化（移动优先默认，防右侧按钮被挤出） */
.runner-hud { padding: 6px 8px; gap: 4px; }
.hud-group { padding: 3px 7px; gap: 5px; }
.armor-heart { font-size: 0.8rem; }
.progress-bar { width: 56px; }
.energy-bar { width: 44px; }
.progress-num { display: none; }
.energy-num { font-size: 0.65rem; min-width: 34px; }
.stat { font-size: 0.75rem; min-width: 36px; }
.hud-btn { padding: 2px 6px; font-size: 0.8rem; }
/* 宽屏恢复大尺寸 */
@media (min-width: 768px) {
  .runner-hud { padding: 8px 12px; gap: 8px; }
  .hud-group { padding: 4px 10px; gap: 8px; }
  .armor-heart { font-size: 0.95rem; }
  .progress-bar { width: 90px; }
  .energy-bar { width: 70px; }
  .progress-num { display: inline; }
  .energy-num { font-size: 0.7rem; min-width: 40px; }
  .stat { font-size: 0.85rem; min-width: 44px; }
  .hud-btn { padding: 3px 8px; font-size: 0.85rem; }
}

.runner-tip {
  position: absolute;
  top: 52px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(2, 6, 23, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.2);
  padding: 6px 16px;
  border-radius: 16px;
  font-size: 0.8rem;
  z-index: 5;
  pointer-events: none;
  white-space: nowrap;
}

/* ==== 过场卡片 ==== */
.intro-card {
  position: absolute;
  right: 12px;
  bottom: 14px;
  max-width: 260px;
  background: rgba(2, 6, 23, 0.82);
  border: 1px solid rgba(125, 211, 252, 0.35);
  border-left: 3px solid #38bdf8;
  border-radius: 12px;
  padding: 12px 14px;
  z-index: 6;
  cursor: pointer;
  animation: intro-in 0.4s ease;
  backdrop-filter: blur(4px);
}
.intro-text {
  font-size: 0.82rem;
  line-height: 1.6;
  color: #e2e8f0;
  white-space: pre-line;
}
.intro-skip {
  margin-top: 6px;
  font-size: 0.68rem;
  color: rgba(148, 163, 184, 0.6);
  text-align: right;
}
@keyframes intro-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 低能量闪烁 */
.energy-fill.low { animation: energy-blink 0.6s infinite; }
.energy-num.low { color: #ef4444; animation: energy-blink 0.6s infinite; }
@keyframes energy-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ==== 大厅（V2-5 前极简版） ==== */
.menu-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}
.menu-card {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 20px;
  padding: 32px 40px;
  text-align: center;
  max-width: 340px;
  backdrop-filter: blur(6px);
}
.menu-card h1 { margin: 0 0 10px; font-size: 1.8rem; }
.menu-story { margin: 0 0 18px; color: rgba(255,255,255,0.75); font-size: 0.9rem; line-height: 1.5; }
.menu-legend {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
  text-align: left;
  font-size: 0.82rem;
  color: rgba(255,255,255,0.85);
}
.legend-item { display: flex; align-items: center; gap: 8px; }
.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legend-dot.white { background: #f8fafc; box-shadow: 0 0 6px rgba(248, 250, 252, 0.6); }
.legend-dot.green { background: #4ade80; box-shadow: 0 0 6px rgba(74, 222, 128, 0.6); }
.legend-dot.gold { background: #fde047; box-shadow: 0 0 6px rgba(253, 224, 71, 0.6); }

/* 飞船库（装备升级） */
.shipyard {
  margin-bottom: 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  padding-top: 12px;
}
.shipyard-title {
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 8px;
  text-align: left;
}
.upgrade-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0;
}
.upgrade-info { text-align: left; }
.upgrade-name { font-size: 0.78rem; }
.upgrade-desc { font-size: 0.65rem; color: rgba(255,255,255,0.5); }
.upgrade-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(56, 189, 248, 0.4);
  background: rgba(56, 189, 248, 0.15);
  color: #7dd3fc;
  font-size: 0.9rem;
  cursor: pointer;
  flex-shrink: 0;
}
.upgrade-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.upgrade-btn:not(:disabled):active { transform: scale(0.9); }

/* ==== 单摇杆 ==== */
.controls-area {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 0 16px;
  z-index: 10;
}
/* 横屏/桌面：摇杆悬浮左下角，游戏区全屏 */
@media (min-width: 768px) and (orientation: landscape), (min-width: 900px) {
  .controls-area {
    position: absolute;
    left: 14px;
    bottom: 14px;
    padding: 0;
  }
  .joystick-base {
    width: 108px;
    height: 108px;
  }
  .joystick-knob {
    width: 38px;
    height: 38px;
    margin: -19px 0 0 -19px;
  }
  .stick-hint { display: none; }
}
.stick-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.joystick-base {
  position: relative;
  width: 128px;
  height: 128px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
  border: 2px solid rgba(148, 163, 184, 0.25);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.joystick-knob {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, rgba(148, 163, 184, 0.9), rgba(100, 116, 139, 0.7));
  border: 1px solid rgba(255,255,255,0.3);
  position: absolute;
  top: 50%;
  left: 50%;
  margin: -22px 0 0 -22px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.4);
}
.joy-arrow {
  position: absolute;
  color: rgba(255,255,255,0.35);
  font-size: 0.7rem;
  pointer-events: none;
}
.joy-arrow.up { top: 6px; left: 50%; transform: translateX(-50%); }
.joy-arrow.down { bottom: 6px; left: 50%; transform: translateX(-50%); }
.joy-arrow.left { left: 8px; top: 50%; transform: translateY(-50%); }
.joy-arrow.right { right: 8px; top: 50%; transform: translateY(-50%); }
.stick-hint { font-size: 0.7rem; color: rgba(255,255,255,0.45); }

.keyboard-hint-desktop {
  display: none;
  text-align: center;
  font-size: 0.72rem;
  color: rgba(255,255,255,0.4);
  padding-bottom: 4px;
}
@media (min-width: 768px) {
  .keyboard-hint-desktop { display: block; }
}

/* ==== 界面 ==== */
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.65);
  z-index: 20;
}
.overlay-card {
  background: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  padding: 28px 40px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}
.overlay-card h2 { margin: 0 0 14px; font-size: 1.5rem; }
.result-line { margin: 6px 0; color: rgba(255,255,255,0.8); }
.btn-primary {
  margin-top: 14px;
  background: linear-gradient(135deg, #38bdf8, #6366f1);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  padding: 10px 28px;
  cursor: pointer;
  width: 100%;
}
.btn-secondary {
  margin-top: 8px;
  background: rgba(255,255,255,0.1);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 0.9rem;
  padding: 8px 22px;
  cursor: pointer;
  width: 100%;
}
</style>
