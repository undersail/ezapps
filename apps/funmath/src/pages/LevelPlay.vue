<script setup lang="ts">
// 普通关卡答题页（基于 V0 改造，支持多关卡题库）
// 完成时回调：emit('complete', { score, total, stars, levelId })

import { ref, computed, onMounted } from 'vue'
import type { Level, Question } from '../types'
import { chapters } from '../data/chapters'
import { getQuestionsByIds } from '../data/questions'

interface Props {
  levelId: string           // '1-1' / '1-2' ...
}

interface Emits {
  (e: 'complete', result: { score: number; total: number; stars: 0 | 1 | 2 | 3; levelId: string }): void
  (e: 'back'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 查找关卡配置
const level = computed<Level | null>(() => {
  for (const ch of chapters) {
    const lv = ch.levels.find((l) => l.id === props.levelId)
    if (lv) return lv
  }
  return null
})

// 该关卡的题库
const levelQuestions = computed<Question[]>(() => {
  if (!level.value) return []
  return getQuestionsByIds(level.value.questionIds)
})

// ==================== 状态 ====================
const idx = ref(0)
const score = ref(0)
const picked = ref<number | null>(null)
const showRight = ref(false)

const current = computed(() => levelQuestions.value[idx.value])
const total = computed(() => levelQuestions.value.length)
const isLast = computed(() => idx.value === total.value - 1)

// ==================== 行为 ====================
function pick(o: number) {
  if (showRight.value || !current.value) return
  picked.value = o
  const right = o === current.value.answer
  if (right) score.value++
  showRight.value = true
  setTimeout(next, 900)
}

function next() {
  if (!isLast.value) {
    idx.value++
    picked.value = null
    showRight.value = false
  } else {
    finish()
  }
}

function finish() {
  if (!level.value) return
  // 计算星级：100%=3星，>=80%=2星，>=passScore=1星，否则 0 星（失败）
  const correct = score.value
  const tot = total.value
  let stars: 0 | 1 | 2 | 3 = 0
  if (correct === tot) stars = 3
  else if (correct >= tot * 0.8) stars = 2
  else if (correct >= level.value.passScore) stars = 1
  else stars = 0
  emit('complete', { score: score.value, total: tot, stars, levelId: props.levelId })
}

// 进度轨 cell 状态
function cellClass(i: number) {
  return {
    'track__cell': true,
    'track__cell--past': i < idx.value,
    'track__cell--now': i === idx.value,
  }
}

const heroLeftStyle = computed(() => ({
  left: total.value > 0 ? ((idx.value + 0.5) / total.value * 100) + '%' : '0%',
}))

// 难度标签
const difficultyStars = computed(() => '⭐'.repeat(level.value?.difficulty ?? 0))
</script>

<template>
  <div class="level-play" v-if="level && levelQuestions.length > 0">
    <!-- 顶部 HUD -->
    <header class="level-play__head">
      <button class="back-btn" @click="$emit('back')" aria-label="返回地图">←</button>
      <div class="level-play__title">
        <span class="emoji">{{ level.emoji }}</span>
        <h2>{{ level.title }}</h2>
      </div>
      <div class="level-play__difficulty">{{ difficultyStars }}</div>
    </header>

    <!-- 关卡知识点提示 -->
    <p class="level-play__knowledge">📚 {{ level.knowledge }}</p>

    <!-- 进度 HUD -->
    <div class="hud">
      <span>第 {{ idx + 1 }} / {{ total }} 题</span>
      <span>得分 {{ score }}</span>
    </div>

    <!-- 进度轨 + 曼曼 -->
    <div class="track">
      <div
        v-for="(_, i) in levelQuestions"
        :key="i"
        :class="cellClass(i)"
      >
        <div class="track__number">{{ i + 1 }}</div>
      </div>
      <div class="track__hero" :style="heroLeftStyle">🧝‍♀️</div>
    </div>

    <!-- 题目 -->
    <div class="q">{{ current.prompt }}</div>

    <!-- 选项 -->
    <div class="options">
      <button
        v-for="o in current.options"
        :key="o"
        class="opt"
        :class="{
          'opt--picked': picked === o,
          'opt--right':  showRight && o === current.answer,
          'opt--wrong':  showRight && picked === o && o !== current.answer,
        }"
        :disabled="showRight"
        @click="pick(Number(o))"
      >
        {{ o }}
      </button>
    </div>

    <p class="hint">点击选答案</p>
  </div>

  <!-- 关卡未找到 -->
  <div v-else class="not-found">
    <p>😢 关卡不存在</p>
    <button @click="$emit('back')">返回地图</button>
  </div>
</template>

<style scoped>
.level-play {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #1a1a2e;
  text-align: center;
}

/* ===== 顶部 ===== */
.level-play__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}
.back-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #475569;
  padding: 0.5rem;
  border-radius: 8px;
}
.back-btn:hover { background: #f1f5f9; }

.level-play__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  justify-content: center;
}
.level-play__title h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}
.emoji { font-size: 1.5rem; }

.level-play__difficulty {
  font-size: 0.8rem;
  color: #f59e0b;
  letter-spacing: 0.15em;
}

.level-play__knowledge {
  display: inline-block;
  background: #ecfdf5;
  color: #047857;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  margin: 0 auto 1.5rem;
}

/* ===== HUD ===== */
.hud {
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

/* ===== 进度轨 ===== */
.track {
  position: relative;
  display: grid;
  grid-template-columns: repeat(v-bind(total), 1fr);
  gap: 0.5rem;
  margin-bottom: 2rem;
  padding: 1.5rem 0 0.5rem;
}

.track__cell {
  height: 28px;
  background: #e2e8f0;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.75rem;
  transition: all 0.3s;
}
.track__cell--past { background: #d1fae5; color: #047857; }
.track__cell--now  { background: #6ee7b7; color: #064e3b; transform: scale(1.05); }
.track__hero {
  position: absolute;
  top: -4px;
  transform: translateX(-50%);
  font-size: 1.5rem;
  transition: left 0.5s ease;
}

/* ===== 题目 ===== */
.q {
  font-size: 2.4rem;
  font-weight: 700;
  margin: 1.5rem 0 1.5rem;
  color: #064e3b;
  letter-spacing: -0.02em;
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
  font-size: 1.25rem;
  font-weight: 600;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.opt:hover:not(:disabled) {
  border-color: #10b981;
  background: #f0fdf4;
}
.opt--picked { border-color: #94a3b8; }
.opt--right  { background: #d1fae5; border-color: #059669; color: #064e3b; }
.opt--wrong  { background: #fee2e2; border-color: #ef4444; color: #7f1d1d; }
.opt:disabled { cursor: default; }

.hint {
  margin-top: 1rem;
  color: #94a3b8;
  font-size: 0.85rem;
}

/* ===== 关卡未找到 ===== */
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