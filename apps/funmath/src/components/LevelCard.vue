<script setup lang="ts">
import { computed } from 'vue'
import type { Level, LevelStatus } from '../types'

interface Props {
  level: Level
  status: LevelStatus
  stars: 0 | 1 | 2 | 3
  isBoss?: boolean
}

const props = defineProps<Props>()
defineEmits<{
  (e: 'click', levelId: string): void
}>()

const isLocked = computed(() => props.status === 'locked')

const cardClass = computed(() => ({
  'level-card': true,
  'level-card--boss': props.isBoss,
  'level-card--locked': isLocked.value,
  'level-card--passed': props.status === 'passed',
  [`level-card--difficulty-${props.level.difficulty}`]: true,
}))

const starsDisplay = computed(() => {
  // ⭐⭐⭐ = 3，⭐⭐ = 2，⭐ = 1
  if (props.stars >= 3) return '⭐⭐⭐'
  if (props.stars >= 2) return '⭐⭐'
  if (props.stars >= 1) return '⭐'
  return '☆☆☆'
})

function handleClick() {
  if (isLocked.value) return
}
</script>

<template>
  <button
    :class="cardClass"
    :disabled="isLocked"
    @click="$emit('click', level.id)"
    :aria-label="`${level.title} ${isLocked ? '未解锁' : starsDisplay}`"
  >
    <!-- 普通关卡头部：emoji + 编号 -->
    <template v-if="!isBoss">
      <div class="level-card__head">
        <span class="level-card__emoji">{{ level.emoji }}</span>
        <span class="level-card__order">{{ level.order }}</span>
      </div>
      <div class="level-card__title">{{ level.title }}</div>
      <div class="level-card__knowledge">{{ level.knowledge }}</div>
      <div class="level-card__difficulty">
        <span v-for="n in level.difficulty" :key="n">⭐</span>
      </div>
    </template>

    <!-- Boss 关卡 -->
    <template v-else>
      <div class="level-card__head">
        <span class="level-card__emoji boss-emoji">{{ level.emoji }}</span>
        <span class="level-card__boss-tag">BOSS</span>
      </div>
      <div class="level-card__title">{{ level.title }}</div>
      <div class="level-card__knowledge">{{ level.knowledge }}</div>
    </template>

    <!-- 底部状态栏 -->
    <div class="level-card__footer">
      <template v-if="isLocked">
        <span class="lock-icon">🔒</span>
      </template>
      <template v-else-if="isBoss">
        <span class="boss-status">
          {{ stars > 0 ? '👑 已击败' : '⚔️ 挑战' }}
        </span>
      </template>
      <template v-else>
        <span class="stars">{{ starsDisplay }}</span>
      </template>
    </div>
  </button>
</template>

<style scoped>
.level-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0.75rem;
  min-height: 140px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  color: #1e293b;
  position: relative;
  overflow: hidden;
}

.level-card:hover:not(:disabled) {
  border-color: #10b981;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.15);
}

.level-card:active:not(:disabled) {
  transform: translateY(0);
}

/* Boss 关卡特殊样式 */
.level-card--boss {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: #f59e0b;
  min-height: 160px;
}

.level-card--boss:hover:not(:disabled) {
  border-color: #d97706;
  box-shadow: 0 8px 24px rgba(245, 158, 11, 0.25);
}

.boss-emoji {
  font-size: 2.5rem;
  filter: drop-shadow(0 2px 8px rgba(245, 158, 11, 0.4));
}

.level-card__boss-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 0.65rem;
  background: #ef4444;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

/* 锁定状态 */
.level-card--locked {
  background: #f1f5f9;
  border-color: #cbd5e1;
  cursor: not-allowed;
  color: #94a3b8;
  opacity: 0.65;
}

.level-card--locked:hover {
  transform: none;
  box-shadow: none;
}

/* 通过状态 */
.level-card--passed {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  border-color: #10b981;
}

/* 各元素 */
.level-card__head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-bottom: 0.5rem;
}

.level-card__emoji {
  font-size: 2rem;
  line-height: 1;
}

.level-card__order {
  position: absolute;
  top: -4px;
  left: 8px;
  font-size: 0.7rem;
  background: #10b981;
  color: white;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.level-card__title {
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  line-height: 1.2;
}

.level-card__knowledge {
  font-size: 0.75rem;
  color: #64748b;
  text-align: center;
  line-height: 1.3;
  margin-bottom: 0.5rem;
  padding: 0 0.25rem;
}

.level-card__difficulty {
  font-size: 0.65rem;
  color: #f59e0b;
  margin-bottom: 0.25rem;
  letter-spacing: 0.1em;
}

.level-card__footer {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.85rem;
  font-weight: 600;
  padding-top: 0.5rem;
  border-top: 1px dashed #e2e8f0;
  margin-top: auto;
}

.stars {
  color: #f59e0b;
  letter-spacing: 0.15em;
  font-size: 0.95rem;
}

.boss-status {
  color: #92400e;
  font-size: 0.85rem;
}

.lock-icon {
  font-size: 1.2rem;
  opacity: 0.7;
}
</style>