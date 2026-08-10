<script setup lang="ts">
import type { AppEntry } from '../apps.config'

const props = defineProps<{ app: AppEntry }>()

const statusLabel = (s: string): string => {
  const map: Record<string, string> = {
    live: '已上线',
    beta: '测试版',
    'coming-soon': '即将推出',
  }
  return map[s] ?? s
}
</script>

<template>
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
</template>

<style scoped>
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
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 1rem;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent) 12%, white) 0%,
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
</style>
