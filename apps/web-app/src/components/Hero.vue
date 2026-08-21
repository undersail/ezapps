<script setup lang="ts">
// LOGO + tagline 区域；技术 meta 已下沉到页脚
</script>

<template>
  <header class="hero">
    <!-- 一体化 LOGO：渐变卡片 + 品牌字 + 装饰点 + 标语 -->
    <div class="hero__logo" aria-label="EZAPPS">
      <span class="hero__logo-text">EZAPPS</span>
      <span class="hero__logo-dot" aria-hidden="true"></span>
      <span class="hero__logo-tag">Focus on Simple Design.</span>
    </div>
    <p class="tag">一个码农的奇思妙想集</p>
  </header>
</template>

<style scoped>
.hero {
  text-align: center;
  padding: 5rem 0 2rem;
  max-width: 760px;
  margin: 0 auto;
}

/* ===== 一体化 LOGO ===== */
.hero__logo {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 1.2rem 2.6rem 0.9rem;
  border-radius: 16px;
  background: linear-gradient(135deg, #1565c0 0%, #7c3aed 100%);
  color: white;
  font-weight: 800;
  font-size: 1.85rem;
  letter-spacing: 0.18em;
  box-shadow:
    0 16px 48px rgba(21, 101, 192, 0.36),
    inset 0 -2px 0 rgba(255, 255, 255, 0.12);
  margin-bottom: 1.5rem;
}
.hero__logo-text {
  line-height: 1;
}
.hero__logo-tag {
  font-size: 0.62rem;
  font-weight: 400;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1;
}
.hero__logo-dot {
  position: absolute;
  top: 24px;
  right: 30px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #fbbf24;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.9);
}

/* ===== tagline ===== */
.tag {
  font-size: 1.35rem;
  color: #334155;
  margin: 0 auto;
  line-height: 1.65;
  max-width: 580px;
  letter-spacing: 0.02em;
  font-weight: 600;
}
</style>
