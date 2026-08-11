<script setup lang="ts">
import { ref, computed } from 'vue'
import MapView from './pages/MapView.vue'
import LevelPlay from './pages/LevelPlay.vue'
import LevelResult from './pages/LevelResult.vue'
import BossPlay from './pages/BossPlay.vue'
import { useGameProgress } from './composables/useGameProgress'
import { chapters } from './data/chapters'

// V0 保留：题库（演示用，可走旧 stage）
interface Question {
  q: string
  options: number[]
  answer: number
}

const questions: Question[] = [
  { q: '1 + 1 = ?',   options: [1, 2, 3, 4], answer: 2 },
  { q: '5 − 3 = ?',   options: [1, 2, 3, 5], answer: 2 },
  { q: '6 × 7 = ?',   options: [42, 36, 48, 40], answer: 42 },
  { q: '10 ÷ 2 = ?',  options: [3, 5, 8, 10], answer: 5 },
]

// 阶段机：
// lobby → map → level → levelResult → map
//                → boss  → bossResult  → map
// play/done 保留作 V0 demo 入口
const stage = ref<'lobby' | 'map' | 'play' | 'done' | 'level' | 'levelResult' | 'boss' | 'bossResult'>('lobby')

// V0 demo state
const idx = ref(0)
const score = ref(0)
const picked = ref<number | null>(null)
const showRight = ref(false)
const current = ref(questions[0])

// 当前关卡 / Boss
const currentLevelId = ref<string | null>(null)
const currentBossId = ref<string | null>(null)

// 结算结果
interface LevelResult {
  levelId: string
  score: number
  total: number
  stars: 0 | 1 | 2 | 3
}
const lastResult = ref<LevelResult | null>(null)

const lastBossResult = ref<{ bossId: string; defeated: boolean } | null>(null)

// 进度管理
const progress = useGameProgress()

// 计算关卡信息
const currentLevelInfo = computed(() => {
  if (!currentLevelId.value) return null
  for (const ch of chapters) {
    const lv = ch.levels.find((l) => l.id === currentLevelId.value)
    if (lv) return { level: lv, chapter: ch }
  }
  return null
})

const currentBossInfo = computed(() => {
  if (!currentBossId.value) return null
  for (const ch of chapters) {
    if (ch.boss?.id === currentBossId.value) return { boss: ch.boss, chapter: ch }
  }
  return null
})

// 是否存在下一关（普通关）
const hasNextLevel = computed(() => {
  if (!currentLevelId.value) return false
  const cur = currentLevelInfo.value
  if (!cur) return false
  // 在同一 chapter 内找 order 大于当前的下一个 level
  const nextLv = cur.chapter.levels.find((l) => l.order > cur.level.order)
  return !!nextLv
})

// ==================== 路由跳转 ====================
function enterMap() {
  stage.value = 'map'
}

function backToLobby() {
  stage.value = 'lobby'
}

function backToMap() {
  stage.value = 'map'
  currentLevelId.value = null
  currentBossId.value = null
  lastResult.value = null
  lastBossResult.value = null
}

// ==================== 普通关卡 ====================
function onEnterLevel(levelId: string) {
  currentLevelId.value = levelId
  idx.value = 0
  score.value = 0
  picked.value = null
  showRight.value = false
  stage.value = 'level'
}

function onLevelComplete(result: { score: number; total: number; stars: 0 | 1 | 2 | 3; levelId: string }) {
  progress.recordLevelComplete(result.levelId, result.score, result.total, result.stars)
  lastResult.value = result
  stage.value = 'levelResult'
}

function onLevelRetry() {
  if (!currentLevelId.value) return
  // 重新进入同一关
  const id = currentLevelId.value
  currentLevelId.value = null
  lastResult.value = null
  // 触发 onEnterLevel 的同款逻辑
  onEnterLevel(id)
}

function onLevelNext() {
  if (!currentLevelId.value) return
  const cur = currentLevelInfo.value
  if (!cur) return
  const nextLv = cur.chapter.levels.find((l) => l.order > cur.level.order)
  if (nextLv) onEnterLevel(nextLv.id)
  else backToMap()
}

// ==================== Boss 关卡 ====================
function onEnterBoss(bossId: string) {
  currentBossId.value = bossId
  stage.value = 'boss'
}

