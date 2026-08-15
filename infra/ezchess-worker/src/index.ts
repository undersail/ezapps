// ezchess-api Worker：经典棋类对战平台（M1 五子棋 MVP）
// 架构：REST（建房/匹配）+ WebSocket（对局）+ Durable Object（每局 1 实例）
// 结算：服务端权威记分（无客户端伪造空间），写 rank:ezchess:<game>:all

const SECRET: string = typeof API_SECRET !== 'undefined' && API_SECRET ? API_SECRET : 'ezchess-secret-2026'
const CORS_ORIGINS = ['https://ezapps.cc', 'https://ezapps.pages.dev', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5173']
const GAMES = ['gomoku', 'reversi', 'checkers', 'chess', 'go', 'ccheckers', 'xiangqi']
const BOARD = 15          // 五子棋棋盘 15×15
const RECONNECT_MS = 60000
const WAIT_TIMEOUT_MS = 120000
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

// ==================== 黑白棋规则（8×8 翻转） ====================
const RV = 8
function rvInit(): number[] {
  const b = new Array(RV * RV).fill(0)
  b[3 * RV + 3] = 1; b[3 * RV + 4] = 2
  b[4 * RV + 3] = 2; b[4 * RV + 4] = 1
  return b
}
const RV_DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]
function rvFlips(board: number[], r: number, c: number, seat: number): number[] {
  const me = seat + 1, opp = seat === 0 ? 2 : 1
  const flips: number[] = []
  for (const [dr, dc] of RV_DIRS) {
    let rr = r + dr, cc = c + dc, line: number[] = []
    while (rr >= 0 && rr < RV && cc >= 0 && cc < RV && board[rr * RV + cc] === opp) {
      line.push(rr * RV + cc)
      rr += dr; cc += dc
    }
    if (rr >= 0 && rr < RV && cc >= 0 && cc < RV && board[rr * RV + cc] === me && line.length > 0) {
      flips.push(...line)
    }
  }
  return flips
}
function rvHasMove(board: number[], seat: number): boolean {
  for (let r = 0; r < RV; r++) for (let c = 0; c < RV; c++) {
    if (board[r * RV + c] === 0 && rvFlips(board, r, c, seat).length > 0) return true
  }
  return false
}

// ==================== 围棋（13 路入门款） ====================
// 棋盘 169 格：0 空、1 黑、2 白；黑先
// 含：气/提子/自杀禁/打劫（禁止立即回提）/双方 pass 终局数子（黑贴 7.5）
const GO = 13
const GO_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]]
function goInit(): number[] { return new Array(169).fill(0) }

// 连通组及其气（返回 { group: number[], liberties: number[] }）
function goGroupInfo(board: number[], start: number): { group: number[]; liberties: number[] } {
  const player = board[start]
  const group: number[] = []
  const liberties: number[] = []
  const seen = new Set<number>()
  const queue = [start]
  seen.add(start)
  while (queue.length) {
    const i = queue.pop()!
    group.push(i)
    const r = Math.floor(i / GO), c = i % GO
    for (const [dr, dc] of GO_DIRS) {
      const rr = r + dr, cc = c + dc
      if (rr < 0 || rr >= GO || cc < 0 || cc >= GO) continue
      const j = rr * GO + cc
      if (seen.has(j)) continue
      if (board[j] === 0) { liberties.push(j); seen.add(j) }
      else if (board[j] === player) { seen.add(j); queue.push(j) }
    }
  }
  return { group, liberties }
}

// 尝试落子：返回 { ok, board, captured, koPoint, reason }
function goTryMove(board: number[], r: number, c: number, player: number, koPoint: number): { ok: boolean; board?: number[]; captured?: number[]; koPoint?: number; reason?: string } {
  const i = r * GO + c
  if (board[i] !== 0) return { ok: false, reason: '该位置已有棋子' }
  if (i === koPoint) return { ok: false, reason: '打劫：不能立即回提' }
  const nb = [...board]
  nb[i] = player
  const opp = player === 1 ? 2 : 1
  // 提对方无气组
  const captured: number[] = []
  for (const [dr, dc] of GO_DIRS) {
    const rr = r + dr, cc = c + dc
    if (rr < 0 || rr >= GO || cc < 0 || cc >= GO) continue
    const j = rr * GO + cc
    if (nb[j] === opp) {
      const info = goGroupInfo(nb, j)
      if (info.liberties.length === 0) {
        for (const g of info.group) { nb[g] = 0; captured.push(g) }
      }
    }
  }
  // 自杀检查
  const mine = goGroupInfo(nb, i)
  if (mine.liberties.length === 0) return { ok: false, reason: '自杀落子禁止' }
  // 打劫点：本次恰好单提对方一子
  const ko = captured.length === 1 ? captured[0] : -1
  return { ok: true, board: nb, captured, koPoint: ko }
}

// 终局数子（双方 pass 后）：黑得分 = 黑子 + 黑空；白同理；空点判归属（邻接单方则归该方）
function goScore(board: number[]): { black: number; white: number } {
  let black = 0, white = 0
  for (let i = 0; i < 169; i++) {
    if (board[i] === 1) black++
    else if (board[i] === 2) white++
  }
  // 空点归属：BFS 空点组，看邻接棋子颜色
  const seen = new Set<number>()
  for (let i = 0; i < 169; i++) {
    if (board[i] !== 0 || seen.has(i)) continue
    const queue = [i]; seen.add(i)
    const group: number[] = []
    let touchBlack = false, touchWhite = false
    while (queue.length) {
      const j = queue.pop()!
      group.push(j)
      const r = Math.floor(j / GO), c = j % GO
      for (const [dr, dc] of GO_DIRS) {
        const rr = r + dr, cc = c + dc
        if (rr < 0 || rr >= GO || cc < 0 || cc >= GO) continue
        const k = rr * GO + cc
        if (board[k] === 0) { if (!seen.has(k)) { seen.add(k); queue.push(k) } }
        else if (board[k] === 1) touchBlack = true
        else if (board[k] === 2) touchWhite = true
      }
    }
    if (touchBlack && !touchWhite) black += group.length
    else if (touchWhite && !touchBlack) white += group.length
  }
  return { black, white }
}

// ==================== 国际象棋（8×8） ====================
// 棋子编码：1白兵 2白车 3白马 4白象 5白后 6白王 | 11黑兵 12黑车 13黑马 14黑象 15黑后 16黑王
// MVP 简化：含兵升变/将军/将死/逼和；王车易位与吃过路兵暂不做
const CH = 8
function chInit(): number[] {
  const b = new Array(64).fill(0)
  const back = [2, 3, 4, 5, 6, 4, 3, 2]   // 车马象后王象马车（白方编码）
  for (let c = 0; c < 8; c++) {
    b[0 * 8 + c] = back[c]      // 白方底线（r0）
    b[1 * 8 + c] = 1            // 白兵
    b[6 * 8 + c] = 11           // 黑兵
    b[7 * 8 + c] = back[c] + 10 // 黑方底线
  }
  return b
}
function chOwner(v: number) { return v === 0 ? -1 : (v < 10 ? 0 : 1) }
const CH_DIRS = { rook: [[-1, 0], [1, 0], [0, -1], [0, 1]], bishop: [[-1, -1], [-1, 1], [1, -1], [1, 1]], king: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]] }
const KNIGHT_DELTAS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]

