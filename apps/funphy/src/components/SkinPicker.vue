<script setup lang="ts">
import { skins } from '../data/skins'
import { useGameProgress } from '../composables/useGameProgress'
import type { SkinDef } from '../engine/types'

const { progress, setSkin, unlockSkin } = useGameProgress()

const emit = defineEmits<{
  (e: 'close'): void
}>()

function isUnlocked(skin: SkinDef): boolean {
  if (skin.unlockType === 'default') return true
  if (skin.unlockType === 'stardust') return progress.totalStardust >= skin.unlockValue
  if (skin.unlockType === 'boss') {
    // Boss通关解锁：第N章Boss通关
    return progress.levels[`${skin.unlockValue}-5-boss`]?.completed ?? false
  }
  return false
}

function selectSkin(skin: SkinDef) {
  if (isUnlocked(skin)) {
    setSkin(skin.id)
  }
}

function unlockLabel(skin: SkinDef): string {
  if (skin.unlockType === 'default') return ''
  if (skin.unlockType === 'stardust') return `✨ ${skin.unlockValue}`
  if (skin.unlockType === 'boss') return `👑 第${skin.unlockValue}章Boss`
  return ''
}

function rarityClass(skin: SkinDef): string {
  return skin.rarity
}
</script>

<template>
  <div class="skin-overlay">
    <div class="skin-picker">
      <div class="sp-header">
        <h2>✈️ 飞机库</h2>
        <button class="sp-close" @click="emit('close')">✕</button>
      </div>
      
      <div class="sp-grid">
        <div
          v-for="skin in skins"
          :key="skin.id"
          class="sp-card"
          :class="[rarityClass(skin), { active: progress.skinId === skin.id, locked: !isUnlocked(skin) }]"
          @click="selectSkin(skin)"
        >
          <div class="sp-preview" :style="{ background: skin.bodyColor }">
            <span class="sp-plane" :style="{ color: skin.bodyColor }">✈️</span>
          </div>
          <div class="sp-info">
            <div class="sp-name">{{ skin.name }}</div>
            <div v-if="!isUnlocked(skin)" class="sp-unlock">{{ unlockLabel(skin) }}</div>
            <div v-else-if="progress.skinId === skin.id" class="sp-using">使用中</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.skin-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  z-index: 100;
}

.skin-picker {
  background: #1e293b;
  border-radius: 16px;
  padding: 1.5rem;
  max-width: 500px;
  width: 95%;
  max-height: 80vh;
  overflow-y: auto;
  color: #e2e8f0;
}

.sp-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}
.sp-header h2 { margin: 0; font-size: 1.2rem; }
.sp-close {
  margin-left: auto;
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.2rem;
  cursor: pointer;
}

.sp-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.sp-card {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
}
.sp-card:hover { background: rgba(255, 255, 255, 0.06); }
.sp-card.active { border-color: #9333ea; background: rgba(147, 51, 234, 0.15); }
.sp-card.rare { border-color: rgba(59, 130, 246, 0.3); }
.sp-card.epic { border-color: rgba(139, 92, 246, 0.3); }
.sp-card.legendary { border-color: rgba(245, 158, 11, 0.3); }
.sp-card.locked { opacity: 0.5; cursor: not-allowed; }

.sp-preview {
  width: 100%;
  aspect-ratio: 2/1;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
}
.sp-plane { font-size: 1.5rem; }

.sp-info { text-align: center; }
.sp-name { font-size: 0.85rem; font-weight: 600; }
.sp-unlock { font-size: 0.7rem; color: #64748b; margin-top: 2px; }
.sp-using { font-size: 0.7rem; color: #a78bfa; margin-top: 2px; }
</style>
