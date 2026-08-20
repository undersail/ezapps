<script setup lang="ts">
// LOGO + tagline 区域；技术 meta 已下沉到页脚
</script>

<template>
  <header class="hero">
    <!-- 一体化 LOGO：横向渐变卡片 + 品牌字 + 装饰点 -->
    <div class="hero__logo" aria-label="EZAPPS">
      <span class="hero__logo-text">EZAPPS</span>
      <span class="hero__logo-dot" aria-hidden="true"></span>
    </div>
    <p class="tag">这里是我的奇思妙想展示厅</p>
    <p class="sub">Focus on Simple Design</p>
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
  align-items: center;
  gap: 10px;
  padding: 1rem 2.25rem;
  border-radius: 16px;
  background: linear-gradient(135deg, #1565c0 0%, #7c3aed 100%);
  color: white;
  font-weight: 800;
  font-size: 1.5rem;
  letter-spacing: 0.18em;
  box-shadow:
    0 16px 48px rgba(21, 101, 192, 0.36),
    inset 0 -2px 0 rgba(255, 255, 255, 0.12);
  margin-bottom: 1.5rem;
}
.hero__logo-text {
  /* 文字颜色保持纯白，靠容器渐变出层次 */
  line-height: 1;
}
.hero__logo-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #fbbf24;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.85);
  /* 让它"飘"在右上角，象征活跃 / live */
  margin-top: -14px;
}

/* ===== tagline ===== */
.tag {
  font-size: 1.35rem;
  color: #334155;
  margin: 0 auto 0.5rem;
  line-height: 1.65;
  max-width: 580px;
  letter-spacing: 0.02em;
  font-weight: 600;
}
.sub {
  font-size: 0.95rem;
  color: #94a3b8;
  margin: 0 auto;
  letter-spacing: 0.02em;
}
</style>
