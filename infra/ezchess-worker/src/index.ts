// ezchess-api Worker：经典棋类对战平台（M1 五子棋 MVP）
// 架构：REST（建房/匹配）+ WebSocket（对局）+ Durable Object（每局 1 实例）
// 结算：服务端权威记分（无客户端伪造空间），写 rank:ezchess:<game>:all

const SECRET: string = typeof API_SECRET !== 'undefined' && API_SECRET ? API_SECRET : 'ezchess-secret-2026'
const CORS_ORIGINS = ['https://ezapps.cc', 'https://ezapps.pages.dev', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5173']
const GAMES = ['gomoku', 'reversi', 'ccheckers', 'xiangqi']
const BOARD = 15          // 五子棋棋盘 15×15
const RECONNECT_MS = 60000
const WAIT_TIMEOUT_MS = 60000
const TURN_MS = 15 * 60 * 1000   // 每方 15 分钟

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
  }
}

function json(data: any, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders(origin) })
}

function uid(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

// ==================== 五子棋规则引擎（服务端权威） ====================
function emptyBoard(): number[] { return new Array(BOARD * BOARD).fill(0) }
function idx(r: number, c: number): number { return r * BOARD + c }
function inBoard(r: number, c: number): boolean { return r >= 0 && r < BOARD && c >= 0 && c < BOARD }
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]]

function checkWin(board: number[], r: number, c: number): number {
  const p = board[idx(r, c)]
  if (!p) return 0
  for (const [dr, dc] of DIRS) {
    let count = 1
    for (let i = 1; i < 5; i++) {
      const nr = r + dr * i, nc = c + dc * i
      if (inBoard(nr, nc) && board[idx(nr, nc)] === p) count++; else break
    }
    for (let i = 1; i < 5; i++) {
      const nr = r - dr * i, nc = c - dc * i
      if (inBoard(nr, nc) && board[idx(nr, nc)] === p) count++; else break
    }
    if (count >= 5) return p
  }
  return 0
}

// ==================== Durable Object：对局房间 ====================
export class GameRoom {
  state: DurableObjectState
  env: any
  game = 'gomoku'
  seats = 2
  phase: 'WAITING' | 'READY' | 'PLAYING' | 'FINISHED' = 'WAITING'
  board: number[] = emptyBoard()
  players: { deviceId: string; nick: string; seat: number; ws: WebSocket | null; reconnectTimer?: number }[] = []
  spectators: WebSocket[] = []
  turn = 0
  timers: number[] = []
  moves: { seat: number; r: number; c: number }[] = []
  roomId = ''
  timerAlarm = 0

  constructor(state: DurableObjectState, env: any) {
    this.state = state
    this.env = env
    this.state.blockConcurrencyWhile(async () => {
      const meta = await this.state.storage.get<any>('meta')
      if (meta) {
        this.game = meta.game
        this.seats = meta.seats
        this.roomId = meta.roomId
      }
    })
  }

