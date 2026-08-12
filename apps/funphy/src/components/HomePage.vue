<script setup lang="ts">
const emit = defineEmits<{
  (e: 'start'): void
}>()
</script>

<template>
  <div class="home-page">
    <div class="home-content">
      <div class="home-title-area">
        <div class="home-emoji">🚀</div>
        <h1 class="home-title">飞飞历险记</h1>
        <p class="home-subtitle">物理星球冒险之旅</p>
      </div>
      <button class="start-btn" @click="emit('start')">
        开始冒险
      </button>
    </div>
    <!-- 星空装饰 -->
    <div class="stars-bg">
      <div v-for="i in 30" :key="i" class="star"
        :style="{
          left: Math.random() * 100 + '%',
          top: Math.random() * 100 + '%',
          animationDelay: Math.random() * 3 + 's',
          animationDuration: (2 + Math.random() * 3) + 's',
          width: (1 + Math.random() * 2) + 'px',
          height: (1 + Math.random() * 2) + 'px',
        }"
      />
    </div>
  </div>
</template>

<style scoped>
.home-page {
  width: 100%;
  height: 100vh;
  height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #050515 0%, #0a0a2e 50%, #0d1b2a 100%);
  position: relative;
  overflow: hidden;
}

.home-content {
  text-align: center;
  z-index: 1;
  padding: 2rem;
}

.home-title-area {
  margin-bottom: 3rem;
}

.home-emoji {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: float 3s ease-in-out infinite;
}

.home-title {
  font-size: 2.5rem;
  color: #e2e8f0;
  margin: 0;
  text-shadow: 0 0 30px rgba(147, 51, 234, 0.4), 0 0 60px rgba(147, 51, 234, 0.2);
}

.home-subtitle {
  font-size: 1rem;
  color: #94a3b8;
  margin-top: 0.5rem;
}

.start-btn {
  padding: 1rem 3rem;
  font-size: 1.2rem;
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  color: white;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4);
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 30px rgba(124, 58, 237, 0.6);
}

.start-btn:active {
  transform: translateY(0);
}

.stars-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.star {
  position: absolute;
  background: white;
  border-radius: 50%;
  animation: twinkle 3s ease-in-out infinite;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.8; }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
