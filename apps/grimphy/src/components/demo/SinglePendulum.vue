<script setup lang="ts">
// 单摆演示：小角度简谐运动 θ(t)=θ0·cos(ωt)，周期 T=2π√(L/g)
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const L = ref(120)      // 摆长 px
const theta0 = ref(30)  // 初始角度°
const running = ref(true)

const G = 400           // 模拟重力（px/s²）
let raf = 0
let last = 0
let t = 0               // 模拟时间

function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  if (running.value) t += dt
  draw()
  raf = requestAnimationFrame(frame)
}

function draw() {
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
  const w = W, h = H
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, w, h)
  const pivotX = w / 2, pivotY = 110

  const omega = Math.sqrt(G / L.value)
  const rad = (theta0.value * Math.PI / 180) * Math.cos(omega * t)
  const ballX = pivotX + L.value * Math.sin(rad)
  const ballY = pivotY + L.value * Math.cos(rad)

  // 摆动包络弧线
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(pivotX, pivotY, L.value, Math.PI * 0.18, Math.PI * 0.82)
  ctx.stroke()

  // 极限位置虚线
  ctx.setLineDash([4, 4])
  ctx.strokeStyle = '#cbd5e1'
  for (const a of [-theta0.value, theta0.value]) {
    const r2 = a * Math.PI / 180
    ctx.beginPath()
    ctx.moveTo(pivotX, pivotY)
    ctx.lineTo(pivotX + L.value * Math.sin(r2), pivotY + L.value * Math.cos(r2))
    ctx.stroke()
  }
  ctx.setLineDash([])

  // 摆杆
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(pivotX, pivotY)
  ctx.lineTo(ballX, ballY)
  ctx.stroke()

  // 悬挂点
  ctx.fillStyle = '#94a3b8'
  ctx.beginPath()
  ctx.arc(pivotX, pivotY, 6, 0, Math.PI * 2)
  ctx.fill()

  // 摆球
  ctx.fillStyle = '#6366f1'
  ctx.beginPath()
  ctx.arc(ballX, ballY, 18, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.beginPath()
  ctx.arc(ballX - 5, ballY - 5, 6, 0, Math.PI * 2)
  ctx.fill()

  // 数据
  const T = 2 * Math.PI * Math.sqrt(L.value / G)
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
  ctx.fillStyle = '#334155'
  ctx.textAlign = 'left'
  ctx.fillText(`摆长 L = ${L.value}px  初始角度 ${theta0.value}°`, 16, 24)
  ctx.fillText(`理论周期 T = ${T.toFixed(2)}s（只与摆长有关）`, 16, 46)
  ctx.fillText(`当前角度 = ${(rad * 180 / Math.PI).toFixed(1)}°`, 16, 68)
}

watch([L, theta0], () => { t = 0 })
onMounted(() => { last = performance.now(); raf = requestAnimationFrame(frame) })
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="demo">
    <canvas ref="canvasRef" width="560" height="320" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <label class="demo__ctl">
        <span>摆长：{{ L }}px</span>
        <input type="range" v-model.number="L" min="60" max="190" step="5" />
      </label>
      <label class="demo__ctl">
        <span>初始角度：{{ theta0 }}°</span>
        <input type="range" v-model.number="theta0" min="5" max="45" step="1" />
      </label>
      <button class="demo__btn" @click="running = !running">{{ running ? '⏸ 暂停' : '▶ 继续' }}</button>
    </div>
  </div>
</template>
