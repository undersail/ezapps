// ============ AI 教学：简单 AI 引擎（客户端） ============
// 五子棋：攻防评分；黑白棋：翻转+角权重；国际跳棋：吃子优先+前进
import { GOMOKU, REVERSI, CHECKERS, CHESS, XIANGQI, GO, type AIGame } from './engine'

export interface AIMove {
  idx?: number          // gomoku / reversi
  from?: number         // checkers
  to?: number
}

// ===== 五子棋 AI（评分：自身连子 + 堵对手） =====
function gomokuScore(board: number[], idx: number, player: number): number {
  const r = Math.floor(idx / 15), c = idx % 15
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
  let score = 0
  const opp = player === 1 ? 2 : 1
  for (const [dr, dc] of dirs) {
    for (const p of [player, opp]) {
      let n = 1, open = 0
      for (const s of [1, -1]) {
        let rr = r + dr * s, cc = c + dc * s
        while (rr >= 0 && rr < 15 && cc >= 0 && cc < 15 && board[rr * 15 + cc] === p) { n++; rr += dr * s; cc += dc * s }
        if (rr >= 0 && rr < 15 && cc >= 0 && cc < 15 && board[rr * 15 + cc] === 0) open++
      }
      const w = p === player ? 1 : 1.2   // 堵对手略优先
      if (n >= 5) score += 100000 * w
      else if (n === 4) score += (open > 0 ? 10000 : 0) * w
      else if (n === 3) score += (open > 1 ? 1000 : open > 0 ? 200 : 0) * w
      else if (n === 2) score += open > 1 ? 100 * w : 0
      else score += open > 2 ? 10 * w : 0
    }
  }
  return score
}

export function gomokuAI(board: number[]): AIMove {
  let best = -1, bestScore = -1
  for (const i of GOMOKU.legalMoves(board)) {
    const s = gomokuScore(board, i, 2)
    if (s > bestScore) { bestScore = s; best = i }
  }
  return { idx: best }
}

// ===== 黑白棋 AI（翻转数 + 角/边权重） =====
const RV_CORNER = [0, 7, 56, 63]
const RV_EDGE = [1, 2, 3, 4, 5, 6, 8, 15, 16, 23, 24, 31, 32, 39, 40, 47, 48, 55, 57, 58, 59, 60, 61, 62]
const RV_BAD = [9, 14, 18, 21, 42, 45, 49, 54]   // 角旁陷阱格

export function reversiAI(board: number[]): AIMove {
  const moves = REVERSI.legalMoves(board, 2)
  if (!moves.length) return { idx: -1 }
  let best = moves[0], bestScore = -Infinity
  for (const i of moves) {
    const flips = REVERSI.flips(board, i, 2).length
    let s = flips * 5
    if (RV_CORNER.includes(i)) s += 100
    else if (RV_EDGE.includes(i)) s += 20
    else if (RV_BAD.includes(i)) s -= 30
    // 模拟落子后对方可翻转数（越小越好）
    const nb = [...board]; nb[i] = 2
    for (const f of REVERSI.flips(board, i, 2)) nb[f] = 2
    const oppMoves = REVERSI.legalMoves(nb, 1).length
    s -= oppMoves * 3
    if (s > bestScore) { bestScore = s; best = i }
  }
  return { idx: best }
}

// ===== 国际跳棋 AI（吃子优先 + 前进 + 王棋） =====
export function checkersAI(board: number[]): AIMove {
  const moves = CHECKERS.moves(board, 1)
  if (!moves.length) return { from: -1, to: -1 }
  const jumps = moves.filter(m => m.jump)
  const pool = jumps.length > 0 ? jumps : moves
  let best = pool[0], bestScore = -Infinity
  for (const m of pool) {
    const fromR = Math.floor(m.from / 8), toR = Math.floor(m.to / 8)
    let s = 0
    if (m.jump) s += 50                                  // 吃子优先
    s += (toR - fromR) * 2                               // 前进奖励（白向下，r 增大）
    if (board[m.from] === 2 && toR === 7) s += 30        // 升王奖励
    if (board[m.from] === 4) s += 10                     // 王棋主动
    const nb = CHECKERS.apply(board, m.from, m.to, m.jump)
    if (CHECKERS.moves(nb, 1).length === 0) s += 200     // 逼死对手
    if (s > bestScore) { bestScore = s; best = m }
  }
  return { from: best.from, to: best.to }
}

