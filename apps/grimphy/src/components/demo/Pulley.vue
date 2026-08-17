<script setup lang="ts">
// 滑轮演示：定滑轮（支架固定，只改变方向 F=G）；动滑轮（省一半力 F=G/2）
// 带拉动动画：定滑轮重物上下升降，动滑轮滑轮+重物整体升降
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const weight = ref(4)        // 重物重量（单位）
const pulleyType = ref<'fixed' | 'moving'>('fixed')

const W = 560, H = 320
const TOP = 100               // 顶部横杆

let raf = 0
let last = 0
let phase = 0                 // 拉动动画相位 0-1

function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  phase += dt * 0.8           // 拉动速度
  if (phase > 1) phase -= 1
  draw()
  raf = requestAnimationFrame(frame)
}

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
  const R = 22
  // 拉动位移（sin 循环：0 → +1 → 0）
  const lift = Math.sin(phase * Math.PI) * 18
  const cy = (fixed ? 185 : 205) - lift      // 动滑轮随拉动整体升降
  // 定滑轮：滑轮固定，拉力端下拉(向下)时重物上升(向上) —— 反向同步
  const wTop = fixed ? cy + 30 - lift : cy + R + 8 + lift
  const pullEndY = fixed ? H - 70 + lift : 0

  // 顶部固定横杆
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(cx - 60, TOP)
  ctx.lineTo(cx + 110, TOP)
  ctx.stroke()

  if (fixed) {
    // ===== 定滑轮：支架（横杆 → 滑轮中心）+ 绳绕上半圈 =====
    // 支架
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx, TOP)
    ctx.lineTo(cx, cy)
    ctx.stroke()
    // 滑轮
    ctx.fillStyle = '#64748b'
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#94a3b8'
    ctx.beginPath()
    ctx.arc(cx, cy, 4, 0, Math.PI * 2)
    ctx.fill()
    // 绳绕滑轮上半圈
    ctx.strokeStyle = '#b45309'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(cx, cy, R, Math.PI, 0)
    ctx.stroke()
    // 左绳（重物端）
    ctx.beginPath()
    ctx.moveTo(cx - R, cy)
    ctx.lineTo(cx - R, wTop)
    ctx.stroke()
    // 右绳（拉力端，长度随拉动变化，与重物反向同步）
    ctx.beginPath()
    ctx.moveTo(cx + R, cy)
    ctx.lineTo(cx + R, pullEndY)
    ctx.stroke()
    // 重物
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(cx - R - 26, wTop, 52, 34)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(weight.value + 'N', cx - R, wTop + 22)
    // 拉力箭头（向下，拉力端）
    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.moveTo(cx + R - 8, pullEndY - 10)
    ctx.lineTo(cx + R + 8, pullEndY - 10)
    ctx.lineTo(cx + R, pullEndY + 10)
    ctx.closePath()
    ctx.fill()
    // 支架标注
    ctx.fillStyle = '#64748b'
    ctx.font = '11px system-ui'
    ctx.fillText('支架固定', cx + 14, cy - 8)
  } else {
    // ===== 动滑轮：绳固定横杆 + 绕下半圈 + 拉力端悬空 =====
    // 滑轮（随 lift 整体升降）
    ctx.fillStyle = '#64748b'
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#94a3b8'
    ctx.beginPath()
    ctx.arc(cx, cy, 4, 0, Math.PI * 2)
    ctx.fill()
    // 绳子
    ctx.strokeStyle = '#b45309'
    ctx.lineWidth = 2.5
    // 固定端（横杆 → 滑轮左侧）
    ctx.beginPath()
    ctx.moveTo(cx - 14, TOP)
    ctx.lineTo(cx - R, cy)
    ctx.stroke()
    // 绕滑轮下半圈
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI)
    ctx.stroke()
    // 拉力绳（滑轮右侧 → 斜向右上悬空，随滑轮升降）
    const pullTop = Math.max(96, TOP - 26 - lift * 1.5)
    const pullEndX = cx + R + 34
    ctx.beginPath()
    ctx.moveTo(cx + R, cy)
    ctx.lineTo(pullEndX, pullTop)
    ctx.stroke()
    // 拉力箭头（斜向右上，悬空端）
    const dx = pullEndX - (cx + R), dy = pullTop - cy
    const dl = Math.hypot(dx, dy) || 1
    const ux = dx / dl, uy = dy / dl
    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.moveTo(pullEndX + ux * 9, pullTop + uy * 9)
    ctx.lineTo(pullEndX - uy * 5, pullTop + ux * 5)
    ctx.lineTo(pullEndX + uy * 5, pullTop - ux * 5)
    ctx.closePath()
    ctx.fill()
    // 重物（挂在滑轮下方，随滑轮升降）
    const wTop2 = cy + R + 8
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(cx - 26, wTop2, 52, 34)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(weight.value + 'N', cx, wTop2 + 22)
    // 标注
    ctx.fillStyle = '#64748b'
    ctx.font = '11px system-ui'
    ctx.fillText('动滑轮随重物一起动', cx + R + 14, cy - R - 6)
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
  ctx.fillText(fixed ? '定滑轮：支架固定，只改变拉力方向，F = G' : '动滑轮：绳端固定横杆，省一半力 F = G/2', 16, 46)
  ctx.fillStyle = '#059669'
  ctx.font = 'bold 13px system-ui'
  ctx.fillText(fixed ? 'F = G ✓ 不省力' : 'F = G/2 ✓ 省一半力', 16, 68)
}

watch([weight, pulleyType], () => { phase = 0 })
onMounted(() => { last = performance.now(); raf = requestAnimationFrame(frame) })
onBeforeUnmount(() => cancelAnimationFrame(raf))
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
