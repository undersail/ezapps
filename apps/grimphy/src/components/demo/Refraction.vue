<script setup lang="ts">
// 光的折射演示：斯涅尔定律 n1·sinθ1 = n2·sinθ2（空气→水）
import { ref, computed, watch, onMounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const angle = ref(30)     // 入射角 °
const n2 = ref(1.33)      // 水折射率

const W = 560, H = 320
const refracted = computed(() => {
  const s = Math.sin((angle.value * Math.PI) / 180) / n2.value
  if (s > 1) return 90   // 全反射边界
  return (Math.asin(s) * 180) / Math.PI
})

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

  // 分界面（上半空气 / 下半水）
  const midY = H / 2 + 30
  ctx.fillStyle = 'rgba(56, 189, 248, 0.22)'
  ctx.fillRect(0, midY, W, H - midY)
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(W, midY); ctx.stroke()
  ctx.fillStyle = '#0284c7'
  ctx.font = '12px system-ui'
  ctx.textAlign = 'left'
  ctx.fillText('水 n₂=' + n2.value.toFixed(2), 20, midY + 24)

  // 法线（虚线）
  const px0 = W / 2, py0 = midY
  ctx.strokeStyle = '#cbd5e1'
  ctx.setLineDash([5, 4])
  ctx.beginPath(); ctx.moveTo(px0, 70); ctx.lineTo(px0, H - 40); ctx.stroke()
  ctx.setLineDash([])

  // 入射光线（左上 → 分界点）+ 方向箭头
  const rad = (angle.value * Math.PI) / 180
  ctx.strokeStyle = '#f59e0b'
  ctx.lineWidth = 3
  const inLen = 105
  const inSx = px0 - Math.sin(rad) * inLen, inSy = py0 - Math.cos(rad) * inLen
  ctx.beginPath()
  ctx.moveTo(inSx, inSy)
  ctx.lineTo(px0, py0)
  ctx.stroke()
  // 入射方向箭头（沿光线方向：指向分界点）
  const inMid = 0.55
  const amx = inSx + (px0 - inSx) * inMid, amy = inSy + (py0 - inSy) * inMid
  const aUx = Math.sin(rad), aUy = Math.cos(rad)
  ctx.fillStyle = '#b45309'
  ctx.beginPath()
  ctx.moveTo(amx + aUx * 9, amy + aUy * 9)
  ctx.lineTo(amx - aUy * 5, amy + aUx * 5)
  ctx.lineTo(amx + aUy * 5, amy - aUx * 5)
  ctx.closePath()
  ctx.fill()

  // 折射光线（右下）+ 方向箭头
  const rrad = (refracted.value * Math.PI) / 180
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 3
  const outLen = 150
  const outEx = px0 + Math.sin(rrad) * outLen, outEy = py0 + Math.cos(rrad) * outLen
  ctx.beginPath()
  ctx.moveTo(px0, py0)
  ctx.lineTo(outEx, outEy)
  ctx.stroke()
  const bmx = px0 + (outEx - px0) * 0.55, bmy = py0 + (outEy - py0) * 0.55
  const bUx = Math.sin(rrad), bUy = Math.cos(rrad)
  ctx.fillStyle = '#1d4ed8'
  ctx.beginPath()
  ctx.moveTo(bmx + bUx * 9, bmy + bUy * 9)
  ctx.lineTo(bmx - bUy * 5, bmy + bUx * 5)
  ctx.lineTo(bmx + bUy * 5, bmy - bUx * 5)
  ctx.closePath()
  ctx.fill()

  // 角度弧线
  // 入射角弧：法线向上(-π/2) → 入射光线反方向(法线左侧 θ)
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(px0, py0, 36, -Math.PI / 2 - rad, -Math.PI / 2)
  ctx.stroke()
  ctx.fillStyle = '#b45309'
  ctx.font = '12px system-ui'
  ctx.fillText('θ₁=' + angle.value + '°', px0 - 62, py0 - 32)

  ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(px0, py0, 44, Math.PI / 2 - rrad, Math.PI / 2)
  ctx.stroke()
  ctx.fillStyle = '#1d4ed8'
  ctx.font = '12px system-ui'
  ctx.fillText('θ₂=' + refracted.value.toFixed(1) + '°', px0 + 60, py0 + 52)

  // 数据
  ctx.fillStyle = '#334155'
  ctx.font = '13px system-ui'
  ctx.fillText(`入射角 θ₁ = ${angle.value}°`, 16, 26)
  ctx.fillStyle = '#1d4ed8'
  ctx.font = 'bold 14px system-ui'
  ctx.fillText(`折射角 θ₂ = ${refracted.value.toFixed(1)}°（光从空气进入水，向法线靠拢）`, 16, 46)
  ctx.fillStyle = '#64748b'
  ctx.font = '13px system-ui'
  ctx.fillText('斯涅尔定律：n₁·sinθ₁ = n₂·sinθ₂', 16, 66)
}

watch([angle, n2], draw)
onMounted(draw)
</script>

<template>
  <div class="demo">
    <canvas ref="canvasRef" width="560" height="320" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <label class="demo__ctl">
        <span>入射角：{{ angle }}°</span>
        <input type="range" v-model.number="angle" min="0" max="80" step="1" />
      </label>
      <label class="demo__ctl">
        <span>水折射率：{{ n2.toFixed(2) }}</span>
        <input type="range" v-model.number="n2" min="1.2" max="2" step="0.01" />
      </label>
    </div>
  </div>
</template>