function onBossComplete(result: { bossId: string; defeated: boolean }) {
  if (result.defeated) {
    progress.recordBossDefeat(result.bossId)
  } else {
    progress.recordBossAttempt(result.bossId)
  }
  lastBossResult.value = result
  stage.value = 'bossResult'
}

function onBossRetry() {
  if (!currentBossId.value) return
  const id = currentBossId.value
  currentBossId.value = null
  lastBossResult.value = null
  onEnterBoss(id)
}

// ==================== V0 demo 旧入口（保留） ====================
function start() {
  stage.value = 'play'
  idx.value = 0
  score.value = 0
  picked.value = null
  showRight.value = false
  current.value = questions[0]
}

function pick(o: number) {
  if (showRight.value) return
  picked.value = o
  const right = o === current.value.answer
  if (right) score.value++
  showRight.value = true
  setTimeout(() => {
    if (idx.value < questions.length - 1) {
      idx.value++
      picked.value = null
      showRight.value = false
      current.value = questions[idx.value]
    } else {
      stage.value = 'done'
    }
  }, 900)
}

function retry() { stage.value = 'lobby' }
</script>

<template>
  <main class="math">
    <header class="hero">
      <div class="badge">BETA · FunMath Adventure</div>
      <h1>📐 曼曼闯天涯</h1>
      <p class="tag">曼曼在数学王国里闯关，答对一题前进一格。</p>
    </header>

    <!-- 大厅 -->
    <section v-if="stage === 'lobby'" class="lobby">
      <div class="lobby__portrait">🧝‍♀️</div>
      <p class="lobby__intro">
        曼曼背着算盘，穿越数王国。每答对一题，曼曼向前一步；<br />
        答错会被「难题怪兽」呛一下。看曼曼能走多远？
      </p>
      <button class="start-btn" @click="enterMap">🗺️ 选关地图</button>
      <p class="hint">🍄 第一章 · 4 关卡 + 1 Boss</p>
    </section>

    <!-- 关卡地图（特性 1） -->
    <MapView
      v-else-if="stage === 'map'"
      @back="backToLobby"
      @enter-level="onEnterLevel"
      @enter-boss="onEnterBoss"
    />

    <!-- 关卡答题（特性 2） -->
    <LevelPlay
      v-else-if="stage === 'level' && currentLevelId"
      :level-id="currentLevelId"
      @back="backToMap"
      @complete="onLevelComplete"
    />

    <!-- 关卡结算（特性 3） -->
    <LevelResult
      v-else-if="stage === 'levelResult' && lastResult && currentLevelInfo"
      :result="lastResult"
      :level-title="currentLevelInfo.level.title"
      :level-emoji="currentLevelInfo.level.emoji"
      :has-next="hasNextLevel && lastResult.stars > 0"
      @retry="onLevelRetry"
      @back="backToMap"
      @next="onLevelNext"
    />

    <!-- Boss 答题（特性 6） -->
    <BossPlay
      v-else-if="stage === 'boss' && currentBossId"
      :boss-id="currentBossId"
      @back="backToMap"
      @complete="onBossComplete"
    />

    <!-- Boss 结算（特性 6 复用 LevelResult） -->
    <LevelResult
      v-else-if="stage === 'bossResult' && lastBossResult && currentBossInfo"
      :result="{
        levelId: lastBossResult.bossId,
        score: lastBossResult.defeated ? currentBossInfo.boss.required : 0,
        total: currentBossInfo.boss.required,
        stars: lastBossResult.defeated ? 3 : 0,
      }"
      :level-title="currentBossInfo.boss.title"
      :level-emoji="currentBossInfo.boss.emoji"
      @retry="onBossRetry"
      @back="backToMap"
    />

    <!-- 答题 -->
    <section v-if="stage === 'play'" class="play">
      <div class="hud">
        <span>第 {{ idx + 1 }} / {{ questions.length }} 题</span>
        <span>得分 {{ score }}</span>
      </div>

      <div class="track">
        <div
          v-for="(q, i) in questions"
          :key="q.q"
          class="track__cell"
          :class="{
            'track__cell--past':  i < idx,
            'track__cell--now':   i === idx,
            'track__cell--right': i < idx && picked === q.answer,
          }"
        >
          <div class="track__number">{{ i + 1 }}</div>
        </div>
        <div class="track__hero" :style="{ left: ((idx + 0.5) / questions.length * 100) + '%' }">
          🧝‍♀️
        </div>
      </div>

      <div class="q">{{ current.q }}</div>

      <div class="options">
        <button
          v-for="o in current.options"
          :key="o"
          class="opt"
          :class="{
            'opt--picked':  picked === o,
            'opt--right':   showRight && o === current.answer,
            'opt--wrong':   showRight && picked === o && o !== current.answer,
          }"
          :disabled="showRight"
          @click="pick(o)"
        >
          {{ o }}
        </button>
      </div>
      <p class="hint">点击选答案</p>
    </section>

    <!-- 完成 -->
    <section v-if="stage === 'done'" class="done">
      <div class="trophy">🏆</div>
      <p class="verdict">
        <span v-if="score === questions.length">🎉 完美通关！曼曼安全抵达了终点。</span>
        <span v-else-if="score >= questions.length / 2">✈️ 曼曼越过了数王国！</span>
        <span v-else>🌱 曼曼被难题怪兽呛了下，下次再战。</span>
      </p>
      <p class="score">你答对了 <b>{{ score }}</b> / {{ questions.length }} 题</p>
      <button class="start-btn" @click="retry">回到大厅</button>
    </section>

    <footer class="foot">
      <a href="/">← 返回 EZAPPS 主页</a>
    </footer>
  </main>
