<script setup lang="ts">
// 机械能演示：过山车小球，高度 ↔ 动能/势能转化（机械能守恒）
import { ref, computed, watch, onMounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const height = ref(80)   // 起点高度 %

const W = 560, H = 320
// 轨道：下降 80px 的水平滑道
const GROUND = 230

// 能量（比例）：势能 = h，动能 = 100 - h
const pe = computed(() => height.value)
const ke = computed(() => 100 - height.value)
const me = computed(() => 100)   // 机械能守恒（无摩擦）

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  // 容器宽度适配：小屏等比缩小渲染分辨率（文字显示尺寸恒定）
  const scale = Math.min(1, (canvas.parentElement?.clientWidth || 560) / 560)
  canvas.width = Math.max(1, Math.round(560 * scale * dpr))
  canvas.height = Math.max(1, Math.round(H * scale * dpr))
  canvas.style.width = '100%'
  canvas.style.height = 'auto'
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0)
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H)

  // 轨道（斜坡 → 平地）
  const topY = GROUND - (height.value / 100) * 120
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(60, GROUND)
  ctx.lineTo(140, topY)              // 斜坡
  ctx.lineTo(300, topY)              // 高台
  ctx.lineTo(300, GROUND)            // 垂直下落
  ctx.lineTo(500, GROUND)            // 平地
  ctx.stroke()

  // 小球位置（沿轨道）
  const x = 300, y = topY
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.arc(x + 40, GROUND, 10, 0, Math.PI * 2)
  ctx.fill()

  // 高台小球
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.arc(220, topY - 10, 10, 0, Math.PI * 2)
  ctx.fill()

  // 能量条
  const barX = 380, barY = 100, barW = 160, barH = 20
  // 势能（橙）
  ctx.fillStyle = '#e2e8f0'
  ctx.fillRect(barX, barY, barW, barH)
  ctx.fillStyle = '#f59e0b'
  ctx.fillRect(barX, barY, (pe.value / 100) * barW, barH)
  ctx.fillStyle = '#334155'
  ctx.font = '12px system-ui'
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
  ctx.fillText(`势能 ${pe.value}%`, barX, barY - 6)
  // 动能（蓝）
  const barY2 = barY + 36
  ctx.fillStyle = '#e2e8f0'
  ctx.fillRect(barX, barY2, barW, barH)
  ctx.fillStyle = '#3b82f6'
  ctx.fillRect(barX, barY2, (ke.value / 100) * barW, barH)
  ctx.fillStyle = '#1d4ed8'
  ctx.font = 'bold 12px system-ui'
  ctx.fillText(`动能 ${ke.value}%`, barX, barY2 - 6)

  // 数据
  ctx.fillStyle = '#334155'
  ctx.font = '13px system-ui'
  ctx.fillText(`起点高度：${height.value}%`, 16, 26)
  ctx.fillStyle = '#059669'
  ctx.font = 'bold 14px system-ui'
  ctx.fillText(`机械能 = 势能 + 动能 = ${me.value}% ✓ 守恒`, 16, 46)
  ctx.fillStyle = '#64748b'
  ctx.font = '13px system-ui'
  ctx.fillText('小球下滑时：势能 ↓ 动能 ↑；忽略摩擦时总机械能不变', 16, 66)
}

watch([height], draw)
onMounted(draw)
</script>

<template>
  <div class="demo">
    <canvas ref="canvasRef" width="560" height="320" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <label class="demo__ctl">
        <span>起点高度：{{ height }}%</span>
        <input type="range" v-model.number="height" min="10" max="100" step="5" />
      </label>
    </div>
  </div>
</template>
