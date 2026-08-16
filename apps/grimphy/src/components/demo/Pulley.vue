<script setup lang="ts">
// 滑轮演示：定滑轮不省力（F=G），动滑轮省一半力（F=G/2）
import { ref, watch, onMounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const weight = ref(4)        // 重物重量（单位）
const pulleyType = ref<'fixed' | 'moving'>('fixed')  // 定滑轮 / 动滑轮

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const W = 560, H = 300
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

  const fixed = pulleyType.value === 'fixed'
  const cx = w / 2
  const cy = fixed ? 90 : 110   // 动滑轮位置更低

  // 绳子（滑轮上端到顶部固定点）
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx - 28, 24)
  ctx.lineTo(cx - 28, cy - 16)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx - 28, 24)
  ctx.lineTo(cx + 60, 24)
  ctx.stroke()

  // 滑轮（圆 + 槽）
  ctx.fillStyle = '#64748b'
  ctx.beginPath()
  ctx.arc(cx, cy, 20, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(cx, cy, 20, 0, Math.PI * 2)
  ctx.stroke()

  // 重物（下方）
  const wY = cy + 42
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx, cy + 20)
  ctx.lineTo(cx, wY)
  ctx.stroke()
  ctx.fillStyle = '#ef4444'
  ctx.fillRect(cx - 26, wY, 52, 34)
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 14px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText(weight.value + 'N', cx, wY + 22)

  // 拉力绳（定滑轮：另一端向下拉；动滑轮：向上拉）
  const pullX = cx + 60
  ctx.strokeStyle = '#f59e0b'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  if (fixed) {
    ctx.moveTo(pullX, 24)
    ctx.lineTo(pullX, h - 50)
  } else {
    ctx.moveTo(pullX, cy - 16)
    ctx.lineTo(pullX, 24)
  }
  ctx.stroke()
  // 拉力箭头
  const force = fixed ? weight.value : weight.value / 2
  const arrowY = fixed ? h - 70 : 44
  const arrowDir = fixed ? 1 : -1   // 定滑轮向下拉，动滑轮向上拉
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.moveTo(pullX - 8, arrowY + arrowDir * 10)
  ctx.lineTo(pullX + 8, arrowY + arrowDir * 10)
  ctx.lineTo(pullX, arrowY + arrowDir * 22)
  ctx.closePath()
  ctx.fill()

  // 读数
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
  ctx.font = 'bold 14px system-ui'
  ctx.fillStyle = '#f59e0b'
  ctx.fillText('拉力 F = ' + force + ' N', 16, 26)
  ctx.font = '13px system-ui'
  ctx.fillStyle = '#334155'
  ctx.fillText(fixed ? '定滑轮：只改变方向，不省力' : '动滑轮：省一半力，但要多拉一倍距离', 16, 46)
  ctx.fillStyle = '#059669'
  ctx.fillText(fixed
    ? (force === weight.value ? 'F = G ✓ 不省力' : '')
    : (Math.abs(force * 2 - weight.value) < 0.01 ? 'F = G/2 ✓ 省一半力' : ''), 16, 66)
}

watch([weight, pulleyType], draw)
onMounted(draw)
</script>

<template>
  <div class="demo">
    <canvas ref="canvasRef" width="560" height="300" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <label class="demo__ctl">
        <span>重物重量：{{ weight }} N</span>
        <input type="range" v-model.number="weight" min="1" max="8" step="1" />
      </label>
      <label class="demo__ctl">
        <span>滑轮类型</span>
        <select v-model="pulleyType" class="demo__select">
          <option value="fixed">定滑轮</option>
          <option value="moving">动滑轮</option>
        </select>
      </label>
    </div>
  </div>
</template>
