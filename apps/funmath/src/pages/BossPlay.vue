<script setup lang="ts">
// Boss 关卡答题页（支持两种模式）
// 1. standard（默认，九九乘法魔王 1-4）：
//    - 随机抽 N 道不重复题
//    - 答错：同题重来，最多 maxRetries 次
//    - 错满 3 次 = 失败
//
// 2. time（限时模式，速算之王 2-4）：
//    - 60 秒倒计时
//    - 答对 +1，答错直接跳下一题（不重出）
//    - 时间到立即结算
//    - 答对 ≥ required 道算通关

import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Boss, Question } from '../types'
import { chapters } from '../data/chapters'
import { bossQuestions } from '../data/bossQuestions'
import { questionMap } from '../data/questions'
import { withOptions } from '../utils/options'

interface Props {
  bossId: string           // '1-4-boss' | '2-4-boss'
}

interface Emits {
  (e: 'complete', result: { bossId: string; defeated: boolean; score: number; total: number }): void
  (e: 'back'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 查找 Boss 配置
const boss = computed<Boss | null>(() => {
  for (const ch of chapters) {
    if (ch.boss?.id === props.bossId) return ch.boss
  }
  return null
})

// Boss 模式
const bossMode = computed<'standard' | 'time'>(() => boss.value?.mode ?? 'standard')
const isTime = computed(() => bossMode.value === 'time')

// ==================== 题库准备 ====================
type QuestionWithOptions = Question & { options: number[] }

function buildPool(poolIds: string[]): Question[] {
  // 优先从 bossQuestions 找，否则从 questionMap 找
  return poolIds
    .map((id) => bossQuestions.find((q) => q.id === id) ?? questionMap[id])
    .filter(Boolean)
}

// ==================== standard 模式状态 ====================
const sessionQuestions = ref<QuestionWithOptions[]>([])
const idx = ref(0)
const retries = ref(0)
const hp = ref(3)
const picked = ref<number | null>(null)
const showRight = ref(false)
const wrongFlash = ref(false)

const total = computed(() => sessionQuestions.value.length)
const isLast = computed(() => idx.value === total.value - 1)
const current = computed(() => sessionQuestions.value[idx.value])

// ==================== time 模式状态 ====================
const timeLeft = ref(0)
const timeProgress = computed(() =>
  boss.value?.timeLimit ? Math.max(0, timeLeft.value / boss.value.timeLimit) : 0,
)
let timerId: number | null = null

// 初始化：从池中随机抽 required 道不重复题
function initSession() {
  if (!boss.value) return
  const pool = buildPool(boss.value.pool)
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  sessionQuestions.value = withOptions(shuffled.slice(0, boss.value.required))

  idx.value = 0
  retries.value = 0
  hp.value = 3
  picked.value = null
  showRight.value = false
  wrongFlash.value = false

  if (isTime.value) {
    startTimer()
  }
}

function startTimer() {
  if (!boss.value?.timeLimit) return
  timeLeft.value = boss.value.timeLimit
  timerId = window.setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      stopTimer()
      finish(timeScore.value >= (boss.value?.required ?? 0))
    }
  }, 1000)
}

function stopTimer() {
  if (timerId !== null) {
    clearInterval(timerId)
    timerId = null
  }
}

onMounted(() => {
  if (boss.value) initSession()
})

onUnmounted(() => {
  stopTimer()
})

// time 模式：当前已答对数（独立计分）
const timeScore = ref(0)

// ==================== 答题 ====================
function pick(o: number) {
  if (showRight.value || !current.value) return

  // time 模式：答错直接跳下一题，不暂停
  if (isTime.value) {
    const right = o === current.value.answer
    if (right) {
      timeScore.value++
    }
    // 直接进入下一题（不显示对错）
    setTimeout(() => {
      idx.value++
      picked.value = null
      // 没有更多题也立即结束
      if (idx.value >= total.value) {
        stopTimer()
        finish(timeScore.value >= (boss.value?.required ?? 0))
      }
    }, 200)
    return
  }

  // standard 模式：答对累加 score，答错走血量逻辑
  picked.value = o
  const right = o === current.value.answer
  if (right) {
    timeScore.value++  // 累计答对数
    showRight.value = true
    setTimeout(nextQuestion, 700)
  } else {
    wrongFlash.value = true
    retries.value++
    setTimeout(() => {
      if (retries.value >= (boss.value?.maxRetries ?? 3)) {
        finish(false)
        return
      }
      picked.value = null
      wrongFlash.value = false
    }, 1100)
  }
}

