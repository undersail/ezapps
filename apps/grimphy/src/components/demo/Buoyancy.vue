<script setup lang="ts">
// 浮力演示：物体密度决定浸入比例（漂浮时 ρ_obj/ρ_水 = 浸入比例）
// 重力 G = ρ_obj·V·g；漂浮时 F浮 = G → V浸 = ρ_obj/ρ水·V
import { ref, computed, watch, onMounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const depth = ref(0)          // 人为压入深度（0=自然漂浮，演示用）
const objDensity = ref(0.7)   // 物体密度（水=1）

const W = 560, H = 320
const waterY = 150            // 水面
const objH = 40

// 自然漂浮时浸入比例 = 密度；用户滑块模拟"压入/上浮"干涉
const naturalSub = computed(() => objDensity.value)             // 0-1
const forcedSub = computed(() => depth.value / 100)             // 0-1
// 物体实际浸入 = 两者较大者（压入 > 自然漂浮时被压下去）
const subRatio = computed(() => Math.max(naturalSub.value, forcedSub.value))
// 浮力（满浸 = 重力浮力 10N 基准）
const buoyancy = computed(() => subRatio.value * 10)
const weight = computed(() => objDensity.value * 10)
// 合外力：上浮（正）/下沉（负）—— 只在水下部分产生浮力
const net = computed(() => buoyancy.value - weight.value)

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

  // ===== 容器 + 水（水面固定） =====
  const cTop = 112, cBottom = 280
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 2
  ctx.strokeRect(80, cTop, 400, cBottom - cTop)
  // 水（水面到容器底）
  ctx.fillStyle = 'rgba(56, 189, 248, 0.35)'
  ctx.fillRect(81, waterY, 399, cBottom - waterY)
  // 水面线
  ctx.strokeStyle = '#38bdf8'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(80, waterY); ctx.lineTo(480, waterY); ctx.stroke()
  ctx.fillStyle = '#0284c7'
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
  ctx.fillText('水面', 86, waterY - 6)

  // ===== 物体 =====
  // 顶部位置：自然漂浮（露出部分随密度）+ 压入深度
  const lift = (naturalSub.value) * objH          // 水下部分（自然）
  const extra = Math.max(0, forcedSub.value - naturalSub.value)  // 额外压入比例
  // 密度>水 → 沉底；否则自然漂浮/压入
  const objTopY = objDensity.value > 1
    ? cBottom - objH - 4
    : waterY - (objH - lift) + extra * 90
  const clampedTop = Math.max(cTop + 4, Math.min(objTopY, cBottom - objH - 4))
  const objX = W / 2 - 32

  // 水下部分（计算浸入范围）
  const submergedTop = Math.max(clampedTop, waterY)
  const submergedBottom = Math.min(clampedTop + objH, cBottom)
  const submergedH = Math.max(0, submergedBottom - submergedTop)

  // 物体（露出部分浅色，水下部分深色半透明）
  ctx.fillStyle = '#f59e0b'
  ctx.fillRect(objX, clampedTop, 64, objH)
  if (submergedH > 0) {
    ctx.fillStyle = 'rgba(245, 158, 11, 0.55)'
    ctx.fillRect(objX, submergedTop, 64, submergedH)
    // 水下轮廓
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 3])
    ctx.strokeRect(objX, submergedTop, 64, submergedH)
    ctx.setLineDash([])
  }
  // 物体文字
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 13px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText('物体', W / 2, clampedTop + objH / 2 + 4)
  // 密度标签
  ctx.fillStyle = '#b45309'
  ctx.font = '11px system-ui'
  ctx.fillText('ρ=' + objDensity.value.toFixed(1), W / 2, clampedTop - 8)

  // 浮力/重力箭头
  const arrowY = clampedTop + objH + 8
  // 浮力箭头（上，长度 ∝ 浮力）
  ctx.strokeStyle = '#38bdf8'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(objX - 18, arrowY); ctx.lineTo(objX - 18, arrowY - buoyancy.value * 3); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(objX - 18, arrowY - buoyancy.value * 3)
  ctx.lineTo(objX - 22, arrowY - buoyancy.value * 3 + 8)
  ctx.moveTo(objX - 18, arrowY - buoyancy.value * 3)
  ctx.lineTo(objX - 14, arrowY - buoyancy.value * 3 + 8)
  ctx.stroke()
  ctx.fillStyle = '#0284c7'
  ctx.font = 'bold 11px system-ui'
  ctx.fillText('F浮', objX - 34, arrowY - buoyancy.value * 3 + 4)

  // 重力箭头（下，长度 ∝ 重力）
  ctx.strokeStyle = '#ef4444'
  ctx.beginPath()
  ctx.moveTo(objX + 82, arrowY - 12); ctx.lineTo(objX + 82, arrowY - 12 + weight.value * 3); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(objX + 82, arrowY - 12 + weight.value * 3)
  ctx.lineTo(objX + 78, arrowY - 12 + weight.value * 3 - 8)
  ctx.moveTo(objX + 82, arrowY - 12 + weight.value * 3)
  ctx.lineTo(objX + 86, arrowY - 12 + weight.value * 3 - 8)
  ctx.stroke()
  ctx.fillStyle = '#dc2626'
  ctx.fillText('G', objX + 94, arrowY - 12 + weight.value * 3 + 4)

  // ===== 数据（顶部专用区，不与图形重叠） =====
  ctx.textAlign = 'left'
  ctx.font = '13px system-ui'
  ctx.fillStyle = '#334155'
  ctx.fillText(`物体密度 ρ=${objDensity.value.toFixed(1)}（水=1）  压入深度 ${depth.value}%`, 16, 24)
  ctx.fillStyle = '#0284c7'
  ctx.font = 'bold 14px system-ui'
  ctx.fillText(`浮力 F浮=${buoyancy.value.toFixed(1)}N   重力 G=${weight.value.toFixed(1)}N`, 16, 44)
  ctx.fillStyle = net.value > 0.5 ? '#059669' : net.value < -0.5 ? '#dc2626' : '#64748b'
  ctx.font = 'bold 13px system-ui'
  ctx.fillText(
    objDensity.value < 1 && depth.value <= objDensity.value * 100
      ? `ρ<水 → 自然漂浮，浸入 ${(naturalSub.value * 100).toFixed(0)}%`
      : net.value > 0.5 ? '浮力 > 重力，松手会上浮' : net.value < -0.5 ? '重力 > 浮力，会下沉' : '≈ 平衡',
    16, 66)
}

watch([depth, objDensity], draw)
onMounted(draw)
</script>

<template>
  <div class="demo">
    <canvas ref="canvasRef" width="560" height="320" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <label class="demo__ctl">
        <span>物体密度：{{ objDensity.toFixed(1) }}（水=1）</span>
        <input type="range" v-model.number="objDensity" min="0.3" max="1.5" step="0.1" />
      </label>
      <label class="demo__ctl">
        <span>压入深度：{{ depth }}%</span>
        <input type="range" v-model.number="depth" min="0" max="100" step="5" />
      </label>
    </div>
  </div>
</template>
