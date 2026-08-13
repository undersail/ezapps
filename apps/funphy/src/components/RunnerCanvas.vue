<template>
  <div class="runner-root">
    <div class="canvas-area" ref="canvasAreaRef">
      <canvas ref="canvasRef"></canvas>

      <!-- 大厅界面（全屏布局） -->
      <div class="menu-overlay" v-if="gameState === 'menu'">
        <div class="lobby">
          <!-- 顶部：标题 + 故事 -->
          <div class="lobby-header">
            <h1 class="lobby-title">🚀 飞飞历险记</h1>
            <p class="lobby-story">驾驶全能飞船，从海洋出发，穿越大陆与天空，冲向广袤宇宙！</p>
          </div>

          <!-- 中部：模式 + 图例 + 进度 -->
          <div class="lobby-main">
            <div class="mode-tabs">
              <button class="mode-tab" :class="{ active: lobbyMode === 'adventure' }" @click="lobbyMode = 'adventure'">🚀 探险</button>
              <button class="mode-tab" :class="{ active: lobbyMode === 'revisit' }" @click="lobbyMode = 'revisit'">🔄 重游</button>
            </div>

            <div v-if="lobbyMode === 'adventure'">
              <button class="btn-primary lobby-start" @click="handleStart">🚀 开始探险 · 第 {{ adventureIndex + 1 }}/{{ runnerLevels.length }} 关</button>
            </div>

            <div v-else class="revisit-panel">
              <div v-for="ch in runnerChapters" :key="ch.chapter" class="chapter-group">
                <div class="chapter-title">{{ ch.emoji }} {{ ch.title }}</div>
                <div class="level-grid">
                  <div
                    v-for="(lv, i) in chapterLevels(ch.chapter)"
                    :key="lv.id"
                    class="level-card"
                    :class="{ locked: !isUnlocked(levelIndex(lv.id)), done: upgrades.isLevelDone(lv.id) }"
                    @click="playLevel(levelIndex(lv.id))"
                  >
                    <div class="level-card-name">{{ lv.name }}{{ lv.endless ? ' ∞' : '' }}</div>
                    <div class="level-card-state">{{ upgrades.isLevelDone(lv.id) ? '✅' : isUnlocked(levelIndex(lv.id)) ? (lv.endless ? '∞' : '▶') : '🔒' }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部：飞船库 + 返回主页 -->
          <div class="lobby-footer">
            <div class="shipyard">
              <div class="shipyard-title">🛠 飞船库 · 💎 {{ totalGems }}</div>
              <div class="upgrade-row" v-for="k in (['engine', 'armor', 'battery'] as const)" :key="k">
                <div class="upgrade-info">
                  <div class="upgrade-name">{{ UPGRADE_NAME[k] }} {{ upgradeState(k) }}</div>
                  <div class="upgrade-desc">{{ upgradeDesc[k] }}</div>
                </div>
                <button class="upgrade-btn" @click="doUpgrade(k)" :disabled="upgrades.progress.upgrades[k] >= UPGRADE_COST[k].length || upgrades.progress.gems < UPGRADE_COST[k][upgrades.progress.upgrades[k]]">
                  ⬆
                </button>
              </div>
            </div>
            <button class="cardbook-btn" @click="showCardbook = true">📚 物理卡册 {{ ownedCards }}/{{ physicsCards.length }}</button>
            <a class="home-link" href="/">🏠 返回 ezapps 主页</a>
          </div>
        </div>
      </div>

      <!-- HUD 顶部：三栏卡片布局 -->
      <div class="runner-hud" v-if="gameState === 'playing' || gameState === 'paused' || gameState === 'won' || gameState === 'lost'">
        <!-- 左：护甲 + 宝石（一行横排） -->
        <div class="hud-group hud-left">
          <span class="armor-display">
            <span v-for="i in 3" :key="i" class="armor-heart" :class="{ empty: i > armor }">❤️</span>
          </span>
          <span class="gem-display">💎 {{ gems }}</span>
        </div>
        <!-- 中：时间 + 里程 -->
        <div class="hud-group hud-center">
          <span class="stat">⏱ {{ fmtTime }}</span>
          <div class="progress-wrap">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
            </div>
            <span class="progress-num">{{ progressPct }}%</span>
          </div>
          <div class="energy-wrap">
            <div class="energy-bar">
              <div class="energy-fill" :class="{ low: energy <= 15 }" :style="{ width: energy + '%', background: energyColor }"></div>
            </div>
            <span class="energy-num" :class="{ low: energy <= 15 }">⚡{{ energy }}%</span>
          </div>
        </div>
        <!-- 右：暂停 + 声音 -->
        <div class="hud-group hud-right">
          <button class="hud-btn" @click="toggleSound" aria-label="声音">{{ soundEnabled ? '🔊' : '🔇' }}</button>
          <button class="hud-btn" @click="togglePause" aria-label="暂停">⏸</button>
        </div>
      </div>

      <!-- 物理卡册弹窗 -->
      <div class="overlay" v-if="showCardbook" @click.self="showCardbook = false">
        <div class="overlay-card cardbook-card">
          <button class="modal-close" @click="showCardbook = false" aria-label="关闭">✕</button>
          <h2>📚 物理卡册 · {{ ownedCards }}/{{ physicsCards.length }}</h2>
          <p class="cardbook-hint">通关关卡即可解锁对应物理卡</p>
          <div class="cardbook-grid">
            <div v-for="c in physicsCards" :key="c.id" class="physics-card" :class="{ locked: !upgrades.progress.cards.includes(c.id) }" @click="upgrades.progress.cards.includes(c.id) && openCardDetail(c.id)">
              <div class="physics-card-name">{{ upgrades.progress.cards.includes(c.id) ? c.intuitionName : '🔒' }}</div>
              <div class="physics-card-desc">{{ upgrades.progress.cards.includes(c.id) ? c.formalName : '通关 ' + c.id + ' 解锁' }}</div>
            </div>
          </div>
          <button class="btn-secondary" @click="showCardbook = false">关闭</button>
        </div>
      </div>

      <!-- 物理卡详情弹窗（点击卡片 / 首次获得自动弹出） -->
      <div class="overlay" v-if="showCardDetail && selectedCard">
        <div class="overlay-card card-detail-card">
          <div class="card-detail-icon">🎴</div>
          <h2>{{ selectedCard.intuitionName }}</h2>
          <p class="card-detail-formal">{{ selectedCard.formalName }}</p>
          <div class="card-detail-body">
            <p class="card-detail-label">💡 直觉理解</p>
            <p class="card-detail-text">{{ selectedCard.intuitionDesc }}</p>
            <p class="card-detail-label">📐 公式</p>
            <p class="card-detail-text">{{ selectedCard.formula }}</p>
            <p class="card-detail-label">🏠 生活例子</p>
            <p class="card-detail-text">{{ selectedCard.lifeExample }}</p>
          </div>
          <button class="btn-primary" @click="closeCardDetail">收起卡片</button>
        </div>
      </div>

      <!-- 过场卡片（位置2：操作提示下方） -->
      <div class="intro-card" v-if="showIntro && gameState === 'playing'" @click="dismissIntro">
        <div class="intro-text">{{ introText }}</div>
        <div class="intro-skip">点击跳过</div>
      </div>

      <!-- 悬浮教学提示（位置1：开局显示约5秒，与过场卡同款排版） -->
      <div class="runner-tip" v-if="gameState === 'playing' && runtime && runtime.progress < 80">
        <div class="tip-title">🕹 操作说明</div>
        <div class="tip-row">←→ 移动 · ↑ 加速 · ↓ 刹车</div>
        <div class="tip-row">⚪ 宝石=升级货币 · 🟢 能量块=补能</div>
        <div class="tip-row">🔴 红边=大障碍（危险）· ❓ 盲盒=随机奖励</div>
      </div>

      <!-- 首次进入太阳能区提示（同款卡片） -->
      <div class="runner-tip solar-tip" v-if="solarTipVisible">
        <div class="tip-title">🟡 太阳能区</div>
        <div class="tip-row">持续充能！待在里面就能慢慢回满能量</div>
      </div>

      <!-- 暂停界面 -->
      <div class="overlay" v-if="gameState === 'paused' && !showShipyard">
        <div class="overlay-card">
          <h2>⏸ 已暂停</h2>
          <button class="btn-primary" @click="resumeGame">继续</button>
          <button class="btn-secondary" @click="handleBack">返回大厅</button>
        </div>
      </div>

      <!-- 失败界面 -->
      <div class="overlay" v-if="gameState === 'lost'">
        <div class="overlay-card lose-card">
          <h2>{{ failText }}</h2>
          <template v-if="runtime?.level.endless">
            <p class="result-line">🌌 本次里程：{{ Math.floor(runtime.progress) }}</p>
            <p class="result-line">🏅 最佳记录：{{ bestDistanceText }}</p>
          </template>
          <button class="btn-primary" @click="handleRetry">再试一次</button>
          <button class="btn-secondary" @click="handleBack">返回大厅</button>
        </div>
      </div>

      <!-- 胜利界面 -->
      <div class="overlay" v-if="gameState === 'won'">
        <div class="overlay-card win-card">
          <h2>🎉 通关！</h2>
          <p class="result-line">🌊 第 {{ currentLevelIndex + 1 }}/{{ runnerLevels.length }} 关 · {{ currentLevelName }}</p>
          <p class="result-line">💎 本关宝石 {{ gems }}（累计 {{ totalGems }}）</p>
          <p class="result-line">⚡ 剩余能量 {{ energy }}%</p>
          <p class="result-line">⏱ 用时 {{ fmtTime }}</p>
          <button class="btn-primary" @click="handleNext">{{ nextBtnText }}</button>
        </div>
      </div>
    </div>

      <!-- 右上功能按钮（升级装备） -->
      <div class="side-btns" v-if="gameState === 'playing'">
        <button class="side-btn" @click="openShipyard" aria-label="升级装备">🛠</button>
      </div>

      <!-- 右下冲刺键（与左摇杆平齐，动作区对称） -->
      <button class="dash-fab" v-if="gameState === 'playing'" @click="dash" aria-label="冲刺">⚡</button>

      <!-- 升级弹窗（暂停游戏） -->
      <div class="overlay" v-if="showShipyard">
        <div class="overlay-card">
          <h2>🛠 飞船库 · 💎 {{ totalGems }}</h2>
          <div class="shipyard" style="margin-bottom: 8px;">
            <div class="upgrade-row" v-for="k in (['engine', 'armor', 'battery'] as const)" :key="k">
              <div class="upgrade-info">
                <div class="upgrade-name">{{ UPGRADE_NAME[k] }} {{ upgradeState(k) }}</div>
                <div class="upgrade-desc">{{ upgradeDesc[k] }}</div>
              </div>
              <button class="upgrade-btn" @click="doUpgrade(k)" :disabled="upgrades.progress.upgrades[k] >= UPGRADE_COST[k].length || upgrades.progress.gems < UPGRADE_COST[k][upgrades.progress.upgrades[k]]">⬆</button>
            </div>
          </div>
          <button class="btn-secondary" @click="closeShipyard">关闭</button>
        </div>
      </div>

      <!-- 单摇杆控制区 -->
      <div class="controls-area" v-if="gameState === 'playing'">
      <div class="stick-wrap">
        <div
          ref="joystickBase"
          class="joystick-base"
          @touchstart.prevent="onStickStart"
          @touchmove.prevent="onStickMove"
          @touchend.prevent="onStickEnd"
          @touchcancel.prevent="onStickEnd"
          @mousedown.prevent="onStickMouseDown"
        >
          <!-- 方向指示 -->
          <div class="joy-arrow up">▲</div>
          <div class="joy-arrow down">▼</div>
          <div class="joy-arrow left">◀</div>
          <div class="joy-arrow right">▶</div>
          <div class="joystick-knob" :style="{ transform: `translate(${knobX}px, ${knobY}px)` }"></div>
        </div>
        <div class="stick-hint">上=加速 · 下=刹车 · 左右=移动</div>
      </div>
    </div>

    <div class="keyboard-hint-desktop" v-if="gameState === 'playing'">
      ←→ 移动 · ↑ 加速 · ↓ 刹车 · ESC 暂停
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRunnerLoop } from '../composables/useRunnerLoop'
import { useUpgrades, UPGRADE_COST, UPGRADE_NAME } from '../composables/useUpgrades'
import { SceneRenderer } from '../scenes/SceneRenderer'
import { skins } from '../data/skins'
import { runnerLevels, runnerChapters } from '../data/runner'