// 某格是否被 owner 方攻击
function chAttacked(board: number[], r: number, c: number, byOwner: number): boolean {
  // 车/后：横竖
  for (const [dr, dc] of CH_DIRS.rook) {
    let rr = r + dr, cc = c + dc
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
      const v = board[rr * 8 + cc]
      if (v !== 0) {
        if (chOwner(v) === byOwner && (v % 10 === 2 || v % 10 === 5)) return true
        break
      }
      rr += dr; cc += dc
    }
  }
  // 象/后：斜
  for (const [dr, dc] of CH_DIRS.bishop) {
    let rr = r + dr, cc = c + dc
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
      const v = board[rr * 8 + cc]
      if (v !== 0) {
        if (chOwner(v) === byOwner && (v % 10 === 4 || v % 10 === 5)) return true
        break
      }
      rr += dr; cc += dc
    }
  }
  // 马
  for (const [dr, dc] of KNIGHT_DELTAS) {
    const rr = r + dr, cc = c + dc
    if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
      const v = board[rr * 8 + cc]
      if (v !== 0 && chOwner(v) === byOwner && v % 10 === 3) return true
    }
  }
  // 王
  for (const [dr, dc] of CH_DIRS.king) {
    const rr = r + dr, cc = c + dc
    if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
      const v = board[rr * 8 + cc]
      if (v !== 0 && chOwner(v) === byOwner && v % 10 === 6) return true
    }
  }
  // 兵（白兵向下攻击，黑兵向上）
  const pr = byOwner === 0 ? r - 1 : r + 1
  for (const pc of [c - 1, c + 1]) {
    if (pr >= 0 && pr < 8 && pc >= 0 && pc < 8) {
      const v = board[pr * 8 + pc]
      if (v !== 0 && chOwner(v) === byOwner && v % 10 === 1) return true
    }
  }
  return false
}

// 生成 owner 方的伪合法走法（不含将军过滤）
function chPseudoMoves(board: number[], owner: number): { from: number; to: number; promote?: boolean }[] {
  const moves: { from: number; to: number; promote?: boolean }[] = []
  const dir = owner === 0 ? 1 : -1          // 白方在顶部（r0-1）向下推进，黑方向上
  const startRow = owner === 0 ? 1 : 6
  const promoteRow = owner === 0 ? 7 : 0
  for (let i = 0; i < 64; i++) {
    const v = board[i]
    if (v === 0 || chOwner(v) !== owner) continue
    const r = Math.floor(i / 8), c = i % 8
    const type = v % 10
    const add = (rr: number, cc: number, promote = false) => {
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) moves.push({ from: i, to: rr * 8 + cc, promote })
    }
    if (type === 1) {   // 兵
      const fr = r + dir
      if (fr >= 0 && fr < 8 && board[fr * 8 + c] === 0) {
        add(fr, c, fr === promoteRow)
        if (r === startRow && board[(r + 2 * dir) * 8 + c] === 0) add(r + 2 * dir, c)
      }
      for (const pc of [c - 1, c + 1]) {
        if (pc >= 0 && pc < 8 && fr >= 0 && fr < 8) {
          const t = board[fr * 8 + pc]
          if (t !== 0 && chOwner(t) !== owner) add(fr, pc, fr === promoteRow)
        }
      }
    } else if (type === 2 || type === 4 || type === 5) {   // 车/象/后
      const dirs = type === 2 ? CH_DIRS.rook : type === 4 ? CH_DIRS.bishop : [...CH_DIRS.rook, ...CH_DIRS.bishop]
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
          const t = board[rr * 8 + cc]
          if (t === 0) { moves.push({ from: i, to: rr * 8 + cc }); rr += dr; cc += dc }
          else {
            if (chOwner(t) !== owner) moves.push({ from: i, to: rr * 8 + cc })
            break
          }
        }
      }
    } else if (type === 3) {   // 马
      for (const [dr, dc] of KNIGHT_DELTAS) {
        const rr = r + dr, cc = c + dc
        if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && chOwner(board[rr * 8 + cc]) !== owner) add(rr, cc)
      }
    } else if (type === 6) {   // 王
      for (const [dr, dc] of CH_DIRS.king) {
        const rr = r + dr, cc = c + dc
        if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && chOwner(board[rr * 8 + cc]) !== owner) add(rr, cc)
      }
    }
  }
  return moves
}

// 合法走法（走完后己方王不能被攻击）
function chLegalMoves(board: number[], owner: number): { from: number; to: number; promote?: boolean }[] {
  const out: { from: number; to: number; promote?: boolean }[] = []
  for (const m of chPseudoMoves(board, owner)) {
    const nb = [...board]
    nb[m.to] = nb[m.from]; nb[m.from] = 0
    if (m.promote) nb[m.to] = owner === 0 ? 5 : 15
    // 找己方王
    const kType = owner === 0 ? 6 : 16
    const ki = nb.indexOf(kType)
    if (ki < 0) continue
    if (!chAttacked(nb, Math.floor(ki / 8), ki % 8, owner === 0 ? 1 : 0)) out.push(m)
  }
  return out
}

// 判断状态：返回 { over, winner(1白/2黑/0和棋), reason }
function chStatus(board: number[], owner: number): { over: boolean; winner: number; reason: string } {
  const moves = chLegalMoves(board, owner)
  const opp = owner === 0 ? 1 : 0
  // 找 owner 的王是否被攻击
  const kType = owner === 0 ? 6 : 16
  const ki = board.indexOf(kType)
  const inCheck = ki >= 0 && chAttacked(board, Math.floor(ki / 8), ki % 8, opp)
  if (moves.length === 0) {
    if (inCheck) return { over: true, winner: opp + 1, reason: '将死（Checkmate）' }
    return { over: true, winner: 0, reason: '逼和（Stalemate）' }
  }
  return { over: false, winner: 0, reason: '' }
}

