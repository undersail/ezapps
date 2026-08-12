<template>
  <div class="runner-root">
    <div class="canvas-area">
      <canvas ref="canvasRef"></canvas>

      <!-- HUD 顶部 -->
      <div class="runner-hud" v-if="gameState === 'playing' || gameState === 'won' || gameState === 'lost'">
        <div class="hud-left">
          <span class="armor-display">
            <span v-for="i in armor" :key="i" class="armor-heart">❤️</span>
            <span v-for="i in (3 - armor)" :key="'e' + i" class="armor-heart empty">🖤</span>
          </span>
          <span class="gem-display">💎 {{ gems }}</span>
        </div>
        <div class="hud-center">
          <div class="energy-bar">
            <div class="energy-fill" :style="{ width: energy + '%', background: energy > 40 ? '#4ade80' : energy > 15 ? '#facc15' : '#ef4444' }"></div>
          </div>
          <div class="energy-label">⚡ {{ energy }}%</div>
        </div>
        <div class="hud-right">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
          </div>
          <button class="hud-btn" @click="toggleSound">{{ soundEnabled ? '🔊' : '🔇' }}</button>
        </div>
      </div>

      <!-- 悬浮教学提示（V2-1 简易版） -->
      <div class="runner-tip" v-if="gameState === 'playing' && runtime && runtime.progress < 12">
        ⬅️ 左摇杆移动躲避 · ➡️ 右推杆推进
      </div>

      <!-- 失败界面 -->
      <div class="overlay" v-if="gameState === 'lost'">
        <div class="overlay-card lose-card">
          <h2>{{ failText }}</h2>
          <button class="btn-primary" @click="handleRetry">再试一次</button>
          <button class="btn-secondary" @click="backToMenu">返回大厅</button>
        </div>
      </div>

      <!-- 胜利界面 -->
      <div class="overlay" v-if="gameState === 'won'">
        <div class="overlay-card win-card">
          <h2>🎉 通关！</h2>
          <p class="result-line">💎 收集宝石 {{ gems }} / {{ runtime?.level.goal.gems }}</p>
          <p class="result-line">⚡ 剩余能量 {{ energy }}%</p>
          <button class="btn-primary" @click="handleNext">继续</button>
        </div>
      </div>
    </div>

    <!-- 双摇杆控制区 -->
    <div class="controls-area" v-if="gameState === 'playing'">
      <!-- 左摇杆（方向/位移） -->
      <div class="stick-wrap">
        <div class="stick-label">方向</div>
        <div
          class="joystick-base small"
          @touchstart.prevent="onStickStart"
          @touchmove.prevent="onStickMove"
          @touchend.prevent="onStickEnd"
          @mousedown.prevent="onStickMouseDown"
        >
          <div class="joystick-knob" :style="{ transform: `translate(${knobX}px, ${knobY}px)` }"></div>
        </div>
      </div>

      <!-- 右推杆（推力/刹车） -->
      <div class="throttle-wrap">
        <div class="stick-label">推力</div>
        <div
          class="throttle-base"
          @touchstart.prevent="onThrottleStart"
          @touchmove.prevent="onThrottleMove"
          @touchend.prevent="onThrottleEnd"
          @mousedown.prevent="onThrottleMouseDown"
        >
          <div class="throttle-arrow up">▲</div>
          <div class="throttle-knob" :style="{ transform: `translateY(${throttleKnobY}px)` }"></div>
          <div class="throttle-arrow down">▼</div>
        </div>
        <div class="throttle-state">{{ throttleText }}</div>
      </div>
    </div>

    <div class="keyboard-hint-desktop" v-if="gameState === 'playing'">
      WASD/方向键 移动 · Shift/X 推进 · 空格/Z 刹车
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRunnerLoop } from '../composables/useRunnerLoop'
import { SceneRenderer } from '../scenes/SceneRenderer'
import { skins } from '../data/skins'
import { runnerLevels } from '../data/runner/ocean'

