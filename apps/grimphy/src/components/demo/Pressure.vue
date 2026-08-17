<script setup lang="ts">
// 压强演示：固体 p = F/S；液体 p = ρgh（深度越深压强越大）
import { ref, computed, watch, onMounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const mode = ref<'solid' | 'liquid'>('solid')   // 固体 / 液体
const force = ref(8)      // 固体：压力
const area = ref(3)       // 固体：受力面积
const depth = ref(50)     // 液体：深度 %
const density = ref(1.0)  // 液体：密度（水=1）

const W = 560, H = 320

const solidP = computed(() => (force.value / area.value).toFixed(1))
const liquidP = computed(() => (density.value * depth.value).toFixed(1))

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

  if (mode.value === 'solid') {
    drawSolid(ctx)
  } else {
    drawLiquid(ctx)
  }
}

function drawSolid(ctx: CanvasRenderingContext2D) {
  const groundY = 235
  ctx.fillStyle = '#cbd5e1'
  ctx.fillRect(50, groundY, 460, 14)

  const objW = 60 + area.value * 26
  const objH = 70
  const objX = W / 2 - objW / 2
  const objY = groundY - objH

  // 压力箭头（从上向下压向物体）
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 3
  const fArrows = Math.min(force.value, 6)
  for (let i = 0; i < fArrows; i++) {
    const ax = objX + (objW / (fArrows + 1)) * (i + 1)
    ctx.beginPath(); ctx.moveTo(ax, objY - 34); ctx.lineTo(ax, objY - 8); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(ax, objY - 8); ctx.lineTo(ax - 5, objY - 16); ctx.moveTo(ax, objY - 8); ctx.lineTo(ax + 5, objY - 16); ctx.stroke()
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

  // 接触面压强点
  const marks = Math.min(area.value * 3, 18)
  ctx.fillStyle = 'rgba(239, 68, 68, 0.6)'
  for (let i = 0; i < marks; i++) {
    const mx = objX + 6 + ((objW - 12) / marks) * i + ((objW - 12) / marks) / 2
    ctx.beginPath(); ctx.arc(mx, groundY + 7, 2.5, 0, Math.PI * 2); ctx.fill()
  }

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
  ctx.font = '13px system-ui'
  ctx.fillStyle = '#334155'
  ctx.fillText(`压力 F = ${force.value}  |  受力面积 S = ${area.value}`, 16, 26)
  ctx.fillStyle = '#7c3aed'
  ctx.font = 'bold 15px system-ui'
  ctx.fillText(`固体压强 p = F/S = ${solidP.value}`, 16, 48)
  ctx.fillStyle = '#64748b'
  ctx.font = '13px system-ui'
  ctx.fillText('同样压力，面积越小压得越“疼”（压强越大）', 16, 68)
}

function drawLiquid(ctx: CanvasRenderingContext2D) {
  // 容器 + 液体
  const top = 112, bottom = 280
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 2
  ctx.strokeRect(90, top, 380, bottom - top)
  ctx.fillStyle = `rgba(56, 189, 248, ${0.2 + density.value * 0.2})`
  ctx.fillRect(91, top, 379, bottom - top)
  ctx.fillStyle = '#0ea5e9'
  ctx.font = '12px system-ui'
  ctx.fillText(`液体密度 ρ=${density.value.toFixed(1)}`, 100, top + 20)

  // 探测点（深度滑块）
  const probeY = top + (depth.value / 100) * (bottom - top)
  // 液面刻度线（深度指示）
  ctx.strokeStyle = 'rgba(14,165,233,0.6)'
  ctx.setLineDash([4, 3])
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(90, probeY); ctx.lineTo(470, probeY); ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#0284c7'
  ctx.font = 'bold 11px system-ui'
  ctx.fillText(`深度 ${depth.value}%`, 470, probeY - 4)

  // 探测小球
  ctx.fillStyle = '#dc2626'
  ctx.beginPath(); ctx.arc(W / 2, probeY, 8, 0, Math.PI * 2); ctx.fill()

  // 压强大小箭头（红色越多压强越大）
  const pVal = Number(liquidP.value)
  const arrows = Math.max(1, Math.min(Math.round(pVal / 2), 10))
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)'
  ctx.lineWidth = 2.5
  for (let i = 0; i < arrows; i++) {
    const ay = probeY + 16 + i * 14
    if (ay > bottom - 6) break
    ctx.beginPath(); ctx.moveTo(W / 2 - 34, ay); ctx.lineTo(W / 2 + 34, ay); ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(W / 2 + 34, ay); ctx.lineTo(W / 2 + 24, ay - 6)
    ctx.moveTo(W / 2 + 34, ay); ctx.lineTo(W / 2 + 24, ay + 6)
    ctx.stroke()
  }

  // 数据
  ctx.textAlign = 'left'
  ctx.font = '13px system-ui'
  ctx.fillStyle = '#334155'
  ctx.fillText(`深度 h = ${depth.value}%  |  液体密度 ρ = ${density.value.toFixed(1)}（水=1）`, 16, 26)
  ctx.fillStyle = '#0284c7'
  ctx.font = 'bold 15px system-ui'
  ctx.fillText(`液体压强 p = ρgh = ${liquidP.value}`, 16, 48)
  ctx.fillStyle = '#64748b'
  ctx.font = '13px system-ui'
  ctx.fillText('液体压强只与深度和密度有关，与容器形状无关（同深度各方向相等）', 16, 68)
}

watch([mode, force, area, depth, density], draw)
onMounted(draw)
</script>

<template>
  <div class="demo">
    <div class="demo__tabs">
      <button class="demo__tab" :class="{ on: mode === 'solid' }" @click="mode = 'solid'">🪨 固体压强</button>
      <button class="demo__tab" :class="{ on: mode === 'liquid' }" @click="mode = 'liquid'">💧 液体压强</button>
    </div>
    <canvas ref="canvasRef" width="560" height="320" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <template v-if="mode === 'solid'">
        <label class="demo__ctl">
          <span>压力：{{ force }}</span>
          <input type="range" v-model.number="force" min="1" max="12" step="1" />
        </label>
        <label class="demo__ctl">
          <span>受力面积：{{ area }}</span>
          <input type="range" v-model.number="area" min="1" max="6" step="1" />
        </label>
      </template>
      <template v-else>
        <label class="demo__ctl">
          <span>深度：{{ depth }}%</span>
          <input type="range" v-model.number="depth" min="10" max="100" step="5" />
        </label>
        <label class="demo__ctl">
          <span>液体密度：{{ density.toFixed(1) }}</span>
          <input type="range" v-model.number="density" min="0.5" max="2" step="0.1" />
        </label>
      </template>
    </div>
  </div>
</template>
