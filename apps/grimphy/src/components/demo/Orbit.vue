<script setup lang="ts">
// 引力与轨道演示：行星绕恒星，速度不同轨道不同（圆/椭圆/逃逸）
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const speed = ref(1.0)   // 切向速度（圆轨道 ≈1.0）

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
  const g = 90000 / (d * d)    // GM=90000：圆轨道 v=1.0 时 v²/r = 9 = GM/r²
  vx += (dx / d) * g * dt
  vy += (dy / d) * g * dt
  px.value += vx * dt          // vx/vy 单位 px/s
  py.value += vy * dt
  // 边界逃逸处理
  if (d > 500) { trail.length = 0; reset() }
  // 撞上恒星（角动量不足直接撞上）→ 重新发射
  if (d < 22) { trail.length = 0; reset() }
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
  ctx.fillText(`行星切向速度：${speed.value.toFixed(2)}（圆轨道速度 = 1.0）`, 16, 26)
  const sp = speed.value
  const orbit = sp < 0.75 ? '扁椭圆（近点很靠近恒星，可能撞上）' : sp < 1.05 ? '椭圆轨道' : sp < 1.25 ? '近圆轨道' : sp < 1.42 ? '圆轨道' : '双曲线 · 逃逸'
  ctx.fillStyle = sp < 0.75 ? '#fbbf24' : sp >= 1.42 ? '#a78bfa' : '#38bdf8'
  ctx.fillText(`轨道状态：${orbit}`, 16, 46)
  ctx.fillStyle = 'rgba(226,232,240,0.6)'
  ctx.fillText('万有引力使行星始终绕恒星转动：速度只决定椭圆的扁圆程度', 16, 66)
}

function reset() {
  px.value = 380; py.value = 160
  trail.length = 0
  // 切向速度（垂直径向），单位 px/s：v=1.0 → 30px/s（圆轨道）
  vx = 0
  vy = speed.value * 30
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
        <input type="range" v-model.number="speed" min="0.5" max="2" step="0.05" />
      </label>
      <button class="demo__btn" @click="reset">🔄 重新发射</button>
    </div>
  </div>
</template>
