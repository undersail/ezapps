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

// 触屏 D-Pad
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

    <!-- Canvas: flex-grow fills all space between HUD and D-Pad -->
    <div class="canvas-area">
      <canvas ref="canvasEl" class="game-canvas"></canvas>
    </div>

    <!-- 暂停界面 -->
    <div class="overlay" v-if="gameState === 'paused'">
      <div class="overlay-card">
        <h2>⏸ 暂停</h2>
        <button class="btn-primary" @click="handleResume">继续</button>
        <button class="btn-secondary" @click="handleBack">返回选关</button>
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
        <button class="btn-secondary" @click="handleBack">返回选关</button>
      </div>
    </div>

    <!-- 触屏 D-Pad -->
    <div class="dpad-area" v-if="gameState === 'playing'">
      <div class="dpad">
        <div class="dpad-row">
          <button class="dpad-btn" @touchstart.prevent="onDPadDown('up')" @touchend.prevent="onDPadUp('up')" @mousedown.prevent="onDPadDown('up')" @mouseup.prevent="onDPadUp('up')">▲</button>
        </div>
        <div class="dpad-row">
          <button class="dpad-btn" @touchstart.prevent="onDPadDown('left')" @touchend.prevent="onDPadUp('left')" @mousedown.prevent="onDPadDown('left')" @mouseup.prevent="onDPadUp('left')">◀</button>
          <button class="dpad-btn center" disabled>●</button>
          <button class="dpad-btn" @touchstart.prevent="onDPadDown('right')" @touchend.prevent="onDPadUp('right')" @mousedown.prevent="onDPadDown('right')" @mouseup.prevent="onDPadUp('right')">▶</button>
        </div>
        <div class="dpad-row">
          <button class="dpad-btn" @touchstart.prevent="onDPadDown('down')" @touchend.prevent="onDPadUp('down')" @mousedown.prevent="onDPadDown('down')" @mouseup.prevent="onDPadUp('down')">▼</button>
        </div>
      </div>
      <div class="keyboard-hint-desktop" v-if="gameState === 'playing'">
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

/* Canvas area: fills all space between HUD and D-Pad */
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

/* D-Pad area: fixed at bottom, not overlapping canvas */
.dpad-area {
  flex-shrink: 0;
  padding: 8px 0 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 10;
}

.dpad {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.dpad-row {
  display: flex;
  gap: 4px;
}

.dpad-btn {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.25);
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

.dpad-btn:active {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.dpad-btn.center {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  cursor: default;
}

.keyboard-hint-desktop {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.3);
  margin-top: 4px;
}

/* Desktop: hide D-Pad, show keyboard hint */
@media (min-width: 768px) {
  .dpad-area {
    padding: 4px 0;
  }
  .dpad { display: none; }
  .keyboard-hint-desktop { display: block; }
}

/* Mobile: show D-Pad, hide keyboard hint */
@media (max-width: 767px) {
  .keyboard-hint-desktop { display: none; }
  .dpad { display: flex; }
}
</style>
