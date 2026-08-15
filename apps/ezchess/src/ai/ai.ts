// ============ AI 教学：Minimax + Alpha-Beta 搜索引擎（客户端） ============
// 五子棋/黑白棋/跳棋/国象/中象：Alpha-Beta 剪枝搜索 + 评估函数
// 围棋：分支因子过大（169），保持启发式贪心
import { GOMOKU, REVERSI, CHECKERS, CHESS, XIANGQI, GO, type AIGame } from './engine'

export interface AIMove {
  idx?: number          // gomoku / reversi / go
  from?: number         // checkers / chess / xiangqi
  to?: number
}

interface SearchMove { idx?: number; from?: number; to?: number }

// ===== 通用搜索框架 =====
interface GameSearch {
  gen: (b: number[], p: number) => SearchMove[]     // 走法生成（p: 1=玩家 2=AI）
  apply: (b: number[], m: SearchMove, p: number) => number[]
  eval: (b: number[]) => number                      // 评估（正 = AI 有利）
  depth: number                                      // 搜索深度
}

// 吃子优先排序（MVV 简化版：to 位有子的走法排前 → 剪枝更有效）
function orderMoves(board: number[], moves: SearchMove[]): SearchMove[] {
  return moves.slice().sort((a, b) => {
    const va = a.to !== undefined && a.to >= 0 && board[a.to] !== 0 ? 1 : 0
    const vb = b.to !== undefined && b.to >= 0 && board[b.to] !== 0 ? 1 : 0
    return vb - va
  })
}

function search(cfg: GameSearch, board: number[], depth: number, alpha: number, beta: number, player: number): number {
  if (depth <= 0) return cfg.eval(board)
  const moves = orderMoves(board, cfg.gen(board, player))
  if (!moves.length) return cfg.eval(board)
  if (player === 2) {
    let best = -Infinity
    for (const m of moves) {
      const v = search(cfg, cfg.apply(board, m, 2), depth - 1, alpha, beta, 1)
      if (v > best) best = v
      if (best > alpha) alpha = best
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const m of moves) {
      const v = search(cfg, cfg.apply(board, m, 1), depth - 1, alpha, beta, 2)
      if (v < best) best = v
      if (best < beta) beta = best
      if (beta <= alpha) break
    }
    return best
  }
}

function searchBest(cfg: GameSearch, board: number[]): AIMove {
  const moves = orderMoves(board, cfg.gen(board, 2))
  if (!moves.length) return { idx: -1, from: -1, to: -1 }
  let best = moves[0], bestScore = -Infinity
  for (const m of moves) {
    const v = search(cfg, cfg.apply(board, m, 2), cfg.depth - 1, -Infinity, Infinity, 1)
    if (v > bestScore) { bestScore = v; best = m }
  }
  return best
}

// ===== 五子棋：候选点（邻近空位）+ 全盘攻防评估 =====
function gomokuCandidates(board: number[]): number[] {
  const set = new Set<number>()
  for (let i = 0; i < 225; i++) {
    if (!board[i]) continue
    const r = Math.floor(i / 15), c = i % 15
    for (let dr = -2; dr <= 2; dr++)
      for (let dc = -2; dc <= 2; dc++) {
        const rr = r + dr, cc = c + dc
        if (rr >= 0 && rr < 15 && cc >= 0 && cc < 15 && board[rr * 15 + cc] === 0) set.add(rr * 15 + cc)
      }
  }
  return set.size ? [...set] : [112]
}

function gomokuEvaluate(board: number[]): number {
  let score = 0
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
  for (let i = 0; i < 225; i++) {
    const v = board[i]
    if (!v) continue
    const r = Math.floor(i / 15), c = i % 15
    for (const [dr, dc] of dirs) {
      // 只统计线段起点
      const pr = r - dr, pc = c - dc
      if (pr >= 0 && pr < 15 && pc >= 0 && pc < 15 && board[pr * 15 + pc] === v) continue
      let n = 1, open = 0
      let rr = r + dr, cc = c + dc
      while (rr >= 0 && rr < 15 && cc >= 0 && cc < 15 && board[rr * 15 + cc] === v) { n++; rr += dr; cc += dc }
      if (rr >= 0 && rr < 15 && cc >= 0 && cc < 15 && board[rr * 15 + cc] === 0) open++
      if (pr >= 0 && pr < 15 && pc >= 0 && pc < 15 && board[pr * 15 + pc] === 0) open++
      const sign = v === 2 ? 1 : -1
      if (n >= 5) score += sign * 100000
      else if (n === 4) score += sign * (open > 0 ? 10000 : 0)
      else if (n === 3) score += sign * (open > 1 ? 1500 : open > 0 ? 200 : 0)
      else if (n === 2) score += sign * (open > 1 ? 100 : 0)
      else if (n === 1) score += sign * (open > 1 ? 10 : 0)
    }
  }
  return score
}

