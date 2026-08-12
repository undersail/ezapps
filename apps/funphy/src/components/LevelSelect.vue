<script setup lang="ts">
import { computed } from 'vue'
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
  const allLevels = [...chapters[chapterIndex].levels, chapters[chapterIndex].boss]
  const idx = allLevels.findIndex(l => l.id === level.id)
  if (idx === 0) return true
  return isLevelCompleted(allLevels[idx - 1].id)
}

function getLevelStatus(level: LevelDef, chapterIndex: number): 'locked' | 'available' | 'completed' {
  if (!isLevelUnlocked(level, chapterIndex)) return 'locked'
  if (isLevelCompleted(level.id)) return 'completed'
  return 'available'
}

function getChapterLevels(chapter: ChapterDef) {
  return [...chapter.levels, chapter.boss]
}

function getChapterStars(chapter: ChapterDef) {
  return getChapterLevels(chapter).reduce((sum, l) => sum + getLevelStars(l.id), 0)
}

function getChapterMaxStars(chapter: ChapterDef) {
  return getChapterLevels(chapter).length * 3
}

// === 折线图节点位置计算 ===
const SVG_WIDTH = 300
const NODE_H = 58  // 每个节点垂直间距
const MILESTONE_H = 72  // 里程碑间距
const PAD_TOP = 20
const PAD_X = 40

// 蛇形路径：每个小关的x坐标左右交替
function getNodeX(levelIndex: number): number {
  // 0=左, 1=右, 2=左, 3=右, 4(中/boss)=中
  if (levelIndex === 4) return SVG_WIDTH / 2  // Boss居中
  return levelIndex % 2 === 0 ? PAD_X + 50 : SVG_WIDTH - PAD_X - 50
}

// 计算所有节点的SVG坐标
interface MapNode {
  type: 'milestone' | 'level' | 'boss'
  x: number
  y: number
  level: LevelDef
  chapter: ChapterDef
  chapterIndex: number
  status: 'locked' | 'available' | 'completed'
  stars: number
}

const allNodes = computed(() => {
  const nodes: MapNode[] = []
  let currentY = PAD_TOP

  for (let ci = 0; ci < chapters.length; ci++) {
    const chapter = chapters[ci]
    const unlocked = isChapterUnlocked(ci)

    // 里程碑节点
    nodes.push({
      type: 'milestone',
      x: SVG_WIDTH / 2,
      y: currentY,
      level: chapter.levels[0],  // placeholder
      chapter,
      chapterIndex: ci,
      status: unlocked ? 'completed' : 'locked',
      stars: 0,
    })
    currentY += MILESTONE_H

    // 小关节点
    if (unlocked) {
      const levels = getChapterLevels(chapter)
      for (let li = 0; li < levels.length; li++) {
        const level = levels[li]
        const status = getLevelStatus(level, ci)
        nodes.push({
          type: level.isBoss ? 'boss' : 'level',
          x: getNodeX(li),
          y: currentY,
          level,
          chapter,
          chapterIndex: ci,
          status,
          stars: getLevelStars(level.id),
        })
        currentY += NODE_H
      }
    } else {
      // 锁定章节：显示灰色占位
      currentY += NODE_H * 2
    }
  }

  return nodes
})

// SVG总高度
const svgHeight = computed(() => {
  if (allNodes.value.length === 0) return 400
  const lastNode = allNodes.value[allNodes.value.length - 1]
  return lastNode.y + 60
})

// 折线路径点（用于画连接线）
const pathPoints = computed(() => {
  return allNodes.value
    .filter(n => n.type !== 'milestone')
    .map(n => ({ x: n.x, y: n.y, status: n.status }))
})

// 里程碑节点
const milestoneNodes = computed(() => {
  return allNodes.value.filter(n => n.type === 'milestone')
})

// 关卡节点（非里程碑）
const levelNodes = computed(() => {
  return allNodes.value.filter(n => n.type !== 'milestone')
})

function onNodeClick(node: MapNode) {
  if (node.type === 'milestone') {
    // 点击里程碑：进入该章节第一关
    const chapter = node.chapter
    const allLevels = getChapterLevels(chapter)
    const firstAvailable = allLevels.find(l => isLevelUnlocked(l, node.chapterIndex))
    if (firstAvailable) {
      emit('select', firstAvailable, chapter)
    }
    return
  }
  if (node.status === 'locked') return
  emit('select', node.level, node.chapter)
}
</script>

