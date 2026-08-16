<script setup lang="ts">
// 引力与轨道演示：行星绕恒星，速度不同轨道不同（圆/椭圆/逃逸）
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const speed = ref(2.2)   // 切向速度

const W = 560, H = 320
let raf = 0
let last = 0
const px = ref(380)
const py = ref(160)
let vx = 0, vy = 0
const trail: { x: number; y: number }[] = []

function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  // 引力（万有引力 → 恒星）
  const sx = W / 2, sy = H / 2
  const dx = sx - px.value, dy = sy - py.value
  const d = Math.max(Math.hypot(dx, dy), 30)
  const g = 900 / (d * d)
  vx += (dx / d) * g * dt
  vy += (dy / d) * g * dt
  px.value += vx * dt * 30
  py.value += vy * dt * 30
  // 边界逃逸处理
  if (d > 500) { trail.length = 0; reset() }
  trail.push({ x: px.value, y: py.value })
  if (trail.length > 400) trail.shift()
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
  ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H)

  // 背景星
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  for (let i = 0; i < 40; i++) {
    ctx.beginPath()
    ctx.arc((i * 67) % W, (i * 41) % H, 1, 0, Math.PI * 2)
    ctx.fill()
  }

  // 轨道（参考圆）
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.arc(W / 2, H / 2, 150, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  // 轨迹
  if (trail.length > 1) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(trail[0].x, trail[0].y)
    for (const p of trail) ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  // 恒星
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.arc(W / 2, H / 2, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(251, 191, 36, 0.3)'
  ctx.beginPath()
  ctx.arc(W / 2, H / 2, 26, 0, Math.PI * 2)
  ctx.fill()

  // 行星
  ctx.fillStyle = '#3b82f6'
  ctx.beginPath()
  ctx.arc(px.value, py.value, 7, 0, Math.PI * 2)
  ctx.fill()

  // 数据
  ctx.textAlign = 'left'
  ctx.font = '13px system-ui'
  ctx.fillStyle = '#e2e8f0'
  ctx.fillText(`行星切向速度：${speed.value.toFixed(1)}`, 16, 26)
  const sp = speed.value
  const orbit = sp < 1.7 ? '被吸引坠落' : sp < 2.1 ? '椭圆轨道' : sp < 2.7 ? '近圆轨道' : '飞离（逃逸）'
  ctx.fillStyle = sp < 1.7 ? '#f87171' : sp > 2.7 ? '#a78bfa' : '#38bdf8'
  ctx.fillText(`轨道状态：${orbit}`, 16, 46)
  ctx.fillStyle = 'rgba(226,232,240,0.6)'
  ctx.fillText('万有引力提供向心力，速度决定轨道形状', 16, 66)
}

function reset() {
  px.value = 380; py.value = 160
  trail.length = 0
  // 切向速度（垂直径向）
  vx = 0
  vy = speed.value
  last = performance.now()
}

watch(speed, reset)
onMounted(() => { reset(); raf = requestAnimationFrame(frame) })
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="demo">
    <canvas ref="canvasRef" width="560" height="320" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <label class="demo__ctl">
        <span>切向速度：{{ speed.toFixed(1) }}</span>
        <input type="range" v-model.number="speed" min="1" max="3.5" step="0.1" />
      </label>
      <button class="demo__btn" @click="reset">🔄 重新发射</button>
    </div>
  </div>
</template>
