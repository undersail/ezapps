<script setup lang="ts">
// 摩擦力演示：滑动摩擦力 f = μN，粗糙度/压力滑块 → 物体动/静
import { ref, computed, watch, onMounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const roughness = ref(0.5)  // 摩擦系数 μ
const press = ref(5)        // 压力 N
const pull = ref(3)         // 拉力

const W = 560, H = 320
const friction = computed(() => roughness.value * press.value)   // 最大摩擦力 μN
const showFriction = computed(() => Math.min(pull.value, friction.value))  // 未动时静摩擦=拉力

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

  const y = 170
  // 地面（粗糙度决定纹理）
  ctx.fillStyle = '#cbd5e1'
  ctx.fillRect(60, y, 440, 12)
  ctx.fillStyle = roughness.value > 0.6 ? '#94a3b8' : roughness.value > 0.3 ? '#cbd5e1' : '#e2e8f0'
  for (let x = 70; x < 490; x += 14) {
    const h = 4 + roughness.value * 10
    ctx.fillRect(x, y - h, 6, h)
  }

  // 物体
  const objX = 180 + Math.min(pull.value - friction.value, 0) * -0  // 不动
  const moving = pull.value > friction.value + 0.1
  const slide = Math.min(pull.value - friction.value, 4) * 18
  const ox = 180 + slide
  ctx.fillStyle = '#f59e0b'
  ctx.fillRect(ox, y - 48, 56, 48)
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 12px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText('木块', ox + 28, y - 18)

  // 拉力箭头（右）
  const pullDir = pull.value > 0 ? 1 : -1
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(ox + 28 + pullDir * 40, y - 24)
  ctx.lineTo(ox + 28 + pullDir * (40 + Math.abs(pull.value) * 12), y - 24)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(ox + 28 + pullDir * (40 + Math.abs(pull.value) * 12), y - 24)
  ctx.lineTo(ox + 28 + pullDir * (30 + Math.abs(pull.value) * 12), y - 31)
  ctx.moveTo(ox + 28 + pullDir * (40 + Math.abs(pull.value) * 12), y - 24)
  ctx.lineTo(ox + 28 + pullDir * (30 + Math.abs(pull.value) * 12), y - 17)
  ctx.stroke()
  ctx.fillStyle = '#3b82f6'
  ctx.font = 'bold 12px system-ui'
  ctx.fillText('F=' + pull.value, ox + 28 + pullDir * 70, y - 30)

  // 摩擦力箭头（左，长度=当前实际摩擦力）
  const fLen = Math.min(showFriction.value, pull.value) * 12
  ctx.strokeStyle = '#dc2626'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(ox + 28 - 30, y - 8)
  ctx.lineTo(ox + 28 - 30 - fLen, y - 8)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(ox + 28 - 30 - fLen, y - 8)
  ctx.lineTo(ox + 28 - 30 - fLen + 8, y - 15)
  ctx.moveTo(ox + 28 - 30 - fLen, y - 8)
  ctx.lineTo(ox + 28 - 30 - fLen + 8, y - 1)
  ctx.stroke()
  ctx.fillStyle = '#dc2626'
  ctx.fillText('f=' + showFriction.value.toFixed(1), ox + 28 - 60, y + 26)

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
  ctx.textAlign = 'left'
  ctx.fillStyle = '#334155'
  ctx.font = '13px system-ui'
  ctx.fillText(`摩擦系数 μ=${roughness.value.toFixed(1)}  压力 N=${press.value}`, 16, 26)
  ctx.fillText(`最大摩擦力 f = μN = ${friction.value.toFixed(1)}（未动时静摩擦=拉力）`, 16, 46)
  ctx.fillStyle = moving ? '#059669' : pull.value > friction.value ? '#dc2626' : '#64748b'
  ctx.font = 'bold 13px system-ui'
  ctx.fillText(
    moving ? '木块被拉动 ✓（拉力大于最大摩擦力）' :
    pull.value > friction.value ? '刚开始动！' : `静摩擦 = 拉力 = ${pull.value.toFixed(1)}，木块不动`, 16, 66)
}

watch([roughness, press, pull], draw)
onMounted(draw)
</script>

<template>
  <div class="demo">
    <canvas ref="canvasRef" width="560" height="320" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <label class="demo__ctl">
        <span>摩擦系数：{{ roughness.toFixed(1) }}</span>
        <input type="range" v-model.number="roughness" min="0.1" max="1" step="0.1" />
      </label>
      <label class="demo__ctl">
        <span>压力：{{ press }}</span>
        <input type="range" v-model.number="press" min="1" max="10" step="0.5" />
      </label>
      <label class="demo__ctl">
        <span>拉力：{{ pull }}</span>
        <input type="range" v-model.number="pull" min="0" max="10" step="0.5" />
      </label>
    </div>
  </div>
</template>
