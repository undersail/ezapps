<script setup lang="ts">
// 全反射演示：光从水（n=1.33）射向空气，入射角>临界角 → 全反射
import { ref, computed, watch, onMounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const angle = ref(30)     // 入射角 °

const W = 560, H = 320
const nWater = 1.33
const critical = computed(() => (Math.asin(1 / nWater) * 180) / Math.PI)   // 48.75°
const isTotal = computed(() => angle.value > critical.value)

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
  ctx.fillText('水 n=' + nWater.toFixed(2) + '（入射光从水中射向水面）', 20, midY + 24)
  ctx.fillStyle = '#94a3b8'
  ctx.fillText('空气 n=1', 20, midY - 10)

  // 法线
  const px0 = W / 2, py0 = midY
  ctx.strokeStyle = '#cbd5e1'
  ctx.setLineDash([5, 4])
  ctx.beginPath(); ctx.moveTo(px0, 70); ctx.lineTo(px0, H - 40); ctx.stroke()
  ctx.setLineDash([])

  // 入射光（从左下 → 分界点）
  const rad = (angle.value * Math.PI) / 180
  ctx.strokeStyle = '#f59e0b'
  ctx.lineWidth = 3
  const inLen = 105
  ctx.beginPath()
  ctx.moveTo(px0 - Math.sin(rad) * inLen, py0 + Math.cos(rad) * inLen)
  ctx.lineTo(px0, py0)
  ctx.stroke()

  if (!isTotal.value) {
    // 未达临界角：光进入空气（折射内容见「光的折射」实验）
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(px0, py0)
    ctx.lineTo(px0 + 60, py0 - 60)
    ctx.stroke()
    ctx.fillStyle = '#1d4ed8'
    ctx.font = '12px system-ui'
    ctx.fillText('光进入空气', px0 + 50, py0 - 70)
  } else {
    // 反射光（左上，θ' = θ）
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(px0, py0)
    ctx.lineTo(px0 - Math.sin(rad) * 130, py0 - Math.cos(rad) * 130)
    ctx.stroke()
    ctx.fillStyle = '#1d4ed8'
    ctx.font = 'bold 13px system-ui'
    ctx.fillText('全反射！没有折射光', px0 - 130, py0 - 70)
  }

  // 角度弧线
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(px0, py0, 36, 0, rad)
  ctx.stroke()
  ctx.fillStyle = '#b45309'
  ctx.font = '12px system-ui'
  ctx.fillText('θ=' + angle.value + '°', px0 - 46, py0 + 42)

  // 临界角标记
  const cr = (critical.value * Math.PI) / 180
  ctx.strokeStyle = 'rgba(220, 38, 38, 0.5)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  ctx.moveTo(px0, py0)
  ctx.lineTo(px0 - Math.sin(cr) * 130, py0 - Math.cos(cr) * 130)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#dc2626'
  ctx.font = '11px system-ui'
  ctx.fillText('临界角 ' + critical.value.toFixed(1) + '°', px0 - 96, py0 - 30)

  // 数据
  ctx.fillStyle = '#334155'
  ctx.font = '13px system-ui'
  ctx.fillText(`入射角 θ = ${angle.value}°  |  临界角 = ${critical.value.toFixed(1)}°`, 16, 26)
  ctx.fillStyle = isTotal.value ? '#dc2626' : '#1d4ed8'
  ctx.font = 'bold 14px system-ui'
  ctx.fillText(
    isTotal.value ? '入射角 > 临界角 → 光全部反射回水中（全反射）' :
    '入射角 < 临界角 → 光进入空气（未全反射）', 16, 46)
  ctx.fillStyle = '#64748b'
  ctx.font = '13px system-ui'
  ctx.fillText('全反射应用：光纤通信、钻石的闪耀', 16, 66)
}

watch([angle], draw)
onMounted(draw)
</script>

<template>
  <div class="demo">
    <canvas ref="canvasRef" width="560" height="320" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <label class="demo__ctl">
        <span>入射角：{{ angle }}°</span>
        <input type="range" v-model.number="angle" min="0" max="85" step="1" />
      </label>
    </div>
  </div>
</template>
