<script setup lang="ts">
import type { ChapterDef } from '../engine/types'

defineProps<{
  chapter: ChapterDef
}>()

const emit = defineEmits<{
  (e: 'start'): void
}>()
</script>

<template>
  <div class="intro-overlay">
    <div class="intro-card" :style="{ background: `linear-gradient(135deg, ${chapter.bgGradient[0]}ee, ${chapter.bgGradient[1]}ee)` }">
      <div class="intro-emoji">{{ chapter.emoji }}</div>
      <h2 class="intro-title">{{ chapter.title }}</h2>
      <p class="intro-subtitle">{{ chapter.subtitle }}</p>
      <div class="intro-divider"></div>
      <p class="intro-text">{{ chapter.intro }}</p>
      <button class="intro-btn" @click="emit('start')">
        🚀 出发！
      </button>
    </div>
  </div>
</template>

<style scoped>
.intro-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
  z-index: 100;
  padding: 1rem;
}

.intro-card {
  border-radius: 20px;
  padding: 2rem 1.5rem;
  max-width: 380px;
  width: 100%;
  color: #e2e8f0;
  text-align: center;
  border: 2px solid rgba(255, 255, 255, 0.15);
  animation: intro-in 0.4s ease-out;
}

@keyframes intro-in {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.intro-emoji {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.intro-title {
  font-size: 1.5rem;
  margin: 0 0 0.3rem;
  font-weight: 700;
}

.intro-subtitle {
  font-size: 0.85rem;
  color: #a78bfa;
  margin: 0 0 1rem;
}

.intro-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0.5rem 0 1rem;
}

.intro-text {
  font-size: 0.9rem;
  line-height: 1.7;
  color: #cbd5e1;
  margin: 0 0 1.5rem;
  text-align: left;
}

.intro-btn {
  width: 100%;
  padding: 0.85rem;
  background: linear-gradient(135deg, #9333ea, #c026d3);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.intro-btn:hover {
  transform: scale(1.03);
  box-shadow: 0 4px 15px rgba(147, 51, 234, 0.4);
}
</style>
