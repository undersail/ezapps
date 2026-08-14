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
    const res = await Net.matchRoom('gomoku', { deviceId, nick: myNick.value })
    if (!res) { roomErr.value = '网络异常，请稍后再试'; return }
    if (res.waiting) { roomErr.value = '正在匹配对手…（60 秒超时）'; return }
    if (res.roomId) { enterRoom(res.roomId) }
  } finally {
    matching.value = false
  }
}

async function createRoom() {
  const res = await Net.createRoom('gomoku', { deviceId, nick: myNick.value })
  if (res?.roomId) {
    roomCode.value = res.roomId
    roomErr.value = `好友房已创建，房间号：${res.roomId}（对方输入此号加入）`
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
  board.value = new Array(BOARD * BOARD).fill(0)
  gameOver.value = null
  players.value = []
  timers.value = []
  phase.value = 'WAITING'
  lastMsg.value = ''

  const gameWs = new GameWS(Net.wsUrl(id, { deviceId, nick: myNick.value }))
  gameWs.on('*', () => { /* 所有消息 */ })
  gameWs.on('state', (m) => {
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
  const size = 14 / rect.width * (e.clientX - rect.left)
  const r = Math.round((e.clientY - rect.top) / rect.width * 14)
  const c = Math.round(size)
  if (r < 0 || r >= BOARD || c < 0 || c >= BOARD) return
  if (board.value[r * BOARD + c] !== 0) return
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

      <!-- 对战入口 -->
      <div class="game-card">
        <div class="game-card__head">
          <span class="game-card__emoji">⚫</span>
          <div>
            <h3>五子棋</h3>
            <p>15×15 棋盘 · 先五连者胜 · 15 分钟包干</p>
          </div>
        </div>
        <div class="game-card__actions">
          <button class="btn btn-primary" :disabled="matching" @click="match">
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
      <header class="room-head">
        <button class="btn back" @click="backToLobby">← 大厅</button>
        <div class="room-info">
          <span class="room-title">⚫ 五子棋</span>
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
