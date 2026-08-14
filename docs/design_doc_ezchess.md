# EZChess · 经典棋类对战平台设计文档
> Cloudflare Workers + Durable Objects + WebSocket 多人在线方案 · 2026-08-14

## 一、目标

在 ezapps 平台上新增**经典棋类对战**游戏（EZChess）：
- 🎯 五子棋（先上线，MVP）
- ⚫ 黑白棋 / 奥赛罗
- 🦘 中国跳棋（6 角星棋盘，**2-6 人**，跳子前进）
- 🐘 中国象棋

支持：**在线匹配对战 / 好友开房 / 观战 / 断线重连 / 战绩榜**，完全复用现有 `api.ezapps.cc` 的身份与排行榜体系。

## 二、技术架构（Cloudflare 官方多人方案）

```
┌──────────┐   wss://api.ezapps.cc/game/<roomId>   ┌──────────────────────┐
│  玩家 A   │ ◄═══════════════════════════════════► │  Durable Object      │
│  (浏览器) │   每步移动 = 1 条 WS 消息               │  (每房间 1 个实例)    │
└──────────┘                                        │   - 对局状态机       │
┌──────────┐                                        │   - 规则校验(轻量)   │
│  玩家 B   │ ◄═══════════════════════════════════► │   - 计时器/回合      │
│  (浏览器) │                                        │   - 广播/存档       │
└──────────┘                                        └──────────┬───────────┘
       观战者 WS（只读广播）                                    │
                                                               ▼
                                          KV（房间元数据/存档/限流）
                                          D1（战绩/对局历史，可选）

部署：独立 Worker `ezchess-api`（与 ezapps-api 分离，避免互相挤占额度）
自定义域：wss://ezchess-api.ezapps.cc（国内可访问）
```

**核心原则**：
- **每局 = 1 个 Durable Object**：状态（棋盘/回合/计时）常驻内存，天然粘性
- **规则校验在服务端 DO**（轻量逻辑，10ms CPU 内完成）：防作弊（改前端代码下棋）
- **AI 走客户端**（服务端 10ms CPU 无法跑搜索算法）
- **重连**：WS 断开 → 房间保留 60 秒 → 玩家用 roomId 重连恢复

## 三、游戏与规则引擎

| 游戏 | 棋盘 | 玩家数 | 规则校验复杂度 | 服务端校验可行性 |
|---|---|---|---|---|
| 五子棋 | 15×15 | 2 | 极简（落子判胜）| ✅ 轻松 |
| 黑白棋 | 8×8 | 2 | 简单（翻转逻辑）| ✅ 轻松 |
| 中国跳棋 | 17×17 六角星 | **2-6** | 中等（跳子前进）| ✅ 可以（无分支逻辑）|
| 中国象棋 | 9×10 | 2 | 较复杂（马脚/象眼/将帅）| ✅ 可以（纯逻辑无搜索）|

> 中国跳棋说明：六角星形棋盘（5 个正六边形区域向外延伸），玩家 2-6 人，目标是把己方 10 子全部跳进对面对角营地。走法：一步一格（相邻点）或**隔子跳**（可连跳）。多玩家房间为 2-6 人桌。

**统一规则接口**（每棋种实现）：
```ts
interface RulesEngine {
  initBoard(): Board
  legalMoves(board: Board, player: Player): Move[]      // 全部合法走法
  applyMove(board: Board, move: Move): { board: Board; captured?: Piece[] }
  isGameOver(board: Board): { over: boolean; winner?: Player; reason?: string }
  validateMove(board: Board, move: Move): boolean        // 服务端校验入口
}
```
- 服务端 DO 调用 `validateMove` + `applyMove`（每步 < 1ms）
- 前端 Canvas 渲染棋盘（程序化绘制，无图片资源 —— 沿用 ezapps 原则）

## 四、房间系统

```
创建房间   POST /api/room/create { app:'ezchess', game:'gomoku'|'reversi'|'ccheckers'|'xiangqi', mode:'friend'|'match', players?: 2|3|4|6, player:{deviceId,nick} }
匹配对局   POST /api/room/match   { game:'gomoku' }  → 进入匹配队列（KV 队列，60 秒超时）
加入房间   POST /api/room/join    { roomId, player }
观战      POST /api/room/spectate { roomId }
离开/认输  WS 消息 { type:'resign' | 'leave' }
```

