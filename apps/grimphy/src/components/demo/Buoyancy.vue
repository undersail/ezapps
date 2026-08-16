<script setup lang="ts">
// 浮力演示：F浮 = ρgV排，浸入越多浮力越大，物体上浮/下沉
import { ref, computed, watch, onMounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const depth = ref(50)   // 浸入深度 %
const objDensity = ref(0.7)  // 物体密度（水=1）

const W = 560, H = 320

const buoyancy = computed(() => (depth.value / 100) * 10)          // 浮力（N，满浸=10）
const weight = computed(() => objDensity.value * 10)               // 重力（N）
const net = computed(() => buoyancy.value - weight.value)          // 合力（+上浮 -下沉）

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

  // 水面（容器）
  const waterY = 140
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2
  ctx.strokeRect(70, 60, 420, 230)
  // 水
  ctx.fillStyle = 'rgba(56, 189, 248, 0.35)'
  ctx.fillRect(71, waterY, 418, 230 - waterY + 1)
  ctx.fillStyle = '#0ea5e9'
  ctx.font = '12px system-ui'
  ctx.fillText('水', 76, waterY + 18)

  // 物体（随净力上下浮动）
  const ballY = waterY + (1 - depth.value / 100) * 120 - net.value * 3
  const objH = 34
  ctx.fillStyle = '#f59e0b'
  ctx.fillRect(W / 2 - 30, ballY, 60, objH)
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 13px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText('物体', W / 2, ballY + objH / 2 + 4)
  // 浸入深度指示
  const subY = Math.max(ballY, waterY)
  const subH = Math.max(0, Math.min(ballY + objH, waterY + 230) - subY)
  if (subH > 0) {
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 3])
    ctx.strokeRect(W / 2 - 30, subY, 60, subH)
    ctx.setLineDash([])
  }

  // 数据
  ctx.textAlign = 'left'
  ctx.font = '13px system-ui'
  ctx.fillStyle = '#334155'
  ctx.fillText(`浸入深度：${depth.value}% → 排开体积越大浮力越大`, 16, 26)
  ctx.fillText(`浮力 F浮 = ${buoyancy.value.toFixed(1)}N  |  重力 G = ${weight.value.toFixed(1)}N`, 16, 46)
  ctx.fillStyle = net.value > 0.5 ? '#059669' : net.value < -0.5 ? '#dc2626' : '#64748b'
  ctx.font = 'bold 13px system-ui'
  ctx.fillText(
    net.value > 0.5 ? '↑ 浮力大于重力，物体上浮' :
    net.value < -0.5 ? '↓ 重力大于浮力，物体下沉' : '≈ 浮力≈重力，悬浮/缓慢', 16, 66)
}

watch([depth, objDensity], draw)
onMounted(draw)
</script>

<template>
  <div class="demo">
    <canvas ref="canvasRef" width="560" height="320" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <label class="demo__ctl">
        <span>浸入深度：{{ depth }}%</span>
        <input type="range" v-model.number="depth" min="10" max="100" step="5" />
      </label>
      <label class="demo__ctl">
        <span>物体密度：{{ objDensity.toFixed(1) }}（水=1）</span>
        <input type="range" v-model.number="objDensity" min="0.3" max="1.5" step="0.1" />
      </label>
    </div>
  </div>
</template>
