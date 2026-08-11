<script setup lang="ts">
// 故事模式关卡间过场（剧情文字 + 自动消失/点击跳过）
// 显示时机：story 模式下进入关卡前 / 通关后

interface Props {
  show: boolean
  title: string
  text: string
  emoji?: string
  duration?: number       // ms，默认 2200
}

const props = withDefaults(defineProps<Props>(), {
  emoji: '✨',
  duration: 2200,
})

const emit = defineEmits<{
  (e: 'done'): void
}>()

// 自动关闭
import { watch, onUnmounted } from 'vue'
let timer: number | null = null

function startTimer() {
  clearTimer()
  if (props.show) {
    timer = window.setTimeout(() => emit('done'), props.duration)
  }
}

function clearTimer() {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
}

watch(() => props.show, (v) => {
  if (v) startTimer()
  else clearTimer()
})

onUnmounted(clearTimer)

function skip() {
  emit('done')
}
</script>

<template>
  <transition name="story">
    <div v-if="show" class="story" @click="skip">
      <div class="story__card">
        <div class="story__emoji">{{ emoji }}</div>
        <h3 class="story__title">{{ title }}</h3>
        <p class="story__text">{{ text }}</p>
        <p class="story__skip">轻点跳过 ▸</p>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.story {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  cursor: pointer;
}

.story__card {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  border: 3px solid #10b981;
  border-radius: 20px;
  padding: 2rem 2rem 1.5rem;
  max-width: 480px;
  width: calc(100% - 2rem);
  text-align: center;
  box-shadow: 0 24px 64px rgba(16, 185, 129, 0.3);
  cursor: pointer;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.story__emoji {
  font-size: 3.5rem;
  margin-bottom: 0.5rem;
  animation: float 2s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.story__title {
  margin: 0 0 0.75rem;
  font-size: 1.3rem;
  font-weight: 800;
  color: #064e3b;
}

.story__text {
  margin: 0 0 1.25rem;
  font-size: 1rem;
  line-height: 1.7;
  color: #047857;
}

.story__skip {
  margin: 0;
  font-size: 0.75rem;
  color: #059669;
  opacity: 0.6;
  letter-spacing: 0.1em;
}

/* 入场/出场动画 */
.story-enter-active, .story-leave-active {
  transition: opacity 0.3s ease;
}
.story-enter-active .story__card,
.story-leave-active .story__card {
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.story-enter-from, .story-leave-to {
  opacity: 0;
}
.story-enter-from .story__card,
.story-leave-to .story__card {
  transform: scale(0.85);
}
</style>