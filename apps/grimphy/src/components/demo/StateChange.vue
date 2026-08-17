<script setup lang="ts">
// 物态变化演示：温度滑块 → 冰（固态）/水（液态）/汽（气态）分子运动
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const temp = ref(0)   // 温度 ℃

const W = 560, H = 320
const state = computed(() => (temp.value < 0 ? 'solid' : temp.value < 100 ? 'liquid' : 'gas'))
const stateName = computed(() => ({ solid: '冰 · 固态', liquid: '水 · 液态', gas: '水蒸气 · 气态' })[state.value])

// 分子位置（随机但固定种子）
const molecules = Array.from({ length: 24 }, (_, i) => ({
  x: 90 + ((i * 37) % 380),
  y: 124 + ((i * 53) % 150),
  dx: ((i % 5) - 2) * 0.3,
  dy: (((i * 3) % 5) - 2) * 0.3,
}))

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

  // 分子（速度随温度）
  const speed = Math.max(0.2, Math.abs(temp.value) / 60)
  const shake = state.value === 'solid' ? 0.4 : state.value === 'liquid' ? 1.2 : 4.5
  ctx.fillStyle = state.value === 'gas' ? '#ef4444' : state.value === 'liquid' ? '#0ea5e9' : '#6366f1'
  for (const m of molecules) {
    // 简单布朗运动（基于当前帧时间戳）
    const t = performance.now() / 1000
    const ox = Math.sin(t * speed * 3 + m.x) * shake
    const oy = Math.cos(t * speed * 3 + m.y) * shake
    const r = state.value === 'solid' ? 5 : state.value === 'liquid' ? 4 : 3
    ctx.beginPath()
    ctx.arc(m.x + ox, m.y + oy, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // 容器（固态/液态在杯内，气态散开）
  if (state.value !== 'gas') {
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 2
    ctx.strokeRect(70, 108, 420, 190)
    ctx.fillStyle = state.value === 'solid' ? 'rgba(99,102,241,0.15)' : 'rgba(14,165,233,0.2)'
    ctx.fillRect(71, 109, 419, 189)
  } else {
    ctx.strokeStyle = 'rgba(239,68,68,0.3)'
    ctx.setLineDash([6, 4])
    ctx.lineWidth = 2
    ctx.strokeRect(50, 108, 460, 172)
    ctx.setLineDash([])
  }

  // 温度计（右侧）
  const tx = 514
  ctx.lineWidth = 3
  ctx.strokeStyle = '#94a3b8'
  ctx.beginPath()
  ctx.moveTo(tx, 108); ctx.lineTo(tx, 276); ctx.stroke()
  ctx.beginPath()
  ctx.arc(tx, 290, 18, 0, Math.PI * 2)
  ctx.stroke()
  // 液柱（-20 ~ 120 映射 70-240）
  const hgt = ((temp.value + 20) / 140) * 170
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(tx, 276 - hgt); ctx.lineTo(tx, 276); ctx.stroke()
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.arc(tx, 290, 14, 0, Math.PI * 2)
  ctx.fill()

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
  ctx.fillStyle = '#334155'
  ctx.font = '13px system-ui'
  ctx.fillText(`温度：${temp.value} ℃`, 16, 26)
  ctx.fillStyle = state.value === 'solid' ? '#4f46e5' : state.value === 'liquid' ? '#0284c7' : '#dc2626'
  ctx.font = 'bold 15px system-ui'
  ctx.fillText(`${stateName.value}：分子${state.value === 'solid' ? '几乎不动（振动）' : state.value === 'liquid' ? '缓慢移动' : '高速运动四散'}`, 16, 48)
  ctx.fillStyle = '#64748b'
  ctx.font = '13px system-ui'
  ctx.fillText('温度越高，分子运动越剧烈 —— 这就是“热”的本质', 16, 68)
}

let raf = 0
let last = 0
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  void dt
  draw()
  raf = requestAnimationFrame(frame)
}
watch([temp], draw)
onMounted(() => { last = performance.now(); raf = requestAnimationFrame(frame) })
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="demo">
    <canvas ref="canvasRef" width="560" height="320" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <label class="demo__ctl">
        <span>温度：{{ temp }} ℃</span>
        <input type="range" v-model.number="temp" min="-20" max="120" step="1" />
      </label>
    </div>
  </div>
</template>
