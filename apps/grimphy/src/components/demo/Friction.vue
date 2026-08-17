<script setup lang="ts">
// 摩擦力演示：物体静止在中部，拉力>最大静摩擦才滑动（f = μN）
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const roughness = ref(0.5)  // 摩擦系数 μ
const press = ref(5)        // 压力 N
const pull = ref(3)         // 拉力

const W = 560, H = 320
const friction = computed(() => roughness.value * press.value)   // 最大摩擦力 μN

// 物体位置（x 状态，调参不动，拉力>摩擦才滑动）
const objX = ref(190)
const START_X = 190
const GROUND_Y = 215

let raf = 0
let last = 0

function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  // 拉力 > 最大摩擦 → 向右滑动；否则静止
  if (pull.value > friction.value + 0.01) {
    objX.value += (pull.value - friction.value) * dt * 30
  }
  draw()
  raf = requestAnimationFrame(frame)
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  if (canvas.width !== W * dpr || canvas.height !== H * dpr) { canvas.width = W * dpr; canvas.height = H * dpr }
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H)

  const y = GROUND_Y
  const moving = pull.value > friction.value + 0.01

  // 地面（粗糙度决定纹理）
  ctx.fillStyle = '#cbd5e1'
  ctx.fillRect(60, y, 440, 12)
  ctx.fillStyle = roughness.value > 0.6 ? '#94a3b8' : roughness.value > 0.3 ? '#cbd5e1' : '#e2e8f0'
  for (let x = 70; x < 490; x += 14) {
    const h = 4 + roughness.value * 10
    ctx.fillRect(x, y - h, 6, h)
  }

  // 物体（当前位置）
  const ox = Math.min(objX.value, 430)
  ctx.fillStyle = '#f59e0b'
  ctx.fillRect(ox, y - 48, 56, 48)
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 12px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText('木块', ox + 28, y - 18)

  // 压力箭头（从上向下压向物体，N）
  ctx.strokeStyle = '#7c3aed'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(ox + 28, y - 48 - 30)
  ctx.lineTo(ox + 28, y - 48 - 6)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(ox + 28, y - 48 - 6)
  ctx.lineTo(ox + 22, y - 48 - 14)
  ctx.moveTo(ox + 28, y - 48 - 6)
  ctx.lineTo(ox + 34, y - 48 - 14)
  ctx.stroke()
  ctx.fillStyle = '#7c3aed'
  ctx.font = 'bold 12px system-ui'
  ctx.fillText('N=' + press.value, ox + 28, y - 48 - 34)

  // 拉力箭头（右）
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(ox + 28 + 40, y - 24)
  ctx.lineTo(ox + 28 + 40 + pull.value * 12, y - 24)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(ox + 28 + 40 + pull.value * 12, y - 24)
  ctx.lineTo(ox + 28 + 30 + pull.value * 12, y - 31)
  ctx.moveTo(ox + 28 + 40 + pull.value * 12, y - 24)
  ctx.lineTo(ox + 28 + 30 + pull.value * 12, y - 17)
  ctx.stroke()
  ctx.fillStyle = '#3b82f6'
  ctx.font = 'bold 12px system-ui'
  ctx.fillText('F=' + pull.value, ox + 28 + 70, y - 30)

  // 摩擦力箭头（左：未动时=拉力，滑动时=μN）
  const fShow = moving ? friction.value : Math.min(pull.value, friction.value)
  const fLen = Math.min(fShow, pull.value) * 12
  ctx.strokeStyle = '#dc2626'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(ox + 28 - 30, y - 8)
  ctx.lineTo(ox + 28 - 30 - fLen, y - 8)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(ox + 28 - 30 - fLen, y - 8)
  ctx.lineTo(ox + 28 - 30 - fLen + 8, y - 15)
  ctx.moveTo(ox + 28 - 30 - fLen, y - 8)
  ctx.lineTo(ox + 28 - 30 - fLen + 8, y - 1)
  ctx.stroke()
  ctx.fillStyle = '#dc2626'
  ctx.fillText('f=' + fShow.toFixed(1), ox + 28 - 60, y + 26)

  // ===== 顶部信息区 =====
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, W, 80)
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, 80)
  ctx.lineTo(W, 80)
  ctx.stroke()
  ctx.fillStyle = '#334155'
  ctx.font = '13px system-ui'
  ctx.textAlign = 'left'
  ctx.fillText(`摩擦系数 μ=${roughness.value.toFixed(1)}  压力 N=${press.value}  最大摩擦力 f = μN = ${friction.value.toFixed(1)}`, 16, 24)
  ctx.fillStyle = moving ? '#059669' : '#64748b'
  ctx.font = 'bold 13px system-ui'
  ctx.fillText(
    moving ? '拉力 > 最大摩擦力 → 木块向右滑动 ✓' :
    pull.value > friction.value ? '刚开始动！' : `拉力 < 最大摩擦力 → 静止（静摩擦 = 拉力 ${pull.value.toFixed(1)}）`, 16, 46)
  ctx.fillStyle = '#64748b'
  ctx.font = '13px system-ui'
  ctx.fillText('静摩擦随拉力增大，直到超过最大静摩擦 μN 才开始滑动', 16, 68)
}

function reset() {
  objX.value = START_X
}

watch([roughness, press, pull], reset)   // 调参 → 回到起点
onMounted(() => { last = performance.now(); raf = requestAnimationFrame(frame) })
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="demo">
    <canvas ref="canvasRef" width="560" height="320" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <label class="demo__ctl">
        <span>摩擦系数：{{ roughness.toFixed(1) }}</span>
        <input type="range" v-model.number="roughness" min="0.1" max="1" step="0.1" />
      </label>
      <label class="demo__ctl">
        <span>压力：{{ press }}</span>
        <input type="range" v-model.number="press" min="1" max="10" step="0.5" />
      </label>
      <label class="demo__ctl">
        <span>拉力：{{ pull }}</span>
        <input type="range" v-model.number="pull" min="0" max="10" step="0.5" />
      </label>
      <button class="demo__btn" @click="reset">🔄 复位</button>
    </div>
  </div>
</template>
