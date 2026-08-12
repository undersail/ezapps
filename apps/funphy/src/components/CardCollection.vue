<script setup lang="ts">
import { physicsCards } from '../data/physicsCards'
import { useGameProgress } from '../composables/useGameProgress'
import type { PhysicsCard } from '../engine/types'

const { progress } = useGameProgress()

const emit = defineEmits<{
  (e: 'close'): void
}>()

function isUnlocked(card: PhysicsCard): boolean {
  return progress.cards.includes(card.id)
}

function getCardLevelId(card: PhysicsCard): string {
  return card.isBoss ? `${card.chapter}-5-boss` : `${card.chapter}-${card.level}`
}
</script>

<template>
  <div class="card-collection-overlay">
    <div class="card-collection">
      <div class="cc-header">
        <h2>📇 物理卡册</h2>
        <span class="cc-count">{{ progress.cards.length }}/{{ physicsCards.length }}</span>
        <button class="cc-close" @click="emit('close')">✕</button>
      </div>
      
      <div class="cc-grid">
        <div
          v-for="card in physicsCards"
          :key="card.id"
          class="cc-card"
          :class="{ unlocked: isUnlocked(card), boss: card.isBoss, locked: !isUnlocked(card) }"
        >
          <template v-if="isUnlocked(card)">
            <div class="cc-card-name">{{ card.intuitionName }}</div>
            <div class="cc-card-formal">{{ card.formalName }}</div>
            <div class="cc-card-desc">{{ card.intuitionDesc }}</div>
          </template>
          <template v-else>
            <div class="cc-card-locked">🔒</div>
            <div class="cc-card-locked-text">通关第{{ card.chapter }}章第{{ card.level }}关解锁</div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-collection-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  z-index: 100;
}

.card-collection {
  background: #1e293b;
  border-radius: 16px;
  padding: 1.5rem;
  max-width: 500px;
  width: 95%;
  max-height: 80vh;
  overflow-y: auto;
  color: #e2e8f0;
}

.cc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 1rem;
}
.cc-header h2 { margin: 0; font-size: 1.2rem; }
.cc-count { color: #94a3b8; font-size: 0.85rem; }
.cc-close {
  margin-left: auto;
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.2rem;
  cursor: pointer;
}

.cc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.cc-card {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  min-height: 100px;
}
.cc-card.unlocked {
  border-color: rgba(147, 51, 234, 0.5);
  background: rgba(147, 51, 234, 0.08);
}
.cc-card.boss.unlocked {
  border-color: rgba(245, 158, 11, 0.5);
  background: rgba(245, 158, 11, 0.08);
}
.cc-card.locked {
  opacity: 0.5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.cc-card-name { font-weight: 600; font-size: 0.9rem; margin-bottom: 4px; }
.cc-card-formal { font-size: 0.7rem; color: #94a3b8; margin-bottom: 4px; }
.cc-card-desc { font-size: 0.75rem; color: #a78bfa; line-height: 1.4; }

.cc-card-locked { font-size: 1.5rem; }
.cc-card-locked-text { font-size: 0.7rem; color: #64748b; text-align: center; margin-top: 4px; }
</style>
