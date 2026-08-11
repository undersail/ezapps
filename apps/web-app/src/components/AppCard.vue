<script setup lang="ts">
import type { AppEntry } from '../apps.config'

const props = defineProps<{
  app: AppEntry
  pinned: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-pin', id: string): void
}>()

const statusLabel = (s: string): string => {
  const map: Record<string, string> = {
    live: '已上线',
    beta: '测试版',
    'coming-soon': '即将推出',
  }
  return map[s] ?? s
}

function onPin(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  emit('toggle-pin', props.app.id)
}
</script>

<template>
  <div class="card-wrap">
    <a :href="app.path" class="card" :style="{ '--accent': app.accent }">
      <div class="card__header">
        <span class="card__emoji">{{ app.emoji }}</span>
        <span class="card__status" :class="`card__status--${app.status}`">
          {{ statusLabel(app.status) }}
        </span>
      </div>
      <div class="card__body">
        <h3>{{ app.title }}</h3>
        <p class="tagline">{{ app.tagline }}</p>
        <p class="desc">{{ app.description }}</p>
        <div class="tags">
          <span v-for="t in app.tags" :key="t" class="tag">{{ t }}</span>
        </div>
      </div>
      <div class="card__footer">
        <span class="enter">进入 →</span>
      </div>
    </a>

    <button
      class="pin-btn"
      :class="{ 'pin-btn--active': pinned }"
      :title="pinned ? '取消置顶' : '置顶'"
      :aria-label="pinned ? '取消置顶' : '置顶'"
      :aria-pressed="pinned"
      @click="onPin"
    >
      <!-- 📌 未置顶时灰白半透明 / 置顶后金色高亮 -->
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 2v8" />
        <path d="M9 6l3-3 3 3" />
        <path d="M12 10v8" />
        <path d="M9 14h6l-1 4h-4z" />
        <path d="M12 22v-4" />
      </svg>
    </button>

    <div v-if="pinned" class="pin-mark" aria-hidden="true">
      <span>已置顶</span>
    </div>
  </div>
</template>

<style scoped>
.card-wrap {
  position: relative;
}
.card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  text-decoration: none;
  color: inherit;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}
.card:hover {
  border-color: var(--accent, #1565c0);
  transform: translateY(-3px);
  box-shadow: 0 14px 38px rgba(0, 0, 0, 0.08);
}
.card-wrap:hover .pin-btn:not(.pin-btn--active) {
  opacity: 0.85;
  transform: scale(1);
}

.card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 1rem;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent, #1565c0) 12%, white) 0%,
    white 100%
  );
}
.card__emoji {
  font-size: 2.5rem;
  line-height: 1;
}
.card__status {
  font-size: 0.75rem;
  padding: 3px 10px;
  border-radius: 999px;
  font-weight: 500;
}
.card__status--live {
  background: #dcfce7;
  color: #166534;
}
.card__status--beta {
  background: #fef3c7;
  color: #92400e;
}
.card__status--coming-soon {
  background: #e0e7ff;
  color: #3730a3;
}
.card__body {
  padding: 0 1.5rem 1rem;
  flex-grow: 1;
}
.card__body h3 {
  margin: 0 0 0.25rem;
  font-size: 1.25rem;
  color: #0f172a;
}
.tagline {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  color: var(--accent, #1565c0);
  font-weight: 500;
}
.desc {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  color: #64748b;
  line-height: 1.55;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag {
  font-size: 0.7rem;
  background: #f1f5f9;
  color: #64748b;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}
.card__footer {
  padding: 0.85rem 1.5rem;
  border-top: 1px solid #f1f5f9;
  text-align: right;
}
.enter {
  color: var(--accent, #1565c0);
  font-weight: 500;
  font-size: 0.9rem;
}

/* === 置顶按钮 === */
.pin-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 50%;
  color: #94a3b8;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.85);
  transition: opacity 0.2s ease, transform 0.15s ease,
    background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  z-index: 2;
  padding: 0;
}
.pin-btn:hover {
  opacity: 1;
  background: #fff;
  color: #475569;
  transform: scale(1.05);
}
.pin-btn--active {
  opacity: 1;
  transform: scale(1);
  background: #fef3c7;
  border-color: #fbbf24;
  color: #b45309;
}
.pin-btn--active:hover {
  background: #fde68a;
  border-color: #d97706;
  color: #92400e;
}

/* === "已置顶" 角标（左下角） === */
.pin-mark {
  position: absolute;
  bottom: 12px;
  left: 12px;
  background: #fbbf24;
  color: #78350f;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  letter-spacing: 0.05em;
  pointer-events: none;
  z-index: 1;
}
</style>