// ==================== 中国象棋（9×10） ====================
// 编码：红 1帅 2仕 3相 4马 5车 6炮 7兵 | 黑 11将 12士 13象 14马 15车 16炮 17卒
// 棋盘：90 格 i = r*9+c（r0-9 行，c0-8 列）；红方在底部（r7-9）
const XQ = 9
function xqInit(): number[] {
  const b = new Array(90).fill(0)
  const row9 = [5, 4, 3, 2, 1, 2, 3, 4, 5]   // 车马相仕帅仕相马车
  for (let c = 0; c < 9; c++) {
    b[9 * 9 + c] = row9[c]      // 红底线
    b[0 * 9 + c] = row9[c] + 10 // 黑底线
    if (c % 2 === 0) { b[6 * 9 + c] = 7; b[3 * 9 + c] = 17 }   // 红兵/黑卒
  }
  b[7 * 9 + 1] = 6; b[7 * 9 + 7] = 6   // 红炮
  b[2 * 9 + 1] = 16; b[2 * 9 + 7] = 16 // 黑炮
  return b
}
function xqOwner(v: number) { return v === 0 ? -1 : (v < 10 ? 0 : 1) }
// 九宫（红 r7-9 c3-5；黑 r0-2 c3-5）
function xqInPalace(r: number, c: number, owner: number) {
  if (c < 3 || c > 5) return false
  return owner === 0 ? (r >= 7 && r <= 9) : (r >= 0 && r <= 2)
}
// 某格是否被 byOwner 方攻击（将军判定用）
function xqAttacked(board: number[], r: number, c: number, byOwner: number): boolean {
  // 车/炮/帅（横竖扫描）
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  for (const [dr, dc] of dirs) {
    let rr = r + dr, cc = c + dc, jumped = false
    while (rr >= 0 && rr < 10 && cc >= 0 && cc < 9) {
      const v = board[rr * 9 + cc]
      if (v === 0) { rr += dr; cc += dc; continue }
      const t = v % 10
      if (!jumped) {
        // 车/帅将：直线上第一个子
        if (xqOwner(v) === byOwner && (t === 5 || t === 1)) return true
      } else {
        // 炮：隔一个子吃
        if (xqOwner(v) === byOwner && t === 6) return true
        break
      }
      jumped = true
      rr += dr; cc += dc
    }
  }
  // 马（日字 + 马脚）：攻击检测中马脚横坐标跟随马位（竖 2 步的 leg 为 [±1,±1]）
  const horse = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
  const leg = [[-1, -1], [-1, 1], [0, -1], [0, 1], [0, -1], [0, 1], [1, -1], [1, 1]]
  for (let k = 0; k < 8; k++) {
    const rr = r + horse[k][0], cc = c + horse[k][1]
    if (rr < 0 || rr >= 10 || cc < 0 || cc >= 9) continue
    const v = board[rr * 9 + cc]
    if (v !== 0 && xqOwner(v) === byOwner && v % 10 === 4) {
      const lr = r + leg[k][0], lc = c + leg[k][1]
      if (board[lr * 9 + lc] === 0) return true
    }
  }
  // 兵/卒（过河后可横吃）
  const pr = byOwner === 0 ? r + 1 : r - 1   // 红兵在下方向上攻（红兵在目标下方一格）
  if (pr >= 0 && pr < 10) {
    const v = board[pr * 9 + c]
    if (v !== 0 && xqOwner(v) === byOwner && v % 10 === 7) return true
  }
  for (const pc of [c - 1, c + 1]) {   // 过河后的横向攻击
    if (pc >= 0 && pc < 9) {
      const v = board[r * 9 + pc]
      if (v !== 0 && xqOwner(v) === byOwner && v % 10 === 7) {
        const crossed = byOwner === 0 ? r <= 4 : r >= 5
        if (crossed) return true
      }
    }
  }
  return false
}

// 生成 owner 方所有合法走法（含送将过滤）
function xqLegalMoves(board: number[], owner: number): { from: number; to: number }[] {
  const moves: { from: number; to: number }[] = []
  const dir = owner === 0 ? -1 : 1   // 红向上（r 减），黑向下（r 增）
  for (let i = 0; i < 90; i++) {
    const v = board[i]
    if (v === 0 || xqOwner(v) !== owner) continue
    const r = Math.floor(i / 9), c = i % 9
    const t = v % 10
    const tryMove = (rr: number, cc: number) => {
      if (rr < 0 || rr >= 10 || cc < 0 || cc >= 9) return
      const tv = board[rr * 9 + cc]
      if (tv !== 0 && xqOwner(tv) === owner) return
      moves.push({ from: i, to: rr * 9 + cc })
    }
    if (t === 1) {   // 帅/将：九宫一格 + 飞将（对脸）
      if (xqInPalace(r + 1, c, owner)) tryMove(r + 1, c)
      if (xqInPalace(r - 1, c, owner)) tryMove(r - 1, c)
      if (xqInPalace(r, c + 1, owner)) tryMove(r, c + 1)
      if (xqInPalace(r, c - 1, owner)) tryMove(r, c - 1)
      // 飞将：同列直线上对方将/帅且无子隔
      let rr = r + dir, cc = c
      while (rr >= 0 && rr < 10) {
        const tv = board[rr * 9 + cc]
        if (tv !== 0) {
          if (xqOwner(tv) !== owner && tv % 10 === 1) moves.push({ from: i, to: rr * 9 + cc })
          break
        }
        rr += dir
      }
    } else if (t === 2) {   // 仕/士：九宫斜一格
      for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
        if (xqInPalace(r + dr, c + dc, owner)) tryMove(r + dr, c + dc)
      }
    } else if (t === 3) {   // 相/象：田字，象眼，不过河（红相 r≥5，黑象 r≤4）
      for (const [dr, dc] of [[-2, -2], [-2, 2], [2, -2], [2, 2]]) {
        const rr = r + dr, cc = c + dc
        if (rr < 0 || rr >= 10 || cc < 0 || cc >= 9) continue
        if (owner === 0 ? rr < 5 : rr > 4) continue   // 红相不过河(r≥5)，黑象不过河(r≤4)
        if (board[(r + dr / 2) * 9 + (c + dc / 2)] !== 0) continue   // 象眼
        tryMove(rr, cc)
      }
    } else if (t === 4) {   // 马：日字 + 马脚
      const horse = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
      const leg = [[-1, 0], [-1, 0], [0, -1], [0, 1], [0, -1], [0, 1], [1, 0], [1, 0]]
      for (let k = 0; k < 8; k++) {
        const rr = r + horse[k][0], cc = c + horse[k][1]
        if (rr < 0 || rr >= 10 || cc < 0 || cc >= 9) continue
        if (board[(r + leg[k][0]) * 9 + (c + leg[k][1])] !== 0) continue   // 马脚
        tryMove(rr, cc)
      }
    } else if (t === 5) {   // 车
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        let rr = r + dr, cc = c + dc
        while (rr >= 0 && rr < 10 && cc >= 0 && cc < 9) {
          const tv = board[rr * 9 + cc]
          if (tv === 0) { moves.push({ from: i, to: rr * 9 + cc }); rr += dr; cc += dc }
          else { if (xqOwner(tv) !== owner) moves.push({ from: i, to: rr * 9 + cc }); break }
        }
      }
    } else if (t === 6) {   // 炮：移动如车（不吃时无隔），吃子需隔一炮架
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        let rr = r + dr, cc = c + dc, jumped = false
        while (rr >= 0 && rr < 10 && cc >= 0 && cc < 9) {
          const tv = board[rr * 9 + cc]
          if (tv === 0) { if (!jumped) moves.push({ from: i, to: rr * 9 + cc }); rr += dr; cc += dc; continue }
          if (!jumped) { jumped = true; rr += dr; cc += dc; continue }
          if (xqOwner(tv) !== owner) moves.push({ from: i, to: rr * 9 + cc })
          break
        }
      }
    } else if (t === 7) {   // 兵/卒：过河前只能前进，过河后可横走
      tryMove(r + dir, c)
      const crossed = owner === 0 ? r <= 4 : r >= 5
      if (crossed) { tryMove(r, c - 1); tryMove(r, c + 1) }
    }
  }
  // 送将过滤：走完后己方帅/将不能被攻击
  const kType = owner === 0 ? 1 : 11
  const opp = owner === 0 ? 1 : 0
  const out: { from: number; to: number }[] = []
  for (const m of moves) {
    const nb = [...board]
    nb[m.to] = nb[m.from]; nb[m.from] = 0
    const ki = nb.indexOf(kType)
    if (ki >= 0 && !xqAttacked(nb, Math.floor(ki / 9), ki % 9, opp)) out.push(m)
  }
  return out
}

