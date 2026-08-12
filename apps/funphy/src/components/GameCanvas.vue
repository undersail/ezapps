<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useGameLoop } from '../composables/useGameLoop'
import { useSound } from '../composables/useSound'
import type { LevelDef } from '../engine/types'

const props = defineProps<{
  level: LevelDef
  skinId: string
  bgGradient: [string, string]
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'win', stars: number, time: number, stardust: number): void
  (e: 'lose'): void
}>()

const {
  canvasRef,
  gameState,
  stars,
  elapsedTime,
  stardustCollected,
  totalStardustInLevel,
  collisions,
  input,
  setDirection,
  setJoystick,
  setPause,
  initCanvas,
  startLevel,
  resumeGame,
  retryLevel,
  backToMenu,
} = useGameLoop()

const { soundEnabled, toggleSound } = useSound()
const canvasEl = ref<HTMLCanvasElement | null>(null)

onMounted(async () => {
  await nextTick()
  if (canvasEl.value) {
    initCanvas(canvasEl.value)
    startLevel(props.level, props.skinId, props.bgGradient)
  }
})

// 故事模式：level变化时自动开始新关卡
watch(() => props.level, async (newLevel) => {
  if (newLevel && canvasEl.value) {
    await nextTick()
    startLevel(newLevel, props.skinId, props.bgGradient)
  }
})

// 键盘方向（桌面端）
function onDPadDown(dir: 'up' | 'down' | 'left' | 'right') {
  setDirection(dir, true)
}
function onDPadUp(dir: 'up' | 'down' | 'left' | 'right') {
  setDirection(dir, false)
}

// 胜利时通知父组件
watch(gameState, (newState) => {
  if (newState === 'won') {
    emit('win', stars.value, elapsedTime.value, stardustCollected.value)
  } else if (newState === 'lost') {
    emit('lose')
  }
})

function handleBack() {
  backToMenu()
  emit('back')
}

function handleRetry() {
  retryLevel()
}

function handleResume() {
  resumeGame()
}

// === 摇杆逻辑 ===
const joystickBase = ref<HTMLDivElement | null>(null)
const JOYSTICK_RADIUS = 56  // 摇杆底座半径
const KNOB_RADIUS = 22      // 摇杆把手半径
const knobX = ref(0)
const knobY = ref(0)
let joystickTouchId: number | null = null
let joystickCenterX = 0
let joystickCenterY = 0

function onJoystickTouchStart(e: TouchEvent) {
  if (joystickTouchId !== null) return
  const touch = e.changedTouches[0]
  joystickTouchId = touch.identifier
  const rect = joystickBase.value!.getBoundingClientRect()
  joystickCenterX = rect.left + rect.width / 2
  joystickCenterY = rect.top + rect.height / 2
  updateJoystick(touch.clientX, touch.clientY)
  e.preventDefault()
}

function onJoystickTouchMove(e: TouchEvent) {
  if (joystickTouchId === null) return
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i]
    if (touch.identifier === joystickTouchId) {
      updateJoystick(touch.clientX, touch.clientY)
      e.preventDefault()
      break
    }
  }
}

function onJoystickTouchEnd(e: TouchEvent) {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i]
    if (touch.identifier === joystickTouchId) {
      joystickTouchId = null
      knobX.value = 0
      knobY.value = 0
      setJoystick(0, 0, false)
      break
    }
  }
}

// 鼠标支持（桌面端测试）
let mouseDown = false
function onJoystickMouseDown(e: MouseEvent) {
  mouseDown = true
  const rect = joystickBase.value!.getBoundingClientRect()
  joystickCenterX = rect.left + rect.width / 2
  joystickCenterY = rect.top + rect.height / 2
  updateJoystick(e.clientX, e.clientY)
}

function onJoystickMouseMove(e: MouseEvent) {
  if (!mouseDown) return
  updateJoystick(e.clientX, e.clientY)
}