function nextQuestion() {
  if (isLast.value) {
    finish(true)
  } else {
    idx.value++
    retries.value = 0
    picked.value = null
    showRight.value = false
  }
}

function finish(defeated: boolean) {
  stopTimer()
  emit('complete', {
    bossId: props.bossId,
    defeated,
    score: timeScore.value,
    total: boss.value?.required ?? 0,
  })
}

function giveUp() {
  finish(false)
}

// HP 视觉：3 颗心，掉血时变灰
function heartClass(i: number) {
  return {
    'heart': true,
    'heart--lost': i >= hp.value,
  }
}

// 难度标签
const difficultyStars = computed(() => '⭐'.repeat(boss.value?.mode === 'time' ? 4 : 3))
</script>

<template>
  <div
    class="boss-play"
    :class="{ 'boss-play--time': isTime }"
    v-if="boss && sessionQuestions.length > 0"
  >
    <!-- 顶部 -->
    <header class="boss-play__head">
      <button class="back-btn" @click="$emit('back')" aria-label="返回地图">←</button>
      <div class="boss-play__title">
        <span class="boss-emoji">{{ boss.emoji }}</span>
        <h2>{{ boss.title }}</h2>
      </div>
      <button class="give-up" @click="giveUp" title="放弃">放弃</button>
    </header>

    <!-- Boss 信息栏 -->
    <div class="boss-info">
      <div class="boss-info__line">
        <span class="info-label">
          {{ isTime ? '⏱️ BOSS 战 (限时)' : '⚔️ BOSS 战' }}
        </span>
        <span class="info-pool">
          <span v-if="isTime">已答对 <b class="text-emerald">{{ timeScore }}</b> / {{ boss.required }} 道</span>
          <span v-else>题池：{{ boss.pool.length }} 道</span>
        </span>
      </div>

      <!-- 进度条（standard）/ 倒计时（time） -->
      <div class="boss-info__line">
        <span class="info-label">
          {{ isTime ? '⏳ 倒计时' : '📊 进度' }}
        </span>
        <div class="progress-bar" :class="{ 'progress-bar--time': isTime, 'progress-bar--warning': isTime && timeProgress < 0.3 }">
          <div
            class="progress-bar__fill"
            :style="{ width: ((isTime ? timeProgress : (idx + 1) / total) * 100) + '%' }"
          ></div>
        </div>
        <span class="info-progress">
          <span v-if="isTime">{{ timeLeft }}s</span>
          <span v-else>{{ idx + 1 }} / {{ total }}</span>
        </span>
      </div>

      <!-- 血量（standard only） -->
      <div v-if="!isTime" class="boss-info__line">
        <span class="info-label">❤️ 血量</span>
        <div class="hp">
          <span v-for="n in 3" :key="n" :class="heartClass(n - 1)">
            {{ n <= hp ? '❤️' : '🖤' }}
          </span>
        </div>
        <span class="info-hp">每题最多错 {{ boss.maxRetries }} 次</span>
      </div>
    </div>

    <!-- 题目 -->
    <div class="q" :class="{ 'q--wrong': wrongFlash }">{{ current.prompt }}</div>

    <!-- 选项 -->
    <div class="options">
      <button
        v-for="o in current.options"
        :key="o"
        class="opt"
        :class="{
          'opt--picked': picked === o,
          'opt--right':  !isTime && showRight && o === current.answer,
          'opt--wrong':  !isTime && wrongFlash && picked === o && o !== current.answer,
        }"
        :disabled="(showRight || wrongFlash) && !isTime"
        @click="pick(Number(o))"
      >
        {{ o }}
      </button>
    </div>

    <!-- 提示 -->
    <p v-if="!isTime && retries > 0 && !showRight && !wrongFlash" class="retry-hint">
      💡 第 {{ retries }} 次尝试，再想想「{{ current.hint }}」
    </p>
    <p v-else-if="isTime" class="time-hint">⚡ 限时模式 · 答错直接跳过</p>
    <p v-else class="hint">点击选答案</p>
  </div>

  <!-- Boss 不存在 -->
  <div v-else class="not-found">
    <p>😢 Boss 不存在</p>
    <button @click="$emit('back')">返回地图</button>
  </div>
