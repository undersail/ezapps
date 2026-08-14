<script setup lang="ts">
// EZChess · 经典棋类对战（M1 五子棋 MVP）
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as Net from './network/api'
import { GameWS } from './network/ws'

const BOARD = 15
const stage = ref<'lobby' | 'room'>('lobby')
const nickInput = ref(Net.getNickname())
const myNick = ref(Net.getNickname() || '玩家')
const deviceId = Net.getDeviceId()

// ===== 游戏选择 =====
const GAME_LIST = [
  { id: 'gomoku', emoji: '⚫', name: '五子棋', desc: '15×15 · 先五连者胜', seats: 2 },
  { id: 'reversi', emoji: '◐', name: '黑白棋', desc: '8×8 · 翻转吃子', seats: 2 },
  { id: 'ccheckers', emoji: '🦘', name: '中国跳棋', desc: '六角星 · 2-6 人 · 跳子入营', seats: 3 },
]
const gameId = ref('gomoku')
const ccSeats = ref(3)

// ===== 大厅状态 =====
const matching = ref(false)
const rankList = ref<{ player: string; score: number; dev?: string }[]>([])
const roomCode = ref('')
const roomErr = ref('')

// ===== 对局状态 =====
const ws = ref<GameWS | null>(null)
const roomId = ref('')
const board = ref<number[]>(new Array(BOARD * BOARD).fill(0))
const mySeat = ref(0)
const turn = ref(0)
const phase = ref('WAITING')
const players = ref<{ nick: string; seat: number; online?: boolean }[]>([])
const timers = ref<number[]>([])
const gameOver = ref<{ winner: number; reason: string; scores: number[] } | null>(null)
const lastMsg = ref('')
const curGame = ref('gomoku')
const selected = ref<number | null>(null)   // 中国跳棋选中的点

function saveNick() {
  const nick = nickInput.value.trim()
  if (nick) { Net.setNickname(nick); myNick.value = nick }
}

async function refreshRank() {
  rankList.value = (await Net.fetchTop(10)) || []
}

// ===== 匹配 / 建房 =====
async function match() {
  matching.value = true
  roomErr.value = ''
  try {
    const res = await Net.matchRoom(gameId.value, { deviceId, nick: myNick.value })
    if (!res) { roomErr.value = '网络异常，请稍后再试'; return }
    if (res.waiting) { roomErr.value = '正在匹配对手…（60 秒超时）'; return }
    if (res.roomId) { enterRoom(res.roomId) }
  } finally {
    matching.value = false
  }
}

async function createRoom() {
  const seats = gameId.value === 'ccheckers' ? ccSeats.value : 2
  const res = await Net.createRoom(gameId.value, { deviceId, nick: myNick.value }, seats)
  if (res?.roomId) {
    roomCode.value = res.roomId
    roomErr.value = `好友房已创建，房间号：${res.roomId}（${seats} 人桌，${seats > 2 ? '满员自动开赛' : '对方输入此号加入'}）`
    enterRoom(res.roomId)
  } else {
    roomErr.value = '建房失败，请稍后再试'
  }
}

async function joinRoom() {
  const code = roomCode.value.trim()
  if (!code) { roomErr.value = '请输入房间号'; return }
  // 直接连 WS（房间存在则进入，不存在则被拒）
  enterRoom(code)
}

function enterRoom(id: string) {
  roomId.value = id
  stage.value = 'room'
  board.value = []
  gameOver.value = null
  players.value = []
  timers.value = []
  phase.value = 'WAITING'
  lastMsg.value = ''
  selected.value = null

  const gameWs = new GameWS(Net.wsUrl(id, { deviceId, nick: myNick.value }))
  gameWs.on('*', () => { /* 所有消息 */ })
  gameWs.on('state', (m) => {
    if (m.game) curGame.value = m.game
    if (m.board) board.value = m.board
    if (typeof m.turn === 'number') turn.value = m.turn
    if (m.timers) timers.value = m.timers
    if (m.phase) phase.value = m.phase
    if (m.players) players.value = m.players
    if (typeof m.mySeat === 'number') mySeat.value = m.mySeat
    if (m.spectator) mySeat.value = -1
  })
  gameWs.on('move_ok', (m) => {
    if (m.board) board.value = m.board
    if (typeof m.nextTurn === 'number') turn.value = m.nextTurn
  })
  gameWs.on('illegal', (m) => { lastMsg.value = m.reason || '非法操作' })
  gameWs.on('player_joined', (m) => { lastMsg.value = `${m.player?.nick} 加入房间 (${m.seats}/${m.seats})` })
  gameWs.on('timer', (m) => {
    if (timers.value[m.seat] !== undefined) timers.value[m.seat] = m.remaining
  })
  gameWs.on('gameover', (m) => {
    gameOver.value = m
    phase.value = 'FINISHED'
    turn.value = -1
    if (m.players) players.value = m.players
  })
  gameWs.on('opponent_left', (m) => { lastMsg.value = `对手掉线，等待重连…（${m.graceSeconds || 60}s）` })
  gameWs.on('player_reconnected', () => { lastMsg.value = '对手已重连！' })
  gameWs.connect()
  ws.value = gameWs
}