function onJoystickMouseUp() {
  mouseDown = false
  knobX.value = 0
  knobY.value = 0
  setJoystick(0, 0, false)
}

function updateJoystick(clientX: number, clientY: number) {
  let dx = clientX - joystickCenterX
  let dy = clientY - joystickCenterY
  const dist = Math.sqrt(dx * dx + dy * dy)
  const maxDist = JOYSTICK_RADIUS - KNOB_RADIUS
  
  if (dist > maxDist) {
    dx = dx / dist * maxDist
    dy = dy / dist * maxDist
  }
  
  knobX.value = dx
  knobY.value = dy
  
  // 归一化方向向量（-1 ~ 1）
  const normX = dx / maxDist
  const normY = dy / maxDist
  setJoystick(normX, normY, Math.abs(normX) > 0.1 || Math.abs(normY) > 0.1)
}

// 全局鼠标松开
onMounted(() => {
  window.addEventListener('mouseup', onJoystickMouseUp)
  window.addEventListener('mousemove', onJoystickMouseMove)
})
onUnmounted(() => {
  window.removeEventListener('mouseup', onJoystickMouseUp)
  window.removeEventListener('mousemove', onJoystickMouseMove)
})
</script>

<template>
  <div class="game-canvas-wrapper">
    <!-- HUD -->
    <div class="hud" v-if="gameState === 'playing' || gameState === 'paused'">
      <div class="hud-left">
        <span class="hud-item">⏱ {{ elapsedTime.toFixed(1) }}s</span>
        <span class="hud-item">✨ {{ stardustCollected }}/{{ totalStardustInLevel }}</span>
        <span class="hud-item" :class="{ warn: collisions > 2 }">💥 {{ collisions }}</span>
      </div>
      <div class="hud-right">
        <button class="hud-btn" @click="toggleSound">{{ soundEnabled.enabled ? '🔊' : '🔇' }}</button>
        <button class="hud-btn" @click="setPause">⏸</button>
      </div>
    </div>

    <!-- Canvas -->
    <div class="canvas-area">
      <canvas ref="canvasEl" class="game-canvas"></canvas>
    </div>

    <!-- 暂停界面 -->
    <div class="overlay" v-if="gameState === 'paused'">
      <div class="overlay-card">
        <h2>⏸ 暂停</h2>
        <button class="btn-primary" @click="handleResume">继续</button>
        <button class="btn-secondary" @click="handleBack">返回</button>
      </div>
    </div>

    <!-- 胜利界面 -->
    <div class="overlay" v-if="gameState === 'won'">
      <div class="overlay-card win-card">
        <h2>🎉 通关！</h2>
        <div class="star-display">
          <span v-for="i in 3" :key="i" class="star" :class="{ filled: i <= stars }">
            {{ i <= stars ? '⭐' : '☆' }}
          </span>
        </div>
        <div class="win-stats">
          <span>⏱ {{ elapsedTime.toFixed(1) }}s</span>
          <span>✨ {{ stardustCollected }}</span>
          <span>💥 {{ collisions }}</span>
        </div>
        <button class="btn-primary" @click="handleBack">继续</button>
        <button class="btn-secondary" @click="handleRetry">再试一次</button>
      </div>
    </div>

    <!-- 失败界面 -->
    <div class="overlay" v-if="gameState === 'lost'">
      <div class="overlay-card lose-card">
        <h2>😵 时间到！</h2>
        <button class="btn-primary" @click="handleRetry">再试一次</button>
        <button class="btn-secondary" @click="handleBack">返回</button>
      </div>
    </div>

    <!-- 摇杆控制区 -->
    <div class="joystick-area" v-if="gameState === 'playing'">
      <div
        ref="joystickBase"
        class="joystick-base"
        @touchstart.prevent="onJoystickTouchStart"
        @touchmove.prevent="onJoystickTouchMove"
        @touchend.prevent="onJoystickTouchEnd"
        @touchcancel.prevent="onJoystickTouchEnd"
        @mousedown.prevent="onJoystickMouseDown"
      >
        <!-- 方向指示 -->
        <div class="joystick-arrow up">▲</div>
        <div class="joystick-arrow down">▼</div>
        <div class="joystick-arrow left">◀</div>
        <div class="joystick-arrow right">▶</div>
        <!-- 摇杆把手 -->
        <div
          class="joystick-knob"
          :style="{
            transform: `translate(${knobX}px, ${knobY}px)`,
          }"
        ></div>
      </div>
      <div class="keyboard-hint-desktop">
        WASD / 方向键 操控 · ESC 暂停
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-canvas-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #0a0a2e;
}