// 状态判定：{ over, winner(1红/2黑/0和), reason }
function xqStatus(board: number[], owner: number): { over: boolean; winner: number; reason: string } {
  const moves = xqLegalMoves(board, owner)
  const opp = owner === 0 ? 1 : 0
  const kType = owner === 0 ? 1 : 11
  const ki = board.indexOf(kType)
  const inCheck = ki >= 0 && xqAttacked(board, Math.floor(ki / 9), ki % 9, opp)
  if (moves.length === 0) {
    if (inCheck) return { over: true, winner: opp + 1, reason: '将死' }
    return { over: true, winner: 0, reason: '困毙' }
  }
  return { over: false, winner: 0, reason: '' }
}

// ==================== 国际跳棋（8×8 黑白格） ====================
const CK = 8
function ckInit(): number[] {
  const b = new Array(64).fill(0)
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 0) b[r * 8 + c] = -1   // 浅色格无效
      else if (r < 3) b[r * 8 + c] = 1           // seat0 顶 3 行
      else if (r > 4) b[r * 8 + c] = 2           // seat1 底 3 行
    }
  }
  return b
}
function ckIsKing(v: number) { return v === 3 || v === 4 }
function ckOwner(v: number) { if (v === 1 || v === 3) return 0; if (v === 2 || v === 4) return 1; return -1 }
// 计算某玩家所有合法走法（跳吃优先）
function ckMoves(board: number[], seat: number): { from: number; to: number; jump: boolean }[] {
  const moves: { from: number; to: number; jump: boolean }[] = []
  const dirs = [[1, -1], [1, 1], [-1, -1], [-1, 1]]
  const forward = seat === 0 ? [1] : [-1]   // seat0 向下走，seat1 向上走
  for (let i = 0; i < 64; i++) {
    if (board[i] === -1 || board[i] === 0) continue   // 跳过浅色格和空格
    const v = board[i]
    if (ckOwner(v) !== seat) continue
    const r = Math.floor(i / 8), c = i % 8
    const isKing = ckIsKing(v)
    const walkDirs = isKing ? dirs : dirs.filter(([dr]) => forward.includes(dr))
    for (const [dr, dc] of walkDirs) {
      // 一步走
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr * 8 + nc] === 0) {
        moves.push({ from: i, to: nr * 8 + nc, jump: false })
      }
      // 跳吃：斜 2 格（王可跳任意距离，中间恰一敌子）
      if (isKing) {
        let mr = r + dr, mc = c + dc
        while (mr >= 0 && mr < 8 && mc >= 0 && mc < 8) {
          const mv = board[mr * 8 + mc]
          if (mv === 0) { mr += dr; mc += dc; continue }
          if (ckOwner(mv) !== seat) {
            // 敌子后方连续空格都可落
            let lr = mr + dr, lc = mc + dc
            while (lr >= 0 && lr < 8 && lc >= 0 && lc < 8 && board[lr * 8 + lc] === 0) {
              moves.push({ from: i, to: lr * 8 + lc, jump: true })
              lr += dr; lc += dc
            }
          }
          break
        }
      } else {
        const mr = r + 2 * dr, mc = c + 2 * dc
        if (mr >= 0 && mr < 8 && mc >= 0 && mc < 8) {
          const mid = board[(r + dr) * 8 + (c + dc)]
          if (mid !== 0 && mid !== -1 && ckOwner(mid) !== seat && board[mr * 8 + mc] === 0) {
            moves.push({ from: i, to: mr * 8 + mc, jump: true })
          }
        }
      }
    }
  }
  return moves
}
// 王棋升级
function ckPromote(board: number[], i: number) {
  const r = Math.floor(i / 8), v = board[i]
  if (v === 1 && r === 7) board[i] = 3
  if (v === 2 && r === 0) board[i] = 4
}