const {
  canvasRef, gameState, runtime, failText,
  stickX, stickY,
  armor, energy, gems, progressPct, elapsedTime,
  soundEnabled, toggleSound,
  startLevel, retryLevel, backToMenu,
  togglePause, resumeGame,
  setStickTouch, setViewSize, upgrades, dash,
  currentLevelIndex, advanceLevel, setLevelIndex, lastNewCardId,
  solarTip,
} = useRunnerLoop()

// 太阳能区提示（首次进入显示 3 秒）
const solarTipVisible = ref(false)
let solarTipTimer = 0
watch(solarTip, (v) => {
  if (v) {
    solarTipVisible.value = true
    clearTimeout(solarTipTimer)
    solarTipTimer = window.setTimeout(() => { solarTipVisible.value = false }, 3000)
  }
})

const totalGems = computed(() => upgrades.progress.gems)

// 升级状态文案
function upgradeState(kind: 'engine' | 'armor' | 'battery') {
  const lv = upgrades.progress.upgrades[kind]
  const costs = UPGRADE_COST[kind]
  if (lv >= costs.length) return `Lv${lv}（满级）`
  return `Lv${lv} → Lv${lv + 1}（💎${costs[lv]}）`
}
function doUpgrade(kind: 'engine' | 'armor' | 'battery') {
  upgrades.upgrade(kind)
}
const upgradeDesc: Record<'engine' | 'armor' | 'battery', string> = {
  engine: '推力+8% / 能耗-6%',
  armor: '护甲+1',
  battery: '能量上限+10',
}