  async fetch(req: Request): Promise<Response> {
    try {
      return await this._handleFetch(req)
    } catch (e: any) {
      return new Response(JSON.stringify({ error: 'DO 内部错误: ' + (e?.message || String(e)) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
  }

  async _handleFetch(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const origin = req.headers.get('Origin')

    // 对局状态（WS 前轮询 / 重连恢复）
    if (url.pathname.endsWith('/state') && req.method === 'GET') {
      return json({
        game: this.game, seats: this.seats, phase: this.phase, board: this.board,
        turn: this.turn, timers: this.timers,
        players: this.players.map(p => ({ deviceId: p.deviceId, nick: p.nick, seat: p.seat, online: !!p.ws })),
        moves: this.moves.slice(-10),
      }, 200, origin)
    }

    // 开始对局（房主/匹配触发）
    if (url.pathname.endsWith('/start') && req.method === 'POST') {
      if (this.phase !== 'WAITING' || this.players.length < 2) return json({ error: '人数不足' }, 400, origin)
      this.phase = 'PLAYING'
      this.turn = Math.random() < 0.5 ? 0 : 1
      this.timers = Array(this.seats).fill(TURN_MS)
      this.broadcast({ type: 'state', board: this.board, turn: this.turn, timers: this.timers, phase: this.phase, players: this.players.map(p => ({ nick: p.nick, seat: p.seat })) })
      this.armTimer()
      return json({ ok: true }, 200, origin)
    }

    // 认输（REST 兜底）
    if (url.pathname.endsWith('/resign') && req.method === 'POST') {
      const body = await req.json() as any
      const seat = this.players.findIndex(p => p.deviceId === body.deviceId)
      if (seat >= 0 && this.phase === 'PLAYING') await this.finish(seat === 0 ? 2 : 1, '认输')
      return json({ ok: true }, 200, origin)
    }

    // WebSocket 对局通道
    if (url.pathname.endsWith('/ws')) {
      const deviceId = url.searchParams.get('deviceId') || ''
      const nick = url.searchParams.get('nick') || '玩家'
      if (!deviceId) return json({ error: '缺少 deviceId' }, 400, origin)

      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair) as WebSocket[]
      server.accept()

      // 已有玩家 → 重连恢复；新玩家 → 入座
      let player = this.players.find(p => p.deviceId === deviceId)
      if (player) {
        if (player.reconnectTimer) { clearTimeout(player.reconnectTimer); player.reconnectTimer = undefined }
        player.ws = server
        this.broadcast({ type: 'player_reconnected', seat: player.seat })
        server.send(JSON.stringify({
          type: 'state', game: this.game, seats: this.seats, phase: this.phase,
          board: this.board, turn: this.turn, timers: this.timers,
          players: this.players.map(p => ({ nick: p.nick, seat: p.seat })),
          mySeat: player.seat,
        }))
      } else if (this.phase === 'WAITING' && this.players.length < this.seats) {
        const seat = this.players.length
        player = { deviceId, nick: nick.slice(0, 12), seat, ws: server }
        this.players.push(player)
        this.broadcast({ type: 'player_joined', player: { nick, seat }, seats: this.players.length })
        server.send(JSON.stringify({ type: 'state', game: this.game, seats: this.seats, phase: this.phase, players: this.players.map(p => ({ nick: p.nick, seat: p.seat })), mySeat: seat }))
        if (this.players.length >= this.seats) {
          // 满员自动开赛
          await this.start()
        } else {
          this.armWaitTimer()
        }
      } else {
        // 观战
        this.spectators.push(server)
        server.send(JSON.stringify({ type: 'state', game: this.game, seats: this.seats, phase: this.phase, board: this.board, turn: this.turn, timers: this.timers, players: this.players.map(p => ({ nick: p.nick, seat: p.seat })), spectator: true }))
      }

      server.addEventListener('message', async (ev: MessageEvent) => {
        try {
          const msg = JSON.parse(String(ev.data))
          const seat = this.players.findIndex(p => p.ws === server)
          if (msg.type === 'move' && seat >= 0) await this.handleMove(seat, msg)
          else if (msg.type === 'resign' && seat >= 0) await this.finish(seat === 0 ? 2 : 1, '认输')
          else if (msg.type === 'chat') this.broadcast({ type: 'chat', player: this.players[seat]?.nick, text: String(msg.text).slice(0, 50) })
        } catch (e) { /* 忽略坏消息 */ }
      })

      server.addEventListener('close', () => {
        const idx = this.players.findIndex(p => p.ws === server)
        if (idx >= 0) {
          this.players[idx].ws = null
          // 60 秒重连窗口
          this.players[idx].reconnectTimer = setTimeout(() => {
            if (this.phase === 'PLAYING' && !this.players[idx].ws) {
              this.finish(idx === 0 ? 2 : 1, '超时未重连')
            }
          }, RECONNECT_MS) as unknown as number
          this.broadcast({ type: 'opponent_left', seat: idx, graceSeconds: 60 })
        } else {
          const si = this.spectators.indexOf(server)
          if (si >= 0) this.spectators.splice(si, 1)
        }
      })

      return new Response(null, { status: 101, webSocket: client })
    }

    return json({ error: 'Not Found' }, 404, origin)
  }

  async start() {
    if (this.phase !== 'WAITING' || this.players.length < 2) return
    this.phase = 'PLAYING'
    this.turn = Math.random() < 0.5 ? 0 : 1
    this.timers = Array(this.seats).fill(TURN_MS)
    this.broadcast({ type: 'state', board: this.board, turn: this.turn, timers: this.timers, phase: this.phase, players: this.players.map(p => ({ nick: p.nick, seat: p.seat })) })
    this.armTimer()
  }

  armTimer() {
    if (this.timerAlarm) clearTimeout(this.timerAlarm)
    this.timerAlarm = setTimeout(() => {
      if (this.phase !== 'PLAYING') return
      const t = (this.timers[this.turn] || 0) - 1000
      this.timers[this.turn] = Math.max(0, t)
      if (t <= 0) { this.finish(this.turn === 0 ? 2 : 1, '超时'); return }
      this.broadcast({ type: 'timer', seat: this.turn, remaining: this.timers[this.turn] })
      this.armTimer()
    }, 1000) as unknown as number
  }

  armWaitTimer() {
    setTimeout(() => {
      if (this.phase === 'WAITING' && this.players.length < this.seats) {
        this.broadcast({ type: 'room_closed', reason: '等待超时' })
        this.phase = 'FINISHED'
      }
    }, WAIT_TIMEOUT_MS)
  }

  async handleMove(seat: number, msg: any) {
    if (this.phase !== 'PLAYING') return
    if (seat !== this.turn) { this.sendTo(seat, { type: 'illegal', reason: '还没轮到你' }); return }
    const { r, c } = msg.move || {}
    if (!Number.isInteger(r) || !Number.isInteger(c) || !inBoard(r, c)) {
      this.sendTo(seat, { type: 'illegal', reason: '落点非法' }); return
    }
    if (this.board[idx(r, c)] !== 0) {
      this.sendTo(seat, { type: 'illegal', reason: '此处已有棋子' }); return
    }
    this.board[idx(r, c)] = seat + 1
    this.moves.push({ seat, r, c })
    const winner = checkWin(this.board, r, c)
    this.broadcast({ type: 'move_ok', seat, move: { r, c }, board: this.board, nextTurn: winner ? -1 : (this.turn === 0 ? 1 : 0) })
    if (winner) {
      await this.finish(winner, '五连')
      return
    }
    // 和棋（棋盘满）
    if (this.moves.length >= BOARD * BOARD) { await this.finish(0, '棋盘已满'); return }
    this.turn = this.turn === 0 ? 1 : 0
  }

  async finish(winnerSeat: number, reason: string) {
    if (this.phase === 'FINISHED') return
    this.phase = 'FINISHED'
    if (this.timerAlarm) clearTimeout(this.timerAlarm)
    // 服务端权威记分：胜 3 / 平 1 / 负 0
    const scores = this.players.map(p => (winnerSeat === 0 ? 1 : p.seat === winnerSeat - 1 ? 3 : 0))
    this.broadcast({ type: 'gameover', winner: winnerSeat, reason, scores, players: this.players.map(p => ({ nick: p.nick, seat: p.seat })) })
    // 写排行榜（服务端权威，await 保证完成 —— DO 内 fire-and-forget 会被回收丢弃）
    try {
      const raw = await this.env.RANK.get(`rank:ezchess:gomoku:all`)
      const list = raw ? JSON.parse(raw as string) as any[] : []
      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i]
        if (!p.deviceId) continue
        const existing = list.findIndex((r: any) => r.deviceId === p.deviceId)
        if (existing >= 0) list[existing].score += scores[i]
        else list.push({ player: p.nick, score: scores[i], ts: Date.now() / 1000, deviceId: p.deviceId })
      }
      list.sort((a: any, b: any) => b.score - a.score)
      await this.env.RANK.put(`rank:ezchess:gomoku:all`, JSON.stringify(list.slice(0, 100)))
    } catch (e) { /* 记分失败不阻塞对局结束 */ }
    // 对局存档
    await this.state.storage.put('archive', { moves: this.moves, winner: winnerSeat, reason, players: this.players.map(p => ({ nick: p.nick, seat: p.seat })) })
  }

  broadcast(msg: any) {
    const data = JSON.stringify(msg)
    for (const p of this.players) { if (p.ws) { try { p.ws.send(data) } catch { /* 忽略 */ } } }
    for (const s of this.spectators) { try { s.send(data) } catch { /* 忽略 */ } }
  }

  sendTo(seat: number, msg: any) {
    const p = this.players[seat]
    if (p?.ws) { try { p.ws.send(JSON.stringify(msg)) } catch { /* 忽略 */ } }
  }
}

// ==================== REST 入口 ====================
async function handleRequest(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url)
  const origin = request.headers.get('Origin')
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) })

  // 健康检查
  if (url.pathname === '/' || url.pathname === '/api/health') {
    return json({ success: true, name: 'ezchess-api', v: 3, time: Date.now() }, 200, origin)
  }

  // 创建房间
  if (url.pathname === '/api/room/create' && request.method === 'POST') {
    const body = await request.json() as any
    const game = body.game || 'gomoku'
    const deviceId = body.player?.deviceId || ''
    const nick = body.player?.nick || '玩家'
    if (!GAMES.includes(game) || !deviceId) return json({ error: '参数异常' }, 400, origin)
    const seats = game === 'ccheckers' ? Math.min(Math.max(parseInt(body.players) || 2, 2), 6) : 2
    const roomId = uid()
    const id = env.GAME_ROOMS.idFromName(roomId)
    const stub = env.GAME_ROOMS.get(id)
    await stub.fetch('http://room/init', {
      method: 'POST',
      body: JSON.stringify({ game, seats, roomId }),
    })
    await env.RANK.put(`room:${roomId}`, JSON.stringify({ game, seats, mode: body.mode || 'friend', owner: deviceId, createdAt: Date.now() }), { expirationTtl: 7200 })
    return json({ success: true, roomId, wsUrl: `/game/${roomId}/ws?deviceId=${encodeURIComponent(deviceId)}&nick=${encodeURIComponent(nick)}` }, 200, origin)
  }

  // 快速匹配
  if (url.pathname === '/api/room/match' && request.method === 'POST') {
    const body = await request.json() as any
    const game = body.game || 'gomoku'
    const deviceId = body.player?.deviceId || ''
    const nick = body.player?.nick || '玩家'
    if (!GAMES.includes(game) || !deviceId) return json({ error: '参数异常' }, 400, origin)
    // 匹配队列：等一个对手
    const matchKey = `match:${game}`
    const waiting = await env.RANK.get(matchKey)
    if (waiting) {
      const opp = JSON.parse(waiting)
      await env.RANK.delete(matchKey)
      const roomId = uid()
      const id = env.GAME_ROOMS.idFromName(roomId)
      const stub = env.GAME_ROOMS.get(id)
      await stub.fetch('http://room/init', { method: 'POST', body: JSON.stringify({ game, seats: 2, roomId }) })
      return json({ success: true, roomId, opp: opp.nick, wsUrl: `/game/${roomId}/ws?deviceId=${encodeURIComponent(deviceId)}&nick=${encodeURIComponent(nick)}` }, 200, origin)
    }
    await env.RANK.put(matchKey, JSON.stringify({ deviceId, nick }), { expirationTtl: 60 })
    return json({ success: true, waiting: true }, 200, origin)
  }

  // 房间信息
  if (url.pathname === '/api/room/info' && request.method === 'GET') {
    const roomId = url.searchParams.get('roomId') || ''
    const meta = await env.RANK.get(`room:${roomId}`)
    if (!meta) return json({ error: '房间不存在或已过期' }, 404, origin)
    return json({ success: true, ...JSON.parse(meta) }, 200, origin)
  }

  // 对局通道：/game/<roomId>/ws → 路由到 Durable Object（WS 升级）
  if (url.pathname.startsWith('/game/')) {
    try {
      const parts = url.pathname.split('/')
      const roomId = parts[2]
      if (!roomId) return json({ error: '房间号无效' }, 400, origin)
      const stub = env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName(roomId))
      return stub.fetch(request)
    } catch (e: any) {
      return json({ error: '对局通道异常: ' + (e?.message || String(e)) }, 500, origin)
    }
  }

  return json({ error: 'Not Found' }, 404, origin)
}

// ==================== 入口（ES Module 格式） ====================
export default {
  async fetch(request: Request, env: any): Promise<Response> {
    return handleRequest(request, env)
  },
}
