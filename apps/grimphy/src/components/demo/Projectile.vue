<script setup lang="ts">
// 平抛运动演示：x = v0·t，y = ½gt²，轨迹为抛物线
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const v0 = ref(3.2)      // 初速度 m/s（模拟）
const resetKey = ref(0)

const G = 9.8            // m/s²
const SCALE = 34         // px/m
const BALL_R = 10

let raf = 0
let last = 0
let t = 0
const trail: { x: number; y: number }[] = []

// 地面高度（canvas 内）
const GROUND = 280

function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  const dtSim = dt * 1.2
  t += dtSim
  // 物理计算：起点 (x=50px, y=100px)
  const x0 = 60, y0 = 90
  const xm = v0.value * t
  const ym = 0.5 * G * t * t
  const px = x0 + xm * SCALE
  const py = y0 + ym * SCALE
  if (py < GROUND - 2) trail.push({ x: px, y: py })
  draw(px, py)
  if (py >= GROUND - 2 && t > 0.1) {
    // 落地后冻结，等重置
    return
  }
  raf = requestAnimationFrame(frame)
}

function draw(ballX: number, ballY: number) {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const W = 560, H = 320
  if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
    canvas.width = W * dpr
    canvas.height = H * dpr
  }
  canvas.style.width = W + 'px'
  canvas.style.height = H + 'px'
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, W, H)
  const w = W, h = H

  // 地面
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, GROUND)
  ctx.lineTo(w, GROUND)
  ctx.stroke()
  ctx.fillStyle = '#cbd5e1'
  ctx.fillRect(0, GROUND, w, 4)

  // 起点平台
  ctx.fillStyle = '#e2e8f0'
  ctx.fillRect(20, 60, 60, GROUND - 60)

  // 轨迹
  if (trail.length > 1) {
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    ctx.moveTo(trail[0].x, trail[0].y)
    for (const p of trail) ctx.lineTo(p.x, p.y)
    ctx.stroke()
    ctx.setLineDash([])
  }

  // 小球
  ctx.fillStyle = '#3b82f6'
  ctx.beginPath()
  ctx.arc(ballX, ballY, BALL_R, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.beginPath()
  ctx.arc(ballX - 3, ballY - 3, 3.5, 0, Math.PI * 2)
  ctx.fill()

  // 数据
  const xm = v0.value * t
  const ym = 0.5 * G * t * t
  ctx.fillStyle = '#334155'
  ctx.font = '13px system-ui'
  // ===== 顶部信息区（白条盖住越界图形，文字专属区） =====
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, W, 80)
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, 80)
  ctx.lineTo(W, 80)
  ctx.stroke()
  ctx.textAlign = 'left'
  ctx.fillText(`时间 t = ${t.toFixed(1)}s`, 16, h - 54)
  ctx.fillText(`水平距离 x = ${xm.toFixed(1)}m`, 16, h - 34)
  ctx.fillText(`下落高度 y = ${ym.toFixed(1)}m`, 16, h - 14)
}

watch([v0, resetKey], () => {
  t = 0
  trail.length = 0
  cancelAnimationFrame(raf)
  last = performance.now()
  raf = requestAnimationFrame(frame)
})
onMounted(() => { last = performance.now(); raf = requestAnimationFrame(frame) })
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="demo">
    <canvas ref="canvasRef" width="560" height="320" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <label class="demo__ctl">
        <span>初速度：{{ v0.toFixed(1) }} m/s</span>
        <input type="range" v-model.number="v0" min="1" max="6" step="0.1" />
      </label>
      <button class="demo__btn" @click="resetKey++">🔄 重新抛出</button>
    </div>
  </div>
</template>