// ===== 国际象棋 AI（子力价值 + 吃子 + 中心控制 + 王安全） =====
const CH_VALUE = [0, 1, 5, 3, 3, 9, 100]   // 兵车马象后王

export function chessAI(board: number[]): AIMove {
  const moves = CHESS.legalMoves(board, 1)
  if (!moves.length) return { from: -1, to: -1 }
  let best = moves[0], bestScore = -Infinity
  for (const m of moves) {
    let s = 0
    const target = board[m.to]
    if (target !== 0) s += CH_VALUE[target % 10] * 10   // 吃子价值
    const fr = Math.floor(m.from / 8), fc = m.from % 8, tr = Math.floor(m.to / 8), tc = m.to % 8
    // 中心控制（d4/e4/d5/e5 附近加分）
    const centerDist = Math.abs(3.5 - tc) + Math.abs(3.5 - tr)
    s += Math.max(0, 4 - centerDist) * 1.5
    // 兵推进奖励
    if (m.to % 10 === 1 && m.to >= 10 && m.to < 20) s += 1
    // 王安全：避免走到被攻击格（attack 检查在 legalMoves 已做，这里避开中心）
    if (target % 10 === 6) s += 200
    // 将军（对手王被攻击）加分
    const nb = [...board]; nb[m.to] = nb[m.from]; nb[m.from] = 0
    const oppKing = nb.indexOf(16)
    if (oppKing >= 0 && CHESS.attacked(nb, Math.floor(oppKing / 8), oppKing % 8, 1)) s += 50
    if (s > bestScore) { bestScore = s; best = m }
  }
  return { from: best.from, to: best.to }
}

// ===== 中国象棋 AI（子力价值 + 吃子 + 推进 + 将军） =====
const XQ_VALUE = [0, 100, 2, 2, 4, 9, 4.5, 1]   // 帅仕相马车炮兵

export function xiangqiAI(board: number[]): AIMove {
  const moves = XIANGQI.legalMoves(board, 1)
  if (!moves.length) return { from: -1, to: -1 }
  let best = moves[0], bestScore = -Infinity
  for (const m of moves) {
    let s = 0
    const target = board[m.to]
    if (target !== 0) s += XQ_VALUE[target % 10] * 10   // 吃子价值
    const tr = Math.floor(m.to / 9)
    if (target % 10 === 7) s += 2   // 兵卒推进
    const nb = [...board]; nb[m.to] = nb[m.from]; nb[m.from] = 0
    const oppKing = nb.indexOf(11)
    if (oppKing >= 0 && XIANGQI.attacked(nb, Math.floor(oppKing / 9), oppKing % 9, 1)) s += 50   // 将军
    if (s > bestScore) { bestScore = s; best = m }
  }
  return { from: best.from, to: best.to }
}

// ===== 围棋 AI（围地 + 吃子 + 自保） =====
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
    if (s > bestScore) { bestScore = s; bestIdx = i }
  }
  return { idx: bestIdx }
}

export function aiMove(game: AIGame, board: number[]): AIMove {
  if (game === 'gomoku') return gomokuAI(board)
  if (game === 'reversi') return reversiAI(board)
  if (game === 'chess') return chessAI(board)
  if (game === 'xiangqi') return xiangqiAI(board)
  if (game === 'go') return goAI(board)
  return checkersAI(board)
}
