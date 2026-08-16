<script setup lang="ts">
// 电场与磁场演示：带电粒子在磁场中做圆周运动（洛伦兹力）
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const speed = ref(2.5)     // 粒子速度
const charge = ref(1)      // 电荷（+/-）

const W = 560, H = 320
let raf = 0
let last = 0
let px = 120, py = 160
let vx = 0, vy = 0
const trail: { x: number; y: number }[] = []

function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  // 洛伦兹力：F = qv×B（垂直速度方向 → 圆周运动）
  const f = speed.value * charge.value * 0.8
  // 磁场方向垂直纸面向外（+z），正电荷偏转方向：F = qv×B
  const ax = vy * f * charge.value
  const ay = -vx * f * charge.value
  vx += ax * dt * 2
  vy += ay * dt * 2
  px += vx * dt * 30
  py += vy * dt * 30
  trail.push({ x: px, y: py })
  if (trail.length > 260) trail.shift()
  // 出界重置
  if (px < 30 || px > W - 30 || py < 30 || py > H - 30) reset()
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

  // 磁场区域（均匀）
  ctx.fillStyle = 'rgba(99, 102, 241, 0.08)'
  ctx.fillRect(50, 40, 460, 240)
  // 磁场符号（点 = 纸面向外）
  ctx.fillStyle = 'rgba(99, 102, 241, 0.5)'
  ctx.font = '10px system-ui'
  ctx.textAlign = 'center'
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 7; c++) {
      ctx.fillText('•', 95 + c * 66, 70 + r * 58)
    }
  }
  ctx.fillStyle = '#6366f1'
  ctx.font = 'bold 13px system-ui'
  ctx.fillText('B ⊗（垂直纸面向里）', W / 2, 30)

  // 轨迹
  if (trail.length > 1) {
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(trail[0].x, trail[0].y)
    for (const p of trail) ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  // 粒子
  ctx.fillStyle = charge.value > 0 ? '#ef4444' : '#3b82f6'
  ctx.beginPath()
  ctx.arc(px, py, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 10px system-ui'
  ctx.fillText(charge.value > 0 ? '+' : '−', px, py + 3.5)

  // 数据
  ctx.textAlign = 'left'
  ctx.fillStyle = '#334155'
  ctx.font = '13px system-ui'
  ctx.fillText(`粒子速度：${speed.value.toFixed(1)}  电荷：${charge.value > 0 ? '正' : '负'}`, 16, 66 + 20)
  ctx.fillStyle = '#7c3aed'
  ctx.font = 'bold 13px system-ui'
  ctx.fillText(`洛伦兹力 F = qvB → 粒子做圆周运动（半径 ∝ 速度）`, 16, 86 + 20)
  ctx.fillStyle = '#64748b'
  ctx.fillText('力始终垂直于速度方向：只改变方向，不做功', 16, 106 + 20)
}

function reset() {
  px = 120; py = 160
  vx = speed.value
  vy = 0
  trail.length = 0
  last = performance.now()
}

watch([speed, charge], reset)
onMounted(() => { reset(); raf = requestAnimationFrame(frame) })
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="demo">
    <canvas ref="canvasRef" width="560" height="320" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <label class="demo__ctl">
        <span>粒子速度：{{ speed.toFixed(1) }}</span>
        <input type="range" v-model.number="speed" min="1" max="4" step="0.2" />
      </label>
      <label class="demo__ctl">
        <span>电荷：{{ charge > 0 ? '正 (+) ' : '负 (−)' }}</span>
        <input type="range" v-model.number="charge" min="-1" max="1" step="1" />
      </label>
    </div>
  </div>
</template>
