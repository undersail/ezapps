<script setup lang="ts">
// 滑轮演示（教材标准画法）
// 定滑轮：支架固定滑轮轴，绳绕滑轮上半圈，左挂重物右下拉（F=G，只改方向）
// 动滑轮：绳一端固定横杆，绕滑轮下半圈，右端向上拉（F=G/2，滑轮随重物上升）
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const weight = ref(4)
const pulleyType = ref<'fixed' | 'moving'>('fixed')

const W = 560, H = 320
const TOP = 100

let raf = 0
let last = 0
let phase = 0

function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  phase += dt * 0.8
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
  const lift = Math.sin(phase * Math.PI) * 16    // 0 → 16 → 0

  // 横杆
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(cx - 70, TOP)
  ctx.lineTo(cx + 110, TOP)
  ctx.stroke()

  // 滑轮中心（定滑轮固定；动滑轮随拉动升降，带动重物）
  const cy = fixed ? 185 : 165 - lift

  // ===== 定滑轮 =====
  if (fixed) {
    // 支架（横杆 → 滑轮轴，粗竖杆）
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(cx, TOP)
    ctx.lineTo(cx, cy)
    ctx.stroke()

    // 重物位置（拉力下拉时上升：lift↑ → 重物上移）
    const wTop = cy + 26 - lift
    const pullEnd = H - 66 + lift   // 拉力端（下拉）

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
    // 右绳（拉力端，随 lift 变长）
    ctx.beginPath()
    ctx.moveTo(cx + R, cy)
    ctx.lineTo(cx + R, pullEnd)
    ctx.stroke()

    // 滑轮（带轴）
    ctx.fillStyle = '#94a3b8'
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#475569'
    ctx.beginPath()
    ctx.arc(cx, cy, 5, 0, Math.PI * 2)
    ctx.fill()

    // 重物
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(cx - R - 26, wTop, 52, 34)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(weight.value + 'N', cx - R, wTop + 22)

    // 拉力端（箭头向下）
    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.moveTo(cx + R - 8, pullEnd - 10)
    ctx.lineTo(cx + R + 8, pullEnd - 10)
    ctx.lineTo(cx + R, pullEnd + 10)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#b45309'
    ctx.font = 'bold 12px system-ui'
    ctx.fillText('F=' + weight.value, cx + R, pullEnd + 28)

    // 标注
    ctx.fillStyle = '#64748b'
    ctx.font = '11px system-ui'
    ctx.fillText('支架固定（轴不动）', cx + 16, cy - 10)
  } else {
    // ===== 动滑轮 =====
    // 重物（滑轮下方）
    const wTop = cy + R + 8

    // 绳：固定端（横杆 → 滑轮左端，短绳头）
    ctx.strokeStyle = '#b45309'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(cx - 24, TOP)
    ctx.lineTo(cx - R, cy)
    ctx.stroke()
    // 固定端张力标注
    ctx.fillStyle = '#b45309'
    ctx.font = 'bold 11px system-ui'
    ctx.textAlign = 'left'
    ctx.fillText('T', cx - R - 16, (TOP + cy - R) / 2 + 4)
    // 绕滑轮下半圈
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI)
    ctx.stroke()
    // 拉力端（滑轮右端 → 短绳头悬空，随滑轮/重物一起升降）
    const pullTop = cy - 48
    ctx.beginPath()
    ctx.moveTo(cx + R, cy)
    ctx.lineTo(cx + R, pullTop)
    ctx.stroke()

    // 滑轮
    ctx.fillStyle = '#94a3b8'
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#475569'
    ctx.beginPath()
    ctx.arc(cx, cy, 5, 0, Math.PI * 2)
    ctx.fill()

    // 拉力箭头（向上，短绳头端）
    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.moveTo(cx + R - 8, pullTop + 10)
    ctx.lineTo(cx + R + 8, pullTop + 10)
    ctx.lineTo(cx + R, pullTop - 10)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#b45309'
    ctx.font = 'bold 12px system-ui'
    ctx.fillText('F=' + (weight.value / 2), cx + R + 12, pullTop)

    // 重物（挂在滑轮下）
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(cx - 26, wTop, 52, 34)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(weight.value + 'N', cx, wTop + 22)

    // 标注
    ctx.fillStyle = '#64748b'
    ctx.font = '11px system-ui'
    ctx.textAlign = 'left'
    ctx.fillText('绳端固定于横杆', cx + R + 16, cy - R - 8)
    // 受力标注（重物重力 G）
    ctx.fillStyle = '#dc2626'
    ctx.font = 'bold 12px system-ui'
    ctx.fillText('G=' + weight.value, cx + 40, wTop + 44)
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
  ctx.fillText(fixed ? '定滑轮：支架固定轴，只改变拉力方向，F = G' : '动滑轮：绳端固定，省一半力 F = G/2', 16, 46)
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
      <div class="demo__tabs">
        <button class="demo__tab" :class="{ on: pulleyType === 'fixed' }" @click="pulleyType = 'fixed'">🔩 定滑轮</button>
        <button class="demo__tab" :class="{ on: pulleyType === 'moving' }" @click="pulleyType = 'moving'">🪝 动滑轮</button>
      </div>
    </div>
  </div>
</template>
