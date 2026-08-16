<script setup lang="ts">
// 磁场与电磁铁演示：通电螺线管电流越大磁场越强
import { ref, computed, watch, onMounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const current = ref(3)   // 电流（线圈数×安培感）

const W = 560, H = 320
const fieldStrength = computed(() => current.value * 2)   // 磁感线数量

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

  const cx = W / 2, cy = H / 2 - 10

  // 磁感线（从 N 极出发 → S 极，数量随电流）
  const lines = Math.round(fieldStrength.value)
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)'
  ctx.lineWidth = 1.5
  for (let i = 0; i < lines; i++) {
    const spread = (i - (lines - 1) / 2) * (110 / Math.max(lines, 1)) + 30
    ctx.beginPath()
    ctx.moveTo(cx - 70, cy + spread * 0.55)
    ctx.quadraticCurveTo(cx - 130, cy + spread, cx - 70, cy - spread * 0.55)  // 左侧外弧
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx + 70, cy - spread * 0.55)
    ctx.quadraticCurveTo(cx + 130, cy + spread, cx + 70, cy + spread * 0.55)  // 右侧外弧
    ctx.stroke()
  }
  // 内部磁感线（直）
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'
  for (let i = 0; i < lines; i++) {
    const y = cy + (i - (lines - 1) / 2) * 12
    ctx.beginPath()
    ctx.moveTo(cx - 70, y); ctx.lineTo(cx + 70, y)
    ctx.stroke()
  }

  // 螺线管（线圈）
  ctx.strokeStyle = '#b45309'
  ctx.lineWidth = 3
  for (let i = -3; i <= 3; i++) {
    const x = cx + i * 16
    ctx.beginPath()
    ctx.ellipse(x, cy, 8, 62, 0, 0, Math.PI * 2)
    ctx.stroke()
  }

  // 铁芯
  ctx.fillStyle = '#475569'
  ctx.fillRect(cx - 70, cy - 40, 140, 80)

  // 磁极标记
  ctx.fillStyle = '#dc2626'
  ctx.font = 'bold 16px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText('N', cx - 96, cy + 5)
  ctx.fillStyle = '#3b82f6'
  ctx.fillText('S', cx + 96, cy + 5)

  // 铁钉（被吸引，电流大吸得牢）
  const nailY = cy + 78
  ctx.fillStyle = '#64748b'
  ctx.fillRect(cx - 8, nailY, 16, 22)
  ctx.beginPath()
  ctx.arc(cx, nailY + 22, 8, 0, Math.PI)
  ctx.fill()
  const attracted = current.value >= 2
  ctx.fillStyle = attracted ? '#059669' : '#dc2626'
  ctx.font = 'bold 12px system-ui'
  ctx.fillText(attracted ? '回形针被吸住 ✓' : '电流太小，吸不住', cx, nailY + 46)

  // 数据
  ctx.textAlign = 'left'
  ctx.fillStyle = '#334155'
  ctx.font = '13px system-ui'
  ctx.fillText(`电流 I = ${current.value}A → 磁感线 ${lines} 条`, 16, 26)
  ctx.fillStyle = '#b45309'
  ctx.fillText('通电螺线管 = 电磁铁：电流越大磁性越强', 16, 46)
}

watch([current], draw)
onMounted(draw)
</script>

<template>
  <div class="demo">
    <canvas ref="canvasRef" width="560" height="320" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <label class="demo__ctl">
        <span>电流：{{ current }} A</span>
        <input type="range" v-model.number="current" min="0" max="6" step="0.5" />
      </label>
    </div>
  </div>
</template>
