<script setup lang="ts">
import { ref, computed, watch, onErrorCaptured } from 'vue'
import MapView from './pages/MapView.vue'
import LevelPlay from './pages/LevelPlay.vue'
import LevelResult from './pages/LevelResult.vue'
import BossPlay from './pages/BossPlay.vue'
import StoryTransition from './components/StoryTransition.vue'
import ErrorFallback from './components/ErrorFallback.vue'
import { useGameProgress } from './composables/useGameProgress'
import { useSound } from './composables/useSound'
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

// 阶段机：lobby(模式选择) / map / level / levelResult / boss / bossResult / play/done
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
const lastBossResult = ref<{ bossId: string; defeated: boolean; score: number; total: number } | null>(null)

// ================ 模式系统（故事模式 / 自由闯关）================
const mode = ref<'story' | 'free'>('story')

// 故事模式过场
const storyShow = ref(false)
const storyTitle = ref('')
const storyText = ref('')
const storyEmoji = ref('✨')

// 进度管理
const progress = useGameProgress()
const sound = useSound()

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

// 是否存在下一关（普通关 / Boss / 下一章）
// 包括：1) 中间普通关（order > 当前 && order < Boss.order）
//       2) 本章 Boss（如果 Boss 未通关）
const hasNextLevel = computed(() => {
  if (!currentLevelId.value) return false
  const cur = currentLevelInfo.value
  if (!cur) return false

  const bossOrder = cur.chapter.boss?.order ?? Infinity

  // 中间普通关
  const nextLv = cur.chapter.levels.find(
    (l) => l.order > cur.level.order && l.order < bossOrder,
  )
  if (nextLv) return true

  // Boss（未通关才视为"下一关"）
  const boss = cur.chapter.boss
  if (boss && boss.order > cur.level.order && !progress.isBossDefeated(boss.id)) {
    return true
  }

  return false
})

// Boss 完成后是否有下一关（普通关，如 1-5 / 2-5）
const hasNextAfterBoss = computed(() => {
  if (!currentBossId.value) return false
  const cur = currentBossInfo.value
  if (!cur) return false
  const nextLv = cur.chapter.levels.find((l) => l.order > cur.boss.order)
  return !!nextLv
})

// ================ 大厅进度统计 ================
/** 已通关关卡数（含所有章节） */
const passedLevelCount = computed(() => {
  let count = 0
  for (const ch of chapters) {
    for (const lv of ch.levels) {
      if (progress.isLevelPassed(lv.id)) count++
    }
  }
  return count
})

/** 总关卡数（含所有已实现章节，普通关） */
const totalLevelCount = computed(() => {
  let count = 0
  for (const ch of chapters) {
    count += ch.levels.length
  }
  return count
})

/** 已击败 Boss 数 */
const defeatedBossCount = computed(() => {
  let count = 0
  for (const ch of chapters) {
    if (ch.boss && progress.isBossDefeated(ch.boss.id)) count++
  }
  return count
})

/** 已解锁章节数 */
const unlockedChapterCount = computed(() => {
  let count = 0
  for (const ch of chapters) {
    if (ch.unlock === 'free' || progress.isBossDefeated(
      typeof ch.unlock === 'object' ? ch.unlock.boss : ''
    )) {
      count++
    }
  }
  return count
})

// ==================== 模式选择 ====================
function enterMode(m: 'story' | 'free') {
  mode.value = m
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

  // 故事模式：进入关卡前显示剧情过场
  if (mode.value === 'story') {
    const lv = currentLevelInfo.value?.level
    if (lv) {
      showStory(lv.emoji, lv.title, lv.story || `曼曼来到「${lv.title}」，展开新的冒险……`)
    }
  }
  stage.value = 'level'
}

function showStory(emoji: string, title: string, text: string) {
  storyEmoji.value = emoji
  storyTitle.value = title
  storyText.value = text
  storyShow.value = true
}

function onStoryDone() {
  storyShow.value = false
}

function onLevelComplete(result: { score: number; total: number; stars: 0 | 1 | 2 | 3; levelId: string }) {
  progress.recordLevelComplete(result.levelId, result.score, result.total, result.stars)
  lastResult.value = result
  stage.value = 'levelResult'
}

function onLevelRetry() {
  if (!currentLevelId.value) return
  const id = currentLevelId.value
  currentLevelId.value = null
  lastResult.value = null
  onEnterLevel(id)
}

