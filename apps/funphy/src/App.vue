<script setup lang="ts">
import { ref, computed } from 'vue'
import LevelSelect from './components/LevelSelect.vue'
import GameCanvas from './components/GameCanvas.vue'
import PhysicsCard from './components/PhysicsCard.vue'
import CardCollection from './components/CardCollection.vue'
import SkinPicker from './components/SkinPicker.vue'
import { chapters } from './data/chapters'
import { physicsCards } from './data/physicsCards'
import { useGameProgress } from './composables/useGameProgress'
import type { LevelDef } from './engine/types'

const { progress, completeLevel, unlockCard } = useGameProgress()

// 页面状态
type Page = 'menu' | 'playing' | 'cards' | 'skins'
const page = ref<Page>('menu')

// 当前关卡
const currentLevel = ref<LevelDef | null>(null)

// 物理卡弹窗
const showCardPopup = ref(false)
const currentCard = ref(physicsCards[0])
const isNewCard = ref(false)

function onLevelSelect(level: LevelDef) {
  currentLevel.value = level
  page.value = 'playing'
}

function onWin(stars: number, time: number, stardust: number) {
  if (!currentLevel.value) return
  
  // 保存进度
  completeLevel(currentLevel.value.id, stars, time, stardust)
  
  // 解锁物理卡
  const cardId = currentLevel.value.id
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
}

function onCardClose() {
  showCardPopup.value = false
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
  background: #0a0a2e;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.app {
  width: 100%;
  height: 100%;
}
</style>
