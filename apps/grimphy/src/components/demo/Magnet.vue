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


  // 磁感线（闭合回路：内部直线从 S→N + 外部弧从 N→S）
  const lines = Math.round(fieldStrength.value)
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)'
  ctx.lineWidth = 1.8
  for (let i = 0; i < lines; i++) {
    // 内部 y 位置（螺线管芯内分布）
    const y = cy + (i - (lines - 1) / 2) * 11
    if (y < cy - 38 || y > cy + 38) continue
    // 内部直线（S 端 → N 端，即从右到左）
    ctx.beginPath()
    ctx.moveTo(cx + 70, y)
    ctx.lineTo(cx - 70, y)
    ctx.stroke()
    // 外部弧（N 端绕出 → S 端绕入，半圈闭合）
    const dir = y < cy ? -1 : 1            // 上半绕上方、下半绕下方
    const arcY = y + dir * 88              // 弧顶/弧底
    ctx.beginPath()
    ctx.moveTo(cx - 70, y)
    ctx.quadraticCurveTo(cx, arcY, cx + 70, y)
    ctx.stroke()
  }
  // 磁感线方向箭头（N → S，在外部弧上标 3 个）
  ctx.fillStyle = 'rgba(239, 68, 68, 0.8)'
  for (const ay of [cy - 76, cy, cy + 76]) {
    if (Math.abs(ay - cy) > 70) {
      const ax = cx
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(ax - 5, ay + (ay < cy ? 8 : -8))
      ctx.lineTo(ax + 5, ay + (ay < cy ? 8 : -8))
      ctx.closePath()
      ctx.fill()
    }
  }

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