</template>

<style scoped>
.boss-play {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #1a1a2e;
  text-align: center;
}

/* ===== 顶部 ===== */
.boss-play__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.back-btn, .give-up {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  color: #475569;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-family: inherit;
}
.back-btn:hover, .give-up:hover { background: #f1f5f9; }
.give-up { font-size: 0.85rem; }

.boss-play__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.boss-play__title h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.boss-emoji {
  font-size: 1.75rem;
  filter: drop-shadow(0 2px 8px rgba(245, 158, 11, 0.4));
}

/* ===== Boss 信息栏 ===== */
.boss-info {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid #f59e0b;
}

.boss-info__line {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  color: #78350f;
}
.boss-info__line:last-child { margin-bottom: 0; }

.info-label {
  font-weight: 700;
  min-width: 64px;
  text-align: left;
}

.info-pool { font-family: ui-monospace, monospace; font-size: 0.8rem; }
.text-emerald { color: #047857; font-size: 1rem; }

.progress-bar {
  flex: 1;
  height: 10px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 999px;
  overflow: hidden;
  position: relative;
}
.progress-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #d97706);
  transition: width 0.5s ease;
}
.progress-bar--time .progress-bar__fill {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}
.progress-bar--warning .progress-bar__fill {
  animation: pulse-warn 1s ease-in-out infinite;
}
@keyframes pulse-warn {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.info-progress {
  font-family: ui-monospace, monospace;
  font-weight: 700;
  min-width: 48px;
}

.hp {
  display: flex;
  gap: 0.25rem;
  font-size: 1.2rem;
}

.heart {
  display: inline-block;
  transition: transform 0.3s;
}
.heart--lost {
  opacity: 0.4;
  transform: scale(0.85);
}

.info-hp {
  font-size: 0.75rem;
  color: #92400e;
  opacity: 0.8;
}

/* ===== 题目 ===== */
.q {
  font-size: 2.6rem;
  font-weight: 700;
  margin: 2rem 0 1.5rem;
  color: #064e3b;
  letter-spacing: -0.02em;
  transition: all 0.15s;
}

.q--wrong {
  animation: shake 0.4s;
  color: #dc2626;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-10px); }
  40% { transform: translateX(10px); }
  60% { transform: translateX(-8px); }
  80% { transform: translateX(8px); }
}

/* ===== 选项 ===== */
.options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.opt {
  padding: 1.25rem;
  font-size: 1.4rem;
  font-weight: 700;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.opt:hover:not(:disabled) {
  border-color: #f59e0b;
  background: #fffbeb;
}
.opt--picked { border-color: #94a3b8; }
.opt--right  { background: #d1fae5; border-color: #059669; color: #064e3b; }
.opt--wrong  { background: #fee2e2; border-color: #ef4444; color: #7f1d1d; }
.opt:disabled { cursor: default; }

.hint, .retry-hint, .time-hint {
  margin-top: 1rem;
  color: #94a3b8;
  font-size: 0.9rem;
}
.retry-hint { color: #d97706; font-weight: 600; }
.time-hint { color: #dc2626; font-weight: 600; }

.not-found {
  text-align: center;
  padding: 4rem 1rem;
}
.not-found button {
  background: #10b981;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
}
</style>