// 无限模式最佳里程
const bestDistanceText = computed(() => upgrades.progress.bestDistance > 0 ? `${upgrades.progress.bestDistance}` : '尚无记录')

// 物理卡册（V1 物理卡数据，30 张，id 与关卡对应）
import { physicsCards } from '../data/physicsCards'
import * as Sound from '../utils/sound'
const showCardbook = ref(false)
const ownedCards = computed(() => physicsCards.filter(c => upgrades.progress.cards.includes(c.id)).length)

// 卡片详情弹窗
const showCardDetail = ref(false)
const selectedCard = ref<(typeof physicsCards)[number] | null>(null)
function openCardDetail(cardId: string) {
  const c = physicsCards.find(x => x.id === cardId)
  if (c && upgrades.progress.cards.includes(c.id)) {
    selectedCard.value = c
    showCardDetail.value = true
  }
}
function closeCardDetail() {
  showCardDetail.value = false
  selectedCard.value = null
}
// 通关首次获得新卡 → 自动弹出详情（watch won 状态）
watch(gameState, (s) => {
  if (s === 'won' && lastNewCardId.value) {
    openCardDetail(lastNewCardId.value)
  }
  if (s === 'menu') lastNewCardId.value = ''   // 回大厅清空
})

const fmtTime = computed(() => {
  const t = elapsedTime.value
  const m = Math.floor(t / 60)
  const s = t % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
})