function onLevelNext() {
  if (!currentLevelId.value) return
  const cur = currentLevelInfo.value
  if (!cur) return

  const bossOrder = cur.chapter.boss?.order ?? Infinity

  // 1. 优先找中间普通关（order > 当前 && order < Boss.order）
  const nextLv = cur.chapter.levels.find(
    (l) => l.order > cur.level.order && l.order < bossOrder,
  )
  if (nextLv) {
    onEnterLevel(nextLv.id)
    return
  }

  // 2. 没有中间关，看 Boss（未通关则跳）
  const boss = cur.chapter.boss
  if (boss && boss.order > cur.level.order && !progress.isBossDefeated(boss.id)) {
    onEnterBoss(boss.id)
    return
  }

  // 3. 都没了 → 返回地图
  backToMap()
}

function onBossNext() {
  if (!currentBossId.value) return
  const cur = currentBossInfo.value
  if (!cur) return
  // Boss 完成后找 order > Boss.order 的关卡（奖励关）
  const nextLv = cur.chapter.levels.find((l) => l.order > cur.boss.order)
  if (nextLv) onEnterLevel(nextLv.id)
  else backToMap()
}

// ==================== Boss 关卡 ====================
function onEnterBoss(bossId: string) {
  currentBossId.value = bossId

  // 故事模式：进入 Boss 前显示剧情
  if (mode.value === 'story') {
    const bossInfo = currentBossInfo.value
    if (bossInfo) {
      showStory(
        bossInfo.boss.emoji,
        bossInfo.boss.title,
        bossInfo.boss.story || `曼曼面前站着强大的「${bossInfo.boss.title}」……`
      )
    }
  }
  stage.value = 'boss'
}

function onBossComplete(result: { bossId: string; defeated: boolean; score: number; total: number }) {
  if (result.defeated) {
    progress.recordBossDefeat(result.bossId)
  } else {
    progress.recordBossAttempt(result.bossId)
  }
  lastBossResult.value = result
  stage.value = 'bossResult'

  // 故事模式：Boss 通关后显示胜利剧情 + 章节解锁音效
  if (result.defeated && mode.value === 'story') {
    setTimeout(() => {
      const bossInfo = currentBossInfo.value
      if (bossInfo) {
        showStory(
          '🌟',
          '恭喜胜利！',
          `曼曼战胜了「${bossInfo.boss.title}」，获得了新的力量！`
        )
      }
      // 章节解锁音效
      sound.play('unlock')
    }, 200)
  } else if (result.defeated) {
    // 非故事模式：Boss 通关时也播放 unlock 提示（章节解锁）
    sound.play('unlock')
  }
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

// 子组件错误捕获（防止单个组件崩溃导致整个 App 白屏）
const childError = ref<Error | null>(null)
onErrorCaptured((err) => {
  console.error('[App onErrorCaptured]', err)
  childError.value = err as Error
  ;(window as any).__funmathLastError = err
  try {
    localStorage.setItem('funmath:lastError', String((err as Error)?.message ?? err))
    setTimeout(() => localStorage.removeItem('funmath:lastError'), 6000)
  } catch {}
  return false
})
</script>

<template>
  <!-- 错误降级 UI：子组件崩溃时显示 -->
  <ErrorFallback v-if="childError" />
  <main v-else class="math">
    <header class="hero">
      <div class="badge">BETA · FunMath Adventure</div>
      <h1>📐 曼曼闯天涯</h1>
      <p class="tag">曼曼在数学王国里闯关，答对一题前进一格。</p>
    </header>

    <!-- 大厅：模式选择（特性 8） -->
    <section v-if="stage === 'lobby'" class="lobby">
      <div class="lobby__portrait">🧝‍♀️</div>
      <p class="lobby__intro">
        曼曼又要出发啦！这次她将翻越高山、穿越数海，<br />
        一路打败九九魔王、速算之王。准备好一起冒险了吗？
      </p>

      <div class="mode-cards">
        <button class="mode-card mode-card--story" @click="enterMode('story')">
          <span class="mode-card__emoji">📖</span>
          <h3 class="mode-card__title">故事模式</h3>
          <p class="mode-card__desc">跟着曼曼的冒险剧情<br />逐步解锁章节与 Boss</p>
        </button>

        <button class="mode-card mode-card--free" @click="enterMode('free')">
          <span class="mode-card__emoji">🗺️</span>
          <h3 class="mode-card__title">自由闯关</h3>
          <p class="mode-card__desc">选择已解锁的任意关卡<br />自由练习、刷分、复习</p>
        </button>
      </div>

      <!-- 进度统计 -->
      <div class="progress-stats">
        <div class="stat">
          <span class="stat__icon">⭐</span>
          <span class="stat__num">{{ progress.state.value.totalStars }}</span>
          <span class="stat__label">总星数</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat">
          <span class="stat__icon">📚</span>
          <span class="stat__num">{{ passedLevelCount }} / {{ totalLevelCount }}</span>
          <span class="stat__label">关卡</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat">
          <span class="stat__icon">👑</span>
          <span class="stat__num">{{ defeatedBossCount }}</span>
          <span class="stat__label">Boss</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat">
          <span class="stat__icon">🏰</span>
          <span class="stat__num">{{ unlockedChapterCount }} / 6</span>
          <span class="stat__label">章节</span>
        </div>
      </div>

      <!-- 音效开关 -->
      <button
        class="sound-toggle"
        :class="{ 'sound-toggle--off': !sound.enabled }"
        :aria-label="sound.enabled ? '关闭音效' : '开启音效'"
        @click="sound.toggle"
      >
        <span class="sound-toggle__icon">{{ sound.enabled ? '🔊' : '🔇' }}</span>
        <span class="sound-toggle__label">{{ sound.enabled ? '音效开' : '音效关' }}</span>
      </button>
    </section>

    <!-- 关卡地图（特性 1 + 5） -->
    <MapView
      v-else-if="stage === 'map'"
      :mode="mode"
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
        score: lastBossResult.score,
        total: lastBossResult.total,
        stars: lastBossResult.defeated ? 3 : 0,
      }"
      :level-title="currentBossInfo.boss.title"
      :level-emoji="currentBossInfo.boss.emoji"
      :has-next="hasNextAfterBoss && lastBossResult.defeated"
      :required="currentBossInfo.boss.required"
      @retry="onBossRetry"
      @back="backToMap"
      @next="onBossNext"
    />

    <!-- 故事模式过场（特性 8） -->
    <StoryTransition
      :show="storyShow"
      :title="storyTitle"
      :text="storyText"
      :emoji="storyEmoji"
      @done="onStoryDone"
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
.hero { margin-bottom: 1.5rem; }
.badge {
  display: inline-block;
  font-size: 0.75rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 4px 12px;
  border-radius: 999px;
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}
.hero h1 {
  font-size: 2.8rem;
  margin: 0 0 0.5rem;
  letter-spacing: -0.03em;
  font-weight: 800;
  background: linear-gradient(135deg, #064e3b 0%, #047857 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.tag { font-size: 1rem; color: #059669; margin: 0 0 0.5rem; font-weight: 500; }

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

/* ===== 模式选择卡片 ===== */
.mode-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  max-width: 560px;
  margin: 0 auto 1.5rem;
}

.mode-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.5rem 1rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  color: #1e293b;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.mode-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
}