function cellClick(e: MouseEvent) {
  if (phase.value !== 'PLAYING' || turn.value !== mySeat.value || gameOver.value) {
    lastMsg.value = gameOver.value ? '对局已结束' : (turn.value !== mySeat.value ? '还没轮到你' : '等待开局…')
    return
  }
  const canvas = e.target as HTMLCanvasElement
  const rect = canvas.getBoundingClientRect()
  const px = e.clientX - rect.left
  const py = e.clientY - rect.top

  if (curGame.value === 'ccheckers') {
    // 六角星：换算点坐标（与绘制 cellX/cellY 一致）
    const size = rect.width
    const pad = size * 0.03
    const cellX = (size - pad * 2) / 13
    const cellY = (size - pad * 2) / 16
    const r = Math.round((py - pad) / cellY)
    const c = Math.round((px - pad) / cellX)
    const pt = r * 17 + c
    if (board.value[pt] === undefined || board.value[pt] === -1) return
    if (selected.value === null) {
      if (board.value[pt] === mySeat.value + 1) selected.value = pt
    } else {
      ws.value?.send({ type: 'move', move: { from: selected.value, to: pt } })
      selected.value = null
    }
    return
  }

  // 五子棋 / 黑白棋：网格点击
  const size = curGame.value === 'reversi' ? 8 : 15
  const cell = rect.width / size
  const r = Math.floor(py / cell)
  const c = Math.floor(px / cell)
  if (r < 0 || r >= size || c < 0 || c >= size) return
  if (curGame.value === 'gomoku' && board.value[r * 15 + c] !== 0) return
  ws.value?.send({ type: 'move', move: { r, c } })
}

function resign() {
  if (phase.value === 'PLAYING') ws.value?.send({ type: 'resign' })
}

function backToLobby() {
  ws.value?.close()
  stage.value = 'lobby'
  refreshRank()
}

function fmtTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ===== Canvas 棋盘渲染 =====
const canvasRef = ref<HTMLCanvasElement | null>(null)
function drawBoard() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const size = Math.min(canvas.clientWidth, canvas.clientHeight)
  canvas.width = size * dpr
  canvas.height = size * dpr
  ctx.scale(dpr, dpr)

  if (curGame.value === 'ccheckers') return drawCC(ctx, size)
  if (curGame.value === 'reversi') return drawReversi(ctx, size)

  // ===== 五子棋 =====
  const cell = size / (BOARD + 1)
  const pad = cell

  // 木纹底色
  ctx.fillStyle = '#d9a05b'
  ctx.fillRect(0, 0, size, size)
  // 网格
  ctx.strokeStyle = '#8b5a2b'
  ctx.lineWidth = 1
  for (let i = 0; i < BOARD; i++) {
    ctx.beginPath(); ctx.moveTo(pad, pad + i * cell); ctx.lineTo(size - pad, pad + i * cell); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(pad + i * cell, pad); ctx.lineTo(pad + i * cell, size - pad); ctx.stroke()
  }
  // 星位
  const stars = [[7, 7], [3, 3], [3, 11], [11, 3], [11, 11]]
  ctx.fillStyle = '#8b5a2b'
  for (const [r, c] of stars) {
    ctx.beginPath(); ctx.arc(pad + c * cell, pad + r * cell, 3.5, 0, Math.PI * 2); ctx.fill()
  }
  // 棋子
  for (let r = 0; r < BOARD; r++) {
    for (let c = 0; c < BOARD; c++) {
      const v = board.value[r * BOARD + c]
      if (!v) continue
      const x = pad + c * cell, y = pad + r * cell
      const grad = ctx.createRadialGradient(x - cell * 0.25, y - cell * 0.25, cell * 0.1, x, y, cell * 0.42)
      if (v === 1) {
        grad.addColorStop(0, '#4a4a4a'); grad.addColorStop(1, '#111111')
      } else {
        grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, '#c9c9c9')
      }
      ctx.fillStyle = grad
      ctx.beginPath(); ctx.arc(x, y, cell * 0.42, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = v === 1 ? '#000' : '#999'
      ctx.lineWidth = 1
      ctx.stroke()
      // 最后一手标记
      if (lastMove && lastMove.r === r && lastMove.c === c) {
        ctx.fillStyle = v === 1 ? '#ff5252' : '#e53935'
        ctx.beginPath(); ctx.arc(x, y, cell * 0.14, 0, Math.PI * 2); ctx.fill()
      }
    }
  }
}
const lastMove = ref<{ r: number; c: number } | null>(null)

