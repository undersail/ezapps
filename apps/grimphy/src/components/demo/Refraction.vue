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
  const midY = H / 2
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
  ctx.beginPath(); ctx.moveTo(px0, 40); ctx.lineTo(px0, H - 40); ctx.stroke()
  ctx.setLineDash([])

  // 入射光线（左上 → 分界点）
  const rad = (angle.value * Math.PI) / 180
  ctx.strokeStyle = '#f59e0b'
  ctx.lineWidth = 3
  const inLen = 150
  ctx.beginPath()
  ctx.moveTo(px0 - Math.sin(rad) * inLen, py0 - Math.cos(rad) * inLen)
  ctx.lineTo(px0, py0)
  ctx.stroke()

  // 折射光线（右下）
  const rrad = (refracted.value * Math.PI) / 180
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 3
  const outLen = 160
  ctx.beginPath()
  ctx.moveTo(px0, py0)
  ctx.lineTo(px0 + Math.sin(rrad) * outLen, py0 + Math.cos(rrad) * outLen)
  ctx.stroke()

  // 角度弧线
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(px0, py0, 36, -rad, 0)
  ctx.stroke()
  ctx.fillStyle = '#b45309'
  ctx.font = '12px system-ui'
  ctx.fillText('θ₁=' + angle.value + '°', px0 - 70, py0 - 40)

  ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)'
  ctx.beginPath()
  ctx.arc(px0, py0, 42, 0, rrad)
  ctx.stroke()
  ctx.fillStyle = '#1d4ed8'
  ctx.fillText('θ₂=' + refracted.value.toFixed(1) + '°', px0 + 50, py0 + 48)

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