**房间类型**：
- **2 人桌**：五子棋 / 黑白棋 / 中国象棋（好友开房 + 快速匹配）
- **N 人桌（2-6）**：中国跳棋（好友开房选人数；满员开赛，房主可"人满即开"或"随时开赛"）

**房间状态机**：
```
WAITING(等人，可 2-6) → READY(满员/房主开赛) → PLAYING → FINISHED(胜负/和棋/超时) → 删除 DO
              └── 60 秒超时（未满员）→ 关闭(通知现有玩家)
```

**匹配机制（轻量）**：
- 匹配队列 = KV key `match:<game>` 存等待玩家（TTL 60s）
- 第二人进队列 → 双方各收到 roomId → 各自连接 WS → 建立对局
- 不做 ELO 分级（MVP 简单化，后续 D1 战绩再升级）

## 五、WebSocket 协议

### 连接
```
wss://ezchess-api.ezapps.cc/game/<roomId>?deviceId=xxx&token=<HMAC>
```

### 消息格式（JSON）
```ts
// 客户端 → 服务端
{ type: 'move',    move: { from?: [r,c], to: [r,c] } }
{ type: 'resign' }
{ type: 'ready' }                               // N 人桌：准备就绪（房主开赛）
{ type: 'chat',    text: string }           // 快捷短语
{ type: 'ping' }

// 服务端 → 客户端
{ type: 'state',   board, turn, timer, phase, seats }   // 全量状态（开局/重连）
{ type: 'move_ok', move, board, nextTurn }              // 落子成功 + 增量（N 人循环）
{ type: 'illegal', reason }                             // 非法走法
{ type: 'gameover', winner, reason, score }             // 胜负结算（N 人按名次）
{ type: 'timer',   seat, remaining }                    // 倒计时同步（每座位独立）
{ type: 'player_joined', player, seats }                // N 人桌有人加入
{ type: 'opponent_left', graceSeconds }                 // 有人掉线（60s 重连窗口）
{ type: 'chat',    player, text }
```

### 对局规则
- 默认 **15 分钟包干**（每方 15 分钟，超时判负）；可自定义（开房选项）
- 每步广播 `move_ok` 到双方 + 观战者（增量同步，观战者本地渲染）
- 断线：60 秒重连窗口，超时判负

## 六、Durable Objects 设计

```ts
class GameRoom extends DurableObject {
  state: {
    game: 'gomoku'|'reversi'|'ccheckers'|'xiangqi'
    seats: number                    // 2（象棋类）/ 2-6（中国跳棋）
    phase: 'WAITING'|'READY'|'PLAYING'|'FINISHED'
    board: Board
    players: { deviceId, nick, ws, seat }[]   // N 人（中国跳棋可 6 人）
    spectators: ws[]
    turn: number                     // 当前座位（N 人循环）
    timers: number[]                 // 每人独立计时
    moves: Move[]                    // 复盘用
    seed?: number                    // 先手随机（2 人局）
  }
  async fetch(req)        // WS 升级入口 + REST 房间操作
  handleMove(seat, move)  // 校验 → apply → 广播（N 人循环下一位）
  handleDisconnect(ws)    // 60s 重连窗口
  finish(result)          // 结算 → KV 存档 → 释放
}
```

**生命周期**：
- 创建：`POST /room/create` → `env.GAME_ROOMS.get(id)` → 初始化 WAITING
- 结算：写 KV（`game:<roomId>` 存档，含 moves 复盘）+ D1（战绩）+ 通知 → `delete self`（释放对象额度）
- 空闲回收：WAITING 超时 60s 自动销毁

