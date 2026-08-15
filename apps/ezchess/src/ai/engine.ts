// ============ AI 教学：前端本地规则引擎 ============
// 三种棋的本地规则（初始化 / 合法落子 / 判胜），与服务端规则一致

export type AIGame = 'gomoku' | 'reversi' | 'checkers'

// ===== 五子棋 =====
export const GOMOKU = {
  init(): number[] { return new Array(225).fill(0) },
  legalMoves(board: number[]): number[] {
    const moves: number[] = []
    for (let i = 0; i < 225; i++) if (board[i] === 0) moves.push(i)
    return moves
  },
  // 落子后判胜（返回获胜方 1/2 或 0）
  checkWin(board: number[], idx: number, player: number): boolean {
    const r = Math.floor(idx / 15), c = idx % 15
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
    for (const [dr, dc] of dirs) {
      let n = 1
      for (let i = 1; i < 5; i++) {
        const rr = r + dr * i, cc = c + dc * i
        if (rr < 0 || rr > 14 || cc < 0 || cc > 14 || board[rr * 15 + cc] !== player) break
        n++
      }
      for (let i = 1; i < 5; i++) {
        const rr = r - dr * i, cc = c - dc * i
        if (rr < 0 || rr > 14 || cc < 0 || cc > 14 || board[rr * 15 + cc] !== player) break
        n++
      }
      if (n >= 5) return true
    }
    return false
  },
}

// ===== 黑白棋 =====
export const REVERSI = {
  init(): number[] {
    const b = new Array(64).fill(0)
    b[27] = 1; b[36] = 1; b[28] = 2; b[35] = 2
    return b
  },
  flips(board: number[], idx: number, player: number): number[] {
    const r = Math.floor(idx / 8), c = idx % 8
    const dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
    const out: number[] = []
    for (const [dr, dc] of dirs) {
      const fl: number[] = []
      let rr = r + dr, cc = c + dc
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const v = board[rr * 8 + cc]
        if (v === 0) break
        if (v === player) { out.push(...fl); break }
        fl.push(rr * 8 + cc)
        rr += dr; cc += dc
      }
    }
    return out
  },
  legalMoves(board: number[], player: number): number[] {
    const out: number[] = []
    for (let i = 0; i < 64; i++) {
      if (board[i] === 0 && this.flips(board, i, player).length > 0) out.push(i)
    }
    return out
  },
}

// ===== 国际跳棋 =====
export const CHECKERS = {
  init(): number[] {
    const b = new Array(64).fill(0)
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 0) b[r * 8 + c] = -1
        else if (r < 3) b[r * 8 + c] = 1
        else if (r > 4) b[r * 8 + c] = 2
      }
    }
    return b
  },
  owner(v: number) { if (v === 1 || v === 3) return 0; if (v === 2 || v === 4) return 1; return -1 },
  moves(board: number[], seat: number): { from: number; to: number; jump: boolean }[] {
    const moves: { from: number; to: number; jump: boolean }[] = []
    const dirs = [[1, -1], [1, 1], [-1, -1], [-1, 1]]
    const forward = seat === 0 ? [1] : [-1]
    for (let i = 0; i < 64; i++) {
      if (board[i] === -1 || board[i] === 0) continue
      if (this.owner(board[i]) !== seat) continue
      const r = Math.floor(i / 8), c = i % 8
      const isKing = board[i] === 3 || board[i] === 4
      const walkDirs = isKing ? dirs : dirs.filter(([dr]) => forward.includes(dr))
      for (const [dr, dc] of walkDirs) {
        const nr = r + dr, nc = c + dc
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr * 8 + nc] === 0) {
          moves.push({ from: i, to: nr * 8 + nc, jump: false })
        }
        if (isKing) {
          let mr = r + dr, mc = c + dc
          while (mr >= 0 && mr < 8 && mc >= 0 && mc < 8) {
            const mv = board[mr * 8 + mc]
            if (mv === 0) { mr += dr; mc += dc; continue }
            if (this.owner(mv) !== seat) {
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
            if (mid !== 0 && mid !== -1 && this.owner(mid) !== seat && board[mr * 8 + mc] === 0) {
              moves.push({ from: i, to: mr * 8 + mc, jump: true })
            }
          }
        }
      }
    }
    return moves
  },
  legalMoves(board: number[], seat: number): { from: number; to: number }[] {
    const moves = this.moves(board, seat)
    const jumps = moves.filter(m => m.jump)
    return (jumps.length > 0 ? jumps : moves).map(m => ({ from: m.from, to: m.to }))
  },
  apply(board: number[], from: number, to: number, jump: boolean): number[] {
    const nb = [...board]
    nb[to] = nb[from]; nb[from] = 0
    if (jump) {
      const fr = Math.floor(from / 8), fc = from % 8, tr = Math.floor(to / 8), tc = to % 8
      const dr = Math.sign(tr - fr), dc = Math.sign(tc - fc)
      let mr = fr + dr, mc = fc + dc
      while (mr !== tr || mc !== tc) {
        if (nb[mr * 8 + mc] !== 0 && this.owner(nb[mr * 8 + mc]) !== this.owner(nb[to])) nb[mr * 8 + mc] = 0
        mr += dr; mc += dc
      }
    }
    const r = Math.floor(to / 8)
    if (nb[to] === 1 && r === 7) nb[to] = 3
    if (nb[to] === 2 && r === 0) nb[to] = 4
    return nb
  },
}