</template>

<style scoped>
.math {
  max-width: 720px;
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
  background: #10b981;
  color: white;
  padding: 4px 12px;
  border-radius: 999px;
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
}
.hero h1 { font-size: 2.6rem; margin: 0 0 0.5rem; letter-spacing: -0.03em; }
.tag { font-size: 1.05rem; color: #059669; margin: 0 0 1rem; font-weight: 500; }

.lobby__portrait { font-size: 4.5rem; margin: 1.5rem 0; animation: bob 2s ease-in-out infinite; }
@keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }

.lobby__intro {
  color: #475569;
  line-height: 1.7;
  margin-bottom: 1.75rem;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
}

.start-btn {
  font-size: 1.1rem;
  font-weight: 600;
  padding: 0.85rem 2.5rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 12px 32px rgba(16, 185, 129, 0.3);
  transition: transform 0.15s, box-shadow 0.15s;
}
.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 40px rgba(16, 185, 129, 0.4);
}

.hint {
  margin-top: 1rem;
  color: #94a3b8;
  font-size: 0.85rem;
}

.play .hud {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-family: ui-monospace, monospace;
  font-size: 0.9rem;
  color: #475569;
}

.track {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-bottom: 2rem;
  padding: 1rem 0;
}
.track__cell {
  height: 32px;
  background: #e2e8f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.3s;
}
.track__cell--past { background: #d1fae5; color: #047857; }
.track__cell--now  { background: #6ee7b7; color: #064e3b; transform: scale(1.05); }
.track__hero {
  position: absolute;
  top: -28px;
  transform: translateX(-50%);
  font-size: 1.5rem;
  transition: left 0.5s ease;
}

.q {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 1.5rem 0 1.5rem;
  color: #064e3b;
  letter-spacing: -0.02em;
}

.options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.opt {
  padding: 1.25rem;
  font-size: 1.25rem;
  font-weight: 600;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.15s;
}
.opt:hover:not(:disabled) {
  border-color: #10b981;
  background: #f0fdf4;
}
.opt--picked  { border-color: #94a3b8; }
.opt--right   { background: #d1fae5; border-color: #059669; color: #064e3b; }
.opt--wrong   { background: #fee2e2; border-color: #ef4444; color: #7f1d1d; }
.opt:disabled { cursor: default; }

.done .trophy { font-size: 4rem; margin: 1.5rem 0; }
.done .verdict { font-size: 1.25rem; color: #0f172a; margin-bottom: 1rem; }
.done .score { color: #64748b; margin-bottom: 1.5rem; font-size: 1.1rem; }
.done .score b { color: #10b981; }

.foot { margin-top: 3rem; }
.foot a { color: #059669; text-decoration: none; font-weight: 500; }
</style>
