<script setup lang="ts">
// 压强演示：p = F/S，同样力下受力面积越小压强越大
import { ref, computed, watch, onMounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const force = ref(8)      // 压力（单位）
const area = ref(3)       // 受力面积（单位）

const W = 560, H = 320
const pressure = computed(() => (force.value / area.value).toFixed(1))

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

  // 地面
  const groundY = 210
  ctx.fillStyle = '#cbd5e1'
  ctx.fillRect(50, groundY, 460, 14)

  // 物体（宽 = 面积比例）
  const objW = 60 + area.value * 26
  const objH = 70
  const objX = W / 2 - objW / 2
  const objY = groundY - objH

  // 压力箭头（向下）
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 3
  const fArrows = Math.min(force.value, 6)
  for (let i = 0; i < fArrows; i++) {
    const ax = objX + (objW / (fArrows + 1)) * (i + 1)
    ctx.beginPath()
    ctx.moveTo(ax, objY - 8)
    ctx.lineTo(ax, objY - 34)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(ax, objY - 34)
    ctx.lineTo(ax - 5, objY - 26)
    ctx.moveTo(ax, objY - 34)
    ctx.lineTo(ax + 5, objY - 26)
    ctx.stroke()
  }
  ctx.fillStyle = '#ef4444'
  ctx.font = 'bold 12px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText('F=' + force.value, objX + objW / 2, objY - 42)

  // 物体
  ctx.fillStyle = '#8b5cf6'
  ctx.fillRect(objX, objY, objW, objH)
  ctx.fillStyle = '#fff'
  ctx.fillText('S=' + area.value, objX + objW / 2, objY + objH / 2 + 4)

  // 接触面压强标记（红点密度 = 压强）
  const marks = Math.min(area.value * 3, 18)
  ctx.fillStyle = 'rgba(239, 68, 68, 0.6)'
  for (let i = 0; i < marks; i++) {
    const mx = objX + 6 + ((objW - 12) / marks) * i + ((objW - 12) / marks) / 2
    ctx.beginPath()
    ctx.arc(mx, groundY + 7, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // 数据
  ctx.textAlign = 'left'
  ctx.font = '13px system-ui'
  ctx.fillStyle = '#334155'
  ctx.fillText(`压力 F = ${force.value}  |  受力面积 S = ${area.value}`, 16, 26)
  ctx.fillStyle = '#7c3aed'
  ctx.font = 'bold 15px system-ui'
  ctx.fillText(`压强 p = F / S = ${pressure.value}`, 16, 48)
  ctx.fillStyle = '#64748b'
  ctx.font = '13px system-ui'
  ctx.fillText('同样压力，面积越小压得越“疼”（压强越大）', 16, 68)
}

watch([force, area], draw)
onMounted(draw)
</script>

<template>
  <div class="demo">
    <canvas ref="canvasRef" width="560" height="320" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <label class="demo__ctl">
        <span>压力：{{ force }}</span>
        <input type="range" v-model.number="force" min="1" max="12" step="1" />
      </label>
      <label class="demo__ctl">
        <span>受力面积：{{ area }}</span>
        <input type="range" v-model.number="area" min="1" max="6" step="1" />
      </label>
    </div>
  </div>
</template>