const CC = 17
const CC_DELTAS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, 1], [1, -1]]
function ccValidSet(): Set<number> {
  const s = new Set<number>()
  // 标准六角星 121 点：行宽 1,2,3,4,13,12,11,10,9,10,11,12,13,4,3,2,1（左对齐）
  const lens = [1, 2, 3, 4, 13, 12, 11, 10, 9, 10, 11, 12, 13, 4, 3, 2, 1]
  for (let r = 0; r < CC; r++) {
    const len = lens[r]
    const c0 = r < 4 ? 8 - r : (r < 9 ? r - 4 : (r < 13 ? 13 - len : 9 - len))
    for (let i = 0; i < len; i++) s.add(r * CC + (c0 + i))
  }
  return s
}
const CC_VALID = ccValidSet()
function ccNeighbors(pt: number): number[] {
  const r = Math.floor(pt / CC), c = pt % CC
  const out: number[] = []
  for (const [dr, dc] of CC_DELTAS) {
    const nr = r + dr, nc = c + dc
    const np = nr * CC + nc
    if (CC_VALID.has(np)) out.push(np)
  }
  return out
}
function ccCamps(): number[][] {
  // 六角星角营地（各 10 点）：顶 r0-3 / 右上 / 右下 / 底 r13-16 / 左下 / 左上
  const p = (r: number, c: number) => r * CC + c
  return [
    [p(0, 8), p(1, 7), p(1, 8), p(2, 6), p(2, 7), p(2, 8), p(3, 5), p(3, 6), p(3, 7), p(3, 8)],
    [p(4, 9), p(4, 10), p(4, 11), p(4, 12), p(5, 10), p(5, 11), p(5, 12), p(6, 11), p(6, 12), p(7, 12)],
    [p(9, 12), p(10, 11), p(10, 12), p(11, 10), p(11, 11), p(11, 12), p(12, 9), p(12, 10), p(12, 11), p(12, 12)],
    [p(13, 5), p(13, 6), p(13, 7), p(13, 8), p(14, 6), p(14, 7), p(14, 8), p(15, 7), p(15, 8), p(16, 8)],
    [p(9, 0), p(10, 0), p(10, 1), p(11, 0), p(11, 1), p(11, 2), p(12, 0), p(12, 1), p(12, 2), p(12, 3)],
    [p(4, 0), p(4, 1), p(4, 2), p(4, 3), p(5, 0), p(5, 1), p(5, 2), p(6, 0), p(6, 1), p(7, 0)],
  ]
}
const CC_CAMPS = ccCamps()
// 对角营地映射：顶↔底、右上↔左下、右下↔左上
const CC_TARGET = [[3, 0], [4, 1], [5, 2]]  // seat0→camp3, seat1→camp4, seat2→camp5, seat3→camp0 ...
function ccCampOf(pt: number): number {
  for (let i = 0; i < 6; i++) if (CC_CAMPS[i].includes(pt)) return i
  return -1
}
function ccInit(seats: number): number[] {
  const b = new Array(CC * CC).fill(-1)
  for (const p of CC_VALID) b[p] = 0
  // 2-6 人：按座位分配起始营地（0,3 顶底；2人：0/3；3人：0,2,4；4人：0,2,3,5?；6人：全）
  const startCamps = seats === 2 ? [0, 3] : seats === 3 ? [0, 2, 4] : seats === 4 ? [0, 2, 3, 5] : seats === 5 ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5]
  const targetOf = (camp: number) => CC_TARGET.find(t => t[0] === camp)?.[1] ?? -1
  startCamps.forEach((camp, seat) => {
    for (const p of CC_CAMPS[camp]) b[p] = seat + 1
  })
  return b
}
function ccCanJump(board: number[], from: number, to: number): boolean {
  if (board[to] !== 0 || !CC_VALID.has(to)) return false
  const fr = Math.floor(from / CC), fc = from % CC
  const tr = Math.floor(to / CC), tc = to % CC
  const mid = Math.floor((fr + tr) / 2) * CC + Math.floor((fc + tc) / 2)
  return board[mid] !== 0 && board[mid] !== -1
}

// ==================== Durable Object：对局房间 ====================
export class GameRoom {
  state: DurableObjectState
  env: any
  game = 'gomoku'
  seats = 2
  phase: 'WAITING' | 'READY' | 'PLAYING' | 'FINISHED' = 'WAITING'
  board: number[] = emptyBoard()
  players: { deviceId: string; nick: string; seat: number; ws: WebSocket | null; reconnectTimer?: number; disconnectAt?: number }[] = []
  spectators: WebSocket[] = []
  turn = 0
  timers: number[] = []
  moves: { seat: number; r: number; c: number }[] = []
  roomId = ''
  timerAlarm = 0
  rematchSeats: number[] = []   // 同意"再来一局"的座位
  goKo = -1          // 围棋打劫点（禁止立即回提）
  goPass = 0         // 围棋连续 pass 计数（双方 pass 终局）

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

    // 初始化房间（建房时调用：设置 game/seats）
    if (url.pathname === '/init' && req.method === 'POST') {
      const body = await req.json() as any
      this.game = body.game || 'gomoku'
      this.seats = body.seats || 2
      this.roomId = body.roomId || ''
      await this.state.storage.put('meta', { game: this.game, seats: this.seats, roomId: this.roomId })
      return json({ ok: true }, 200, origin)
    }

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

