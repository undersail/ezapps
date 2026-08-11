<script setup lang="ts">
// 关卡地图视图
// 展示所有章节、关卡、Boss，呈现解锁/通关状态
// mode = 'story' | 'free' 控制展示策略

import { computed } from 'vue'
import { chapters } from '../data/chapters'
import type { Chapter, Level, LevelStatus } from '../types'
import LevelCard from '../components/LevelCard.vue'
import { useGameProgress, isChapterUnlocked } from '../composables/useGameProgress'

interface Props {
  mode?: 'story' | 'free'   // 默认 'story'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'story',
})

defineEmits<{
  (e: 'enter-level', levelId: string): void
  (e: 'enter-boss', bossId: string): void
  (e: 'back'): void
}>()

// 使用进度管理（localStorage 持久化）
const progress = useGameProgress()

/**
 * 当前章节（故事模式）：
 * - 最大已解锁章节
 * - 第一次玩默认第一章
 */
const currentChapterId = computed(() => {
  // 从大到小遍历章节，找第一个已解锁的
  for (let i = chapters.length - 1; i >= 0; i--) {
    if (isChapterUnlocked(chapters[i].unlock, progress.isBossDefeated)) {
      return chapters[i].id
    }
  }
  return 1
})

/**
 * 章节是否被折叠（仅故事模式折叠非当前章节）
 */
function isChapterCollapsed(chapter: Chapter): boolean {
  if (props.mode !== 'story') return false
  return chapter.id !== currentChapterId.value
}

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
 * 规则：
 *   1. 章节锁定 → 关卡锁定
 *   2. 已通关 → passed（显示星级）
 *   3. order=1 → 默认解锁
 *   4. 最后一个普通关（maxOrder）→ 需 Boss 通关（这是 Boss 后的"奖励关"）
 *   5. 其余关 → order-1 的关卡通关即可
 *   兜底：order 跳号（如 Boss 占位）→ 找 order 最大且 < 自身的关卡
 *
 * Boss 自身由 getBossStatus 处理。
 */
function getLevelStatus(level: Level, chapterStatus: 'unlocked' | 'locked'): LevelStatus {
  if (chapterStatus === 'locked') return 'locked'
  if (progress.isLevelPassed(level.id)) return 'passed'

  const chapter = chapters.find((c) => c.id === level.chapter)
  if (!chapter) return 'unlocked'

  // order=1 默认解锁
  if (level.order === 1) return 'unlocked'

  // 最后一个普通关（order 最大）需要 Boss 通关
  const maxLevelOrder = Math.max(...chapter.levels.map((l) => l.order))
  if (level.order === maxLevelOrder && chapter.boss) {
    return progress.isBossDefeated(chapter.boss.id) ? 'unlocked' : 'locked'
  }

  // 其余关：前一关通关即可（order-1）
  const prevLevel = chapter.levels.find((l) => l.order === level.order - 1)
  if (prevLevel) {
    return progress.isLevelPassed(prevLevel.id) ? 'unlocked' : 'locked'
  }

  // 兜底：order 跳号（如 Boss 占位导致 1-5 的 order=4 但 1-4 是 Boss）
  // 找 order 最大且 < current 的关卡
  const fallback = chapter.levels
    .filter((l) => l.order < level.order)
    .sort((a, b) => b.order - a.order)[0]
  if (!fallback) return 'unlocked'
  return progress.isLevelPassed(fallback.id) ? 'unlocked' : 'locked'
}

/**
 * Boss 解锁状态
 * 规则：Boss 解锁 = 同章节内 order < Boss.order 的关卡中 order 最大的那个通关
 *      （即 Boss 的"前一关"，通常是最后一个基础关）
 */
function getBossStatus(chapter: Chapter, chapterStatus: 'unlocked' | 'locked'): LevelStatus {
  if (chapterStatus === 'locked' || !chapter.boss) return 'locked'
  if (progress.isBossDefeated(chapter.boss.id)) return 'passed'

  const bossOrder = chapter.boss.order
  const prevCandidates = chapter.levels
    .filter((l) => l.order < bossOrder)
    .sort((a, b) => b.order - a.order)

  if (prevCandidates.length === 0) return 'unlocked'
  const prev = prevCandidates[0]
  return progress.isLevelPassed(prev.id) ? 'unlocked' : 'locked'
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
        <span class="map__emoji">{{ props.mode === 'story' ? '📖' : '🗺️' }}</span>
        <h2>{{ props.mode === 'story' ? '故事模式' : '自由闯关' }}</h2>
        <span v-if="props.mode === 'story'" class="mode-badge">第 {{ currentChapterId }} 章</span>
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
        :class="{
          'chapter--locked': getChapterStatus(chapter) === 'locked',
          'chapter--current': props.mode === 'story' && chapter.id === currentChapterId,
        }"
      >
        <header class="chapter__head" @click="props.mode === 'story' && chapter.id !== currentChapterId && getChapterStatus(chapter) !== 'locked' ? null : null">
          <span class="chapter__emoji">{{ chapter.emoji }}</span>
          <div class="chapter__title">
            <h3>第 {{ chapter.id }} 章 · {{ chapter.title }}</h3>
            <p>{{ chapter.subtitle }}</p>
          </div>
          <span v-if="getChapterStatus(chapter) === 'locked'" class="chapter__lock">🔒</span>
          <span v-else-if="props.mode === 'story' && isChapterCollapsed(chapter)" class="chapter__toggle">▸</span>
        </header>

        <!-- 已解锁章节 + 未折叠 → 展示关卡 -->
        <div v-if="getChapterStatus(chapter) === 'unlocked' && !isChapterCollapsed(chapter)" class="levels">
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

        <!-- 已解锁章节 + 折叠（故事模式下） → 显示通关进度摘要 -->
        <div
          v-else-if="getChapterStatus(chapter) === 'unlocked' && isChapterCollapsed(chapter)"
          class="levels--collapsed"
        >
          <p class="collapsed-hint">
            ✅ 已通关 · 当前正在 <b>第 {{ currentChapterId }} 章</b>
          </p>
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

.mode-badge {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  padding: 0.2rem 0.7rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  margin-left: 0.5rem;
}

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

.chapter--current {
  border-color: #10b981;
  border-width: 2px;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.15);
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

.chapter__toggle {
  font-size: 1.25rem;
  color: #94a3b8;
  font-weight: 700;
}

/* 折叠摘要 */
.levels--collapsed {
  padding: 1rem 0.5rem;
  text-align: center;
}
.collapsed-hint {
  margin: 0;
  font-size: 0.9rem;
  color: #047857;
}
.collapsed-hint b {
  color: #064e3b;
  font-weight: 700;
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