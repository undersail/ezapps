<script setup lang="ts">
import { chapters } from '../data/chapters'
import { useGameProgress } from '../composables/useGameProgress'
import type { LevelDef, ChapterDef } from '../engine/types'

const { progress, getLevelStars, isLevelCompleted } = useGameProgress()

const emit = defineEmits<{
  (e: 'select', level: LevelDef, chapter: ChapterDef): void
  (e: 'openCards'): void
  (e: 'openSkins'): void
}>()

function isChapterUnlocked(chapterIndex: number): boolean {
  if (chapterIndex === 0) return true
  const prevChapter = chapters[chapterIndex - 1]
  return isLevelCompleted(prevChapter.boss.id)
}

function isLevelUnlocked(level: LevelDef, chapterIndex: number): boolean {
  if (!isChapterUnlocked(chapterIndex)) return false
  if (chapterIndex === 0) {
    const allLevels = [...chapters[0].levels, chapters[0].boss]
    const idx = allLevels.findIndex(l => l.id === level.id)
    if (idx === 0) return true
    return isLevelCompleted(allLevels[idx - 1].id)
  }
  return true
}

function getLevelStatus(level: LevelDef, chapterIndex: number): 'locked' | 'available' | 'completed' {
  if (!isLevelUnlocked(level, chapterIndex)) return 'locked'
  if (isLevelCompleted(level.id)) return 'completed'
  return 'available'
}

// 获取章节的所有关卡（含Boss）按顺序
function getChapterLevels(chapter: typeof chapters[0]) {
  return [...chapter.levels, chapter.boss]
}

// 获取章节总星星数
function getChapterStars(chapter: typeof chapters[0]) {
  const allLevels = getChapterLevels(chapter)
  return allLevels.reduce((sum, l) => sum + getLevelStars(l.id), 0)
}

// 获取章节最大星星数
function getChapterMaxStars(chapter: typeof chapters[0]) {
  return getChapterLevels(chapter).length * 3
}

// 蛇形路径：计算每个节点的对齐方向
function getNodeAlign(index: number, total: number): 'left' | 'right' | 'center' {
  // Boss关居中
  if (index === total - 1) return 'center'
  // 蛇形：奇数左，偶数右
  return index % 2 === 0 ? 'left' : 'right'
}
</script>

<template>
  <div class="world-map">
    <header class="wm-header">
      <h1>🚀 飞飞历险记</h1>
      <div class="wm-stats">
        <span>✨ {{ progress.stardust }}</span>
        <span>📇 {{ progress.cards.length }}/5</span>
      </div>
    </header>

    <div class="wm-actions">
      <button class="action-btn" @click="emit('openCards')">📇 卡册</button>
      <button class="action-btn" @click="emit('openSkins')">✈️ 飞机库</button>
    </div>

    <div class="wm-scroll">
      <div v-for="(chapter, ci) in chapters" :key="chapter.id" class="chapter-section">
        <!-- 章节标题栏 -->
        <div class="chapter-header" :class="{ locked: !isChapterUnlocked(ci) }"
          :style="isChapterUnlocked(ci) ? { background: `linear-gradient(135deg, ${chapter.bgGradient[0]}cc, ${chapter.bgGradient[1]}cc)` } : {}">
          <span class="chapter-emoji">{{ chapter.emoji }}</span>
          <div class="chapter-info">
            <h2>{{ chapter.title }}</h2>
            <p class="chapter-sub">{{ chapter.subtitle }}</p>
          </div>
          <div class="chapter-stars" v-if="isChapterUnlocked(ci)">
            ⭐ {{ getChapterStars(chapter) }}/{{ getChapterMaxStars(chapter) }}
          </div>
          <div class="chapter-locked" v-else>🔒</div>
        </div>

        <!-- 路线地图 -->
        <div class="route-path" v-if="isChapterUnlocked(ci)">
          <div
            v-for="(level, li) in getChapterLevels(chapter)"
            :key="level.id"
            class="route-point"
            :class="[getNodeAlign(li, getChapterLevels(chapter).length), getLevelStatus(level, ci)]"
          >
            <!-- 连接路径 -->
            <div class="path-segment" :class="{
              lit: li > 0 && isLevelCompleted(getChapterLevels(chapter)[li - 1].id),
              'from-left': li > 0 && getNodeAlign(li - 1, getChapterLevels(chapter).length) === 'left',
              'from-right': li > 0 && getNodeAlign(li - 1, getChapterLevels(chapter).length) === 'right',
              'to-left': getNodeAlign(li, getChapterLevels(chapter).length) === 'left',
              'to-right': getNodeAlign(li, getChapterLevels(chapter).length) === 'right',
              'to-center': getNodeAlign(li, getChapterLevels(chapter).length) === 'center',
            }"></div>

            <!-- 路标节点 -->
            <button
              class="waypoint"
              :class="[
                getLevelStatus(level, ci),
                { boss: level.isBoss }
              ]"
              :disabled="getLevelStatus(level, ci) === 'locked'"
              @click="emit('select', level, chapter)"
            >
              <div class="waypoint-marker">
                <template v-if="level.isBoss">👑</template>
                <template v-else-if="getLevelStatus(level, ci) === 'completed'">✅</template>
                <template v-else-if="getLevelStatus(level, ci) === 'available'">
                  <span class="marker-num">{{ li + 1 }}</span>
                </template>
                <template v-else>🔒</template>
              </div>
              <div class="waypoint-body">
                <span class="waypoint-name">{{ level.name }}</span>
                <div class="waypoint-stars" v-if="isLevelCompleted(level.id)">
                  <span v-for="i in 3" :key="i" :class="{ filled: i <= getLevelStars(level.id) }">
                    {{ i <= getLevelStars(level.id) ? '⭐' : '☆' }}
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.world-map {
  max-width: 500px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: #e2e8f0;
  background: linear-gradient(180deg, #050515 0%, #0a0a2e 100%);
  overflow: hidden;
}

/* 顶部 */
.wm-header {
  text-align: center;
  padding: 1rem 1.5rem 0.5rem;
  flex-shrink: 0;
}
.wm-header h1 {
  font-size: 1.6rem;
  margin: 0;
  text-shadow: 0 0 20px rgba(147, 51, 234, 0.3);
}
.wm-stats {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 0.4rem;
  font-size: 0.85rem;
  color: #94a3b8;
}

.wm-actions {
  display: flex;
  gap: 8px;
  padding: 0.5rem 1.5rem;
  flex-shrink: 0;
}
.action-btn {
  flex: 1;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}
.action-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.wm-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 1rem 2rem;
}

