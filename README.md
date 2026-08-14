# 🚀 ezapps

> **小工具游戏合集，简单但好玩儿好用。**
>
> 由 Jack（[@undersail](https://github.com/undersail)）单人维护的个人应用集合站。
> 每款应用聚焦一个具体的痛点或好玩的想法，做得**足够小、足够好玩就好用**。

---

## 🌐 访问地址

| 来源                         | 地址                                                  |
| ---------------------------- | ----------------------------------------------------- |
| 🇨🇳 **主站（推荐）**           | <https://ezapps.cc>                                    |
| 🌍 Cloudflare Pages（备）     | <https://ezapps.pages.dev>                             |
| 📦 GitHub（源码）             | <https://github.com/undersail/ezapps>                  |
| 🪞 Gitee 镜像                 | <https://gitee.com/undersail/ezapps>                   |

---

## 🎮 应用清单

每个 `apps/<name>/` 是一个独立的 Vite + Vue 3 子应用，构建产物落在 `apps/web-app/dist/<name>/`，通过子路径访问。

| 子项目                                    | 简介                                  | 状态     |
| ----------------------------------------- | ------------------------------------- | -------- |
| 🚀 [飞飞历险记](/funphy/) · Funphy Adventure | 垂直跑酷探险：驾驶飞船从海洋冲向宇宙，六章 30 关 + 无限模式 + 每日挑战，护甲/能量/装备升级/物理卡养成，**在线排行榜 + 云存档** | 测试版   |
| 🔬 [物理实验室](/grimphy/) · Grimphy Lab     | 趣味物理实验动画演示                   | 测试版   |
| 📐 [曼曼闯天涯](/funmath/) · FunMath Adventure | 数学闯关答题游戏                       | 测试版   |

> 📖 [飞飞历险记 · 游戏手册](docs/funphy_game_manual.md)（玩法/操作/六章/成长全解）

### 添加新应用

```bash
# 1. 复制骨架
mkdir apps/<your-name> && cp -r apps/funphy/* apps/<your-name>/

# 2. 修改 vite.config.ts 的 outDir 为 ../web-app/dist/<your-name>，base 为 /<your-name>/

# 3. 编辑 src/App.vue 实现你的功能

# 4. 在 apps/web-app/src/apps.config.ts 的 apps[] 加一项，主页自动出现新卡片

git add . && git commit -m "feat: add <your-name>" && git push origin main
```

→ 1-3 分钟内 Cloudflare Pages 自动部署。

---

## 🔧 本地开发

需要 **Node.js 20+** 和 **pnpm 9+**。

```bash
pnpm install
pnpm dev            # 主页 dev（http://localhost:5173）
pnpm dev:funphy     # funphy dev（5174）
pnpm dev:grimphy    # grimphy dev（5175）
pnpm dev:funmath    # funmath dev（5176）
pnpm build          # 全量构建 → apps/web-app/dist/
pnpm type-check     # TypeScript 检查
```

推送即触发 CI，CI 通过后 Cloudflare Pages 拉代码自动构建。

---

## 🚀 部署架构

```
本地开发机 (CVM)
   ↓ git push
GitHub (主仓)  ◀──── mirror ──── Gitee (镜像)
   ↓ webhook                │
Cloudflare Pages GitHub App  │  (国内访问加速备选)
   ↓
自动 pnpm build（webapp + funphy + grimphy + funmath）
   ↓
托管到 ezapps.pages.dev / ezapps.cc
```

- **主仓**：`github.com/undersail/ezapps`（自动部署）
- **Gitee 镜像**：`gitee.com/undersail/ezapps`（备份，国内 Clone 更快）
- **构建**：Cloudflare Pages（接 GitHub）
- **CDN**：Cloudflare 全球网络，国内访问走 CF 边缘节点

---

## 🛰 维护者与社区

| 平台       | 入口                                                       |
| ---------- | ---------------------------------------------------------- |
| 🐙 GitHub  | [@undersail](https://github.com/undersail)                |
| 🇨🇳 Gitee  | [@undersail](https://gitee.com/undersail)                  |
| 📮 公众号  | **科普狮**（ID: `scilion`）· 码农视角看世界 ｜ IDEA & TECH |

### 📮 科普狮 · 微信公众号

> 码农视角看世界 ｜ IDEA & TECH，扫码关注 👇

<p align="center"><img src="docs/assets/wechat-kepushi-qrcode.jpg" alt="科普狮公众号二维码" width="200"/></p>

---

## 📐 项目原则

> **做得足够小、足够好玩就好用。**
>
> 每一款应用都专注于一个明确的任务，避免"大而全"；
> 当有新想法时，新建 `apps/<name>/` 子项目即可——主页自动出现新卡片。

---

## 📋 项目状态

- ⏰ 最后更新：2026-08
- 👤 单人维护，欢迎 PR / Issue
- 📜 许可证：MIT
- 📦 funphy 已完成 V2 改版：垂直跑酷探险（六章 30 关 + 无限模式 + 装备成长 + 物理卡）