.hud {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10;
  font-size: 0.85rem;
  color: #e2e8f0;
}

.hud-left { display: flex; gap: 12px; }
.hud-right { display: flex; gap: 8px; }
.hud-item { font-family: ui-monospace, monospace; }
.hud-item.warn { color: #f59e0b; }
.hud-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}

.canvas-area {
  flex: 1 1 0;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.game-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  z-index: 20;
}

.overlay-card {
  background: #1e293b;
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  min-width: 280px;
  color: #e2e8f0;
}

.overlay-card h2 {
  margin: 0 0 1rem;
  font-size: 1.5rem;
}

.win-card { border: 2px solid #10b981; }
.lose-card { border: 2px solid #ef4444; }

.star-display {
  font-size: 2rem;
  margin: 0.5rem 0;
}
.star { margin: 0 4px; }
.star.filled { filter: drop-shadow(0 0 6px #ffd700); }

.win-stats {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin: 1rem 0;
  font-size: 0.9rem;
  color: #94a3b8;
}

.btn-primary {
  display: block;
  width: 100%;
  padding: 0.75rem;
  margin-top: 0.75rem;
  background: linear-gradient(135deg, #9333ea, #c026d3);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary {
  display: block;
  width: 100%;
  padding: 0.75rem;
  margin-top: 0.5rem;
  background: transparent;
  color: #94a3b8;
  border: 1px solid #475569;
  border-radius: 10px;
  font-size: 0.9rem;
  cursor: pointer;
}

/* === 摇杆 === */
.joystick-area {
  flex-shrink: 0;
  padding: 8px 0 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 10;
}

.joystick-base {
  position: relative;
  width: 136px;
  height: 136px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 2px solid rgba(255, 255, 255, 0.15);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.joystick-knob {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 44px;
  height: 44px;
  margin-left: -22px;
  margin-top: -22px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.35), rgba(147,51,234,0.5));
  border: 2px solid rgba(255, 255, 255, 0.4);
  transition: transform 0.05s ease-out;
  pointer-events: none;
}

.joystick-arrow {
  position: absolute;
  color: rgba(255, 255, 255, 0.2);
  font-size: 12px;
  pointer-events: none;
}
.joystick-arrow.up    { top: 6px;   left: 50%; transform: translateX(-50%); }
.joystick-arrow.down  { bottom: 6px; left: 50%; transform: translateX(-50%); }
.joystick-arrow.left  { left: 6px;  top: 50%;  transform: translateY(-50%); }
.joystick-arrow.right { right: 6px; top: 50%;  transform: translateY(-50%); }

.keyboard-hint-desktop {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.3);
  margin-top: 4px;
}

/* Desktop: show keyboard hint, hide joystick arrows */
@media (min-width: 768px) {
  .joystick-base {
    width: 120px;
    height: 120px;
  }
  .joystick-knob {
    width: 38px;
    height: 38px;
    margin-left: -19px;
    margin-top: -19px;
  }
  .joystick-arrow { display: none; }
}

/* Mobile: hide keyboard hint */
@media (max-width: 767px) {
  .keyboard-hint-desktop { display: none; }
}
</style>