const {
  canvasRef, gameState, runtime, failText,
  stickX, stickY, throttle,
  armor, energy, gems, progressPct,
  soundEnabled, toggleSound,
  startLevel, retryLevel, backToMenu, setStickTouch,
} = useRunnerLoop()

const throttleText = computed(() => {
  const t = throttle.value
  if (t > 0.1) return '推进 ⬆'
  if (t < -0.1) return '刹车 ⬇'
  return '滑行'
})

// ===== 左摇杆（复用 V1 逻辑，尺寸缩小） =====
const knobX = ref(0)
const knobY = ref(0)
const JOY_RADIUS = 40
const KNOB_R = 16
let stickTouchId: number | null = null
let stickCenterX = 0
let stickCenterY = 0

function setStickFromOffset(dx: number, dy: number) {
  const maxDist = JOY_RADIUS - KNOB_R
  let nx = dx / maxDist
  let ny = dy / maxDist
  const mag = Math.sqrt(nx * nx + ny * ny)
  if (mag > 1) { nx /= mag; ny /= mag }
  // 死区 0.15
  const remap = mag > 0.15 ? (mag - 0.15) / 0.85 : 0
  const norm = remap / (mag || 1)
  stickX.value = nx * norm * (mag > 0.15 ? 1 : 0)
  stickY.value = ny * norm * (mag > 0.15 ? 1 : 0)
  knobX.value = nx * maxDist
  knobY.value = ny * maxDist
  setStickTouch(mag > 0.15)
}

function onStickStart(e: TouchEvent) {
  const t = e.touches[0]
  const el = (e.target as HTMLElement).getBoundingClientRect()
  stickTouchId = t.identifier
  stickCenterX = t.clientX - el.left
  stickCenterY = t.clientY - el.top
  setStickFromOffset(0, 0)
}
function onStickMove(e: TouchEvent) {
  if (stickTouchId === null) return
  const t = Array.from(e.touches).find(tt => tt.identifier === stickTouchId)
  if (!t) return
  const el = (e.target as HTMLElement).getBoundingClientRect()
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
  const el = (e.target as HTMLElement).getBoundingClientRect()
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

// ===== 右推杆（垂直：上=推进，下=刹车） =====
const throttleKnobY = ref(0)
const THROTTLE_RANGE = 36
let throttleTouchId: number | null = null

function setThrottleFromOffset(dy: number) {
  let t = -dy / THROTTLE_RANGE
  t = Math.max(-1, Math.min(1, t))
  throttle.value = t
  throttleKnobY.value = -t * THROTTLE_RANGE
}
function onThrottleStart(e: TouchEvent) {
  const t = e.touches[0]
  throttleTouchId = t.identifier
  setThrottleFromOffset(0)
}
function onThrottleMove(e: TouchEvent) {
  if (throttleTouchId === null) return
  const t = Array.from(e.touches).find(tt => tt.identifier === throttleTouchId)
  if (!t) return
  const el = (e.target as HTMLElement).getBoundingClientRect()
  const centerY = el.top + el.height / 2
  setThrottleFromOffset(t.clientY - centerY)
}
function onThrottleEnd() {
  throttleTouchId = null
  throttle.value = 0
  throttleKnobY.value = 0
}
function onThrottleMouseDown(e: MouseEvent) {
  const el = (e.target as HTMLElement).getBoundingClientRect()
  const centerY = el.top + el.height / 2
  const move = (ev: MouseEvent) => {
    setThrottleFromOffset(ev.clientY - centerY)
  }
  const up = () => {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
    onThrottleEnd()
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}

// ===== 渲染循环 =====
let renderer: SceneRenderer | null = null
let renderRaf = 0

function renderLoop() {
  const canvas = canvasRef.value
  const rt = runtime.value
  if (canvas && renderer && rt) {
    renderer.renderRunner(rt, skins[rt.level.chapter % skins.length] || skins[0])
  }
  renderRaf = requestAnimationFrame(renderLoop)
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  // 尺寸
  const dpr = window.devicePixelRatio || 1
  const w = canvas.clientWidth || 640
  const h = canvas.clientHeight || 360
  canvas.width = w * dpr
  canvas.height = h * dpr
  renderer = new SceneRenderer(ctx, canvas.width, canvas.height)
  renderer.setBgGradient(['#042f3e', '#0a5a5e'])
  renderRaf = requestAnimationFrame(renderLoop)
  // 自动开始第一关（V2-1 测试入口）
  startLevel(runnerLevels[0])
})

onUnmounted(() => {
  cancelAnimationFrame(renderRaf)
})

function handleRetry() {
  retryLevel()
}
function handleNext() {
  backToMenu()
}
</script>

<style scoped>
.runner-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100vh;
  background: #030712;
  color: #fff;
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

/* HUD */
.runner-hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: linear-gradient(rgba(0,0,0,0.5), transparent);
  z-index: 5;
}
.hud-left { display: flex; align-items: center; gap: 10px; }
.armor-heart { font-size: 1.1rem; }
.armor-heart.empty { opacity: 0.3; }
.gem-display { font-size: 0.95rem; }
.hud-center { display: flex; align-items: center; gap: 8px; }
.energy-bar {
  width: 120px;
  height: 10px;
  border-radius: 5px;
  background: rgba(255,255,255,0.15);
  overflow: hidden;
}
.energy-fill { height: 100%; border-radius: 5px; transition: width 0.1s; }
.energy-label { font-size: 0.75rem; min-width: 48px; }
.hud-right { display: flex; align-items: center; gap: 8px; }
.progress-bar {
  width: 100px;
  height: 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.15);
  overflow: hidden;
}
.progress-fill { height: 100%; background: #38bdf8; transition: width 0.15s; }
.hud-btn {
  background: rgba(255,255,255,0.1);
  border: none;
  border-radius: 8px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 0.9rem;
}

.runner-tip {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.6);
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 0.85rem;
  z-index: 5;
  pointer-events: none;
}

