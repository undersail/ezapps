<script setup lang="ts">
// 光的反射与全反射
// mode 'interface'：光从空气射向水面 → 反射回空气 + 折射入水（反射定律）
// mode 'total'：光从水中射向水面 → 入射角>临界角 → 全反射回水中
import { ref, computed, watch, onMounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const angle = ref(30)     // 入射角 °
const mode = ref<'interface' | 'total'>('interface')

const W = 560, H = 320
const nWater = 1.33
const critical = computed(() => (Math.asin(1 / nWater) * 180) / Math.PI)   // 48.75°
const isTotal = computed(() => mode.value === 'total' && angle.value > critical.value)

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
  ctx.fillText('水（光密介质）', 20, midY + 24)
  ctx.fillStyle = '#94a3b8'
  ctx.fillText('空气（光疏介质）', 20, midY - 10)

  // 法线
  const px0 = W / 2, py0 = midY
  ctx.strokeStyle = '#cbd5e1'
  ctx.setLineDash([5, 4])
  ctx.beginPath(); ctx.moveTo(px0, 70); ctx.lineTo(px0, H - 40); ctx.stroke()
  ctx.setLineDash([])

  const rad = (angle.value * Math.PI) / 180
  const inLen = 105

  if (mode.value === 'interface') {
    // === 界面反射：光从空气射向水面 ===
    // 入射光（左上 → 分界点）
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(px0 - Math.sin(rad) * inLen, py0 - Math.cos(rad) * inLen)
    ctx.lineTo(px0, py0)
    ctx.stroke()
    // 反射光（右上，入射角=反射角）
    ctx.strokeStyle = '#dc2626'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(px0, py0)
    ctx.lineTo(px0 + Math.sin(rad) * inLen, py0 - Math.cos(rad) * inLen)
    ctx.stroke()
    // 折射光（右下，进入水中，向法线靠拢）
    const rrad = (Math.asin(Math.sin(rad) / nWater) * 180) / Math.PI
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(px0, py0)
    ctx.lineTo(px0 + Math.sin(rrad * Math.PI / 180) * 120, py0 + Math.cos(rrad * Math.PI / 180) * 120)
    ctx.stroke()
    // 入射角弧（法线 → 入射光，左上）
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(px0, py0, 36, -Math.PI / 2, -Math.PI / 2 + rad)
    ctx.stroke()
    ctx.fillStyle = '#b45309'
    ctx.font = '12px system-ui'
    ctx.fillText('θ=' + angle.value + '°', px0 - 62, py0 - 32)
  } else {
    // === 全反射：光从水中射向水面 ===
    // 入射光（左下 → 分界点，从水中）
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(px0 - Math.sin(rad) * inLen, py0 + Math.cos(rad) * inLen)
    ctx.lineTo(px0, py0)
    ctx.stroke()
    ctx.fillStyle = '#b45309'
    ctx.font = '11px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('入射光（水中）', px0 - 95, py0 + Math.cos(rad) * inLen + 16)
    if (isTotal.value) {
      // 全反射光（向左下，全部反射回水中！）
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(px0, py0)
      ctx.lineTo(px0 - Math.sin(rad) * inLen, py0 + Math.cos(rad) * inLen)
      ctx.stroke()
      ctx.fillStyle = '#1d4ed8'
      ctx.font = 'bold 12px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('全反射！光全部反射回水中', px0 - 100, py0 + Math.cos(rad) * inLen + 16)
    } else {
      // 未超临界：光进入空气（简化）
      const rrad = (Math.asin(nWater * Math.sin(rad)) * 180) / Math.PI
      if (!isNaN(rrad)) {
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(px0, py0)
        ctx.lineTo(px0 + Math.sin(rrad * Math.PI / 180) * 120, py0 - Math.cos(rrad * Math.PI / 180) * 120)
        ctx.stroke()
      }
      ctx.fillStyle = '#1d4ed8'
      ctx.font = '12px system-ui'
      ctx.fillText('光进入空气（未全反射）', px0 + 60, py0 - 70)
    }
    // 临界角标记
    const cr = (critical.value * Math.PI) / 180
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.5)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(px0, py0)
    ctx.lineTo(px0 - Math.sin(cr) * 110, py0 - Math.cos(cr) * 110)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#dc2626'
    ctx.font = '11px system-ui'
    ctx.fillText('临界角 ' + critical.value.toFixed(1) + '°', px0 - 90, py0 - 26)
    // 入射角弧（法线 → 入射光，水中左侧）
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(px0, py0, 36, -Math.PI / 2, -Math.PI / 2 + rad)
    ctx.stroke()
    ctx.fillStyle = '#b45309'
    ctx.font = '12px system-ui'
    ctx.textAlign = 'left'
    ctx.fillText('θ=' + angle.value + '°', px0 - 34, py0 - 30)
  }

  // ===== 顶部信息区 =====
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
  ctx.fillText(`入射角 θ = ${angle.value}°${mode.value === 'total' ? `  |  临界角 = ${critical.value.toFixed(1)}°` : ''}`, 16, 24)
  if (mode.value === 'interface') {
    ctx.fillStyle = '#dc2626'
    ctx.font = 'bold 14px system-ui'
    ctx.fillText('反射定律：入射角 = 反射角，光在界面反射回空气', 16, 46)
    ctx.fillStyle = '#64748b'
    ctx.font = '13px system-ui'
    ctx.fillText('同时有一部分光折射入水（向法线靠拢）', 16, 68)
  } else {
    ctx.fillStyle = isTotal.value ? '#dc2626' : '#1d4ed8'
    ctx.font = 'bold 14px system-ui'
    ctx.fillText(
      isTotal.value ? '入射角 > 临界角 → 光全部反射回水中（全反射）' :
      '入射角 < 临界角 → 光进入空气（未全反射）', 16, 46)
    ctx.fillStyle = '#64748b'
    ctx.font = '13px system-ui'
    ctx.fillText('全反射只发生在光从水中射向空气时（光密→光疏）', 16, 68)
  }
}

watch([angle, mode], draw)
onMounted(draw)
</script>

<template>
  <div class="demo">
    <div class="demo__tabs">
      <button class="demo__tab" :class="{ on: mode === 'interface' }" @click="mode = 'interface'">🔆 空气射向水面</button>
      <button class="demo__tab" :class="{ on: mode === 'total' }" @click="mode = 'total'">💧 水中射向水面（全反射）</button>
    </div>
    <canvas ref="canvasRef" width="560" height="320" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <label class="demo__ctl">
        <span>入射角：{{ angle }}°</span>
        <input type="range" v-model.number="angle" min="0" max="85" step="1" />
      </label>
    </div>
  </div>
</template>