const energyColor = computed(() => energy.value > 40 ? '#4ade80' : energy.value > 15 ? '#facc15' : '#ef4444')

// ===== 过场卡片（探险模式开场介绍，仅关卡开始显示一次） =====
const showIntro = ref(false)
const introText = ref('')
let introTimer = 0
watch(gameState, (s, old) => {
  // 暂停/升级弹窗恢复（paused→playing）时不重复显示
  if (s === 'playing' && old !== 'paused' && runtime.value?.level.introCard) {
    introText.value = runtime.value.level.introCard
    showIntro.value = true
    // 3 秒自动消失
    clearTimeout(introTimer)
    introTimer = window.setTimeout(() => { showIntro.value = false }, 3000)
  } else {
    showIntro.value = false
  }
})
function dismissIntro() {
  clearTimeout(introTimer)
  showIntro.value = false
}
onUnmounted(() => clearTimeout(introTimer))

// ===== 画布自适应（ResizeObserver） =====
const canvasAreaRef = ref<HTMLElement | null>(null)
let renderer: SceneRenderer | null = null
let renderRaf = 0
let resizeObserver: ResizeObserver | null = null

function setupCanvas() {
  const canvas = canvasRef.value
  const area = canvasAreaRef.value
  if (!canvas || !area) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const w = Math.max(1, area.clientWidth)
  const h = Math.max(1, area.clientHeight)
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  if (!renderer) {
    renderer = new SceneRenderer(ctx, canvas.width, canvas.height)
  } else {
    renderer.resize(canvas.width, canvas.height)
  }
  // 同步物理边界（视口世界尺寸，防飞船飞出可视区）
  const vs = renderer.getRunnerViewSize()
  setViewSize(vs.width, vs.height)
}

function renderLoop() {
  const canvas = canvasRef.value
  const rt = runtime.value
  if (canvas && renderer) {
    if (rt) {
      renderer.renderRunner(rt, skins[0], upgrades.progress.upgrades)
    } else {
      // 大厅背景（深蓝渐变 + 星空感）
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height)
        grad.addColorStop(0, '#0a0a2e')
        grad.addColorStop(1, '#1a1a4e')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
    }
  }
  renderRaf = requestAnimationFrame(renderLoop)
}

onMounted(() => {
  setupCanvas()
  // 监听容器尺寸变化（旋转/窗口调整/布局稳定）
  const area = canvasAreaRef.value
  if (area && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      setupCanvas()
    })
    resizeObserver.observe(area)
  }
  renderRaf = requestAnimationFrame(renderLoop)
  // 显示大厅（不再自动开局，点"开始探险"进入）
})

onUnmounted(() => {
  cancelAnimationFrame(renderRaf)
  resizeObserver?.disconnect()
})

// ===== 单摇杆（左右移动 + 上下加速/刹车） =====
const knobX = ref(0)
const knobY = ref(0)
// 大屏（≥768px）摇杆/按钮放大
const isLargeScreen = () => window.innerWidth >= 768
const joyRadius = () => (isLargeScreen() ? 66 : 52)    // 摇杆活动半径
const knobR = () => (isLargeScreen() ? 28 : 22)        // 摇杆帽半径
let stickTouchId: number | null = null
let stickCenterX = 0
let stickCenterY = 0

function setStickFromOffset(dx: number, dy: number) {
  const maxDist = joyRadius() - knobR()
  let nx = dx / maxDist
  let ny = dy / maxDist
  const mag = Math.sqrt(nx * nx + ny * ny)
  if (mag > 1) { nx /= mag; ny /= mag }
  // 死区 0.15 + 重映射 + 响应曲线（小推杆更敏感，跟手）
  const active = mag > 0.15
  const remap = active ? (mag - 0.15) / 0.85 : 0
  const n = active ? remap / mag : 0
  // 混合曲线：0.35 线性 + 0.65 平方（小推杆快速响应，大推杆满速）
  const norm = active ? 0.35 * n + 0.65 * n * n : 0
  stickX.value = nx * norm
  stickY.value = -ny * norm   // 上推(dy<0) → 正（加速），下拉 → 负（刹车）
  knobX.value = nx * maxDist
  knobY.value = ny * maxDist
  setStickTouch(active)
}

