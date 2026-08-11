<script setup lang="ts">
// 关卡地图视图
// 展示所有章节、关卡、Boss，呈现解锁/通关状态

import { computed } from 'vue'
import { chapters } from '../data/chapters'
import type { Chapter, Level, LevelStatus } from '../types'
import LevelCard from '../components/LevelCard.vue'

defineEmits<{
  (e: 'enter-level', levelId: string): void
  (e: 'enter-boss', bossId: string): void
  (e: 'back'): void
}>()

/**
 * 计算每个关卡的进度状态（mock 阶段：硬编码）
 * 真实进度后续从 useGameProgress 获取
 */
const mockStars: Record<string, 0 | 1 | 2 | 3> = {
  '1-1': 3,        // 3 星通关
  '1-2': 2,        // 2 星通关
  '1-3': 1,        // 1 星通关
  '1-4-boss': 0,   // Boss 未通关
  '1-5': 0,        // 未解锁
}

function getStars(id: string): 0 | 1 | 2 | 3 {
  return mockStars[id] ?? 0
}

function isPassed(id: string): boolean {
  return mockStars[id] > 0
}

/**
 * 关卡解锁判定
 * 第一章普通关：默认全部解锁（mock 阶段）
 * 章节解锁：默认仅第一章解锁
 */
function getChapterStatus(chapter: Chapter): 'unlocked' | 'locked' {
  if (chapter.unlock === 'free') return 'unlocked'
  // mock 阶段：只有第一章解锁
  return chapter.id === 1 ? 'unlocked' : 'locked'
}

function getLevelStatus(level: Level, chapterStatus: 'unlocked' | 'locked'): LevelStatus {
  if (chapterStatus === 'locked') return 'locked'
  // 第一章 mock：1-1/1-2/1-3 已通关（解锁），Boss 之后的 1-5 锁定
  const stars = getStars(level.id)
  if (stars > 0) return 'passed'
  // Boss 后的关卡锁定：1-5 在 1-4-boss 通关前锁定
  if (level.id === '1-5' && mockStars['1-4-boss'] === 0) return 'locked'
  return 'unlocked'
}

function getBossStatus(chapter: Chapter, chapterStatus: 'unlocked' | 'locked'): LevelStatus {
  if (chapterStatus === 'locked' || !chapter.boss) return 'locked'
  const stars = getStars(chapter.boss.id)
  if (stars > 0) return 'passed'
  // Boss 解锁条件：前一关通关（这里 mock：1-3 通关就解锁）
  return 'unlocked'
}

// 总星星统计
const totalStars = computed(() => {
  let sum = 0
  Object.values(mockStars).forEach((s) => (sum += s))
  return sum
})

const maxStars = computed(() => {
  // 第一章：4 关 × 3 星 + 1 Boss（不算星级）
  return 12
})

// Boss 是否需要在关卡列表里特殊位置展示
function bossAsCard(chapter: Chapter) {
  return chapter.boss
}
</script>

<template>
  <div class="map">
    <!-- 顶部 HUD -->
    <header class="map__head">
      <button class="back-btn" @click="$emit('back')" aria-label="返回大厅">←</button>
      <div class="map__title">
        <span class="map__emoji">🗺️</span>
        <h2>关卡地图</h2>
      </div>
      <div class="map__hud">
        <span class="stars-icon">⭐</span>
        <span class="stars-text">{{ totalStars }} / {{ maxStars }}</span>
      </div>
    </header>

    <!-- 章节列表 -->
    <div class="chapters">
      <section
        v-for="chapter in chapters"
        :key="chapter.id"
        class="chapter"
        :class="{ 'chapter--locked': getChapterStatus(chapter) === 'locked' }"
      >
        <header class="chapter__head">
          <span class="chapter__emoji">{{ chapter.emoji }}</span>
          <div class="chapter__title">
            <h3>第 {{ chapter.id }} 章 · {{ chapter.title }}</h3>
            <p>{{ chapter.subtitle }}</p>
          </div>
          <span v-if="getChapterStatus(chapter) === 'locked'" class="chapter__lock">🔒</span>
        </header>

        <!-- 已解锁章节：展示关卡 -->
        <div v-if="getChapterStatus(chapter) === 'unlocked'" class="levels">
          <LevelCard
            v-for="level in chapter.levels"
            :key="level.id"
            :level="level"
            :status="getLevelStatus(level, 'unlocked')"
            :stars="getStars(level.id)"
            @click="(id) => $emit('enter-level', id)"
          />

          <!-- Boss 关卡（特殊位置） -->
          <LevelCard
            v-if="bossAsCard(chapter)"
            :level="{
              id: chapter.boss!.id,
              chapter: chapter.id,
              order: chapter.boss!.order,
              title: chapter.boss!.title,
              emoji: chapter.boss!.emoji,
              knowledge: `需掌握 ${chapter.boss!.required} 道`,
              difficulty: 3,
              questionIds: chapter.boss!.pool,
              passScore: chapter.boss!.required,
            }"
            :status="getBossStatus(chapter, 'unlocked')"
            :stars="getStars(chapter.boss!.id)"
            is-boss
            @click="(id) => $emit('enter-boss', id)"
          />
        </div>

        <!-- 锁定章节占位 -->
        <div v-else class="levels--placeholder">
          <div class="placeholder-card">
            <span class="placeholder-icon">🔒</span>
            <p>解锁条件：{{ chapter.id === 2 ? '击败 Boss 1-4' : `击败 第 ${chapter.id - 1} 章 Boss` }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.map {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #1a1a2e;
}

/* ===== 顶部 HUD ===== */
.map__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding: 0 0.5rem;
}

.back-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #475569;
  padding: 0.5rem;
  border-radius: 8px;
  transition: background 0.15s;
}
.back-btn:hover { background: #f1f5f9; }

.map__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.map__title h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}
.map__emoji { font-size: 1.5rem; }

.map__hud {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.9rem;
  color: #92400e;
}
.stars-icon { font-size: 1rem; }
.stars-text { font-family: ui-monospace, monospace; }

/* ===== 章节 ===== */
.chapters {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.chapter {
  background: white;
  border-radius: 16px;
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
}

.chapter--locked {
  background: #f8fafc;
  border-color: #e2e8f0;
  opacity: 0.85;
}

.chapter__head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f1f5f9;
}

.chapter__emoji {
  font-size: 2rem;
  line-height: 1;
}

.chapter__title {
  flex: 1;
}
.chapter__title h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}
.chapter__title p {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  color: #94a3b8;
}

.chapter__lock {
  font-size: 1.25rem;
  opacity: 0.6;
}

/* ===== 关卡网格 ===== */
.levels {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

/* 锁定占位 */
.levels--placeholder {
  padding: 1.5rem;
  text-align: center;
}
.placeholder-card {
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  padding: 1.5rem;
  color: #94a3b8;
}
.placeholder-icon {
  font-size: 1.5rem;
  display: block;
  margin-bottom: 0.5rem;
  opacity: 0.5;
}
.placeholder-card p {
  margin: 0;
  font-size: 0.85rem;
}

/* ===== 响应式 ===== */
@media (max-width: 600px) {
  .levels {
    grid-template-columns: repeat(2, 1fr);
  }
  .map { padding: 1.5rem 0.75rem 3rem; }
}
</style>