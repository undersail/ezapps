<script setup lang="ts">
// 电路演示：欧姆定律 I = U/R，电压/电阻滑块 → 电流表读数
import { ref, computed, watch, onMounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const voltage = ref(6)    // 电压 V
const resistance = ref(3) // 电阻 Ω

const W = 560, H = 320
const current = computed(() => voltage.value / resistance.value)

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

  const midY = H / 2 + 35
  // 导线（矩形回路）
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 3
  ctx.strokeRect(90, midY - 80, 380, 160)

  // 电池（左侧，长线+短线）
  const batX = 140
  ctx.lineWidth = 4
  ctx.beginPath(); ctx.moveTo(batX - 8, midY - 12); ctx.lineTo(batX + 8, midY - 12); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(batX - 8, midY + 12); ctx.lineTo(batX + 8, midY + 12); ctx.stroke()
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(batX, midY - 12); ctx.lineTo(batX, midY + 12); ctx.stroke()
  ctx.fillStyle = '#ef4444'
  ctx.font = 'bold 13px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText(voltage.value + 'V', batX, midY - 24)

  // 电阻（右侧，锯齿）
  const resX = 420
  ctx.strokeStyle = '#f59e0b'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(resX - 30, midY)
  for (let i = 0; i < 5; i++) {
    ctx.lineTo(resX - 18 + i * 9, midY - 14)
    ctx.lineTo(resX - 12 + i * 9, midY + 14)
  }
  ctx.lineTo(resX + 30, midY)
  ctx.stroke()
  ctx.fillStyle = '#b45309'
  ctx.fillText('R=' + resistance.value + 'Ω', resX, midY + 34)

  // 电流表（底部中央）
  const ampX = W / 2, ampY = midY + 74
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(ampX, ampY, 22, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 2
  ctx.stroke()
  // 指针（按电流偏转）
  const angle = Math.min(current.value / 3, 1) * 1.8 - 1.2
  ctx.strokeStyle = '#dc2626'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(ampX, ampY)
  ctx.lineTo(ampX + Math.cos(angle) * 18, ampY + Math.sin(angle) * 18)
  ctx.stroke()
  ctx.fillStyle = '#0f172a'
  ctx.font = 'bold 10px system-ui'
  ctx.fillText('A', ampX, ampY + 4)

  // 电流方向箭头（回路顶部）
  ctx.fillStyle = '#3b82f6'
  ctx.beginPath()
  ctx.moveTo(150, midY - 72); ctx.lineTo(180, midY - 82); ctx.lineTo(180, midY - 62); ctx.closePath(); ctx.fill()
  ctx.font = '12px system-ui'
  ctx.fillText('I', 120, midY - 78)

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
  ctx.fillStyle = '#334155'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#334155'
  ctx.font = '13px system-ui'
  ctx.fillText(`电压 U = ${voltage.value}V   电阻 R = ${resistance.value}Ω`, 16, 24)
  ctx.fillStyle = '#059669'
  ctx.font = 'bold 15px system-ui'
  ctx.fillText(`电流 I = U/R = ${current.value.toFixed(1)} A`, 16, 46)
  ctx.fillStyle = '#64748b'
  ctx.font = '13px system-ui'
  ctx.fillText('欧姆定律：电压越大电流越大，电阻越大电流越小', 16, 66)
}

watch([voltage, resistance], draw)
onMounted(draw)
</script>

<template>
  <div class="demo">
    <canvas ref="canvasRef" width="560" height="320" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <label class="demo__ctl">
        <span>电压：{{ voltage }} V</span>
        <input type="range" v-model.number="voltage" min="1" max="12" step="0.5" />
      </label>
      <label class="demo__ctl">
        <span>电阻：{{ resistance }} Ω</span>
        <input type="range" v-model.number="resistance" min="1" max="10" step="0.5" />
      </label>
    </div>
  </div>
</template>