// ===== 黑白棋棋盘（8×8 绿底） =====
const RV2 = 8
function drawReversi(ctx: CanvasRenderingContext2D, size: number) {
  const cell = size / RV2
  // 绿底棋盘
  ctx.fillStyle = '#2d8a4e'
  ctx.fillRect(0, 0, size, size)
  for (let r = 0; r < RV2; r++) for (let c = 0; c < RV2; c++) {
    if ((r + c) % 2 === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.08)'
      ctx.fillRect(c * cell, r * cell, cell, cell)
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'
  ctx.lineWidth = 1
  for (let i = 0; i <= RV2; i++) {
    ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, size); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(size, i * cell); ctx.stroke()
  }
  // 棋子
  for (let r = 0; r < RV2; r++) for (let c = 0; c < RV2; c++) {
    const v = board.value[r * RV2 + c]
    if (!v) continue
    const x = c * cell + cell / 2, y = r * cell + cell / 2
    const grad = ctx.createRadialGradient(x - cell * 0.15, y - cell * 0.15, cell * 0.08, x, y, cell * 0.42)
    if (v === 1) { grad.addColorStop(0, '#3a3a3a'); grad.addColorStop(1, '#0a0a0a') }
    else { grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, '#bdbdbd') }
    ctx.fillStyle = grad
    ctx.beginPath(); ctx.arc(x, y, cell * 0.42, 0, Math.PI * 2); ctx.fill()
  }
}