/* 控制区 */
.controls-area {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 8px 20px 14px;
  z-index: 10;
}
.stick-wrap, .throttle-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.stick-label { font-size: 0.7rem; color: rgba(255,255,255,0.5); }
.joystick-base {
  position: relative;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  border: 2px solid rgba(255,255,255,0.2);
  touch-action: none;
}
.joystick-base.small .joystick-knob {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.7);
  position: absolute;
  top: 50%;
  left: 50%;
  margin: -16px 0 0 -16px;
}
.throttle-base {
  position: relative;
  width: 56px;
  height: 110px;
  border-radius: 28px;
  background: rgba(255,255,255,0.08);
  border: 2px solid rgba(255,255,255,0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  touch-action: none;
  padding: 6px 0;
}
.throttle-arrow { font-size: 0.7rem; color: rgba(255,255,255,0.4); }
.throttle-knob {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(74, 222, 128, 0.7);
  position: absolute;
  top: 50%;
  left: 50%;
  margin: -18px 0 0 -18px;
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.4);
}
.throttle-state { font-size: 0.7rem; color: rgba(255,255,255,0.6); min-height: 14px; }

.keyboard-hint-desktop {
  display: none;
  text-align: center;
  font-size: 0.75rem;
  color: rgba(255,255,255,0.4);
  padding-bottom: 6px;
}
@media (min-width: 768px) {
  .keyboard-hint-desktop { display: block; }
}

/* 界面 */
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.6);
  z-index: 20;
}
.overlay-card {
  background: #0f172a;
  border-radius: 16px;
  padding: 28px 36px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}
.overlay-card h2 { margin: 0 0 12px; font-size: 1.6rem; }
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
}
</style>
