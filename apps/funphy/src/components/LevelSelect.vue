<script setup lang="ts">
import { chapters } from '../data/chapters'
import { useGameProgress } from '../composables/useGameProgress'
import { skins } from '../data/skins'
import type { LevelDef } from '../engine/types'

const { progress, getLevelStars, isLevelCompleted } = useGameProgress()

const emit = defineEmits<{
  (e: 'select', level: LevelDef): void
  (e: 'openCards'): void
  (e: 'openSkins'): void
}>()

function isLevelUnlocked(level: LevelDef, chapterIndex: number): boolean {
  // 第一章总是解锁
  if (chapterIndex === 0) return true
  // 上一章的Boss通关才解锁下一章
  const prevChapter = chapters[chapterIndex - 1]
  return isLevelCompleted(prevChapter.boss.id)
}

function getLevelStatus(level: LevelDef, chapterIndex: number): 'locked' | 'available' | 'completed' {
  if (!isLevelUnlocked(level, chapterIndex)) return 'locked'
  if (isLevelCompleted(level.id)) return 'completed'
  return 'available'
}

function currentSkin() {
  return skins.find(s => s.id === progress.skinId) || skins[0]
}
</script>

<template>
  <div class="level-select">
    <header class="ls-header">
      <h1>🚀 飞飞历险记</h1>
      <div class="ls-stats">
        <span>✨ {{ progress.stardust }}</span>
        <span>📇 {{ progress.cards.length }}/5</span>
      </div>
    </header>

    <div class="ls-chapters">
      <div v-for="(chapter, ci) in chapters" :key="chapter.id" class="chapter">
        <div class="chapter-header">
          <span class="chapter-emoji">{{ chapter.emoji }}</span>
          <div>
            <h2>{{ chapter.title }}</h2>
            <p class="chapter-sub">{{ chapter.subtitle }}</p>
          </div>
        </div>

        <div class="level-grid">
          <button
            v-for="(level, li) in chapter.levels"
            :key="level.id"
            class="level-btn"
            :class="getLevelStatus(level, ci)"
            :disabled="getLevelStatus(level, ci) === 'locked'"
            @click="emit('select', level)"
          >
            <span class="level-num">{{ li + 1 }}</span>
            <span class="level-name">{{ level.name }}</span>
            <div class="level-stars">
              <span v-for="i in 3" :key="i" :class="{ filled: i <= getLevelStars(level.id) }">
                {{ i <= getLevelStars(level.id) ? '⭐' : '☆' }}
              </span>
            </div>
          </button>

          <button
            class="level-btn boss-btn"
            :class="getLevelStatus(chapter.boss, ci)"
            :disabled="getLevelStatus(chapter.boss, ci) === 'locked'"
            @click="emit('select', chapter.boss)"
          >
            <span class="level-num">👑</span>
            <span class="level-name">{{ chapter.boss.name }}</span>
            <div class="level-stars">
              <span v-for="i in 3" :key="i" :class="{ filled: i <= getLevelStars(chapter.boss.id) }">
                {{ i <= getLevelStars(chapter.boss.id) ? '⭐' : '☆' }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <div class="ls-actions">
      <button class="action-btn" @click="emit('openCards')">📇 物理卡册</button>
      <button class="action-btn" @click="emit('openSkins')">✈️ 飞机库</button>
    </div>
  </div>
</template>

<style scoped>
.level-select {
  max-width: 500px;
  margin: 0 auto;
  padding: 1.5rem;
  min-height: 100vh;
  color: #e2e8f0;
  background: linear-gradient(180deg, #0a0a2e 0%, #1a1a4e 100%);
}

.ls-header {
  text-align: center;
  margin-bottom: 1.5rem;
}
.ls-header h1 {
  font-size: 1.8rem;
  margin: 0;
}
.ls-stats {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #94a3b8;
}

.chapter { margin-bottom: 1.5rem; }
.chapter-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 0.75rem;
}
.chapter-emoji { font-size: 1.5rem; }
.chapter-header h2 { margin: 0; font-size: 1.1rem; }
.chapter-sub { margin: 0; font-size: 0.8rem; color: #94a3b8; }

.level-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.level-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.15s;
}

.level-btn.available {
  border-color: rgba(147, 51, 234, 0.5);
  background: rgba(147, 51, 234, 0.1);
}
.level-btn.available:hover {
  background: rgba(147, 51, 234, 0.2);
}

.level-btn.completed {
  border-color: rgba(16, 185, 129, 0.5);
  background: rgba(16, 185, 129, 0.1);
}

.level-btn.locked {
  opacity: 0.4;
  cursor: not-allowed;
}

.level-btn.boss-btn {
  grid-column: span 2;
  border-color: rgba(245, 158, 11, 0.5);
  background: rgba(245, 158, 11, 0.1);
}
.level-btn.boss-btn.completed {
  border-color: rgba(16, 185, 129, 0.5);
  background: rgba(16, 185, 129, 0.1);
}

.level-num { font-size: 1.2rem; }
.level-name { font-size: 0.8rem; margin: 2px 0; }
.level-stars { font-size: 0.7rem; }
.level-stars .filled { filter: drop-shadow(0 0 3px #ffd700); }

.ls-actions {
  display: flex;
  gap: 8px;
  margin-top: 1rem;
}
.action-btn {
  flex: 1;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #e2e8f0;
  font-size: 0.9rem;
  cursor: pointer;
}
.action-btn:hover { background: rgba(255, 255, 255, 0.1); }
</style>