const gomokuSearch: GameSearch = {
  gen: (b) => gomokuCandidates(b).map(idx => ({ idx })),
  apply: (b, m, p) => { const nb = [...b]; nb[m.idx!] = p; return nb },
  eval: gomokuEvaluate,
  depth: 2,
}

// ===== 黑白棋：位置权重 + 行动力评估 =====
const RV_CORNER = [0, 7, 56, 63]
const RV_EDGE = [1, 2, 3, 4, 5, 6, 8, 15, 16, 23, 24, 31, 32, 39, 40, 47, 48, 55, 57, 58, 59, 60, 61, 62]
const RV_BAD = [9, 14, 18, 21, 42, 45, 49, 54]   // 角旁陷阱格

function reversiEvaluate(board: number[]): number {
  let s = 0
  for (let i = 0; i < 64; i++) {
    const v = board[i]
    if (!v) continue
    const sign = v === 2 ? 1 : -1
    if (RV_CORNER.includes(i)) s += sign * 100
    else if (RV_EDGE.includes(i)) s += sign * 15
    else if (RV_BAD.includes(i)) s += sign * -25
    else s += sign * 1
  }
  s += (REVERSI.legalMoves(board, 2).length - REVERSI.legalMoves(board, 1).length) * 8
  return s
}

const reversiSearch: GameSearch = {
  gen: (b, p) => REVERSI.legalMoves(b, p).map(idx => ({ idx })),
  apply: (b, m, p) => {
    const nb = [...b]
    nb[m.idx!] = p
    for (const f of REVERSI.flips(b, m.idx!, p)) nb[f] = p
    return nb
  },
  eval: reversiEvaluate,
  depth: 3,
}

// ===== 国际跳棋：子力 + 王棋 + 位置 =====
function checkersEvaluate(board: number[]): number {
  let s = 0
  for (let i = 0; i < 64; i++) {
    const v = board[i]
    if (!v) continue
    const r = Math.floor(i / 8)
    if (v === 2 || v === 4) { s += v === 4 ? 30 : 10; s += (7 - r) * 0.5 }   // AI 白（向下推进）
    else { s -= v === 3 ? 30 : 10; s -= r * 0.5 }                            // 玩家黑
  }
  return s
}

const checkersSearch: GameSearch = {
  // CHECKERS.moves seat 语义：0=黑(玩家) 1=白(AI)
  gen: (b, p) => CHECKERS.moves(b, p === 1 ? 0 : 1).map(m => ({ from: m.from, to: m.to })),
  apply: (b, m, p) => {
    const jump = Math.abs(Math.floor(m.from! / 8) - Math.floor(m.to! / 8)) > 1
    return CHECKERS.apply(b, m.from!, m.to!, jump)
  },
  eval: checkersEvaluate,
  depth: 3,
}

// ===== 国际象棋：子力 + 中心 + 王安全 =====
const CH_VALUE = [0, 100, 500, 330, 320, 900, 20000]   // 兵车马象后王

function chessEvaluate(board: number[]): number {
  let s = 0
  for (let i = 0; i < 64; i++) {
    const v = board[i]
    if (!v) continue
    const t = v % 10
    const sign = v >= 11 ? 1 : -1   // AI 黑正，玩家白负
    s += sign * CH_VALUE[t]
    const r = Math.floor(i / 8), c = i % 8
    const center = Math.max(0, 4 - (Math.abs(3.5 - r) + Math.abs(3.5 - c)))
    if (t === 3 || t === 4) s += sign * center * 10   // 马象占中心
  }
  return s
}

function chessApply(b: number[], m: SearchMove, p: number): number[] {
  const nb = [...b]
  nb[m.to!] = nb[m.from!]
  nb[m.from!] = 0
  // 升变：玩家白兵 → 白后(5)，AI 黑兵 → 黑后(15)
  const tr = Math.floor(m.to! / 8)
  if ((p === 1 && tr === 0 && nb[m.to!] === 1) || (p === 2 && tr === 7 && nb[m.to!] === 11)) {
    nb[m.to!] = p === 1 ? 5 : 15
  }
  return nb
}

