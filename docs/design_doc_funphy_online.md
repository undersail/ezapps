# 飞飞历险记 · 联网功能设计方案
> Cloudflare Workers + KV 免费后端 · 2026-08-13

## ✅ 实施状态（2026-08-14 全部完成）

| 阶段 | 功能 | 状态 |
|---|---|---|
| **P0** | 🏅 全球排行榜（无限模式）| ✅ 已上线 |
| **P1** | ☁️ 云存档（跨设备进度同步）| ✅ 已上线 |
| **P2** | 📅 每日挑战（全服同种子关卡 + 日榜）| ✅ 已上线 |

**线上地址**：https://api.ezapps.cc（Cloudflare Workers `ezapps-api`）

## 实际实现要点（与方案的差异）

1. **部署方式**：wrangler CLI 在国内网络不可用（npm 源 + API 均 fetch failed）→ 改用 **REST API + esbuild 打包**部署（`PUT /accounts/{id}/workers/scripts/{name}` multipart 上传）
2. **脚本格式**：`application/javascript+module` 上传报 "Unexpected token 'export'" → 改用 **service-worker 格式**（addEventListener + esbuild --format=iife）
3. **vars 注入不生效**：CF vars API 无权限 + multipart vars 未生效 → **API_SECRET 硬编码进 Worker 代码**（防小白作弊足够）
4. **KV 绑定**：bindings/settings API 无权限 → 上传时 **metadata 内嵌 bindings**（multipart metadata JSON）一次搞定
5. **自定义域**：workers.dev 域名国内超时（实测）→ 绑 `api.ezapps.cc`（用户 Dashboard 操作，Token 无 Zone 路由权限）
6. **KV 缓存**：DELETE key 后读仍有缓存 → 用 PUT 覆盖空数组立即生效

## 一、目标

在现有 Cloudflare Pages 静态托管基础上，为 funphy 游戏增加联网能力：
- **P0 全球排行榜**：无限模式（6-5）最佳里程 + 每日挑战成绩
- **P1 云存档**：进度/装备跨设备同步
- **P2 每日挑战**：全服同配置比成绩

零服务器成本（Workers 免费额度），与现有 CF Pages 同账号零摩擦。

## 二、架构

```
游戏（前端 Vue SPA）
   │  fetch JSON
   ▼
api.ezapps.cc  ── Cloudflare Workers（免费，边缘节点）
   ├── KV 命名空间 rank / save      （键值：排行榜、存档）
   └── D1 数据库（可选，P2+ 统计查询）
```

- **域名**：绑定 `api.ezapps.cc` 子域（走 CF 边缘，国内可达性与 ezapps.cc 一致）
- **协议**：HTTPS + JSON，无 WebSocket（P0/P1 不需要）
- **CORS**：允许 `https://ezapps.cc`、`https://ezapps.pages.dev` 及本地开发 5174

## 三、数据结构

### KV：排行榜（命名空间 rank）
```
key: rank:<mode>:<date>          value: JSON 数组（降序前 100）
  mode = 'endless' | 'daily'
  date = 'all' | 'YYYY-MM-DD'

单条记录：{ player: string, score: number, level: string, ts: number }
```
- `rank:endless:all`：总榜（bestDistance）
- `rank:daily:2026-08-13`：每日挑战榜

> 简单方案：KV 读全量 TOP100 在内存排序后写回（10 万读/天 额度内，100 条记录 ~10KB，完全够用）。P2 需要复杂查询再迁 D1。

### KV：云存档（命名空间 save）
```
key: save:<playerId>             value: 存档 JSON（funphy_v2_progress 原样）
```

### KV：每日挑战配置
```
key: daily:cfg                  value: { date: 'YYYY-MM-DD', seed: 42, params: {...} }
```

## 四、API 设计（Worker 路由）

### 排行榜
| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/rank/top?mode=endless&limit=10` | GET | 取榜（limit ≤ 100） |
| `/api/rank/submit` | POST | 提交成绩 |

**submit 请求**：
```json
{ "player": "jack", "score": 12345, "mode": "endless", "level": "6-5", "token": "..." }
```

**防作弊（轻量）**：
1. **签名校验**：游戏内置密钥对 `player+score+mode+ts` 做 HMAC-SHA256，Worker 校验（防直接 POST 伪造）
2. **频率限制**：同 player 每 30 秒最多 1 次（KV 记录上次提交时间）
3. 分数合理性：`score < 50000` 且 `level` 必须属于对应模式
4. 签名密钥前端可见是已知局限 —— 防小白作弊足够，高防需服务端权威计分（P2+）

### 云存档
| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/save/get?player=xxx` | GET | 读存档 |
| `/api/save/put` | POST | 写存档（body: {player, data, token}） |

