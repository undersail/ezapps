<script setup lang="ts">
// 波的叠加演示：两列同向正弦波 y = A1·sin(2πf1x - ωt) + A2·sin(2πf2x - ωt)
import { ref, onMounted, onBeforeUnmount } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const f1 = ref(1.6)   // 波1 频率
const f2 = ref(1.0)   // 波2 频率
const A1 = ref(1)
const A2 = ref(1)

let raf = 0
let last = 0
let t = 0

function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  t += dt * 0.9
  draw()
  raf = requestAnimationFrame(frame)
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width, h = canvas.height
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, w, h)

  const mid = h / 2
  const amp = 56
  const N = 200

  // 中线
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, mid); ctx.lineTo(w, mid)
  ctx.stroke()

  // 波1（蓝）
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.75)'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * w
    const y = mid - amp * A1.value * Math.sin(2 * Math.PI * f1.value * (i / N) * 1.8 - t * 3)
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.stroke()

  // 波2（绿）
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.75)'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * w
    const y = mid - amp * A2.value * Math.sin(2 * Math.PI * f2.value * (i / N) * 1.8 - t * 3)
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.stroke()

  // 叠加波（紫，最上层）
  ctx.strokeStyle = '#8b5cf6'
  ctx.lineWidth = 3
  ctx.beginPath()
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * w
    const y1 = amp * A1.value * Math.sin(2 * Math.PI * f1.value * (i / N) * 1.8 - t * 3)
    const y2 = amp * A2.value * Math.sin(2 * Math.PI * f2.value * (i / N) * 1.8 - t * 3)
    const y = mid - (y1 + y2)
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.stroke()

  // 图例
  ctx.font = '12px system-ui'
  ctx.fillStyle = '#3b82f6'
  ctx.fillText('— 波 1', 16, 24)
  ctx.fillStyle = '#059669'
  ctx.fillText('— 波 2', 16, 44)
  ctx.fillStyle = '#7c3aed'
  ctx.fillText('— 叠加', 16, 64)
}

onMounted(() => { last = performance.now(); raf = requestAnimationFrame(frame) })
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="demo">
    <canvas ref="canvasRef" width="560" height="320" class="demo__canvas"></canvas>
    <div class="demo__controls">
      <label class="demo__ctl">
        <span>波1 频率：{{ f1.toFixed(1) }}</span>
        <input type="range" v-model.number="f1" min="0.5" max="3" step="0.1" />
      </label>
      <label class="demo__ctl">
        <span>波2 频率：{{ f2.toFixed(1) }}</span>
        <input type="range" v-model.number="f2" min="0.5" max="3" step="0.1" />
      </label>
      <label class="demo__ctl demo__ctl--inline">
        <span>波1 振幅</span>
        <input type="range" v-model.number="A1" min="0" max="1.2" step="0.1" />
      </label>
      <label class="demo__ctl demo__ctl--inline">
        <span>波2 振幅</span>
        <input type="range" v-model.number="A2" min="0" max="1.2" step="0.1" />
      </label>
    </div>
  </div>
</template>