const chessSearch: GameSearch = {
  // CHESS.legalMoves owner 语义：0=白(玩家) 1=黑(AI)
  gen: (b, p) => CHESS.legalMoves(b, p === 1 ? 0 : 1).map(m => ({ from: m.from, to: m.to })),
  apply: chessApply,
  eval: chessEvaluate,
  depth: 2,
}

// ===== 中国象棋：子力 + 过河兵 =====
const XQ_VALUE = [0, 1000, 200, 200, 400, 900, 450, 100]   // 帅仕相马车炮兵

function xiangqiEvaluate(board: number[]): number {
  let s = 0
  for (let i = 0; i < 90; i++) {
    const v = board[i]
    if (!v) continue
    const t = v % 10
    const r = Math.floor(i / 9), c = i % 9
    const isBlack = v >= 11
    const sign = isBlack ? 1 : -1
    s += sign * XQ_VALUE[t]
    const rr = isBlack ? r : 9 - r          // 归一化黑视角（0 底 → 9 底）
    const center = Math.max(0, 3 - (Math.abs(4 - c) + Math.abs(4.5 - rr)))  // 中路/中心活跃度
    if (t === 4) s += sign * center * 12    // 马：中心河界最活
    else if (t === 5) s += sign * center * 8    // 车：占要道
    else if (t === 6) {                          // 炮：过河有威胁 + 占中
      s += sign * center * 8
      const crossed = isBlack ? r >= 5 : r <= 4
      s += sign * (crossed ? 50 : 0)
    } else if (t === 7) {                        // 兵：过河越深入越强
      const depth = isBlack ? r - 4 : 4 - r
      if (depth > 0) s += sign * (60 + depth * 25)
    }
  }
  // 将/帅安全：被将军重罚
  const redKing = board.indexOf(1), blackKing = board.indexOf(11)
  if (blackKing >= 0 && XIANGQI.attacked(board, Math.floor(blackKing / 9), blackKing % 9, 0)) s -= 3000
  if (redKing >= 0 && XIANGQI.attacked(board, Math.floor(redKing / 9), redKing % 9, 1)) s += 3000
  return s
}

function xiangqiApply(b: number[], m: SearchMove, p: number): number[] {
  const nb = [...b]
  nb[m.to!] = nb[m.from!]
  nb[m.from!] = 0
  return nb
}

const xiangqiSearch: GameSearch = {
  // XIANGQI.legalMoves owner 语义：0=红(玩家) 1=黑(AI)
  gen: (b, p) => XIANGQI.legalMoves(b, p === 1 ? 0 : 1).map(m => ({ from: m.from, to: m.to })),
  apply: xiangqiApply,
  eval: xiangqiEvaluate,
  depth: 3,
}

// ===== 围棋：启发式贪心（分支过大无法搜索） =====
export function goAI(board: number[], koPoint = -1): AIMove {
  let bestIdx = -1, bestScore = -Infinity
  for (let i = 0; i < 169; i++) {
    if (board[i] !== 0 || i === koPoint) continue
    const r = Math.floor(i / 13), c = i % 13
    const res = GO.tryMove(board, r, c, 2, koPoint)
    if (!res.ok) continue
    let s = 0
    s += (res.captured?.length || 0) * 30            // 吃子优先
    const dist = Math.abs(6 - r) + Math.abs(6 - c)
    s += Math.max(0, 6 - dist) * 2                   // 中央控制
    if (res.koPoint >= 0) s += 5                     // 制造打劫
    // 自保：落子后己方组气多
    const mine = GO.groupInfo(res.board!, i)
    s += mine.liberties.length * 0.5
    // 连接/分断：落子后相邻敌方组被威胁（气=1）加分
    for (const [dr, dc] of GO.dirs) {
      const rr = r + dr, cc = c + dc
      if (rr < 0 || rr >= 13 || cc < 0 || cc >= 13) continue
      const j = rr * 13 + cc
      if (res.board[j] === 1) {
        const opp = GO.groupInfo(res.board, j)
        if (opp.liberties.length === 1) s += 15      // 紧气对方
      }
    }
    if (s > bestScore) { bestScore = s; bestIdx = i }
  }
  return { idx: bestIdx }
}

export function aiMove(game: AIGame, board: number[]): AIMove {
  if (game === 'gomoku') return searchBest(gomokuSearch, board)
  if (game === 'reversi') return searchBest(reversiSearch, board)
  if (game === 'checkers') return searchBest(checkersSearch, board)
  if (game === 'chess') return searchBest(chessSearch, board)
  if (game === 'xiangqi') return searchBest(xiangqiSearch, board)
  return goAI(board)
}
