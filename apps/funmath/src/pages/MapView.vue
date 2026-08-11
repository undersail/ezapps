<script setup lang="ts">
// 关卡地图视图
// 展示所有章节、关卡、Boss，呈现解锁/通关状态

import { computed } from 'vue'
import { chapters } from '../data/chapters'
import type { Chapter, Level, LevelStatus } from '../types'
import LevelCard from '../components/LevelCard.vue'
import { useGameProgress, isChapterUnlocked } from '../composables/useGameProgress'

defineEmits<{
  (e: 'enter-level', levelId: string): void
  (e: 'enter-boss', bossId: string): void
  (e: 'back'): void
}>()

// 使用进度管理（localStorage 持久化）
const progress = useGameProgress()

/**
 * 章节解锁状态
 * 第一章：unlock = 'free' → 默认解锁
 * 其它章节：需击败前一章 Boss
 */
function getChapterStatus(chapter: Chapter): 'unlocked' | 'locked' {
  return isChapterUnlocked(chapter.unlock, progress.isBossDefeated) ? 'unlocked' : 'locked'
}

/**
 * 关卡解锁状态
 * - 章节锁定 → 关卡锁定
 * - 已通过 → passed（显示星级）
 * - order=1 → 默认解锁
 * - 其余关 → 同章节内 order 最接近的前一关通过即可
 * Boss 是独立支线，不影响普通关解锁
 */
function getLevelStatus(level: Level, chapterStatus: 'unlocked' | 'locked'): LevelStatus {
  if (chapterStatus === 'locked') return 'locked'
  if (progress.isLevelPassed(level.id)) return 'passed'
  if (level.order === 1) return 'unlocked'

  // 在同章节内找 order 最大且 < 当前 order 的关卡（处理 Boss 跳号场景）
  const chapter = chapters.find((c) => c.id === level.chapter)
  if (!chapter) return 'unlocked'

  const prevCandidates = chapter.levels
    .filter((l) => l.order < level.order)
    .sort((a, b) => b.order - a.order)

  if (prevCandidates.length === 0) return 'unlocked'
  const prev = prevCandidates[0]
  return progress.isLevelPassed(prev.id) ? 'unlocked' : 'locked'
}

function getBossStatus(chapter: Chapter, chapterStatus: 'unlocked' | 'locked'): LevelStatus {
  if (chapterStatus === 'locked' || !chapter.boss) return 'locked'
  if (progress.isBossDefeated(chapter.boss.id)) return 'passed'
  // Boss 解锁条件：本章最后一个普通关通关
  const lastLevel = chapter.levels
    .slice()
    .sort((a, b) => b.order - a.order)[0]
  if (!lastLevel) return 'unlocked'
  return progress.isLevelPassed(lastLevel.id) ? 'unlocked' : 'locked'
}

// 总星星统计（响应式）
const totalStars = computed(() => progress.state.value.totalStars)

// 第一章最大星 = 4 关 × 3 星 = 12（不含 Boss）
const maxStars = computed(() => {
  // 简化：第一章可玩部分 4 关 × 3 = 12
  return 12
})
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
            :stars="progress.getLevelStars(level.id)"
            @click="(id) => $emit('enter-level', id)"
          />

          <!-- Boss 关卡（特殊位置） -->
          <LevelCard
            v-if="chapter.boss"
            :level="{
              id: chapter.boss.id,
              chapter: chapter.id,
              order: chapter.boss.order,
              title: chapter.boss.title,
              emoji: chapter.boss.emoji,
              knowledge: `需掌握 ${chapter.boss.required} 道`,
              difficulty: 3,
              questionIds: chapter.boss.pool,
              passScore: chapter.boss.required,
            }"
            :status="getBossStatus(chapter, 'unlocked')"
            :stars="progress.getLevelStars(chapter.boss.id)"
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