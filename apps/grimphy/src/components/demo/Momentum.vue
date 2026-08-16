<script setup lang="ts">
// 动量碰撞演示：一维弹性碰撞，动量守恒 m1v1+m2v2 = m1v1'+m2v2'
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const m1 = ref(2)
const m2 = ref(3)
const v1 = ref(4)
const v2 = ref(-2)

let raf = 0
let last = 0
let running = true
let x1 = 110, x2 = 440
let s1 = 0, s2 = 0
const R = 22

function momentum() {
  return m1.value * v1.value + m2.value * v2.value
}
function momentumAfter() {
  return m1.value * s1 + m2.value * s2
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const W = 560, H = 280
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
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, w, h)
  const y = h / 2 + 20

  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(20, y + R + 8)
  ctx.lineTo(w - 20, y + R + 8)
  ctx.stroke()

  // 左球（蓝）
  ctx.fillStyle = '#3b82f6'
  ctx.beginPath()
  ctx.arc(x1, y, R, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 12px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText('m=' + m1.value, x1, y + 4)

  // 右球（绿）
  ctx.fillStyle = '#10b981'
  ctx.beginPath()
  ctx.arc(x2, y, R, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.fillText('m=' + m2.value, x2, y + 4)

  // 速度箭头
  function arrow(c: CanvasRenderingContext2D, x: number, v: number, color: string) {
    if (Math.abs(v) < 0.05) return
    const dir = v > 0 ? 1 : -1
    const ax = x + dir * (R + 14)
    c.strokeStyle = color
    c.lineWidth = 2.5
    c.beginPath()
    c.moveTo(ax, y + R + 20)
    c.lineTo(ax + dir * 30, y + R + 20)
    c.stroke()
    c.beginPath()
    c.moveTo(ax + dir * 30, y + R + 20)
    c.lineTo(ax + dir * 22, y + R + 16)
    c.moveTo(ax + dir * 30, y + R + 20)
    c.lineTo(ax + dir * 22, y + R + 24)
    c.stroke()
  }
  arrow(ctx, x1, running ? v1.value : s1, '#3b82f6')
  arrow(ctx, x2, running ? v2.value : s2, '#10b981')

  // 数据
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
  ctx.font = '13px system-ui'
  ctx.fillStyle = '#334155'
  ctx.fillText('碰撞前：v1=' + v1.value + ' m/s  v2=' + v2.value + ' m/s', 16, 24)
  ctx.fillText('动量守恒：' + momentum().toFixed(1) + ' = ' + (running ? '碰撞中…' : momentumAfter().toFixed(1)), 16, 44)
  if (!running) {
    ctx.fillStyle = '#059669'
    ctx.fillText('碰撞后：v1=' + s1.toFixed(1) + ' m/s  v2=' + s2.toFixed(1) + ' m/s ✓ 守恒', 16, 64)
  }
}

function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  if (running) {
    x1 += v1.value * dt * 45
    x2 += v2.value * dt * 45
    if (x2 - x1 <= R * 2 + 2) {
      s1 = ((m1.value - m2.value) * v1.value + 2 * m2.value * v2.value) / (m1.value + m2.value)
      s2 = ((m2.value - m1.value) * v2.value + 2 * m1.value * v1.value) / (m1.value + m2.value)
      running = false
    }
  } else {
    x1 += s1 * dt * 45
    x2 += s2 * dt * 45
    if (x1 < R) { x1 = R; s1 = Math.abs(s1) }
    if (x2 > 560 - R) { x2 = 560 - R; s2 = -Math.abs(s2) }
  }
  draw()
  raf = requestAnimationFrame(frame)
}

function reset() {
  x1 = 110; x2 = 440
  s1 = 0; s2 = 0
  running = true
  last = performance.now()
}

watch([m1, m2, v1, v2], reset)
onMounted(() => {
  reset()
  last = performance.now()
  raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="demo">
    <canvas ref="canvasRef" width="560" height="280" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <label class="demo__ctl">
        <span>m1 质量：{{ m1 }}</span>
        <input type="range" v-model.number="m1" min="1" max="5" step="1" />
      </label>
      <label class="demo__ctl">
        <span>v1 速度：{{ v1 }}</span>
        <input type="range" v-model.number="v1" min="-5" max="5" step="0.5" />
      </label>
      <label class="demo__ctl">
        <span>m2 质量：{{ m2 }}</span>
        <input type="range" v-model.number="m2" min="1" max="5" step="1" />
      </label>
      <label class="demo__ctl">
        <span>v2 速度：{{ v2 }}</span>
        <input type="range" v-model.number="v2" min="-5" max="5" step="0.5" />
      </label>
      <button class="demo__btn" @click="reset">🔄 重新碰撞</button>
    </div>
  </div>
</template>
