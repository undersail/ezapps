# 🚀 ezapps

Web 应用项目 · Cloudflare Pages 自动部署

## 本地开发

```bash
pnpm install
pnpm --filter web-app dev
```

打开 <http://localhost:5173>

## 构建

```bash
pnpm --filter web-app build
# 输出到 apps/web-app/dist/
```

## 部署

Push 到 `main` 分支 → Cloudflare Pages 自动部署

构建日志：Cloudflare Dashboard → Workers & Pages → ezapps → Deployments

## 仓库结构

```
ezapps/
├── apps/
│   └── web-app/                # 前端 (Vue 3 + Vite + TypeScript)
│       ├── src/
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI
├── package.json                # pnpm workspace 根
├── pnpm-workspace.yaml
└── README.md
```