<template>
  <div class="world-map">
    <header class="wm-header">
      <h1>🚀 飞飞历险记</h1>
      <div class="wm-stats">
        <span>✨ {{ progress.stardust }}</span>
        <span>📇 {{ progress.cards.length }}/30</span>
      </div>
    </header>

    <div class="wm-actions">
      <button class="action-btn" @click="emit('openCards')">📇 卡册</button>
      <button class="action-btn" @click="emit('openSkins')">✈️ 飞机库</button>
    </div>

    <div class="wm-scroll">
      <svg
        :viewBox="`0 0 ${SVG_WIDTH} ${svgHeight}`"
        class="route-svg"
        preserveAspectRatio="xMidYMin meet"
      >
        <!-- 折线连接 -->
        <polyline
          v-if="pathPoints.length > 1"
          :points="pathPoints.map(p => `${p.x},${p.y}`).join(' ')"
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <!-- 点亮段折线 -->
        <polyline
          v-if="pathPoints.length > 1"
          :points="pathPoints.filter(p => p.status !== 'locked').map(p => `${p.x},${p.y}`).join(' ')"
          fill="none"
          stroke="rgba(16, 185, 129, 0.5)"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- 里程碑节点 -->
        <g v-for="(node, ni) in milestoneNodes" :key="`ms-${ni}`"
          class="node-milestone" :class="{ locked: !isChapterUnlocked(node.chapterIndex) }"
          @click="onNodeClick(node)"
        >
          <!-- 里程碑大圆 -->
          <circle :cx="node.x" :cy="node.y" r="28"
            :fill="isChapterUnlocked(node.chapterIndex) ? node.chapter.bgGradient[1] + 'cc' : '#1e293b'"
            :stroke="isChapterUnlocked(node.chapterIndex) ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'"
            stroke-width="2"
          />
          <text :x="node.x" :y="node.y - 4" text-anchor="middle" dominant-baseline="middle"
            font-size="22">{{ node.chapter.emoji }}</text>
          <text :x="node.x" :y="node.y + 14" text-anchor="middle"
            font-size="8" fill="#94a3b8">{{ node.chapter.title }}</text>
          <!-- 章节星星 -->
          <text v-if="isChapterUnlocked(node.chapterIndex)"
            :x="node.x" :y="node.y + 42" text-anchor="middle"
            font-size="9" fill="#fbbf24">
            ⭐{{ getChapterStars(node.chapter) }}/{{ getChapterMaxStars(node.chapter) }}
          </text>
          <text v-else
            :x="node.x" :y="node.y + 42" text-anchor="middle"
            font-size="10" fill="#475569">🔒</text>
        </g>

        <!-- 关卡节点 -->
        <g v-for="(node, ni) in levelNodes" :key="`lv-${ni}`"
          class="node-level"
          :class="[node.status, { boss: node.type === 'boss' }]"
          @click="onNodeClick(node)"
        >
          <!-- 外圈光晕 -->
          <circle v-if="node.status === 'available' && node.type === 'boss'"
            :cx="node.x" :cy="node.y" r="18"
            fill="none" stroke="rgba(245,158,11,0.4)" stroke-width="1.5"
            class="pulse-ring"
          />
          <circle v-else-if="node.status === 'available'"
            :cx="node.x" :cy="node.y" r="14"
            fill="none" stroke="rgba(147,51,234,0.4)" stroke-width="1.5"
            class="pulse-ring"
          />

          <!-- 节点圆 -->
          <circle
            :cx="node.x" :cy="node.y"
            :r="node.type === 'boss' ? 14 : 10"
            :fill="node.status === 'completed' ? 'rgba(16,185,129,0.25)'
              : node.status === 'available' ? (node.type === 'boss' ? 'rgba(245,158,11,0.2)' : 'rgba(147,51,234,0.2)')
              : 'rgba(255,255,255,0.05)'"
            :stroke="node.status === 'completed' ? 'rgba(16,185,129,0.6)'
              : node.status === 'available' ? (node.type === 'boss' ? 'rgba(245,158,11,0.7)' : 'rgba(147,51,234,0.6)')
              : 'rgba(255,255,255,0.08)'"
            stroke-width="2"
          />

          <!-- 节点内容 -->
          <text v-if="node.type === 'boss'" :x="node.x" :y="node.y + 1"
            text-anchor="middle" dominant-baseline="middle" font-size="14">👑</text>
          <text v-else-if="node.status === 'completed'" :x="node.x" :y="node.y + 1"
            text-anchor="middle" dominant-baseline="middle" font-size="11">✅</text>
          <text v-else-if="node.status === 'locked'" :x="node.x" :y="node.y + 1"
            text-anchor="middle" dominant-baseline="middle" font-size="9">🔒</text>
          <text v-else :x="node.x" :y="node.y + 1"
            text-anchor="middle" dominant-baseline="middle" font-size="9" fill="#c4b5fd">⭐</text>

          <!-- 关卡名 -->
          <text :x="node.x" :y="node.y + (node.type === 'boss' ? 24 : 18)"
            text-anchor="middle" font-size="7"
            :fill="node.status === 'locked' ? '#475569' : '#94a3b8'"
          >{{ node.level.name }}</text>

          <!-- 星星 -->
          <g v-if="node.status === 'completed'" :transform="`translate(${node.x - 12}, ${node.y + (node.type === 'boss' ? 30 : 24)})`">
            <text v-for="i in 3" :key="i" :x="(i - 1) * 9" font-size="7"
              :fill="i <= node.stars ? '#fbbf24' : '#475569'"
            >{{ i <= node.stars ? '★' : '☆' }}</text>
          </g>
        </g>
      </svg>
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
  background: linear-gradient(180deg, #050515 0%, #0a0a2e 50%, #0d1b2a 100%);
  overflow: hidden;
}

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
  padding: 0 0.5rem 2rem;
}

.route-svg {
  width: 100%;
  display: block;
}

.node-milestone {
  cursor: pointer;
  transition: transform 0.15s;
}
.node-milestone:hover {
  filter: brightness(1.2);
}
.node-milestone.locked {
  cursor: default;
  opacity: 0.5;
}

.node-level {
  cursor: pointer;
}
.node-level.locked {
  cursor: not-allowed;
}
.node-level.available {
  animation: node-pulse 2s ease-in-out infinite;
}
.node-level.boss.available {
  animation: node-pulse-gold 2s ease-in-out infinite;
}

.pulse-ring {
  animation: ring-pulse 2s ease-in-out infinite;
}

@keyframes node-pulse {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.3); }
}
@keyframes node-pulse-gold {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.4); }
}
@keyframes ring-pulse {
  0%, 100% { opacity: 0.3; r: 14; }
  50% { opacity: 0.8; r: 18; }
}
</style>
