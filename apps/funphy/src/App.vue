<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const playing = ref(false)
const x = ref(50)
const y = ref(50)
const vx = ref(0)
const vy = ref(0)
let keys = new Set<string>()
let rafId = 0

function tick() {
  if (playing.value) {
    if (keys.has('w') || keys.has('arrowup'))    vy.value -= 0.32
    if (keys.has('s') || keys.has('arrowdown'))  vy.value += 0.32
    if (keys.has('a') || keys.has('arrowleft'))  vx.value -= 0.32
    if (keys.has('d') || keys.has('arrowright')) vx.value += 0.32
    // 阻尼
    vx.value *= 0.94
    vy.value *= 0.94
    // 移动 + 边界反弹
    let nx = x.value + vx.value
    let ny = y.value + vy.value
    if (nx < 5)  { nx = 5;  vx.value *= -0.7 }
    if (nx > 95) { nx = 95; vx.value *= -0.7 }
    if (ny < 10) { ny = 10; vy.value *= -0.7 }
    if (ny > 90) { ny = 90; vy.value *= -0.7 }
    x.value = nx
    y.value = ny
  }
  rafId = requestAnimationFrame(tick)
}

const onKD = (e: KeyboardEvent) => { keys.add(e.key.toLowerCase()); if (playing.value) e.preventDefault() }
const onKU = (e: KeyboardEvent) => { keys.delete(e.key.toLowerCase()) }

function start() {
  playing.value = true
  x.value = 50; y.value = 50; vx.value = 0; vy.value = 0
}
function stop() { playing.value = false }

onMounted(() => {
  window.addEventListener('keydown', onKD)
  window.addEventListener('keyup', onKU)
  rafId = requestAnimationFrame(tick)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKD)
  window.removeEventListener('keyup', onKU)
  cancelAnimationFrame(rafId)
})
</script>

<template>
  <div class="game">
    <header class="hero">
      <div class="badge">BETA · v0.1</div>
      <h1>🚀 飞飞历险记</h1>
      <p class="tag">Flyphy Adventure · 一个简单的物理冒险游戏</p>
      <p class="intro">
        操控飞飞在空间中穿行，体验<strong>速度、惯性、阻力</strong>的平衡。撞墙会反弹，离开太久会停下。
      </p>
    </header>

    <section v-if="!playing" class="start">
      <button class="start-btn" @click="start">▶ 开始游戏</button>
      <p class="hint">按键：<kbd>W</kbd> 推进 · <kbd>A</kbd> 左 · <kbd>S</kbd> 减速 · <kbd>D</kbd> 右 （也支持方向键）</p>
    </section>

    <section v-else class="stage">
      <div class="hud">
        <span>x: {{ x.toFixed(0) }} / y: {{ y.toFixed(0) }}</span>
        <button class="stop-btn" @click="stop">暂停</button>
      </div>
      <div class="arena">
        <div class="ship" :style="{ left: x + '%', top: y + '%' }">🛸</div>
      </div>
      <p class="controls">W 推进 · A 左 · S 减速 · D 右</p>
    </section>

    <footer class="foot">
      <a href="/">← 返回 EZAPPS 主页</a>
    </footer>
  </div>
</template>

<style scoped>
.game {
  max-width: 800px;
  margin: 0 auto;
  padding: 4rem 1.5rem;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #1a1a2e;
  text-align: center;
}
.hero { margin-bottom: 2.5rem; }
.badge {
  display: inline-block;
  font-size: 0.75rem;
  background: #9333ea;
  color: white;
  padding: 4px 12px;
  border-radius: 999px;
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
}
.hero h1 { font-size: 2.75rem; margin: 0 0 0.5rem; letter-spacing: -0.03em; }
.tag { font-size: 1.05rem; color: #7c3aed; margin: 0 0 1rem; font-weight: 500; }
.intro { color: #64748b; margin: 0 auto; max-width: 520px; line-height: 1.6; }
.intro strong { color: #0f172a; }

.start { margin-top: 2rem; }
.start-btn {
  font-size: 1.1rem;
  font-weight: 600;
  padding: 0.85rem 2.5rem;
  background: linear-gradient(135deg, #9333ea 0%, #c026d3 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 12px 32px rgba(147, 51, 234, 0.3);
  transition: transform 0.15s, box-shadow 0.15s;
}
.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 40px rgba(147, 51, 234, 0.4);
}
.hint {
  margin-top: 1rem;
  color: #94a3b8;
  font-size: 0.9rem;
}
kbd {
  display: inline-block;
  padding: 2px 8px;
  background: #f1f5f9;
  color: #475569;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85em;
  margin: 0 2px;
  border: 1px solid #e2e8f0;
  border-bottom-width: 2px;
}

.stage { margin-top: 1rem; }
.hud {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  font-family: ui-monospace, monospace;
  font-size: 0.9rem;
  color: #475569;
}
.stop-btn {
  font-size: 0.8rem;
  padding: 4px 12px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #64748b;
  cursor: pointer;
}
.stop-btn:hover { background: #f1f5f9; }

.arena {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: linear-gradient(135deg, #faf5ff 0%, #eff6ff 100%);
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}
.ship {
  position: absolute;
  font-size: 1.75rem;
  transform: translate(-50%, -50%);
  transition: none;
  filter: drop-shadow(0 4px 8px rgba(147, 51, 234, 0.4));
}
.controls {
  margin-top: 1rem;
  color: #94a3b8;
  font-size: 0.85rem;
}

.foot {
  margin-top: 3rem;
}
.foot a {
  color: #7c3aed;
  text-decoration: none;
  font-weight: 500;
}
</style>
