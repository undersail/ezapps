<script setup lang="ts">
// 凸透镜成像演示：薄透镜公式 1/f = 1/u + 1/v
// u>2f 倒立缩小实像；2f>u>f 倒立放大实像；u<f 正立放大虚像（同侧）
import { ref, computed, watch, onMounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const u = ref(3.0)   // 物距（单位 f）
const f = 1          // 焦距（固定 1 单位）

const v = computed(() => {
  // v = uf/(u-f)；u=f 时不成像
  if (Math.abs(u.value - f) < 0.05) return Infinity
  return (u.value * f) / (u.value - f)
})
const isReal = computed(() => u.value > f)
const mag = computed(() => (v.value === Infinity ? 0 : Math.abs(v.value / u.value)))

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const W = 560, H = 300
  // 容器宽度适配：小屏等比缩小渲染分辨率（文字显示尺寸恒定）
  const scale = Math.min(1, (canvas.parentElement?.clientWidth || 560) / 560)
  canvas.width = Math.max(1, Math.round(560 * scale * dpr))
  canvas.height = Math.max(1, Math.round(300 * scale * dpr))
  canvas.style.width = '100%'
  canvas.style.height = 'auto'
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0)
  ctx.clearRect(0, 0, W, H)
  const w = W, h = H
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, w, h)

  const SCALE = 60          // 每单位 f 的像素
  const lensX = w / 2       // 透镜位置
  const axisY = h / 2 + 20
  const objH = 44           // 物体高度 px

  // 光轴
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(20, axisY); ctx.lineTo(w - 20, axisY)
  ctx.stroke()

  // 焦点标记（透镜左右各 f）
  const fLeft = lensX - f * SCALE
  const fRight = lensX + f * SCALE
  const twoFLeft = lensX - 2 * f * SCALE
  const twoFRight = lensX + 2 * f * SCALE
  ctx.fillStyle = '#f59e0b'
  for (const fx of [fLeft, fRight]) {
    ctx.beginPath(); ctx.arc(fx, axisY, 4, 0, Math.PI * 2); ctx.fill()
  }
  ctx.fillStyle = '#94a3b8'
  for (const fx of [twoFLeft, twoFRight]) {
    ctx.beginPath(); ctx.arc(fx, axisY, 3, 0, Math.PI * 2); ctx.fill()
  }
  ctx.font = '11px system-ui'
  ctx.fillStyle = '#f59e0b'
  ctx.fillText('F', fLeft - 8, axisY - 10)
  ctx.fillText('F', fRight + 4, axisY - 10)

  // 凸透镜（课本符号：竖线 + 上下短横，与物体箭头区分）
  ctx.strokeStyle = '#6366f1'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(lensX, axisY - 30)
  ctx.lineTo(lensX, axisY + 30)
  ctx.stroke()
  // 两端圆点（凸面示意，与物体箭头区分）
  ctx.fillStyle = '#6366f1'
  ctx.beginPath()
  ctx.arc(lensX, axisY - 27, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(lensX, axisY + 27, 5, 0, Math.PI * 2)
  ctx.fill()

  // 物体（左侧，箭头朝上）
  const objX = lensX - u.value * SCALE
  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(objX, axisY)
  ctx.lineTo(objX, axisY - objH)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(objX - 7, axisY - objH + 10)
  ctx.lineTo(objX, axisY - objH)
  ctx.lineTo(objX + 7, axisY - objH + 10)
  ctx.stroke()

  // 成像（实像倒立朝下 / 虚像正立朝上）
  if (v.value !== Infinity && isReal.value && v.value > 0) {
    const imgX = lensX + v.value * SCALE
    const imgH = objH * mag.value
    if (imgX < w - 20) {
      ctx.strokeStyle = '#dc2626'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(imgX, axisY)
      ctx.lineTo(imgX, axisY + imgH)          // 实像倒立：箭头朝下
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(imgX - 6, axisY + imgH - 9)
      ctx.lineTo(imgX, axisY + imgH)
      ctx.lineTo(imgX + 6, axisY + imgH - 9)
      ctx.stroke()
    }
  } else if (v.value !== Infinity && !isReal.value) {
    // 虚像：同侧（透镜左侧），虚线，正立朝上
    const imgX = lensX + v.value * SCALE   // v 为负 → 透镜左侧
    const imgH = objH * mag.value
    if (imgX > 20) {
      ctx.setLineDash([5, 4])
      ctx.strokeStyle = '#dc2626'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(imgX, axisY)
      ctx.lineTo(imgX, axisY - imgH)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(imgX - 6, axisY - imgH + 9)
      ctx.lineTo(imgX, axisY - imgH)
      ctx.lineTo(imgX + 6, axisY - imgH + 9)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  // 数据
  ctx.font = '13px system-ui'
  ctx.fillStyle = '#334155'
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
  const kind = u.value > 2 * f ? '倒立缩小实像' : u.value === 2 * f ? '等大实像' : u.value > f ? '倒立放大实像' : '正立放大虚像'
  ctx.fillText(`物距 u = ${u.value.toFixed(1)}f`, 16, 24)
  ctx.fillText(`像距 v = ${isReal.value ? v.value.toFixed(1) + 'f' : '|' + Math.abs(v.value).toFixed(1) + 'f|（同侧）'}`, 16, 44)
  ctx.fillText(`像的性质：${kind}${mag.value !== 0 && mag.value !== Infinity ? `（放大 × ${mag.value.toFixed(1)}）` : ''}`, 16, 64)
}

watch([u], draw)
onMounted(draw)
</script>

<template>
  <div class="demo">
    <canvas ref="canvasRef" width="560" height="300" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <label class="demo__ctl">
        <span>物距：{{ u.toFixed(1) }}f</span>
        <input type="range" v-model.number="u" min="0.5" max="4" step="0.1" />
      </label>
    </div>
  </div>
</template>