      // 已有玩家 → 重连恢复；新玩家 → 入座（可顶替掉线超时的座位）
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
        // 对局结束且有人请求再来一局 → 补发 offer（重连方能看到）
        if (this.phase === 'FINISHED' && this.rematchSeats.length > 0) {
          server.send(JSON.stringify({ type: 'rematch_offer', seat: this.rematchSeats[0], count: this.rematchSeats.length }))
        }
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
      } else if (this.phase === 'WAITING' && this.players.length >= this.seats) {
        // 房间已满但有人掉线（重连窗口内）：新玩家顶替掉线超 15 秒的座位
        const idx = this.players.findIndex(p => !p.ws && p.disconnectAt && Date.now() - p.disconnectAt > 15000)
        if (idx >= 0) {
          const old = this.players[idx]
          if (old.reconnectTimer) { clearTimeout(old.reconnectTimer); old.reconnectTimer = undefined }
          this.players[idx] = { deviceId, nick: nick.slice(0, 12), seat: old.seat, ws: server }
          this.broadcast({ type: 'player_joined', player: { nick, seat: old.seat }, seats: this.players.length })
          server.send(JSON.stringify({ type: 'state', game: this.game, seats: this.seats, phase: this.phase, players: this.players.map(p => ({ nick: p.nick, seat: p.seat })), mySeat: old.seat }))
          await this.start()
        } else {
          this.spectators.push(server)
          server.send(JSON.stringify({ type: 'state', game: this.game, seats: this.seats, phase: this.phase, board: this.board, turn: this.turn, timers: this.timers, players: this.players.map(p => ({ nick: p.nick, seat: p.seat })), spectator: true }))
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
          else if (msg.type === 'rematch' && seat >= 0) {
            // 再来一局：双方同意后重新开局
            if (this.phase !== 'FINISHED') return
            if (!this.rematchSeats.includes(seat)) this.rematchSeats.push(seat)
            this.broadcast({ type: 'rematch_offer', seat, count: this.rematchSeats.length })
            if (this.rematchSeats.length >= this.players.length && this.players.length >= 2) {
              this.rematchSeats = []
              await this.restart()
            }
          }
        } catch (e) { /* 忽略坏消息 */ }
      })

      server.addEventListener('close', async () => {
        const idx = this.players.findIndex(p => p.ws === server)
        if (idx >= 0) {
          this.players[idx].ws = null
          this.players[idx].disconnectAt = Date.now()   // 记录掉线时间（供顶替判定）
          // 对局中掉线：房主转移给在线玩家 + 房间回到大厅列表（可重连/顶替）
          if (this.phase === 'PLAYING') {
            const newOwner = this.players.find(p => p.ws && p.seat !== idx)
            if (newOwner) {
              try {
                await waitingAdd(this.env, this.game, this.roomId, newOwner.nick || '玩家')
                const raw = await this.env.RANK.get(`room:${this.roomId}`)
                if (raw) {
                  const info = JSON.parse(raw)
                  info.owner = newOwner.deviceId
                  await this.env.RANK.put(`room:${this.roomId}`, JSON.stringify(info), { expirationTtl: 7200 })
                }
              } catch (e) { /* 忽略 */ }
            }
          }
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
    try {
      // 从等待房列表移除（失败不影响对局）
      try { await waitingRemove(this.env, this.game, this.roomId) } catch (e) { /* 忽略 */ }
      // 按棋种初始化棋盘
      if (this.game === 'reversi') this.board = rvInit()
      else if (this.game === 'checkers') this.board = ckInit()
      else if (this.game === 'chess') this.board = chInit()
      else if (this.game === 'xiangqi') this.board = xqInit()
      else if (this.game === 'go') this.board = goInit()
      else if (this.game === 'ccheckers') this.board = ccInit(this.seats)
      else this.board = emptyBoard()
      this.goKo = -1
      this.goPass = 0
      this.turn = this.game === 'chess' || this.game === 'go' ? 0 : Math.floor(Math.random() * this.players.length)   // 国象白先/围棋黑先
      this.timers = Array(this.seats).fill(TURN_MS)
      this.moves = []
      this.broadcast({ type: 'state', board: this.board, turn: this.turn, timers: this.timers, phase: this.phase, players: this.players.map(p => ({ nick: p.nick, seat: p.seat })) })
      this.armTimer()
    } catch (e: any) {
      this.broadcast({ type: 'illegal', reason: '开赛错误: ' + (e?.message || String(e)) })
    }
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

  // 再来一局：双方同意后重新开局（FINISHED → PLAYING）
  async restart() {
    this.phase = 'PLAYING'
    if (this.game === 'reversi') this.board = rvInit()
    else if (this.game === 'checkers') this.board = ckInit()
    else if (this.game === 'chess') this.board = chInit()
    else if (this.game === 'xiangqi') this.board = xqInit()
    else if (this.game === 'go') this.board = goInit()
    else if (this.game === 'ccheckers') this.board = ccInit(this.seats)
    else this.board = emptyBoard()
    this.goKo = -1
    this.goPass = 0
    this.turn = this.game === 'chess' || this.game === 'go' ? 0 : Math.floor(Math.random() * this.players.length)   // 国象白先/围棋黑先
    this.timers = Array(this.seats).fill(TURN_MS)
    this.moves = []
    this.broadcast({ type: 'state', board: this.board, turn: this.turn, timers: this.timers, phase: this.phase, players: this.players.map(p => ({ nick: p.nick, seat: p.seat })) })
    this.armTimer()
  }

  armWaitTimer() {
    setTimeout(() => {
      if (this.phase === 'WAITING' && this.players.length < this.seats) {
        // 从等待房列表移除（失败不影响）
        try { void waitingRemove(this.env, this.game, this.roomId) } catch (e) { /* 忽略 */ }
        this.broadcast({ type: 'room_closed', reason: '等待超时' })
        this.phase = 'FINISHED'
      }
    }, WAIT_TIMEOUT_MS)
  }

  async handleMove(seat: number, msg: any) {
    if (this.phase !== 'PLAYING') return
    if (seat !== this.turn) { this.sendTo(seat, { type: 'illegal', reason: '还没轮到你' }); return }

    if (this.game === 'go') {
      // 围棋：{r,c} 落子 或 {pass:true} 放弃一手
      const { r, c, pass } = msg
      if (pass) {
        this.goPass++
        if (this.goPass >= 2) {
          // 双方 pass → 数子终局（黑贴 7.5）
          const sc = goScore(this.board)
          const blackScore = sc.black
          const whiteScore = sc.white + 7.5
          this.broadcast({ type: 'move_ok', seat, move: { pass: true }, board: this.board, nextTurn: -1, goScore: sc })
          await this.finish(blackScore > whiteScore ? 1 : whiteScore > blackScore ? 2 : 0, `终局数子：黑 ${sc.black} 目 vs 白 ${sc.white} 目（白贴 7.5）`)
          return
        }
        this.turn = (this.turn + 1) % this.players.length
        this.broadcast({ type: 'move_ok', seat, move: { pass: true }, board: this.board, nextTurn: this.turn })
        return
      }
      if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || r >= GO || c < 0 || c >= GO) {
        this.sendTo(seat, { type: 'illegal', reason: '落子位置非法' }); return
      }
      const player = seat + 1
      const res = goTryMove(this.board, r, c, player, this.goKo)
      if (!res.ok || !res.board) { this.sendTo(seat, { type: 'illegal', reason: res.reason || '非法落子' }); return }
      this.board = res.board
      this.goKo = res.koPoint ?? -1
      this.goPass = 0
      this.turn = (this.turn + 1) % this.players.length
      const captured = res.captured?.length || 0
      this.broadcast({ type: 'move_ok', seat, move: { r, c }, board: this.board, nextTurn: this.turn, captured })
      return
    }

    if (this.game === 'reversi') {
      const { r, c } = msg.move || {}
      if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || r >= RV || c < 0 || c >= RV) {
        this.sendTo(seat, { type: 'illegal', reason: '落点非法' }); return
      }
      const bi = r * RV + c
      if (this.board[bi] !== 0) { this.sendTo(seat, { type: 'illegal', reason: '此处已有棋子' }); return }
      const flips = rvFlips(this.board, r, c, seat)
      if (flips.length === 0) { this.sendTo(seat, { type: 'illegal', reason: '必须翻转对方棋子' }); return }
      this.board[bi] = seat + 1
      for (const f of flips) this.board[f] = seat + 1
      this.moves.push({ seat, r, c })
      // 结束判定：双方都无子可走
      const opp = seat === 0 ? 1 : 0
      const oppCan = rvHasMove(this.board, opp)
      const meCan = rvHasMove(this.board, seat)
      if (!oppCan && !meCan) {
        const cnt = (s: number) => this.board.filter(v => v === s + 1).length
        const w = cnt(0) === cnt(1) ? 0 : (cnt(0) > cnt(1) ? 1 : 2)
        this.broadcast({ type: 'move_ok', seat, move: { r, c }, board: this.board, nextTurn: -1 })
        await this.finish(w, '无子可落'); return
      }
      if (!oppCan) {
        // 对方跳过（保持自己回合）
        this.sendTo(opp, { type: 'illegal', reason: '你无子可落，回合跳过' })
      } else {
        this.turn = opp
      }
      this.broadcast({ type: 'move_ok', seat, move: { r, c }, board: this.board, nextTurn: this.turn })
      return
    }

    if (this.game === 'checkers') {
      const { from, to } = msg
      if (from === undefined || to === undefined) { this.sendTo(seat, { type: 'illegal', reason: '参数错误' }); return }
      const moves = ckMoves(this.board, seat)
      if (moves.length === 0) {
        // 无子可动 → 判负
        await this.finish(seat === 0 ? 2 : 1, '无子可动')
        return
      }
      // 有跳吃必须跳吃
      const jumps = moves.filter(m => m.jump)
      const legal = (jumps.length > 0 ? jumps : moves).find(m => m.from === from && m.to === to)
      if (!legal) { this.sendTo(seat, { type: 'illegal', reason: '非法走法' }); return }
      // 应用走法
      this.board[to] = this.board[from]
      this.board[from] = 0
      if (legal.jump) {
        // 沿方向移除被跳过的敌子（王棋可能跳多格）
        const fr = Math.floor(from / 8), fc = from % 8, tr = Math.floor(to / 8), tc = to % 8
        const dr = Math.sign(tr - fr), dc = Math.sign(tc - fc)
        let mr = fr + dr, mc = fc + dc
        while (mr !== tr || mc !== tc) {
          if (this.board[mr * 8 + mc] !== 0 && ckOwner(this.board[mr * 8 + mc]) !== seat) {
            this.board[mr * 8 + mc] = 0
          }
          mr += dr; mc += dc
        }
      }
      ckPromote(this.board, to)
      // 连吃：该子还能跳吃则继续（不换人）；否则换人
      const cont = ckMoves(this.board, seat).filter(m => m.jump && m.from === to)
      if (legal.jump && cont.length > 0) {
        this.broadcast({ type: 'state', board: this.board, turn: this.turn })
        this.sendTo(seat, { type: 'must_capture', from: to })
      } else {
        this.turn = (this.turn + 1) % this.players.length
        // 对方无子可动 → 判胜
        const opp = ckMoves(this.board, this.turn)
        if (opp.length === 0) {
          await this.finish(seat + 1, '对方无子可动')
          return
        }
        this.broadcast({ type: 'state', board: this.board, turn: this.turn })
      }
      this.timerAlarm = setTimeout(() => this.timeoutMove(this.turn), MOVE_TIME) as unknown as number
      return
    }

    if (this.game === 'chess') {
      // 国际象棋：{from, to} 移动（服务端权威校验，含将军过滤）
      const { from, to } = msg
      if (!Number.isInteger(from) || !Number.isInteger(to)) {
        this.sendTo(seat, { type: 'illegal', reason: '走法非法' }); return
      }
      if (chOwner(this.board[from]) !== seat) { this.sendTo(seat, { type: 'illegal', reason: '移动的不是你的棋子' }); return }
      const legal = chLegalMoves(this.board, seat).find(m => m.from === from && m.to === to)
      if (!legal) { this.sendTo(seat, { type: 'illegal', reason: '非法走法' }); return }
      // 应用走法（含兵升变）
      this.board[to] = this.board[from]
      this.board[from] = 0
      if (legal.promote) this.board[to] = seat === 0 ? 5 : 15
      // 切换回合 + 判断对方状态（被将军提示 / 将死 / 逼和）
      this.turn = (this.turn + 1) % this.players.length
      const opp = this.turn
      const st = chStatus(this.board, opp)
      if (st.over) {
        this.broadcast({ type: 'move_ok', seat, move: { from, to }, board: this.board, nextTurn: -1 })
        await this.finish(st.winner, st.reason)
        return
      }
      // 将军提示（对方王被攻击但可解）
      const oppKing = this.board.indexOf(opp === 0 ? 6 : 16)
      const inCheck = oppKing >= 0 && chAttacked(this.board, Math.floor(oppKing / 8), oppKing % 8, seat)
      this.broadcast({ type: 'move_ok', seat, move: { from, to }, board: this.board, nextTurn: this.turn, check: inCheck ? true : undefined })
      this.timerAlarm = setTimeout(() => this.timeoutMove(this.turn), MOVE_TIME) as unknown as number
      return
    }

    if (this.game === 'xiangqi') {
      // 中国象棋：{from, to} 移动（马脚/象眼/炮架/九宫/将军 服务端权威校验）
      const { from, to } = msg
      if (!Number.isInteger(from) || !Number.isInteger(to)) {
        this.sendTo(seat, { type: 'illegal', reason: '走法非法' }); return
      }
      if (xqOwner(this.board[from]) !== seat) { this.sendTo(seat, { type: 'illegal', reason: '移动的不是你的棋子' }); return }
      const legal = xqLegalMoves(this.board, seat).find(m => m.from === from && m.to === to)
      if (!legal) { this.sendTo(seat, { type: 'illegal', reason: '非法走法' }); return }
      // 应用走法
      this.board[to] = this.board[from]
      this.board[from] = 0
      this.turn = (this.turn + 1) % this.players.length
      const opp = this.turn
      const st = xqStatus(this.board, opp)
      if (st.over) {
        this.broadcast({ type: 'move_ok', seat, move: { from, to }, board: this.board, nextTurn: -1 })
        await this.finish(st.winner, st.reason)
        return
      }
      // 将军提示
      const oppKing = this.board.indexOf(opp === 0 ? 1 : 11)
      const inCheck = oppKing >= 0 && xqAttacked(this.board, Math.floor(oppKing / 9), oppKing % 9, seat)
      this.broadcast({ type: 'move_ok', seat, move: { from, to }, board: this.board, nextTurn: this.turn, check: inCheck ? true : undefined })
      this.timerAlarm = setTimeout(() => this.timeoutMove(this.turn), MOVE_TIME) as unknown as number
      return
    }

    if (this.game === 'ccheckers') {
      const { from, to } = msg.move || {}
      if (!Number.isInteger(from) || !Number.isInteger(to)) {
        this.sendTo(seat, { type: 'illegal', reason: '走法非法' }); return
      }
      if (this.board[from] !== seat + 1) { this.sendTo(seat, { type: 'illegal', reason: '移动的不是你的棋子' }); return }
      if (this.board[to] !== 0) { this.sendTo(seat, { type: 'illegal', reason: '目标点被占据' }); return }
      const isAdj = ccNeighbors(from).includes(to)
      const isJump = ccCanJump(this.board, from, to)
      if (!isAdj && !isJump) { this.sendTo(seat, { type: 'illegal', reason: '只能走相邻点或隔子跳' }); return }
      this.board[from] = 0
      this.board[to] = seat + 1
      this.moves.push({ seat, from, to })
      // 完成判定：所有棋子进入对角营地
      const targetCamp = CC_TARGET.find(t => t[0] === seat)?.[1] ?? -1
      if (targetCamp >= 0) {
        const campSet = new Set(CC_CAMPS[targetCamp])
        const mine = this.board.filter(v => v === seat + 1).length
        const inCamp = this.board.filter((v, i) => v === seat + 1 && campSet.has(i)).length
        if (mine === 10 && inCamp === 10) {
          this.broadcast({ type: 'move_ok', seat, move: { from, to }, board: this.board, nextTurn: -1 })
          await this.finish(seat + 1, '全部入营'); return
        }
      }
      this.turn = (this.turn + 1) % this.players.length
      this.broadcast({ type: 'move_ok', seat, move: { from, to }, board: this.board, nextTurn: this.turn })
      return
    }

    // ===== gomoku（五子棋） =====
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
      const raw = await this.env.RANK.get(`rank:ezchess:${this.game}:all`)
      const list = raw ? JSON.parse(raw as string) as any[] : []
      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i]
        if (!p.deviceId) continue
        const existing = list.findIndex((r: any) => r.deviceId === p.deviceId)
        if (existing >= 0) list[existing].score += scores[i]
        else list.push({ player: p.nick, score: scores[i], ts: Date.now() / 1000, deviceId: p.deviceId })
      }
      list.sort((a: any, b: any) => b.score - a.score)
      await this.env.RANK.put(`rank:ezchess:${this.game}:all`, JSON.stringify(list.slice(0, 100)))
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