// ===== 中国跳棋六角星棋盘 =====
const CC3 = 17
function ccPtPos(pt: number): { r: number; c: number } {
  return { r: Math.floor(pt / CC3), c: pt % CC3 }
}
function drawCC(ctx: CanvasRenderingContext2D, size: number) {
  const pad = size * 0.03
  const cellX = (size - pad * 2) / 13   // 13 列（最宽行 12 格）
  const cellY = (size - pad * 2) / 16   // 17 行
  const X = (c: number) => pad + c * cellX
  const Y = (r: number) => pad + r * cellY
  ctx.fillStyle = '#f5e6c8'
  ctx.fillRect(0, 0, size, size)

  // 有效点
  const lens = [1, 2, 3, 4, 13, 12, 11, 10, 9, 10, 11, 12, 13, 4, 3, 2, 1]
  const valid = new Set<number>()
  for (let r = 0; r < 17; r++) {
    const len = lens[r]
    const c0 = r < 4 ? 8 - r : (r < 9 ? r - 4 : (r < 13 ? 13 - len : 9 - len))
    for (let i = 0; i < len; i++) valid.add(r * 17 + (c0 + i))
  }
  const inValid = (r: number, c: number) => valid.has(r * 17 + c)

  // 蜂窝网格连线（右/下/右下 3 方向去重）
  ctx.strokeStyle = 'rgba(139,90,43,0.28)'
  ctx.lineWidth = 1
  const EDGE_DELTAS = [[0, 1], [1, 0], [1, -1]]
  ctx.beginPath()
  for (const pt of valid) {
    const r = Math.floor(pt / 17), c = pt % 17
    for (const [dr, dc] of EDGE_DELTAS) {
      if (inValid(r + dr, c + dc)) {
        ctx.moveTo(X(c), Y(r))
        ctx.lineTo(X(c + dc), Y(r + dr))
      }
    }
  }
  ctx.stroke()

  // 星形轮廓（顶/右上/右下/底/左下/左凹/左上：右边缘是直线）
  ctx.fillStyle = '#e8c98a'
  ctx.beginPath()
  const outline = [[0, 8], [4, 12], [12, 12], [16, 8], [12, 0], [8, 4], [4, 0]]
  ctx.moveTo(X(outline[0][1]), Y(outline[0][0]))
  for (const [r, c] of outline.slice(1)) ctx.lineTo(X(c), Y(r))
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(139,90,43,0.5)'
  ctx.lineWidth = 2
  ctx.stroke()

  // 营地圆点标记
  const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']
  const campPolys = [
    [[0, 8], [1, 7], [1, 8], [2, 6], [2, 7], [2, 8], [3, 5], [3, 6], [3, 7], [3, 8]],
    [[4, 9], [4, 10], [4, 11], [4, 12], [5, 10], [5, 11], [5, 12], [6, 11], [6, 12], [7, 12]],
    [[9, 12], [10, 11], [10, 12], [11, 10], [11, 11], [11, 12], [12, 9], [12, 10], [12, 11], [12, 12]],
    [[13, 5], [13, 6], [13, 7], [13, 8], [14, 6], [14, 7], [14, 8], [15, 7], [15, 8], [16, 8]],
    [[9, 0], [10, 0], [10, 1], [11, 0], [11, 1], [11, 2], [12, 0], [12, 1], [12, 2], [12, 3]],
    [[4, 0], [4, 1], [4, 2], [4, 3], [5, 0], [5, 1], [5, 2], [6, 0], [6, 1], [7, 0]],
  ]
  campPolys.forEach((pts, i) => {
    ctx.fillStyle = COLORS[i] + '28'
    for (const [r, c] of pts) {
      ctx.beginPath(); ctx.arc(X(c), Y(r), cellX * 0.4, 0, Math.PI * 2); ctx.fill()
    }
  })

  // 有效点（空心小圆）
  ctx.strokeStyle = 'rgba(139,90,43,0.55)'
  ctx.lineWidth = 1.2
  for (const pt of valid) {
    const r = Math.floor(pt / 17), c = pt % 17
    ctx.beginPath(); ctx.arc(X(c), Y(r), 2.8, 0, Math.PI * 2); ctx.stroke()
  }
  // 棋子 + 选中高亮
  for (let pt = 0; pt < board.value.length; pt++) {
    const v = board.value[pt]
    if (!v || v === -1) continue
    const r = Math.floor(pt / 17), c = pt % 17
    const x = X(c), y = Y(r)
    ctx.fillStyle = COLORS[(v - 1) % 6]
    ctx.beginPath(); ctx.arc(x, y, cellX * 0.36, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    if (selected.value === pt) {
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 3
      ctx.stroke()
    }
  }
}

let raf = 0
function renderLoop() {
  drawBoard()
  raf = requestAnimationFrame(renderLoop)
}

onMounted(() => {
  refreshRank()
  raf = requestAnimationFrame(renderLoop)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  ws.value?.close()
})
</script>

<template>
  <div class="ezchess">
    <!-- ===== 大厅 ===== -->
    <section v-if="stage === 'lobby'" class="lobby">
      <header class="hero">
        <div class="badge">BETA · EZChess</div>
        <h1>♟️ 棋类对战</h1>
        <p class="tag">五子棋 · 在线对战 · 服务端权威判棋</p>
      </header>

      <!-- 昵称 -->
      <div class="nick-row">
        <input v-model="nickInput" maxlength="12" placeholder="输入昵称" @keyup.enter="saveNick" />
        <button class="btn" @click="saveNick">保存</button>
      </div>

      <!-- 游戏选择 -->
      <div class="game-picker">
        <button
          v-for="g in GAME_LIST"
          :key="g.id"
          class="game-pick"
          :class="{ on: gameId === g.id }"
          @click="gameId = g.id"
        >
          <span class="game-pick__emoji">{{ g.emoji }}</span>
          <div>
            <h3>{{ g.name }}</h3>
            <p>{{ g.desc }}</p>
          </div>
        </button>
      </div>

      <!-- 中国跳棋人数 -->
      <div v-if="gameId === 'ccheckers'" class="seats-row">
        <span>人数：</span>
        <button v-for="n in [2, 3, 4, 6]" :key="n" class="seat-btn" :class="{ on: ccSeats === n }" @click="ccSeats = n">{{ n }}</button>
      </div>

      <!-- 对战入口 -->
      <div class="game-card">
        <div class="game-card__head">
          <span class="game-card__emoji">{{ GAME_LIST.find(g => g.id === gameId)?.emoji }}</span>
          <div>
            <h3>{{ GAME_LIST.find(g => g.id === gameId)?.name }}</h3>
            <p>{{ GAME_LIST.find(g => g.id === gameId)?.desc }} · 15 分钟包干</p>
          </div>
        </div>
        <div class="game-card__actions">
          <button v-if="gameId !== 'ccheckers'" class="btn btn-primary" :disabled="matching" @click="match">
            {{ matching ? '匹配中…' : '⚡ 快速匹配' }}
          </button>
          <button class="btn" @click="createRoom">🏠 创建房间</button>
        </div>
      </div>

      <!-- 加入好友房 -->
      <div class="join-row">
        <input v-model="roomCode" placeholder="输入房间号加入" @keyup.enter="joinRoom" />
        <button class="btn" @click="joinRoom">加入</button>
      </div>
      <p v-if="roomErr" class="hint">{{ roomErr }}</p>

      <!-- 排行榜 -->
      <div class="rank-box">
        <h3>🏅 积分榜（胜3/平1/负0）</h3>
        <div class="rank-list">
          <div v-if="!rankList.length" class="rank-empty">暂无战绩，快来下第一盘！</div>
          <div v-for="(r, i) in rankList" :key="i" class="rank-row">
            <span class="rank-no">{{ i + 1 }}</span>
            <span class="rank-player">{{ r.player }}<span v-if="r.dev" class="rank-dev">#{{ r.dev }}</span></span>
            <span class="rank-score">{{ r.score }} 分</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 对局页 ===== -->
    <section v-else class="room">
      <!-- 房间标题按棋种 -->
      <header class="room-head">
        <button class="btn back" @click="backToLobby">← 大厅</button>
        <div class="room-info">
          <span class="room-title">{{ GAME_LIST.find(g => g.id === curGame)?.emoji }} {{ GAME_LIST.find(g => g.id === curGame)?.name }}</span>
          <span class="room-id">房间 {{ roomId.slice(0, 8) }}</span>
          <span class="room-phase">{{ phase === 'PLAYING' ? '对局中' : phase === 'FINISHED' ? '已结束' : '等待玩家…' }}</span>
        </div>
        <button class="btn danger" v-if="phase === 'PLAYING'" @click="resign">认输</button>
      </header>

      <!-- 玩家栏 -->
      <div class="players">
        <div v-for="p in players" :key="p.seat" class="player-chip" :class="{ me: p.seat === mySeat, active: phase === 'PLAYING' && turn === p.seat }">
          <span class="dot" :style="{ background: p.seat === 0 ? '#111' : '#eee' }"></span>
          <span>{{ p.nick }}<small v-if="p.seat === mySeat">（我）</small></span>
          <span v-if="timers[p.seat] !== undefined" class="timer">{{ fmtTime(timers[p.seat]) }}</span>
        </div>
      </div>

      <!-- 棋盘 -->
      <div class="board-wrap">
        <canvas ref="canvasRef" class="board" @click="cellClick"></canvas>
      </div>

      <!-- 状态提示 -->
      <p class="status" v-if="!gameOver">
        {{ phase === 'PLAYING' ? (turn === mySeat ? '轮到你落子 ⚫' : '等待对方落子…') : phase === 'FINISHED' ? '对局结束' : '等待开局（满 2 人自动开始）' }}
      </p>
      <p class="status warn">{{ lastMsg }}</p>

      <!-- 结算 -->
      <div v-if="gameOver" class="over-box">
        <h2>{{ gameOver.winner === 0 ? '🤝 和棋' : (gameOver.winner - 1 === mySeat ? '🎉 你赢了！' : '😢 你输了') }}</h2>
        <p>{{ gameOver.reason }} · 积分：{{ gameOver.scores[mySeat] ?? gameOver.scores[0] }} 分</p>
        <button class="btn btn-primary" @click="backToLobby">返回大厅</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ezchess { max-width: 640px; margin: 0 auto; padding: 2rem 1.2rem; font-family: system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif; color: #1a1a2e; }
.hero { text-align: center; margin-bottom: 1.5rem; }
.badge { display: inline-block; background: #e2e8f0; color: #475569; border-radius: 999px; padding: 3px 12px; font-size: 0.72rem; margin-bottom: 8px; }
h1 { margin: 0; font-size: 1.8rem; }
.tag { color: #64748b; margin: 6px 0 0; font-size: 0.9rem; }
.nick-row, .join-row { display: flex; gap: 8px; justify-content: center; margin-bottom: 14px; }
input { flex: 1; max-width: 260px; padding: 9px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 0.95rem; outline: none; }
input:focus { border-color: #6366f1; }
.btn { padding: 9px 18px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; cursor: pointer; font-size: 0.9rem; }
.btn-primary { background: #6366f1; border-color: #6366f1; color: #fff; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.danger { color: #dc2626; border-color: #fca5a5; }
.game-card { border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; margin-bottom: 14px; background: #fafafa; }
.game-card__head { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
.game-card__emoji { font-size: 2rem; }
.game-card h3 { margin: 0; }
.game-card p { margin: 2px 0 0; color: #64748b; font-size: 0.82rem; }
.game-card__actions { display: flex; gap: 8px; }
.game-picker { display: flex; gap: 10px; margin-bottom: 12px; }
.game-pick { flex: 1; display: flex; gap: 8px; align-items: center; padding: 10px 12px; border: 2px solid #e2e8f0; border-radius: 14px; background: #fff; cursor: pointer; text-align: left; }
.game-pick.on { border-color: #6366f1; background: #eef2ff; }
.game-pick__emoji { font-size: 1.6rem; }
.game-pick h3 { margin: 0; font-size: 0.95rem; }
.game-pick p { margin: 2px 0 0; font-size: 0.72rem; color: #64748b; }
.seats-row { display: flex; gap: 8px; align-items: center; justify-content: center; margin-bottom: 12px; font-size: 0.9rem; }
.seat-btn { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #e2e8f0; background: #fff; cursor: pointer; font-weight: bold; }
.seat-btn.on { border-color: #6366f1; background: #eef2ff; color: #4338ca; }
.hint { text-align: center; color: #64748b; font-size: 0.85rem; margin: 6px 0; }
.rank-box { border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; background: #fafafa; }
.rank-box h3 { margin: 0 0 10px; font-size: 1rem; }
.rank-row { display: flex; gap: 10px; padding: 6px 8px; border-radius: 8px; font-size: 0.88rem; }
.rank-row:nth-child(odd) { background: #f1f5f9; }
.rank-no { width: 22px; text-align: center; color: #94a3b8; font-weight: bold; }
.rank-player { flex: 1; }
.rank-dev { color: #94a3b8; font-size: 0.72rem; }
.rank-score { color: #6366f1; font-weight: bold; }
.rank-empty { color: #94a3b8; text-align: center; padding: 12px; font-size: 0.85rem; }

.room-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.room-info { flex: 1; text-align: center; }
.room-title { font-weight: bold; font-size: 1.05rem; margin-right: 8px; }
.room-id, .room-phase { color: #64748b; font-size: 0.78rem; margin-right: 6px; }
.players { display: flex; justify-content: center; gap: 12px; margin-bottom: 12px; }
.player-chip { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: #f1f5f9; font-size: 0.85rem; }
.player-chip.me { border: 2px solid #6366f1; }
.player-chip.active { background: #e0e7ff; }
.player-chip .dot { width: 14px; height: 14px; border-radius: 50%; border: 1px solid #94a3b8; }
.timer { color: #dc2626; font-weight: bold; font-size: 0.8rem; }
.board-wrap { display: flex; justify-content: center; }
.board { width: min(92vw, 480px); height: min(92vw, 480px); border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); cursor: pointer; touch-action: none; }
.status { text-align: center; color: #475569; font-size: 0.9rem; margin: 12px 0 4px; }
.status.warn { color: #d97706; font-size: 0.8rem; min-height: 1.2em; }
.over-box { text-align: center; margin-top: 14px; padding: 18px; border-radius: 16px; background: #eef2ff; }
.over-box h2 { margin: 0 0 8px; }
.over-box p { margin: 0 0 12px; color: #64748b; }
</style>