.mode-card--story:hover { border-color: #10b981; }
.mode-card--free:hover { border-color: #3b82f6; }

.mode-card__emoji {
  font-size: 2.5rem;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.mode-card__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #0f172a;
}

.mode-card--story .mode-card__title { color: #047857; }
.mode-card--free .mode-card__title { color: #1d4ed8; }

.mode-card__desc {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.5;
  text-align: center;
}

@media (max-width: 480px) {
  .mode-cards {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
}

/* ===== 进度统计 ===== */
.progress-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  max-width: 560px;
  margin: 1.5rem auto 0;
  padding: 1rem 1.25rem;
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}

.stat__icon {
  font-size: 1.5rem;
  line-height: 1;
}

.stat__num {
  font-size: 1.15rem;
  font-weight: 800;
  color: #0f172a;
  font-family: ui-monospace, monospace;
  line-height: 1;
  margin-top: 0.25rem;
}

.stat__label {
  font-size: 0.7rem;
  color: #94a3b8;
  letter-spacing: 0.1em;
  margin-top: 0.15rem;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: #e2e8f0;
}

@media (max-width: 480px) {
  .progress-stats {
    gap: 0.5rem;
    padding: 0.75rem;
  }
  .stat__icon { font-size: 1.2rem; }
  .stat__num { font-size: 1rem; }
  .stat__label { font-size: 0.65rem; }
}

/* ===== 音效开关 ===== */
.sound-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  margin: 1rem auto 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.85rem;
  color: #475569;
  transition: all 0.15s;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}
.sound-toggle:hover {
  border-color: #10b981;
  background: #f0fdf4;
}
.sound-toggle--off {
  opacity: 0.7;
  background: #f8fafc;
}
.sound-toggle__icon {
  font-size: 1.1rem;
  line-height: 1;
}
.sound-toggle__label {
  font-weight: 500;
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