> P1 用 playerId 需登录体系 —— 轻量方案：**玩家自定昵称 + 存档名**（无密码），或接 Cloudflare Access 简化登录。P0 阶段只做排行榜（昵称即 player 字段），存档 P1 再定。

### 每日挑战
| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/daily/cfg` | GET | 当日配置（种子 → 生成固定关卡） |
| `/api/daily/submit` | POST | 提交当日成绩（入 daily 榜） |

每日 0 点（UTC）自动换配置；`seed` 驱动生成器 → 全服同关卡同障碍布局（用固定随机种子生成关卡，需要生成器支持 seed 化 —— 改动较小：spawnRunnerEntities 的 Math.random 换成 seeded RNG）。

## 五、游戏接入点（funphy 前端改动）

1. **新文件** `apps/funphy/src/network/api.ts`：
   ```ts
   const API = 'https://api.ezapps.cc/api'
   export async function submitRank(player, score, mode, level) { ... }
   export async function fetchTop(mode, limit = 10) { ... }
   ```
2. **无限模式失败结算**（useRunnerLoop lost 分支）：`bestDistance` 更新后调用 `submitRank`（静默失败，不阻塞游戏）
3. **大厅新增「🏅 排行榜」入口**：弹窗显示 TOP10（玩家名 + 分数 + 我的排名）
4. **昵称设置**：大厅首次进入弹昵称输入（localStorage 记忆）
5. **网络状态**：请求超时 5s 静默降级（无网时游戏照常玩）

## 六、部署流程

```
1. mkdir -p infra/worker && cd infra/worker
2. npm create cloudflare@latest -- --template worker
3. 配置 wrangler.toml：
   - name = "ezapps-api"
   - kv_namespaces: RANK / SAVE（cf kv namespace create 创建）
   - routes: api.ezapps.cc/*（先验证 *.workers.dev，再绑自定义域）
4. 添加自定义域：CF Dashboard → Workers → ezapps-api → 触发器 → 自定义域 api.ezapps.cc
5. npm run deploy（推送即部署）
6. CORS：Worker 响应头 Access-Control-Allow-Origin: https://ezapps.cc
```

## 七、分阶段计划

| 阶段 | 内容 | 工作量 |
|---|---|---|
| **P0** | Workers + KV 基建 + 排行榜 API + 游戏接入（结算上传 + 大厅榜单 UI）| ~1 天 |
| **P0.5** | 昵称系统 + HMAC 防作弊 + 频率限制 | ~半天 |
| **P1** | 云存档（跨设备进度同步）+ 存档冲突处理 | ~1 天 |
| **P2** | 每日挑战（seeded 关卡生成 + 日榜）+ 迁移 D1 做统计 | ~1-2 天 |

## 八、风险与注意

- **workers.dev 域名国内不稳** → 必须绑 api.ezapps.cc 自定义域
- **KV 免费额度**：读 10 万/天（排行榜 GET 每次读 1 次 —— 日活 1 万以内无压力）；写 1000 次/天（提交成绩）—— 够用
- **HMAC 密钥前端可见** → 防小白；重度反作弊需要后端权威跑分（P3，成本高，暂不做）
- **本地开发**：dev 环境可配置 API 指向 `https://api.ezapps.cc`（CORS 放行 5174）或本地 wrangler dev
- 存档冲突：同一账号多设备以 `last-write-wins` + 时间戳合并（P1 细化）

## 九、验收标准

- [ ] `curl https://api.ezapps.cc/api/rank/top?mode=endless` 返回 JSON 榜
- [ ] 游戏无限模式失败后成绩出现在榜上
- [ ] 大厅排行榜弹窗显示 TOP10 + 我的排名
- [ ] 断网时游戏正常（请求静默降级）
- [ ] 国内网络可访问 api.ezapps.cc