function onStickStart(e: TouchEvent) {
  const t = e.touches[0]
  const el = joystickBase.value?.getBoundingClientRect()
  if (!el) return
  stickTouchId = t.identifier
  stickCenterX = t.clientX - el.left
  stickCenterY = t.clientY - el.top
  setStickFromOffset(0, 0)
}
function onStickMove(e: TouchEvent) {
  if (stickTouchId === null) return
  const t = Array.from(e.touches).find(tt => tt.identifier === stickTouchId)
  const el = joystickBase.value?.getBoundingClientRect()
  if (!t || !el) return
  setStickFromOffset(t.clientX - el.left - stickCenterX, t.clientY - el.top - stickCenterY)
}
function onStickEnd() {
  stickTouchId = null
  stickX.value = 0
  stickY.value = 0
  knobX.value = 0
  knobY.value = 0
  setStickTouch(false)
}
function onStickMouseDown(e: MouseEvent) {
  const el = joystickBase.value?.getBoundingClientRect()
  if (!el) return
  stickCenterX = el.width / 2
  stickCenterY = el.height / 2
  const move = (ev: MouseEvent) => {
    setStickFromOffset(ev.clientX - el.left - stickCenterX, ev.clientY - el.top - stickCenterY)
  }
  const up = () => {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
    onStickEnd()
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}
const joystickBase = ref<HTMLElement | null>(null)

function handleRetry() {
  retryLevel()
}
function handleNext() {
  // 下一关（章末关后回大厅）
  const next = advanceLevel(runnerLevels)
  if (next) startLevel(next)
  else backToMenu()
}
function handleBack() {
  backToMenu()
}
// 探险进度：从关卡完成状态推导（持久化，刷新后仍准确）
const adventureIndex = computed(() => {
  let idx = 0
  for (let i = 0; i < runnerLevels.length; i++) {
    if (upgrades.isLevelDone(runnerLevels[i].id)) idx = i + 1
    else break
  }
  return Math.min(idx, runnerLevels.length - 1)
})
function handleStart() {
  // 用户手势内预热音频（修复收集音效经常没声音）
  Sound.unlock()
  // 支持 ?level=N 调试参数（开发调测用）
  const params = new URLSearchParams(location.search)
  const lv = parseInt(params.get('level') || '0', 10)
  if (lv > 0) setLevelIndex(Math.min(lv - 1, runnerLevels.length - 1))
  else setLevelIndex(adventureIndex.value)   // 从最新进度继续
  startLevel(runnerLevels[currentLevelIndex.value])
}

// 大厅模式（探险/重游）
const lobbyMode = ref<'adventure' | 'revisit'>('adventure')
function isUnlocked(i: number): boolean {
  return upgrades.isLevelUnlocked(runnerLevels[i].id, runnerLevels)
}
function levelIndex(levelId: string): number {
  return runnerLevels.findIndex(l => l.id === levelId)
}
function chapterLevels(chapter: number): typeof runnerLevels {
  return runnerLevels.filter(l => l.chapter === chapter)
}
function playLevel(i: number) {
  if (i < 0 || !isUnlocked(i)) return
  setLevelIndex(i)
  startLevel(runnerLevels[i])
}

// 当前关卡信息
const currentLevelName = computed(() => runnerLevels[currentLevelIndex.value]?.name || '海面初航')
const isLastLevel = computed(() => currentLevelIndex.value >= runnerLevels.length - 1)
const nextBtnText = computed(() => isLastLevel.value ? '🏆 完成章节' : '下一关 ▶')

// 升级弹窗（打开时暂停游戏）
const showShipyard = ref(false)
function openShipyard() {
  showShipyard.value = true
  if (gameState.value === 'playing') togglePause()
}
function closeShipyard() {
  showShipyard.value = false
  if (gameState.value === 'paused') resumeGame()
}
</script>

<style scoped>
.runner-root {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background: #030712;
  color: #fff;
  overflow: hidden;
}
.canvas-area {
  position: relative;
  flex: 1;
  min-height: 0;
}
canvas {
  width: 100%;
  height: 100%;
  display: block;
}

/* ==== HUD（三栏卡片） ==== */
.runner-hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(rgba(2, 6, 23, 0.55), rgba(2, 6, 23, 0));
  z-index: 5;
  pointer-events: none;
}
.hud-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 10px;
  padding: 4px 10px;
  backdrop-filter: blur(4px);
  pointer-events: auto;
}
.armor-display { display: inline-flex; gap: 2px; white-space: nowrap; }
.armor-heart { font-size: 0.8rem; }
.armor-heart.empty { opacity: 0.25; filter: grayscale(1); }
.gem-display { font-size: 0.85rem; font-weight: 600; white-space: nowrap; }
/* HUD 布局：左/右固定，中栏 flex 自适应压缩（窄屏条变短不溢出） */
.hud-left { flex-shrink: 0; }
.hud-right { flex-shrink: 0; }
.hud-center { flex: 1 1 auto; min-width: 0; gap: 8px; }
.stat { font-size: 0.85rem; font-variant-numeric: tabular-nums; color: #e2e8f0; white-space: nowrap; flex-shrink: 0; }
.progress-wrap { flex: 1 1 auto; min-width: 24px; display: flex; align-items: center; gap: 5px; }
.progress-bar {
  flex: 1 1 auto;
  width: 100%;
  max-width: 90px;
  min-width: 24px;
  height: 7px;
  border-radius: 4px;
  background: rgba(255,255,255,0.12);
  overflow: hidden;
}
.progress-fill { height: 100%; background: linear-gradient(90deg, #38bdf8, #818cf8); border-radius: 4px; transition: width 0.15s; }
.progress-num { font-size: 0.7rem; color: rgba(255,255,255,0.6); flex-shrink: 0; }
.energy-wrap { flex: 1 1 auto; min-width: 24px; display: flex; align-items: center; gap: 5px; }
.energy-bar {
  flex: 1 1 auto;
  width: 100%;
  max-width: 70px;
  min-width: 24px;
  height: 7px;
  border-radius: 4px;
  background: rgba(255,255,255,0.12);
  overflow: hidden;
}
.energy-fill { height: 100%; border-radius: 4px; transition: width 0.1s, background 0.3s; }
.energy-num { font-size: 0.7rem; flex-shrink: 0; }
.hud-btn {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  padding: 3px 8px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #fff;
}

/* 窄屏 HUD 紧凑化（移动优先默认，防右侧按钮被挤出） */
.runner-hud { padding: 6px 8px; gap: 4px; }
.hud-group { padding: 3px 7px; gap: 5px; }
.armor-heart { font-size: 0.8rem; }
.progress-bar { width: 56px; }
.energy-bar { width: 44px; }
.progress-num { display: none; }
.energy-num { font-size: 0.65rem; min-width: 34px; }
.stat { font-size: 0.75rem; min-width: 36px; }
.hud-btn { padding: 2px 6px; font-size: 0.8rem; }
/* 宽屏恢复大尺寸 */
@media (min-width: 768px) {
  .runner-hud { padding: 8px 12px; gap: 8px; }
  .hud-group { padding: 4px 10px; gap: 8px; }
  .armor-heart { font-size: 0.95rem; }
  .progress-bar { max-width: 110px; }
  .energy-bar { max-width: 90px; }
  .progress-num { font-size: 0.75rem; }
  .energy-num { font-size: 0.75rem; }
  .stat { font-size: 0.9rem; }
  .hud-btn { padding: 3px 8px; font-size: 0.85rem; }
}

/* 操作提示（与过场卡片同款：尺寸/排版/图层一致） */
.runner-tip {
  position: absolute;
  top: 52px;
  left: 0;
  right: 0;
  margin: 0 auto;
  width: min(420px, 86%);
  background: rgba(2, 6, 23, 0.85);
  border: 1px solid rgba(125, 211, 252, 0.3);
  border-radius: 14px;
  padding: 14px 18px;
  z-index: 7;              /* 与 intro-card 同层 */
  pointer-events: none;
  backdrop-filter: blur(6px);
  box-shadow: 0 8px 28px rgba(0,0,0,0.5);
  text-align: center;
}
.tip-title { font-size: 0.9rem; font-weight: 600; margin-bottom: 6px; }
.tip-row { font-size: 0.8rem; color: rgba(255,255,255,0.85); line-height: 1.7; }
.tip-row + .tip-row { border-top: 1px solid rgba(148, 163, 184, 0.12); padding-top: 5px; }
.solar-tip { border-color: rgba(253, 224, 71, 0.4); }

/* ==== 过场卡片（位置2：操作提示下方，多弹窗错位不重叠） ==== */
.intro-card {
  position: absolute;
  top: 220px;              /* 位置2：避开位置1（52px 操作提示，4行高约165px） */
  left: 0;
  right: 0;
  margin: 0 auto;          /* 用 margin 居中，transform 留给动画 */
  width: min(420px, 86%);
  background: rgba(2, 6, 23, 0.85);
  border: 1px solid rgba(125, 211, 252, 0.3);
  border-radius: 14px;
  padding: 14px 18px;
  z-index: 7;
  cursor: pointer;
  animation: intro-in 0.4s ease;
  backdrop-filter: blur(6px);
  box-shadow: 0 8px 28px rgba(0,0,0,0.5);
}
.intro-text {
  font-size: 0.82rem;
  line-height: 1.6;
  color: #e2e8f0;
  white-space: pre-line;
}
.intro-close {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.intro-close:hover { background: rgba(255, 255, 255, 0.25); color: #fff; }
.intro-hint { margin-top: 8px; font-size: 0.7rem; color: rgba(255, 255, 255, 0.45); }
.intro-skip {
  margin-top: 6px;
  font-size: 0.68rem;
  color: rgba(148, 163, 184, 0.6);
  text-align: right;
}
@keyframes intro-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 低能量闪烁 */
.energy-fill.low { animation: energy-blink 0.6s infinite; }
.energy-num.low { color: #ef4444; animation: energy-blink 0.6s infinite; }
@keyframes energy-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ==== 大厅（全屏布局） ==== */
.menu-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  background: linear-gradient(180deg, rgba(4, 20, 35, 0.75), rgba(2, 8, 18, 0.9));
  overflow-y: auto;
}
.lobby {
  width: min(720px, 94%);
  max-height: 96dvh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px 8px 18px;
}
.lobby-header { text-align: center; }
.lobby-title { margin: 0 0 8px; font-size: 2.2rem; letter-spacing: 2px; }
.lobby-story { margin: 0; color: rgba(255,255,255,0.75); font-size: 0.95rem; line-height: 1.6; }
.lobby-main {
  background: rgba(10, 20, 35, 0.6);
  border-radius: 16px;
  padding: 16px;
}
.lobby-start { width: 100%; }
.lobby-footer {
  background: rgba(10, 20, 35, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 16px;
  padding: 14px 16px 18px;
}
.home-link {
  display: block;
  text-align: center;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(148, 163, 184, 0.15);
  color: rgba(148, 163, 184, 0.8);
  font-size: 0.82rem;
  text-decoration: none;
}
.home-link:hover { color: #7dd3fc; }
.cardbook-btn {
  display: block;
  width: 100%;
  margin-top: 12px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.85);
  font-size: 0.88rem;
  cursor: pointer;
}
.cardbook-btn:hover { border-color: rgba(125, 211, 252, 0.4); color: #fff; }

/* 物理卡册弹窗 */
.cardbook-card { max-width: 560px; max-height: 84dvh; overflow-y: auto; text-align: center; }
.cardbook-hint { margin: 0 0 12px; color: rgba(255,255,255,0.55); font-size: 0.8rem; }
.cardbook-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.physics-card {
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 12px 10px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.1s, border-color 0.1s;
}
.physics-card:active { transform: scale(0.97); }
.physics-card.locked { opacity: 0.45; filter: grayscale(0.8); cursor: default; }

/* 卡片详情弹窗 */
.card-detail-card { max-width: 300px; text-align: center; }
.card-detail-icon { font-size: 2.4rem; }
.card-detail-formal { margin: 0 0 12px; color: rgba(125, 211, 252, 0.9); font-size: 0.95rem; font-weight: 600; }
.card-detail-body { text-align: left; background: rgba(255,255,255,0.05); border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; }
.card-detail-label { margin: 8px 0 3px; font-size: 0.75rem; color: rgba(253, 224, 71, 0.85); font-weight: 600; }
.card-detail-label:first-child { margin-top: 0; }
.card-detail-text { margin: 0; font-size: 0.82rem; color: rgba(255,255,255,0.8); line-height: 1.6; }
.physics-card-icon { font-size: 1.6rem; }
.physics-card-name { font-size: 0.85rem; font-weight: 600; margin: 4px 0 4px; }
.physics-card-desc { font-size: 0.7rem; color: rgba(255,255,255,0.6); line-height: 1.4; }

/* 模式切换 */
.mode-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.mode-tab {
  flex: 1;
  padding: 8px 0;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.7);
  font-size: 0.9rem;
  cursor: pointer;
}
.mode-tab.active {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.3), rgba(99, 102, 241, 0.3));
  border-color: rgba(56, 189, 248, 0.5);
  color: #fff;
  font-weight: 600;
}

/* 重游关卡卡片 */
.chapter-group { margin-bottom: 14px; }
.chapter-title {
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 6px;
  text-align: left;
  color: rgba(255,255,255,0.9);
}
.level-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}
.level-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(255,255,255,0.05);
  cursor: pointer;
  transition: transform 0.1s;
}
.level-card:active { transform: scale(0.97); }
.level-card.locked { opacity: 0.4; cursor: not-allowed; }
.level-card.done { border-color: rgba(74, 222, 128, 0.4); }
.level-card-name { font-size: 0.78rem; }
.level-card-state { font-size: 0.9rem; }
.menu-legend {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
  text-align: left;
  font-size: 0.82rem;
  color: rgba(255,255,255,0.85);
}
.legend-item { display: flex; align-items: center; gap: 8px; }
.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legend-dot.white { background: #f8fafc; box-shadow: 0 0 6px rgba(248, 250, 252, 0.6); }
.legend-dot.green { background: #4ade80; box-shadow: 0 0 6px rgba(74, 222, 128, 0.6); }
.legend-dot.gold { background: #fde047; box-shadow: 0 0 6px rgba(253, 224, 71, 0.6); }

/* 飞船库（装备升级） */
.shipyard {
  margin-bottom: 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  padding-top: 12px;
}
.shipyard-title {
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 8px;
  text-align: left;
}
.upgrade-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0;
}
.upgrade-info { text-align: left; }
.upgrade-name { font-size: 0.78rem; }
.upgrade-desc { font-size: 0.65rem; color: rgba(255,255,255,0.5); }
.upgrade-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(56, 189, 248, 0.4);
  background: rgba(56, 189, 248, 0.15);
  color: #7dd3fc;
  font-size: 0.9rem;
  cursor: pointer;
  flex-shrink: 0;
}
.upgrade-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.upgrade-btn:not(:disabled):active { transform: scale(0.9); }

/* ==== 单摇杆（统一左侧悬浮，横竖屏一致） ==== */
.controls-area {
  position: absolute;
  left: 14px;
  bottom: 14px;
  z-index: 10;
  display: flex;
  justify-content: center;
  align-items: center;
}
.joystick-base {
  position: relative;
  width: 112px;
  height: 112px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
  border: 2px solid rgba(148, 163, 184, 0.25);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.joystick-knob {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, rgba(148, 163, 184, 0.9), rgba(100, 116, 139, 0.7));
  border: 1px solid rgba(255,255,255,0.3);
  position: absolute;
  top: 50%;
  left: 50%;
  margin: -20px 0 0 -20px;   /* 帽尺寸一半（40px 帽 → -20px）居中 */
  box-shadow: 0 2px 10px rgba(0,0,0,0.4);
}
.stick-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.joy-arrow {
  position: absolute;
  color: rgba(255,255,255,0.35);
  font-size: 0.7rem;
  pointer-events: none;
}
.joy-arrow.up { top: 6px; left: 50%; transform: translateX(-50%); }
.joy-arrow.down { bottom: 6px; left: 50%; transform: translateX(-50%); }
.joy-arrow.left { left: 8px; top: 50%; transform: translateY(-50%); }
.joy-arrow.right { right: 8px; top: 50%; transform: translateY(-50%); }
.stick-hint { font-size: 0.7rem; color: rgba(255,255,255,0.45); }

/* ==== 右侧功能按钮列 ==== */
.side-btns {
  position: absolute;
  right: 12px;
  top: 70px;               /* 上移：更贴 HUD 下方 */
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.side-btn {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.6);
  color: #e2e8f0;
  font-size: 1.15rem;
  cursor: pointer;
  backdrop-filter: blur(4px);
}
.side-btn:active { transform: scale(0.9); }

/* 右下冲刺键（右移靠近边缘，与摇杆垂直中心对齐保持） */
.dash-fab {
  position: absolute;
  right: 48px;
  bottom: 59px;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 2px solid rgba(253, 224, 71, 0.6);
  background: radial-gradient(circle at 35% 35%, rgba(253, 224, 71, 0.35), rgba(147, 51, 234, 0.4));
  color: #fde047;
  font-size: 1.6rem;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 0 16px rgba(253, 224, 71, 0.3);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.dash-fab:active {
  transform: scale(0.9);
  box-shadow: 0 0 26px rgba(253, 224, 71, 0.55);
}

.keyboard-hint-desktop {
  display: none;
  text-align: center;
  font-size: 0.72rem;
  color: rgba(255,255,255,0.4);
  padding-bottom: 4px;
}
@media (min-width: 768px) {
  .keyboard-hint-desktop { display: block; }
}

/* ==== 界面 ==== */
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.65);
  z-index: 20;
}
.overlay-card {
  position: relative;
  background: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  padding: 28px 40px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}
/* 弹窗右上角关闭按钮 */
.modal-close {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.75);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-close:hover { background: rgba(255, 255, 255, 0.22); color: #fff; }
.overlay-card h2 { margin: 0 0 14px; font-size: 1.5rem; }
.result-line { margin: 6px 0; color: rgba(255,255,255,0.8); }
.btn-primary {
  margin-top: 14px;
  background: linear-gradient(135deg, #38bdf8, #6366f1);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  padding: 10px 28px;
  cursor: pointer;
  width: 100%;
}
.btn-secondary {
  margin-top: 8px;
  background: rgba(255,255,255,0.1);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 0.9rem;
  padding: 8px 22px;
  cursor: pointer;
  width: 100%;
}

/* 大屏放大（≥768px）：摇杆/按钮整体变大（置于样式末尾，避免被覆盖） */
@media (min-width: 768px) {
  .joystick-base { width: 144px; height: 144px; }
  .joystick-knob { width: 52px; height: 52px; margin: -26px 0 0 -26px; }  /* 52px 帽 → -26px 保持居中 */
  .dash-fab { width: 84px; height: 84px; font-size: 2.2rem; }
  .side-btn { width: 58px; height: 58px; font-size: 1.5rem; }
  .side-btns { right: 18px; top: 76px; gap: 12px; }
  .stick-hint { font-size: 0.78rem; }
}
</style>
