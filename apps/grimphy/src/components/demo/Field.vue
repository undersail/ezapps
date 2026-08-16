<script setup lang="ts">
// 电场与磁场演示：带电粒子垂直射入匀强磁场 → 洛伦兹力提供向心力做圆周运动
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
  // 洛伦兹力 F = qv×B（B 垂直纸面向里 ⊗，力垂直于速度 → 圆周运动）
  const f = speed.value * charge.value * 0.55
  const ax = vy * f
  const ay = -vx * f
  vx += ax * dt
  vy += ay * dt
  px += vx * dt * 26
  py += vy * dt * 26
  trail.push({ x: px, y: py })
  if (trail.length > 240) trail.shift()
  if (px < 40 || px > W - 40 || py < 92 || py > H - 20) reset()   // 轨迹不穿顶部白条区
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

  // ===== 磁场区域（y≥88，浅灰底 + ⊗ 符号） =====
  const fieldTop = 88, fieldBottom = 300
  ctx.fillStyle = '#f1f5f9'
  ctx.fillRect(50, fieldTop, 460, fieldBottom - fieldTop)
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 1.5
  ctx.strokeRect(50, fieldTop, 460, fieldBottom - fieldTop)
  // ⊗ 符号网格（B 向里）
  ctx.fillStyle = 'rgba(100, 116, 139, 0.55)'
  ctx.font = '12px system-ui'
  ctx.textAlign = 'center'
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 6; c++) {
      ctx.fillText('⊗', 110 + c * 72, 118 + r * 66)
    }
  }
  ctx.fillStyle = '#64748b'
  ctx.font = 'bold 12px system-ui'
  ctx.fillText('磁场区域（B ⊗ 垂直纸面向里）', W / 2, fieldTop + 16)

  // 轨迹
  if (trail.length > 1) {
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)'
    ctx.lineWidth = 2.5
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

  // 入射方向说明
  ctx.fillStyle = '#64748b'
  ctx.font = '11px system-ui'
  ctx.textAlign = 'left'
  ctx.fillText('粒子从画面中央向右射入 ↓', 60, fieldBottom + 16)

  // ===== 顶部信息区（白条盖住越界图形，文字最后画） =====
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
  ctx.fillText(`粒子速度 v=${speed.value.toFixed(1)}  电荷：${charge.value > 0 ? '正 (+)' : '负 (−)'}`, 16, 24)
  ctx.fillStyle = '#7c3aed'
  ctx.font = 'bold 14px system-ui'
  ctx.fillText('洛伦兹力 F = qvB 始终垂直于速度 → 粒子做圆周运动', 16, 46)
  ctx.fillStyle = '#64748b'
  ctx.font = '13px system-ui'
  ctx.fillText('F 只改变方向不做功，速度大小不变；电荷正负偏转方向相反', 16, 68)
}

function reset() {
  px = W / 2; py = 190
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
