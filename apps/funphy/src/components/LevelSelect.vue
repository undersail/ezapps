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

// === 直线图节点位置计算 ===
const SVG_W = 340
const CX = SVG_W / 2
const LEVEL_V_GAP = 32    // 小关垂直间距（密集）
const MILESTONE_R = 30    // 里程碑半径
const LEVEL_R = 9         // 小关半径
const BOSS_R = 13         // Boss半径
const PAD_TOP = 60        // 顶部留白（防止截断）
const PAD_BOTTOM = 80     // 底部留白（防止截断）
const MS_TO_FIRST = 42    // 里程碑到第一个小关的间距
const LAST_TO_NEXT = 70   // 最后一个小关到下一个里程碑的间距

// 节点类型
interface MapNode {
  type: 'milestone' | 'level' | 'boss'
  x: number
  y: number
  level: LevelDef | null
  chapter: ChapterDef
  chapterIndex: number
  status: 'locked' | 'available' | 'completed'
  stars: number
}

// 计算所有节点坐标
const allNodes = computed(() => {
  const nodes: MapNode[] = []
  let curY = PAD_TOP

  for (let ci = 0; ci < chapters.length; ci++) {
    const chapter = chapters[ci]
    const unlocked = isChapterUnlocked(ci)

    // 里程碑节点
    nodes.push({
      type: 'milestone',
      x: CX,
      y: curY,
      level: null,
      chapter,
      chapterIndex: ci,
      status: unlocked ? 'completed' : 'locked',
      stars: 0,
    })

    // 小关节点：直线布局（全部居中，从上到下）
    if (unlocked) {
      const levels = getChapterLevels(chapter)
      for (let li = 0; li < levels.length; li++) {
        const level = levels[li]
        const status = getLevelStatus(level, ci)
        const isBoss = level.isBoss

        // 所有节点都在中间垂直线上
        const x = CX

        const y = curY + MS_TO_FIRST + li * LEVEL_V_GAP

        nodes.push({
          type: isBoss ? 'boss' : 'level',
          x,
          y,
          level,
          chapter,
          chapterIndex: ci,
          status,
          stars: getLevelStars(level.id),
        })
      }
      curY += MS_TO_FIRST + (levels.length - 1) * LEVEL_V_GAP + LAST_TO_NEXT
    } else {
      // 锁定章节：占位间距
      curY += MS_TO_FIRST + LEVEL_V_GAP * 2 + LAST_TO_NEXT
    }
  }

  return nodes
})

// SVG总高度
const svgHeight = computed(() => {
  if (allNodes.value.length === 0) return 400
  const lastNode = allNodes.value[allNodes.value.length - 1]
  return lastNode.y + PAD_BOTTOM
})

// 逐段直线（用于画连接线，区分点亮/暗色）
const pathSegments = computed(() => {
  const segs: { x1: number; y1: number; x2: number; y2: number; lit: boolean }[] = []
  for (let i = 0; i < allNodes.value.length - 1; i++) {
    const a = allNodes.value[i]
    const b = allNodes.value[i + 1]
    // 只连接同一章节内的节点，或跨章节的里程碑到里程碑
    segs.push({
      x1: a.x, y1: a.y,
      x2: b.x, y2: b.y,
      lit: a.status !== 'locked' && b.status !== 'locked',
    })
  }
  return segs
})

// 里程碑节点
const milestoneNodes = computed(() => {
  return allNodes.value.filter(n => n.type === 'milestone')
})

// 关卡节点
const levelNodes = computed(() => {
  return allNodes.value.filter(n => n.type !== 'milestone')
})

// 章节区域（用于画背景装饰）
const chapterAreas = computed(() => {
  const areas: { chapter: ChapterDef; chapterIndex: number; topY: number; bottomY: number; unlocked: boolean }[] = []
  for (let ci = 0; ci < chapters.length; ci++) {
    const milestone = allNodes.value.find(n => n.type === 'milestone' && n.chapterIndex === ci)
    const chLevels = allNodes.value.filter(n => n.chapterIndex === ci && n.type !== 'milestone')
    if (milestone) {
      const topY = milestone.y - MILESTONE_R - 8
      const bottomY = chLevels.length > 0
        ? chLevels[chLevels.length - 1].y + 30
        : milestone.y + 80
      areas.push({
        chapter: chapters[ci],
        chapterIndex: ci,
        topY,
        bottomY,
        unlocked: isChapterUnlocked(ci),
      })
    }
  }
  return areas
})

