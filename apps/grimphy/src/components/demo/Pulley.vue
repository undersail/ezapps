<script setup lang="ts">
// 滑轮演示：定滑轮不省力（F=G，只改变方向）；动滑轮省一半力（F=G/2）
import { ref, watch, onMounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const weight = ref(4)        // 重物重量（单位）
const pulleyType = ref<'fixed' | 'moving'>('fixed')  // 定滑轮 / 动滑轮

const W = 560, H = 320
const TOP = 100               // 顶部横杆

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

  const fixed = pulleyType.value === 'fixed'
  const cx = W / 2 - 40
  const cy = fixed ? 180 : 200
  const R = 22                    // 滑轮半径

  // 顶部固定横杆
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(cx - 60, TOP)
  ctx.lineTo(cx + 90, TOP)
  ctx.stroke()

  // 滑轮（圆 + 槽）
  ctx.fillStyle = '#64748b'
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.stroke()
  // 轴
  ctx.fillStyle = '#94a3b8'
  ctx.beginPath()
  ctx.arc(cx, cy, 4, 0, Math.PI * 2)
  ctx.fill()

  // 绳子（棕色，统一线宽 2.5）
  ctx.strokeStyle = '#b45309'
  ctx.lineWidth = 2.5

  if (fixed) {
    // ===== 定滑轮：绳绕滑轮上半圈，左端挂重物，右端向下拉 =====
    // 绳绕滑轮上半圈
    ctx.beginPath()
    ctx.arc(cx, cy, R, Math.PI, 0)
    ctx.stroke()
    // 左绳：从滑轮左侧垂到重物
    const wTop = cy + 30
    ctx.beginPath()
    ctx.moveTo(cx - R, cy)
    ctx.lineTo(cx - R, wTop)
    ctx.stroke()
    // 右绳：从滑轮右侧垂到下方（拉力端）
    ctx.beginPath()
    ctx.moveTo(cx + R, cy)
    ctx.lineTo(cx + R, H - 90)
    ctx.stroke()
    // 重物
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(cx - R - 26, wTop, 52, 34)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(weight.value + 'N', cx - R, wTop + 22)
    // 拉力端箭头（向下）
    const fY = H - 90
    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.moveTo(cx + R - 8, fY - 10)
    ctx.lineTo(cx + R + 8, fY - 10)
    ctx.lineTo(cx + R, fY + 10)
    ctx.closePath()
    ctx.fill()
  } else {
    // ===== 动滑轮：绳一端固定顶部，绕滑轮下半圈，另一端向上拉 =====
    // 固定端绳（顶部 → 滑轮左侧）
    ctx.beginPath()
    ctx.moveTo(cx - 14, TOP)
    ctx.lineTo(cx - R, cy)
    ctx.stroke()
    // 绳绕滑轮下半圈
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI)
    ctx.stroke()
    // 拉力绳（滑轮右侧 → 顶部 → 水平到右侧拉手）
    ctx.beginPath()
    ctx.moveTo(cx + R, cy)
    ctx.lineTo(cx + R, TOP)
    ctx.lineTo(cx + 90, TOP)
    ctx.stroke()
    // 拉力箭头（沿水平绳段向右，示意拉绳）
    const fX = cx + 90
    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.moveTo(fX - 14, TOP - 7)
    ctx.lineTo(fX + 10, TOP - 7)
    ctx.lineTo(fX + 10, TOP - 13)
    ctx.lineTo(fX + 22, TOP)
    ctx.lineTo(fX + 10, TOP + 13)
    ctx.lineTo(fX + 10, TOP + 7)
    ctx.lineTo(fX - 14, TOP + 7)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#b45309'
    ctx.font = 'bold 12px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('F=' + weight.value / 2, fX + 20, TOP + 24)
    // 重物（挂在滑轮下方）
    const wTop = cy + R + 8
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(cx - 26, wTop, 52, 34)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(weight.value + 'N', cx, wTop + 22)
    // 标注"滑轮随重物上升"
    ctx.fillStyle = '#64748b'
    ctx.font = '11px system-ui'
    ctx.fillText('动滑轮随重物一起动', cx, cy - R - 10)
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
  const force = fixed ? weight.value : weight.value / 2
  ctx.fillStyle = '#f59e0b'
  ctx.font = 'bold 15px system-ui'
  ctx.fillText('拉力 F = ' + force + ' N' + (fixed ? '（不省力）' : '（省一半力）'), 16, 24)
  ctx.fillStyle = '#334155'
  ctx.font = '13px system-ui'
  ctx.fillText(fixed ? '定滑轮：只改变拉力方向，F = G' : '动滑轮：省一半力，F = G/2，但要多拉一倍距离', 16, 46)
  ctx.fillStyle = '#059669'
  ctx.font = 'bold 13px system-ui'
  ctx.fillText(fixed ? 'F = G ✓ 不省力' : 'F = G/2 ✓ 省一半力', 16, 68)
}

watch([weight, pulleyType], draw)
onMounted(draw)
</script>

<template>
  <div class="demo">
    <canvas ref="canvasRef" width="560" height="320" class="demo__canvas"></canvas>
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
