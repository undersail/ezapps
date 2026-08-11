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
      <!-- 标题栏：emoji + 标题 + 状态 badge -->
      <div class="card__header">
        <span class="card__emoji">{{ app.emoji }}</span>
        <h3 class="card__title">{{ app.title }}</h3>
        <span class="card__status" :class="`card__status--${app.status}`">
          {{ statusLabel(app.status) }}
        </span>
      </div>

      <div class="card__body">
        <p class="tagline">{{ app.tagline }}</p>
        <p class="desc">{{ app.description }}</p>
        <div class="tags">
          <span v-for="t in app.tags" :key="t" class="tag">{{ t }}</span>
        </div>
      </div>

      <!-- footer：左下显式置顶按钮 + 右下"进入 →" -->
      <div class="card__footer">
        <button
          class="pin-btn"
          :class="{ 'pin-btn--active': pinned }"
          :title="pinned ? '取消置顶' : '置顶'"
          :aria-label="pinned ? '取消置顶' : '置顶'"
          :aria-pressed="pinned"
          @click="onPin"
        >
          <!-- 通用 SVG 图标，颜色由 CSS 控制 -->
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none"
               stroke="currentColor" stroke-width="2.2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 2v8" />
            <path d="M9 6l3-3 3 3" />
            <path d="M12 10v8" />
            <path d="M9 14h6l-1 4h-4z" />
            <path d="M12 22v-4" />
          </svg>
          <span class="pin-btn__text">{{ pinned ? '已置顶' : '置顶' }}</span>
        </button>
        <span class="enter">进入 →</span>
      </div>
    </a>
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

.card__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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
  flex-shrink: 0;
}
.card__title {
  margin: 0;
  font-size: 1.25rem;
  color: #0f172a;
  font-weight: 700;
  flex: 1;
  min-width: 0;
  overflow-wrap: break-word;
  word-break: break-word;
}
.card__status {
  font-size: 0.75rem;
  padding: 3px 10px;
  border-radius: 999px;
  font-weight: 500;
  flex-shrink: 0;
  white-space: nowrap;
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

/* footer：左下置顶 + 右下进入 */
.card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid #f1f5f9;
}
.enter {
  color: var(--accent, #1565c0);
  font-weight: 500;
  font-size: 0.9rem;
}

/* === 置顶按钮 === 左下角显式按钮 */
.pin-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid transparent;
  border-radius: 999px;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}
.pin-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}
.pin-btn:active {
  transform: scale(0.96);
}
.pin-btn--active {
  background: #fef3c7;
  color: #92400e;
  border-color: #fcd34d;
}
.pin-btn--active:hover {
  background: #fde68a;
  color: #78350f;
  border-color: #f59e0b;
}
.pin-btn__text {
  line-height: 1;
}

/* ===== 移动端适配 ===== */
@media (max-width: 480px) {
  .card__header {
    padding: 1rem 1rem 0.75rem;
    gap: 0.6rem;
  }
  .card__emoji {
    font-size: 2rem;
  }
  .card__title {
    font-size: 1.05rem;
    line-height: 1.3;
  }
  .card__status {
    font-size: 0.65rem;
    padding: 2px 8px;
  }
  .card__body {
    padding: 0 1rem 0.85rem;
  }
  .desc {
    font-size: 0.85rem;
  }
  .card__footer {
    padding: 0.75rem 1rem;
  }
}
</style>