/* 章节区域 */
.chapter-section {
  margin-bottom: 2rem;
}

.chapter-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 1rem;
  padding: 0.7rem 1rem;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s;
}
.chapter-header.locked {
  opacity: 0.4;
  filter: grayscale(0.5);
}
.chapter-emoji {
  font-size: 1.8rem;
}
.chapter-info {
  flex: 1;
}
.chapter-info h2 {
  margin: 0;
  font-size: 1.1rem;
}
.chapter-sub {
  margin: 0;
  font-size: 0.75rem;
  color: #a78bfa;
}
.chapter-stars {
  font-size: 0.8rem;
  color: #fbbf24;
  white-space: nowrap;
}
.chapter-locked {
  font-size: 1.2rem;
}

/* 路线地图 */
.route-path {
  position: relative;
  padding: 0 0.5rem;
}

.route-point {
  position: relative;
  display: flex;
  margin-bottom: 8px;
}

/* 蛇形对齐 */
.route-point.left {
  justify-content: flex-start;
  padding-right: 40%;
}
.route-point.right {
  justify-content: flex-end;
  padding-left: 40%;
}
.route-point.center {
  justify-content: center;
}

/* 路径连接线 */
.path-segment {
  position: absolute;
  top: -8px;
  left: 15%;
  right: 15%;
  height: 8px;
  border: none;
  z-index: 0;
}

/* 路径线用伪元素绘制 */
.path-segment::before {
  content: '';
  position: absolute;
  top: 3px;
  height: 2px;
  background: rgba(255, 255, 255, 0.12);
  transition: all 0.3s;
}

.path-segment.lit::before {
  background: rgba(16, 185, 129, 0.5);
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.3);
}

/* 路径线方向 - 从左到右 */
.path-segment.from-left.to-right::before {
  left: 0;
  right: 0;
}
/* 从右到左 */
.path-segment.from-right.to-left::before {
  left: 0;
  right: 0;
}
/* 从左到中 */
.path-segment.from-left.to-center::before {
  left: 0;
  right: 30%;
}
/* 从右到中 */
.path-segment.from-right.to-center::before {
  left: 30%;
  right: 0;
}

/* 路标节点 */
.waypoint {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0.6rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  z-index: 1;
  min-width: 140px;
  max-width: 200px;
}

.waypoint.available {
  border-color: rgba(147, 51, 234, 0.6);
  background: rgba(147, 51, 234, 0.12);
  animation: pulse-glow 2s ease-in-out infinite;
}
.waypoint.available:hover {
  background: rgba(147, 51, 234, 0.25);
  transform: scale(1.05);
}

.waypoint.completed {
  border-color: rgba(16, 185, 129, 0.5);
  background: rgba(16, 185, 129, 0.1);
}
.waypoint.completed:hover {
  background: rgba(16, 185, 129, 0.2);
}

.waypoint.locked {
  opacity: 0.3;
  cursor: not-allowed;
}

.waypoint.boss {
  min-width: 180px;
  max-width: 220px;
  border-color: rgba(245, 158, 11, 0.5);
  background: rgba(245, 158, 11, 0.1);
}
.waypoint.boss.available {
  border-color: rgba(245, 158, 11, 0.7);
  background: rgba(245, 158, 11, 0.15);
  animation: pulse-glow-gold 2s ease-in-out infinite;
}
.waypoint.boss.completed {
  border-color: rgba(16, 185, 129, 0.5);
  background: rgba(16, 185, 129, 0.1);
}

.waypoint-marker {
  font-size: 1.3rem;
  width: 2rem;
  text-align: center;
  flex-shrink: 0;
}
.marker-num {
  font-size: 1rem;
  font-weight: 700;
  color: #c4b5fd;
}

.waypoint-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.waypoint-name {
  font-size: 0.85rem;
  font-weight: 500;
}
.waypoint-stars {
  display: flex;
  gap: 2px;
  font-size: 0.6rem;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 4px rgba(147, 51, 234, 0.2); }
  50% { box-shadow: 0 0 12px rgba(147, 51, 234, 0.5); }
}
@keyframes pulse-glow-gold {
  0%, 100% { box-shadow: 0 0 4px rgba(245, 158, 11, 0.2); }
  50% { box-shadow: 0 0 12px rgba(245, 158, 11, 0.5); }
}
</style>