// ==================== 等待房列表（KV 维护） ====================
async function waitingAdd(env: any, game: string, roomId: string, owner: string) {
  const key = `waiting:${game}`
  const raw = await env.RANK.get(key)
  const list = raw ? JSON.parse(raw) : []
  list.push({ roomId, owner, createdAt: Date.now() })
  await env.RANK.put(key, JSON.stringify(list.slice(-20)), { expirationTtl: 7200 })
}
async function waitingRemove(env: any, game: string, roomId: string) {
  const key = `waiting:${game}`
  const raw = await env.RANK.get(key)
  if (!raw) return
  const list = JSON.parse(raw).filter((r: any) => r.roomId !== roomId)
  await env.RANK.put(key, JSON.stringify(list), { expirationTtl: 7200 })
}

// 好友房短房间号（6 位，去易混淆字符）
const FRIEND_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function friendId(): string {
  let id = ''
  for (let i = 0; i < 6; i++) id += FRIEND_CHARS[Math.floor(Math.random() * FRIEND_CHARS.length)]
  return id
}

// 创建房间
  if (url.pathname === '/api/room/create' && request.method === 'POST') {
    const body = await request.json() as any
    const game = body.game || 'gomoku'
    const deviceId = body.player?.deviceId || ''
    const nick = body.player?.nick || '玩家'
    if (!GAMES.includes(game) || !deviceId) return json({ error: '参数异常' }, 400, origin)
    const seats = game === 'ccheckers' ? Math.min(Math.max(parseInt(body.players) || 2, 2), 6) : 2
    // 好友房用短房间号（6 位，碰撞重试）
    let roomId = friendId()
    for (let i = 0; i < 5; i++) {
      if (!(await env.RANK.get(`room:${roomId}`))) break
      roomId = friendId()
    }
    const id = env.GAME_ROOMS.idFromName(roomId)
    const stub = env.GAME_ROOMS.get(id)
    await stub.fetch('http://room/init', {
      method: 'POST',
      body: JSON.stringify({ game, seats, roomId }),
    })
    await env.RANK.put(`room:${roomId}`, JSON.stringify({ game, seats, mode: body.mode || 'friend', owner: deviceId, createdAt: Date.now() }), { expirationTtl: 7200 })
    // 好友房不进快速对战列表（靠房间号加入，队列独立）
    return json({ success: true, roomId, wsUrl: `/game/${roomId}/ws?deviceId=${encodeURIComponent(deviceId)}&nick=${encodeURIComponent(nick)}` }, 200, origin)
  }

  // 房间号校验（加入前检查存在性）
  if (url.pathname === '/api/room/check' && request.method === 'POST') {
    const body = await request.json() as any
    const roomId = String(body.roomId || '').trim().toUpperCase()
    if (!roomId) return json({ success: false, error: '房间号为空' }, 400, origin)
    // 以 room KV 为准（建房/匹配时写入；DO 实例会被懒创建，不能作为存在性依据）
    const kv = await env.RANK.get(`room:${roomId}`)
    if (!kv) return json({ success: false, error: '房间不存在' }, 404, origin)
    let game = 'gomoku', seats = 2, phase = 'WAITING', players = 0
    try {
      const stub = env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName(roomId))
      const st = await stub.fetch('http://room/state')
      const info: any = await st.json()
      if (info.game) game = info.game
      if (info.seats) seats = info.seats
      if (info.phase) phase = info.phase
      players = (info.players || []).length
    } catch (e) { /* 房间详情读取失败用默认值 */ }
    return json({ success: true, roomId, game, seats, phase, players }, 200, origin)
  }

  // 快速匹配（匹配即建房：队列存房间号，第 2 人直接加入）
  if (url.pathname === '/api/room/match' && request.method === 'POST') {
    const body = await request.json() as any
    const game = body.game || 'gomoku'
    const deviceId = body.player?.deviceId || ''
    const nick = body.player?.nick || '玩家'
    if (!GAMES.includes(game) || !deviceId) return json({ error: '参数异常' }, 400, origin)
    const matchKey = `match:${game}`
    const waiting = await env.RANK.get(matchKey)
    if (waiting) {
      // 有等待中的匹配房 → 校验仍可加入（未满/未关）→ 加入
      await env.RANK.delete(matchKey)
      const { roomId } = JSON.parse(waiting)
      try {
        const stub = env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName(roomId))
        const st = await stub.fetch('http://room/state')
        const info: any = await st.json()
        if (info.phase === 'WAITING' && (info.players || []).length < (info.seats || 2)) {
          return json({ success: true, roomId, opp: '对手', wsUrl: `/game/${roomId}/ws?deviceId=${encodeURIComponent(deviceId)}&nick=${encodeURIComponent(nick)}` }, 200, origin)
        }
      } catch (e) { /* 房间无效 → 落空重新建房 */ }
    }
    // 无等待者 / 等待房已失效 → 创建匹配房并入队
    const roomId = uid()
    const id = env.GAME_ROOMS.idFromName(roomId)
    const stub = env.GAME_ROOMS.get(id)
    await stub.fetch('http://room/init', { method: 'POST', body: JSON.stringify({ game, seats: 2, roomId }) })
    await env.RANK.put(`room:${roomId}`, JSON.stringify({ game, seats: 2, mode: 'match', owner: deviceId, createdAt: Date.now() }), { expirationTtl: 7200 })
    await env.RANK.put(matchKey, JSON.stringify({ roomId }), { expirationTtl: 120 })
    await waitingAdd(env, game, roomId, nick)
    return json({ success: true, roomId, waiting: true, wsUrl: `/game/${roomId}/ws?deviceId=${encodeURIComponent(deviceId)}&nick=${encodeURIComponent(nick)}` }, 200, origin)
  }

  // 等待中的房间列表（实时校验房间状态，过滤已开赛/关闭的）
  if (url.pathname === '/api/room/list' && request.method === 'GET') {
    const game = url.searchParams.get('game') || 'gomoku'
    const raw = await env.RANK.get(`waiting:${game}`)
    const list: any[] = raw ? JSON.parse(raw) : []
    const valid: any[] = []
    for (const r of list) {
      if (Date.now() - (r.createdAt || 0) > 120000) continue   // 超时房过滤
      try {
        const stub = env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName(r.roomId))
        const st = await stub.fetch('http://room/state')
        const info: any = await st.json()
        // 有在线玩家、未满员、未结束的房间才展示（含对局中掉线的房，供重连/顶替）
        const online = (info.players || []).filter((p: any) => p.online).length
        if (info.phase !== 'FINISHED' && online > 0 && online < (info.seats || 2)) {
          valid.push(r)
        }
      } catch (e) { /* 房间无效 → 过滤 */ }
    }
    return json({ success: true, rooms: valid }, 200, origin)
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
