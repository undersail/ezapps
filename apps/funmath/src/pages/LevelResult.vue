<script setup lang="ts">
// 关卡结算页
// 接收 result 对象，显示星级、得分、操作按钮

interface Result {
  levelId: string
  score: number
  total: number
  stars: 0 | 1 | 2 | 3
}

interface Props {
  result: Result
  levelTitle: string
  levelEmoji: string
  hasNext?: boolean             // 是否有下一关（决定"下一关"按钮显隐）
}

defineProps<Props>()

defineEmits<{
  (e: 'retry'): void
  (e: 'back'): void
  (e: 'next'): void
}>()
</script>

<template>
  <div class="result" :class="{ 'result--failed': result.stars === 0 }">
    <!-- 顶部 emoji 动画 -->
    <div class="result__hero">
      <span v-if="result.stars === 0" class="result__emoji">🌱</span>
      <span v-else-if="result.stars === 3" class="result__emoji result__emoji--perfect">🏆</span>
      <span v-else class="result__emoji">🎉</span>
    </div>

    <!-- 标题 -->
    <h2 v-if="result.stars === 0" class="result__title">差一点点，再来一次</h2>
    <h2 v-else-if="result.stars === 3" class="result__title result__title--perfect">完美通关！</h2>
    <h2 v-else class="result__title">闯关成功</h2>

    <p class="result__subtitle">
      <span class="result__emoji-small">{{ levelEmoji }}</span> {{ levelTitle }}
    </p>

    <!-- 星星 -->
    <div class="stars">
      <span
        v-for="n in 3"
        :key="n"
        class="star"
        :class="{ 'star--active': result.stars >= n, 'star--empty': result.stars < n }"
      >
        {{ result.stars >= n ? '⭐' : '☆' }}
      </span>
    </div>

    <!-- 分数 -->
    <p class="score">
      答对 <b>{{ result.score }}</b> / {{ result.total }} 题
    </p>
    <p v-if="result.stars === 0" class="score-tip">
      （未达通关分数线，再来一次挑战吧）
    </p>

    <!-- 评价 -->
    <p class="verdict" v-if="result.stars === 3">🌟 掌握度极佳，继续保持！</p>
    <p class="verdict" v-else-if="result.stars === 2">👍 表现不错，加油冲刺 3⭐！</p>
    <p class="verdict" v-else-if="result.stars === 1">💪 闯关成功，多练几次冲更高星</p>

    <!-- 操作 -->
    <div class="actions">
      <button class="btn btn--secondary" @click="$emit('retry')">🔁 再玩一次</button>
      <button class="btn btn--primary" @click="$emit('back')">🗺️ 返回地图</button>
      <button
        v-if="hasNext && result.stars > 0"
        class="btn btn--success"
        @click="$emit('next')"
      >下一关 →</button>
    </div>
  </div>
</template>

<style scoped>
.result {
  max-width: 520px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 4rem;
  text-align: center;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #1a1a2e;
}

.result__hero {
  font-size: 5rem;
  margin-bottom: 1rem;
  animation: bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.result__emoji {
  display: inline-block;
}

.result__emoji--perfect {
  filter: drop-shadow(0 8px 16px rgba(245, 158, 11, 0.4));
  animation: bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), wobble 1.5s ease-in-out 0.6s infinite;
}

@keyframes bounce-in {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes wobble {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}

.result__title {
  margin: 0 0 0.5rem;
  font-size: 1.8rem;
  font-weight: 800;
  color: #0f172a;
}

.result__title--perfect {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.result__subtitle {
  color: #64748b;
  margin: 0 0 1.5rem;
  font-size: 0.95rem;
}

.result__emoji-small {
  font-size: 1.1rem;
  margin-right: 0.25rem;
}

/* ===== 星星 ===== */
.stars {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.star {
  font-size: 2.5rem;
  line-height: 1;
  transition: all 0.3s;
}

.star--empty {
  color: #e2e8f0;
}

.star--active {
  display: inline-block;
  animation: star-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
}

.star--active:nth-child(1) { animation-delay: 0.3s; }
.star--active:nth-child(2) { animation-delay: 0.6s; }
.star--active:nth-child(3) { animation-delay: 0.9s; }

@keyframes star-pop {
  0% { transform: scale(0) rotate(-180deg); opacity: 0; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

/* ===== 分数 ===== */
.score {
  font-size: 1.15rem;
  color: #475569;
  margin: 0 0 0.5rem;
}

.score b {
  color: #10b981;
  font-size: 1.4rem;
  font-weight: 800;
}

.score-tip {
  color: #94a3b8;
  font-size: 0.85rem;
  margin: 0 0 0.5rem;
}

.verdict {
  color: #64748b;
  font-size: 0.95rem;
  margin: 0.5rem 0 2rem;
}

/* ===== 失败态 ===== */
.result--failed .result__title { color: #64748b; }
.result--failed .score b { color: #94a3b8; }

/* ===== 操作按钮 ===== */
.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.btn {
  padding: 0.85rem 1.5rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.btn:hover {
  transform: translateY(-2px);
}

.btn--primary {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
}

.btn--secondary {
  background: white;
  border: 2px solid #e2e8f0;
  color: #475569;
}

.btn--secondary:hover {
  border-color: #10b981;
  background: #f0fdf4;
}

.btn--success {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
}
</style>