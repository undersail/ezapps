<script setup lang="ts">
// 杠杆平衡演示：力矩 M = F × d，平衡条件 F1·d1 = F2·d2
import { ref, computed, watch, onMounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const F1 = ref(3)   // 左端力（砝码数）
const F2 = ref(3)   // 右端力（砝码数）
const d1 = ref(2)   // 左臂（格）
const d2 = ref(2)   // 右臂（格）

const tilt = computed(() => {
  const t1 = F1.value * d1.value
  const t2 = F2.value * d2.value
  const max = Math.max(t1, t2, 1)
  // 左力矩大 → 左端下沉 → 逆时针（负角度）
  return Math.max(-16, Math.min(16, -((t1 - t2) / max) * 16))
})
const balance = computed(() => F1.value * d1.value === F2.value * d2.value)

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const W = 560, H = 240
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

  const pivotX = w / 2, pivotY = h / 2 + 15
  const rad = tilt.value * Math.PI / 180
  const HALF = 165

  // 支点三角
  ctx.fillStyle = '#64748b'
  ctx.beginPath()
  ctx.moveTo(pivotX - 12, pivotY + 22)
  ctx.lineTo(pivotX + 12, pivotY + 22)
  ctx.lineTo(pivotX, pivotY)
  ctx.closePath()
  ctx.fill()

  ctx.save()
  ctx.translate(pivotX, pivotY)
  ctx.rotate(rad)
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-HALF, 0)
  ctx.lineTo(HALF, 0)
  ctx.stroke()

  // 刻度（每格 44px）
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 1
  for (let g = -4; g <= 4; g++) {
    if (g === 0) continue
    ctx.beginPath()
    ctx.moveTo(g * 44, -6)
    ctx.lineTo(g * 44, 6)
    ctx.stroke()
  }

  // 左砝码
  const g1x = -d1.value * 44
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(g1x, 0)
  ctx.lineTo(g1x, 26 + F1.value * 12)
  ctx.stroke()
  ctx.fillStyle = '#3b82f6'
  for (let i = 0; i < F1.value; i++) ctx.fillRect(g1x - 14, 26 + i * 12, 28, 10)

  // 右砝码
  const g2x = d2.value * 44
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(g2x, 0)
  ctx.lineTo(g2x, 26 + F2.value * 12)
  ctx.stroke()
  ctx.fillStyle = '#10b981'
  for (let i = 0; i < F2.value; i++) ctx.fillRect(g2x - 14, 26 + i * 12, 28, 10)
  ctx.restore()

  // 读数
  ctx.font = '13px system-ui'
  ctx.fillStyle = '#334155'
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
  ctx.fillText(`左力矩 = ${F1.value} × ${d1.value} = ${F1.value * d1.value}`, 16, 24)
  ctx.fillText(`右力矩 = ${F2.value} × ${d2.value} = ${F2.value * d2.value}`, 16, 44)
  ctx.fillStyle = balance.value ? '#059669' : '#dc2626'
  ctx.font = 'bold 13px system-ui'
  ctx.fillText(balance.value ? '⚖️ 平衡！' : (tilt.value > 0 ? '▶ 右侧下沉（右力矩大）' : '◀ 左侧下沉（左力矩大）'), 16, 66)
}

watch([F1, F2, d1, d2], draw)
onMounted(draw)
</script>

<template>
  <div class="demo">
    <canvas ref="canvasRef" width="560" height="240" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <label class="demo__ctl">
        <span>左力：{{ F1 }} 个砝码</span>
        <input type="range" v-model.number="F1" min="1" max="5" step="1" />
      </label>
      <label class="demo__ctl">
        <span>左臂：{{ d1 }} 格</span>
        <input type="range" v-model.number="d1" min="1" max="4" step="1" />
      </label>
      <label class="demo__ctl">
        <span>右力：{{ F2 }} 个砝码</span>
        <input type="range" v-model.number="F2" min="1" max="5" step="1" />
      </label>
      <label class="demo__ctl">
        <span>右臂：{{ d2 }} 格</span>
        <input type="range" v-model.number="d2" min="1" max="4" step="1" />
      </label>
    </div>
  </div>
</template>
