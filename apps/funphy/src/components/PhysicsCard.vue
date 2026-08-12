<script setup lang="ts">
import type { PhysicsCard } from '../engine/types'

defineProps<{
  card: PhysicsCard
  isNew: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'openCollection'): void
}>()
</script>

<template>
  <div class="card-overlay">
    <div class="card-popup" :class="{ boss: card.isBoss }">
      <div class="card-badge" v-if="isNew">🆕 新卡！</div>
      <div class="card-rarity" v-if="card.isBoss">⭐ 稀有卡</div>
      
      <h2 class="card-title">{{ card.intuitionName }}</h2>
      <p class="card-intuition">{{ card.intuitionDesc }}</p>
      
      <div class="card-divider"></div>
      
      <div class="card-formal">
        <h3>{{ card.formalName }}</h3>
        <p class="card-formula">{{ card.formula }}</p>
      </div>
      
      <div class="card-example">
        <span class="example-label">💡 生活实例</span>
        <p>{{ card.lifeExample }}</p>
      </div>
      
      <div class="card-actions">
        <button class="btn-primary" @click="emit('close')">继续</button>
        <button class="btn-secondary" @click="emit('openCollection')">查看卡册</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  z-index: 100;
}

.card-popup {
  background: #1e293b;
  border-radius: 16px;
  padding: 1.5rem;
  max-width: 360px;
  width: 90%;
  color: #e2e8f0;
  border: 2px solid #9333ea;
  position: relative;
}
.card-popup.boss {
  border-color: #f59e0b;
  background: linear-gradient(135deg, #1e293b, #2d1f0e);
}

.card-badge {
  position: absolute;
  top: -10px;
  right: 10px;
  background: #10b981;
  color: white;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.card-rarity {
  color: #f59e0b;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.card-title {
  font-size: 1.3rem;
  margin: 0 0 0.5rem;
}

.card-intuition {
  color: #a78bfa;
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0 0 1rem;
}

.card-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 1rem 0;
}

.card-formal h3 {
  font-size: 0.9rem;
  color: #94a3b8;
  margin: 0 0 0.3rem;
}

.card-formula {
  font-size: 0.85rem;
  color: #cbd5e1;
  line-height: 1.5;
  margin: 0;
}

.card-example {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}
.example-label {
  font-size: 0.8rem;
  color: #f59e0b;
}
.card-example p {
  margin: 0.3rem 0 0;
  font-size: 0.85rem;
  color: #94a3b8;
}

.card-actions {
  margin-top: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn-primary {
  padding: 0.75rem;
  background: linear-gradient(135deg, #9333ea, #c026d3);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary {
  padding: 0.5rem;
  background: transparent;
  color: #94a3b8;
  border: 1px solid #475569;
  border-radius: 10px;
  font-size: 0.85rem;
  cursor: pointer;
}
</style>
