<script setup lang="ts">
import { ref, computed } from 'vue'
import LevelSelect from './components/LevelSelect.vue'
import GameCanvas from './components/GameCanvas.vue'
import PhysicsCard from './components/PhysicsCard.vue'
import CardCollection from './components/CardCollection.vue'
import SkinPicker from './components/SkinPicker.vue'
import ChapterIntro from './components/ChapterIntro.vue'
import { chapters } from './data/chapters'
import { physicsCards } from './data/physicsCards'
import { useGameProgress } from './composables/useGameProgress'
import type { LevelDef, ChapterDef } from './engine/types'

const { progress, completeLevel, unlockCard } = useGameProgress()

// 页面状态
type Page = 'menu' | 'playing' | 'cards' | 'skins'
const page = ref<Page>('menu')

// 当前关卡和章节
const currentLevel = ref<LevelDef | null>(null)
const currentChapter = ref<ChapterDef | null>(null)

// 章节介绍弹窗
const showChapterIntro = ref(false)
const introChapter = ref<ChapterDef | null>(null)

// 物理卡弹窗
const showCardPopup = ref(false)
const currentCard = ref(physicsCards[0])
const isNewCard = ref(false)

// 当前章节背景渐变
const currentBgGradient = computed<[string, string]>(() => {
  return currentChapter.value?.bgGradient || ['#0a0a2e', '#1a1a4e']
})

function onLevelSelect(level: LevelDef, chapter: ChapterDef) {
  currentChapter.value = chapter
  currentLevel.value = level

  // 检查是否需要显示章节介绍（章节第一关且未完成过）
  const allLevels = [...chapter.levels, chapter.boss]
  const isFirstLevel = allLevels[0]?.id === level.id
  const chapterIntroShown = `intro_shown_${chapter.id}`
  if (isFirstLevel && !localStorage.getItem(chapterIntroShown)) {
    introChapter.value = chapter
    showChapterIntro.value = true
    return
  }

  page.value = 'playing'
}

function onChapterIntroStart() {
  if (introChapter.value) {
    localStorage.setItem(`intro_shown_${introChapter.value.id}`, '1')
  }
  showChapterIntro.value = false
  introChapter.value = null
  page.value = 'playing'
}

function onWin(stars: number, time: number, stardust: number) {
  if (!currentLevel.value || !currentChapter.value) return
  
  // 保存进度
  completeLevel(currentLevel.value.id, stars, time, stardust)
  
  // 解锁物理卡
  let cardId = currentLevel.value.id
  if (cardId.endsWith('-boss')) {
    cardId = cardId.replace('-boss', '')
  }
  const card = physicsCards.find(c => c.id === cardId)
  if (card) {
    isNewCard.value = !progress.cards.includes(card.id)
    unlockCard(card.id)
    currentCard.value = card
    showCardPopup.value = true
  }
}

function onLose() {
  // 失败不做特殊处理，GameCanvas内部已处理
}

function onBackFromGame() {
  page.value = 'menu'
  currentLevel.value = null
  currentChapter.value = null
}

function onCardClose() {
  showCardPopup.value = false
  // 故事模式：通关后自动进入下一关
  if (currentLevel.value && currentChapter.value) {
    const nextLevel = getNextLevel(currentLevel.value, currentChapter.value)
    if (nextLevel) {
      currentLevel.value = nextLevel
      page.value = 'playing'
      return
    }
  }
  // 没有下一关，回大厅
  page.value = 'menu'
  currentLevel.value = null
  currentChapter.value = null
}

/** 获取当前关卡的下一关，没有则返回null */
function getNextLevel(current: LevelDef, chapter: ChapterDef): LevelDef | null {
  const allLevels = [...chapter.levels, chapter.boss]
  const idx = allLevels.findIndex(l => l.id === current.id)
  if (idx >= 0 && idx < allLevels.length - 1) {
    const next = allLevels[idx + 1]
    // 只有下一关已解锁才能自动进入
    if (isLevelUnlocked(next, chapter)) return next
  }
  return null
}

function isLevelUnlocked(level: LevelDef, chapter: ChapterDef): boolean {
  const chapterIndex = chapters.findIndex(c => c.id === chapter.id)
  if (chapterIndex === 0) {
    const allLevels = [...chapters[0].levels, chapters[0].boss]
    const idx = allLevels.findIndex(l => l.id === level.id)
    if (idx === 0) return true
    return progress.levels[allLevels[idx - 1].id]?.completed ?? false
  }
  return true
}

function onOpenCards() {
  page.value = 'cards'
}

function onOpenSkins() {
  page.value = 'skins'
}

function onCloseCards() {
  page.value = 'menu'
}

function onCloseSkins() {
  page.value = 'menu'
}
</script>

<template>
  <div class="app">
    <!-- 选关页面 -->
    <LevelSelect
      v-if="page === 'menu'"
      @select="onLevelSelect"
      @open-cards="onOpenCards"
      @open-skins="onOpenSkins"
    />

    <!-- 游戏页面 -->
    <GameCanvas
      v-else-if="page === 'playing' && currentLevel"
      :level="currentLevel"
      :skin-id="progress.skinId"
      :bg-gradient="currentBgGradient"
      @win="onWin"
      @lose="onLose"
      @back="onBackFromGame"
    />

    <!-- 卡册 -->
    <CardCollection
      v-if="page === 'cards'"
      @close="onCloseCards"
    />

    <!-- 飞机库 -->
    <SkinPicker
      v-if="page === 'skins'"
      @close="onCloseSkins"
    />

    <!-- 章节介绍弹窗 -->
    <ChapterIntro
      v-if="showChapterIntro && introChapter"
      :chapter="introChapter"
      @start="onChapterIntroStart"
    />

    <!-- 物理卡弹窗 -->
    <PhysicsCard
      v-if="showCardPopup"
      :card="currentCard"
      :is-new="isNewCard"
      @close="onCardClose"
      @open-collection="() => { showCardPopup = false; page = 'cards' }"
    />
  </div>
</template>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
body {
  background: #050515;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.app {
  width: 100%;
  height: 100%;
}
</style>