function onNodeClick(node: MapNode) {
  if (node.type === 'milestone') {
    const chapter = node.chapter
    const allLevels = getChapterLevels(chapter)
    const firstAvailable = allLevels.find(l => isLevelUnlocked(l, node.chapterIndex))
    if (firstAvailable) {
      emit('select', firstAvailable, chapter)
    }
    return
  }
  if (node.status === 'locked') return
  if (!node.level) return
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
        :viewBox="`0 0 ${SVG_W} ${svgHeight}`"
        class="route-svg"
        preserveAspectRatio="xMidYMin meet"
      >
        <defs>
          <!-- 章节背景渐变 -->
          <linearGradient v-for="(area, ai) in chapterAreas" :key="`grad-${ai}`"
            :id="`chapterBg${ai}`" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="area.chapter.bgGradient[0]" stop-opacity="0.4" />
            <stop offset="100%" :stop-color="area.chapter.bgGradient[1]" stop-opacity="0.15" />
          </linearGradient>
          <!-- 发光滤镜 -->
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <!-- ===== 章节背景区域 ===== -->
        <g v-for="(area, ai) in chapterAreas" :key="`area-${ai}`">
          <!-- 背景渐变区块 -->
          <rect
            :x="8" :y="area.topY"
            :width="SVG_W - 16"
            :height="area.bottomY - area.topY"
            :fill="`url(#chapterBg${ai})`"
            rx="16"
          />
          <!-- 章节主图emoji背景（大半透明） -->
          <text
            :x="CX + 60" :y="(area.topY + area.bottomY) / 2 + 10"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="72"
            opacity="0.06"
          >{{ area.chapter.emoji }}</text>
          <!-- 左侧小emoji装饰 -->
          <text
            :x="28" :y="area.topY + 28"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="16"
            opacity="0.15"
          >{{ area.chapter.emoji }}</text>
        </g>

        <!-- ===== 直线连接（逐段绘制） ===== -->
        <g v-for="(seg, si) in pathSegments" :key="`seg-${si}`">
          <!-- 暗色底线 -->
          <line
            :x1="seg.x1" :y1="seg.y1"
            :x2="seg.x2" :y2="seg.y2"
            stroke="rgba(255,255,255,0.08)"
            stroke-width="2.5"
            stroke-linecap="round"
          />
          <!-- 点亮线 -->
          <line
            v-if="seg.lit"
            :x1="seg.x1" :y1="seg.y1"
            :x2="seg.x2" :y2="seg.y2"
            stroke="rgba(16,185,129,0.6)"
            stroke-width="2.5"
            stroke-linecap="round"
          />
        </g>

        <!-- ===== 里程碑节点 ===== -->
        <g v-for="(node, ni) in milestoneNodes" :key="`ms-${ni}`"
          class="node-milestone" :class="{ locked: !isChapterUnlocked(node.chapterIndex) }"
          @click="onNodeClick(node)"
        >
          <!-- 外圈光晕 -->
          <circle :cx="node.x" :cy="node.y" :r="MILESTONE_R + 8"
            fill="none"
            :stroke="isChapterUnlocked(node.chapterIndex) ? node.chapter.bgGradient[1] + '40' : 'rgba(255,255,255,0.04)'"
            stroke-width="2"
            class="milestone-glow"
          />
          <!-- 里程碑大圆 -->
          <circle :cx="node.x" :cy="node.y" :r="MILESTONE_R"
            :fill="isChapterUnlocked(node.chapterIndex) ? node.chapter.bgGradient[1] + 'cc' : '#1e293b'"
            :stroke="isChapterUnlocked(node.chapterIndex) ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.08)'"
            stroke-width="2.5"
          />
          <!-- emoji -->
          <text :x="node.x" :y="node.y - 3" text-anchor="middle" dominant-baseline="middle"
            font-size="24">{{ node.chapter.emoji }}</text>
          <!-- 章节名 -->
          <text :x="node.x" :y="node.y + 16" text-anchor="middle"
            font-size="9" :fill="isChapterUnlocked(node.chapterIndex) ? '#c4b5fd' : '#475569'"
          >{{ node.chapter.title }}</text>
          <!-- 星星统计（移到里程碑左下侧，避免与正下方第一个小关重叠） -->
          <text v-if="isChapterUnlocked(node.chapterIndex)"
            :x="node.x - MILESTONE_R - 8" :y="node.y + MILESTONE_R + 12" text-anchor="end"
            font-size="9" fill="#fbbf24">
            ⭐{{ getChapterStars(node.chapter) }}/{{ getChapterMaxStars(node.chapter) }}
          </text>
          <text v-else
            :x="node.x" :y="node.y + MILESTONE_R + 16" text-anchor="middle"
            font-size="11" fill="#475569">🔒</text>
        </g>

        <!-- ===== 关卡节点 ===== -->
        <g v-for="(node, ni) in levelNodes" :key="`lv-${ni}`"
          class="node-level"
          :class="[node.status, { boss: node.type === 'boss' }]"
          @click="onNodeClick(node)"
        >
          <!-- 可用状态脉冲光晕 -->
          <circle v-if="node.status === 'available' && node.type === 'boss'"
            :cx="node.x" :cy="node.y" :r="BOSS_R + 7"
            fill="none" stroke="rgba(245,158,11,0.4)" stroke-width="1.5"
            class="pulse-ring"
          />
          <circle v-else-if="node.status === 'available'"
            :cx="node.x" :cy="node.y" :r="LEVEL_R + 5"
            fill="none" stroke="rgba(147,51,234,0.4)" stroke-width="1.5"
            class="pulse-ring"
          />

          <!-- 节点圆 -->
          <circle
            :cx="node.x" :cy="node.y"
            :r="node.type === 'boss' ? BOSS_R : LEVEL_R"
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
            text-anchor="middle" dominant-baseline="middle" font-size="9">✅</text>
          <text v-else-if="node.status === 'locked'" :x="node.x" :y="node.y + 1"
            text-anchor="middle" dominant-baseline="middle" font-size="7">🔒</text>
          <text v-else :x="node.x" :y="node.y + 1"
            text-anchor="middle" dominant-baseline="middle" font-size="8" fill="#c4b5fd">⭐</text>

          <!-- 关卡名（在节点下方居中显示） -->
          <text
            :x="node.x"
            :y="node.y + (node.type === 'boss' ? BOSS_R : LEVEL_R) + 12"
            text-anchor="middle"
            font-size="8"
            :fill="node.status === 'locked' ? '#475569' : '#94a3b8'"
          >{{ node.level?.name }}</text>

          <!-- 星星评分（移到节点右下侧，避免与居中显示的关卡名重叠） -->
          <g v-if="node.status === 'completed' && node.level" 
            :transform="`translate(${node.x + (node.type === 'boss' ? BOSS_R : LEVEL_R) + 7}, ${node.y + (node.type === 'boss' ? BOSS_R + 8 : LEVEL_R + 8)})`">
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
  height: 100dvh;
  display: flex;
  flex-direction: column;
  color: #e2e8f0;
  background: linear-gradient(180deg, #050515 0%, #0a0a2e 50%, #0d1b2a 100%);
  overflow: hidden;
}

.wm-header {
  text-align: center;
  padding: 0.8rem 1.5rem 0.3rem;
  flex-shrink: 0;
}
.wm-header h1 {
  font-size: 1.5rem;
  margin: 0;
  text-shadow: 0 0 20px rgba(147, 51, 234, 0.3);
}
.wm-stats {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 0.3rem;
  font-size: 0.85rem;
  color: #94a3b8;
}

.wm-actions {
  display: flex;
  gap: 8px;
  padding: 0.4rem 1.5rem;
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
  padding: 0.5rem 0.25rem 2rem;
  -webkit-overflow-scrolling: touch;
}

.route-svg {
  width: 100%;
  display: block;
  min-height: 100%;
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

.milestone-glow {
  animation: glow-pulse 3s ease-in-out infinite;
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
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}
@keyframes glow-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}
</style>