## 七、API 一览

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/room/create` | POST | 建房（game/friend/mode/时间）→ roomId |
| `/api/room/match` | POST | 匹配 → 等待/roomId |
| `/api/room/join` | POST | 加入好友房 |
| `/api/room/spectate` | POST | 观战 |
| `/api/room/info` | GET | 房间状态（WS 前轮询）|
| `/api/rank/top` | GET | 棋类战绩榜（复用现有 app 隔离：app=ezchess, mode=<game>）|
| `/api/rank/submit` | POST | 对局结算自动上传（胜=3分/平=1分/负=0分 积分制）|
| `/game/<roomId>` | WS | 对局实时通道 |

## 八、数据模型

### KV
```
room:<roomId>         → 房间元数据（创建即写，TTL 2h）
game:<roomId>         → 对局终局存档（moves 复盘，TTL 7d）
match:<game>          → 匹配队列（TTL 60s）
rank:ezchess:<game>:all → 积分榜（复用现有去重/限流逻辑）
```

### D1（可选，MVP 后加）
```sql
CREATE TABLE matches (
  room_id TEXT PRIMARY KEY, game TEXT, winner TEXT,
  moves INT, duration INT, created_at INT, players TEXT
);
CREATE TABLE players (
  device_id TEXT PRIMARY KEY, nick TEXT, wins INT, losses INT, draws INT,
  elo INT DEFAULT 1200, updated_at INT
);
```

## 九、身份与榜单复用

- **身份**：完全复用现有 `deviceId + 昵称`（无需新登录）
- **积分制**：胜 3 分 / 平 1 分 / 负 0 分；按积分排名（不搞 ELO，MVP 简单化）
- **提交**：复用 `/api/rank/submit`（app=ezchess, mode=<game>）—— 去重/限流/防刷已内置
- **断线重连**：deviceId 匹配座位

## 十、额度预算（免费版）

| 指标 | 每局消耗 | 日 100 局 | 免费额度 | 余量 |
|---|---|---|---|---|
| 请求 | ~120（建房+WS 消息）| 1.2 万 | 10 万/天 | ✅ 8 倍富余 |
| DO 对象 | 1（局末销毁）| 100 | 1000/月 | ⚠️ 月 ~1000 局 |
| WS 并发 | 2-5/局 | 峰值 ~100 | 500 | ✅ |
| CPU | 每步 <1ms | — | 10ms/请求 | ✅ |

**结论**：日活 < 1000、月对局 < 1000 完全免费；超过后 `$5/月` 升级（DO 50 万/月）。

## 十一、前端架构

```
apps/ezchess/
├── src/pages/Lobby.vue        # 大厅：游戏选择/匹配/建房/排行榜
├── src/pages/GameRoom.vue     # 对局页：棋盘 Canvas + 计时器 + 聊天
├── src/engine/
│   ├── gomoku.ts              # 五子棋规则（MVP）
│   ├── reversi.ts             # 黑白棋规则
│   ├── ccheckers.ts           # 中国跳棋规则（六角星棋盘 + N 人）
│   └── xiangqi.ts             # 中国象棋规则
├── src/network/ws.ts          # WebSocket 封装（重连/心跳）
├── src/network/api.ts         # REST 封装（复用 ezapps-api 模式）
└── src/render/BoardCanvas.ts  # 程序化棋盘渲染（Canvas，无图片）
```

- Canvas 程序化绘制棋盘/棋子（沿用 ezapps 无图片原则，皮肤可换）
- 落子前本地模拟校验（即时反馈），服务端权威确认
- 断线自动重连 + 状态恢复（`state` 全量消息）

## 十二、实施计划

| 阶段 | 内容 | 工作量 |
|---|---|---|
| **M1** | 五子棋 MVP：DO 房间 + WS 协议 + 匹配 + Canvas 棋盘 + 积分榜 | ~2 天 |
| **M2** | 黑白棋 + **中国跳棋（N 人桌 2-6 + 六角星棋盘 + 跳子规则）** | ~2 天 |
| **M3** | 中国象棋（复杂规则）+ 计时器 + 聊天 | ~2 天 |
| **M4** | 战绩 D1 + 复盘 + 排行榜细化 + 皮肤 | ~1 天 |

## 十三、风险与限制

1. **DO 免费 1000 对象/月**：对局数超限需付费（$5/月），个人项目预期内
2. **CPU 10ms/请求**：服务端只能做规则校验（<1ms）；**AI 引擎必须在客户端**（如人机对战模式）
3. **WS 在国内可用性**：必须走自定义域（`ezchess-api.ezapps.cc`），workers.dev 域名国内不稳（已验证）
4. **服务端权威**：所有走法服务端校验（防改前端作弊）；断线重连窗口 60s
5. **匹配体验**：MVP 无 ELO，随机匹配；人少时可先做"好友开房"为主
6. **存储清理**：房间 TTL 2h、对局存档 7d、日榜 TTL 7d（KV 自动过期，无需人工）

## 十四、与现有系统关系

```
ezapps.cc 主页
  ├── funphy（跑酷）    ← 已有：排行榜/云存档/每日挑战（app=funphy）
  ├── funmath（答题）   ← 已有：排行榜/每日挑战（app=funmath）
  └── ezchess（棋类）   ← 新增：多人在线（app=ezchess，独立 Worker）
                        复用：deviceId 身份 / 昵称 / HMAC / 限流 / 积分榜模式
```
