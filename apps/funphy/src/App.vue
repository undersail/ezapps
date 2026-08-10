<script setup lang="ts">
const games = [
  { id: 'gravity', icon: '🪐', title: '引力奇点', desc: '操控引力源，观察轨道如何扭曲', status: 'coming-soon' },
  { id: 'light', icon: '🔆', title: '光学迷宫', desc: '折射与反射的逻辑谜题', status: 'coming-soon' },
  { id: 'circuit', icon: '🔋', title: '电路作坊', desc: '搭建你的闭合电路，看电压与电流起舞', status: 'coming-soon' },
  { id: 'wave', icon: '🌊', title: '波动工坊', desc: '叠加、干涉、驻波的互动可视化', status: 'coming-soon' },
  { id: 'pendulum', icon: '⏱️', title: '单摆画廊', desc: '长度、角度、阻尼对周期的影响实验', status: 'coming-soon' },
  { id: 'magnet', icon: '🧲', title: '磁场沙盘', desc: '磁感线随手画，磁极配对有惊喜', status: 'coming-soon' },
]
</script>

<template>
  <div class="lab">
    <header class="hero">
      <div class="badge">BETA · v0.1</div>
      <h1>⚛️ 物理实验室</h1>
      <p class="tag">Fun Physics Lab · 用互动小游戏理解物理概念</p>
      <p class="intro">
        每款小游戏都对应一个核心物理概念。我们相信"做中学"比"读中学"更深刻——
        在玩耍中你会自然理解那些抽象的公式和图像。
      </p>
    </header>

    <section class="games">
      <header class="games__head">
        <h2>即将上线的小游戏</h2>
        <p>每个项目独立可玩，预计 2026 Q4 起陆续开放。</p>
      </header>
      <div class="games__grid">
        <div v-for="g in games" :key="g.id" class="game">
          <div class="game__icon">{{ g.icon }}</div>
          <h3>{{ g.title }}</h3>
          <p>{{ g.desc }}</p>
          <span class="game__status">即将推出</span>
        </div>
      </div>
    </section>

    <footer class="foot">
      <a href="/">← 返回 EZApps 主页</a>
    </footer>
  </div>
</template>

<style scoped>
.lab {
  max-width: 1080px;
  margin: 0 auto;
  padding: 4rem 1.5rem;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #1a1a2e;
}
.hero { text-align: center; margin-bottom: 3rem; }
.badge {
  display: inline-block;
  font-size: 0.75rem;
  background: #9333ea;
  color: white;
  padding: 4px 12px;
  border-radius: 999px;
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
}
.hero h1 {
  font-size: 3rem;
  margin: 0 0 0.5rem;
  letter-spacing: -0.03em;
}
.tag {
  font-size: 1.1rem;
  color: #7c3aed;
  margin: 0 0 1.5rem;
  font-weight: 500;
}
.intro {
  max-width: 620px;
  margin: 0 auto;
  color: #64748b;
  line-height: 1.7;
}
.games { margin-top: 4rem; }
.games__head { text-align: center; margin-bottom: 2rem; }
.games__head h2 { margin: 0 0 0.5rem; font-size: 1.75rem; }
.games__head p { margin: 0; color: #64748b; }
.games__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.5rem;
}
.game {
  background: white;
  padding: 2rem 1.5rem;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  text-align: center;
  transition: all 0.25s;
}
.game:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(147, 51, 234, 0.12);
  border-color: #9333ea;
}
.game__icon { font-size: 3rem; margin-bottom: 1rem; }
.game h3 { margin: 0 0 0.5rem; font-size: 1.15rem; color: #0f172a; }
.game p { margin: 0 0 1rem; color: #64748b; font-size: 0.9rem; line-height: 1.5; }
.game__status {
  display: inline-block;
  font-size: 0.75rem;
  background: #f3e8ff;
  color: #7c3aed;
  padding: 3px 10px;
  border-radius: 999px;
  font-weight: 500;
}
.foot {
  margin-top: 4rem;
  text-align: center;
}
.foot a {
  color: #7c3aed;
  text-decoration: none;
  font-weight: 500;
}
</style>
