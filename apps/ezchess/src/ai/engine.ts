// ============ AI 教学：前端本地规则引擎 ============
// 三种棋的本地规则（初始化 / 合法落子 / 判胜），与服务端规则一致

export type AIGame = 'gomoku' | 'reversi' | 'checkers' | 'chess' | 'xiangqi' | 'go'

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


// ===== 国际象棋（MVP：兵升变/将军/将死/逼和；无易位/过路兵） =====
export const CHESS = {
  init(): number[] {
    const b = new Array(64).fill(0)
    const back = [2, 3, 4, 5, 6, 4, 3, 2]
    for (let c = 0; c < 8; c++) {
      b[0 * 8 + c] = back[c]
      b[1 * 8 + c] = 1
      b[6 * 8 + c] = 11
      b[7 * 8 + c] = back[c] + 10
    }
    return b
  },
  owner(v: number) { return v === 0 ? -1 : (v < 10 ? 0 : 1) },
  dirs: {
    rook: [[-1, 0], [1, 0], [0, -1], [0, 1]],
    bishop: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
    king: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
  },
  knights: [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
  attacked(board: number[], r: number, c: number, byOwner: number): boolean {
    for (const [dr, dc] of this.dirs.rook) {
      let rr = r + dr, cc = c + dc
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const v = board[rr * 8 + cc]
        if (v !== 0) { if (this.owner(v) === byOwner && (v % 10 === 2 || v % 10 === 5)) return true; break }
        rr += dr; cc += dc
      }
    }
    for (const [dr, dc] of this.dirs.bishop) {
      let rr = r + dr, cc = c + dc
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const v = board[rr * 8 + cc]
        if (v !== 0) { if (this.owner(v) === byOwner && (v % 10 === 4 || v % 10 === 5)) return true; break }
        rr += dr; cc += dc
      }
    }
    for (const [dr, dc] of this.knights) {
      const rr = r + dr, cc = c + dc
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const v = board[rr * 8 + cc]
        if (v !== 0 && this.owner(v) === byOwner && v % 10 === 3) return true
      }
    }
    for (const [dr, dc] of this.dirs.king) {
      const rr = r + dr, cc = c + dc
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const v = board[rr * 8 + cc]
        if (v !== 0 && this.owner(v) === byOwner && v % 10 === 6) return true
      }
    }
    const pr = byOwner === 0 ? r - 1 : r + 1
    for (const pc of [c - 1, c + 1]) {
      if (pr >= 0 && pr < 8 && pc >= 0 && pc < 8) {
        const v = board[pr * 8 + pc]
        if (v !== 0 && this.owner(v) === byOwner && v % 10 === 1) return true
      }
    }
    return false
  },
  legalMoves(board: number[], owner: number): { from: number; to: number; promote?: boolean }[] {
    const dir = owner === 0 ? 1 : -1
    const startRow = owner === 0 ? 1 : 6
    const promoteRow = owner === 0 ? 7 : 0
    const pseudo: { from: number; to: number; promote?: boolean }[] = []
    for (let i = 0; i < 64; i++) {
      const v = board[i]
      if (v === 0 || this.owner(v) !== owner) continue
      const r = Math.floor(i / 8), c = i % 8
      const t = v % 10
      if (t === 1) {
        const fr = r + dir
        if (fr >= 0 && fr < 8 && board[fr * 8 + c] === 0) {
          pseudo.push({ from: i, to: fr * 8 + c, promote: fr === promoteRow })
          if (r === startRow && board[(r + 2 * dir) * 8 + c] === 0) pseudo.push({ from: i, to: (r + 2 * dir) * 8 + c })
        }
        for (const pc of [c - 1, c + 1]) {
          if (pc >= 0 && pc < 8 && fr >= 0 && fr < 8) {
            const tv = board[fr * 8 + pc]
            if (tv !== 0 && this.owner(tv) !== owner) pseudo.push({ from: i, to: fr * 8 + pc, promote: fr === promoteRow })
          }
        }
      } else if (t === 2 || t === 4 || t === 5) {
        const dirs = t === 2 ? this.dirs.rook : t === 4 ? this.dirs.bishop : [...this.dirs.rook, ...this.dirs.bishop]
        for (const [dr, dc] of dirs) {
          let rr = r + dr, cc = c + dc
          while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
            const tv = board[rr * 8 + cc]
            if (tv === 0) { pseudo.push({ from: i, to: rr * 8 + cc }); rr += dr; cc += dc }
            else { if (this.owner(tv) !== owner) pseudo.push({ from: i, to: rr * 8 + cc }); break }
          }
        }
      } else if (t === 3) {
        for (const [dr, dc] of this.knights) {
          const rr = r + dr, cc = c + dc
          if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && this.owner(board[rr * 8 + cc]) !== owner) pseudo.push({ from: i, to: rr * 8 + cc })
        }
      } else if (t === 6) {
        for (const [dr, dc] of this.dirs.king) {
          const rr = r + dr, cc = c + dc
          if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && this.owner(board[rr * 8 + cc]) !== owner) pseudo.push({ from: i, to: rr * 8 + cc })
        }
      }
    }
    // 将军过滤
    const kType = owner === 0 ? 6 : 16
    const opp = owner === 0 ? 1 : 0
    const out: { from: number; to: number; promote?: boolean }[] = []
    for (const m of pseudo) {
      const nb = [...board]
      nb[m.to] = nb[m.from]; nb[m.from] = 0
      if (m.promote) nb[m.to] = owner === 0 ? 5 : 15
      const ki = nb.indexOf(kType)
      if (ki >= 0 && !this.attacked(nb, Math.floor(ki / 8), ki % 8, opp)) out.push(m)
    }
    return out
  },
}


// ===== 中国象棋（9×10，红 1-7 / 黑 11-17） =====
export const XIANGQI = {
  init(): number[] {
    const b = new Array(90).fill(0)
    const row9 = [5, 4, 3, 2, 1, 2, 3, 4, 5]
    for (let c = 0; c < 9; c++) {
      b[9 * 9 + c] = row9[c]
      b[0 * 9 + c] = row9[c] + 10
      if (c % 2 === 0) { b[6 * 9 + c] = 7; b[3 * 9 + c] = 17 }
    }
    b[7 * 9 + 1] = 6; b[7 * 9 + 7] = 6
    b[2 * 9 + 1] = 16; b[2 * 9 + 7] = 16
    return b
  },
  owner(v: number) { return v === 0 ? -1 : (v < 10 ? 0 : 1) },
  inPalace(r: number, c: number, owner: number) {
    if (c < 3 || c > 5) return false
    return owner === 0 ? (r >= 7 && r <= 9) : (r >= 0 && r <= 2)
  },
  attacked(board: number[], r: number, c: number, byOwner: number): boolean {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      let rr = r + dr, cc = c + dc, jumped = false
      while (rr >= 0 && rr < 10 && cc >= 0 && cc < 9) {
        const v = board[rr * 9 + cc]
        if (v === 0) { rr += dr; cc += dc; continue }
        const t = v % 10
        if (!jumped) { if (this.owner(v) === byOwner && (t === 5 || t === 1)) return true }
        else { if (this.owner(v) === byOwner && t === 6) return true; break }
        jumped = true
        rr += dr; cc += dc
      }
    }
    const horse = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
    const leg = [[-1, -1], [-1, 1], [0, -1], [0, 1], [0, -1], [0, 1], [1, -1], [1, 1]]
    for (let k = 0; k < 8; k++) {
      const rr = r + horse[k][0], cc = c + horse[k][1]
      if (rr < 0 || rr >= 10 || cc < 0 || cc >= 9) continue
      const v = board[rr * 9 + cc]
      if (v !== 0 && this.owner(v) === byOwner && v % 10 === 4) {
        if (board[(r + leg[k][0]) * 9 + (c + leg[k][1])] === 0) return true
      }
    }
    const pr = byOwner === 0 ? r + 1 : r - 1
    if (pr >= 0 && pr < 10) {
      const v = board[pr * 9 + c]
      if (v !== 0 && this.owner(v) === byOwner && v % 10 === 7) return true
    }
    for (const pc of [c - 1, c + 1]) {
      if (pc >= 0 && pc < 9) {
        const v = board[r * 9 + pc]
        if (v !== 0 && this.owner(v) === byOwner && v % 10 === 7) {
          const crossed = byOwner === 0 ? r <= 4 : r >= 5
          if (crossed) return true
        }
      }
    }
    return false
  },
  legalMoves(board: number[], owner: number): { from: number; to: number }[] {
    const moves: { from: number; to: number }[] = []
    const dir = owner === 0 ? -1 : 1
    for (let i = 0; i < 90; i++) {
      const v = board[i]
      if (v === 0 || this.owner(v) !== owner) continue
      const r = Math.floor(i / 9), c = i % 9
      const t = v % 10
      const tryMove = (rr: number, cc: number) => {
        if (rr < 0 || rr >= 10 || cc < 0 || cc >= 9) return
        const tv = board[rr * 9 + cc]
        if (tv !== 0 && this.owner(tv) === owner) return
        moves.push({ from: i, to: rr * 9 + cc })
      }
      if (t === 1) {
        if (this.inPalace(r + 1, c, owner)) tryMove(r + 1, c)
        if (this.inPalace(r - 1, c, owner)) tryMove(r - 1, c)
        if (this.inPalace(r, c + 1, owner)) tryMove(r, c + 1)
        if (this.inPalace(r, c - 1, owner)) tryMove(r, c - 1)
        let rr = r + dir, cc = c
        while (rr >= 0 && rr < 10) {
          const tv = board[rr * 9 + cc]
          if (tv !== 0) {
            if (this.owner(tv) !== owner && tv % 10 === 1) moves.push({ from: i, to: rr * 9 + cc })
            break
          }
          rr += dir
        }
      } else if (t === 2) {
        for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
          if (this.inPalace(r + dr, c + dc, owner)) tryMove(r + dr, c + dc)
        }
      } else if (t === 3) {
        const limit = owner === 0 ? 4 : 5
        for (const [dr, dc] of [[-2, -2], [-2, 2], [2, -2], [2, 2]]) {
          const rr = r + dr, cc = c + dc
          if (rr < 0 || rr >= 10 || cc < 0 || cc >= 9) continue
          if (owner === 0 ? rr > limit : rr < limit) continue
          if (board[(r + dr / 2) * 9 + (c + dc / 2)] !== 0) continue
          tryMove(rr, cc)
        }
      } else if (t === 4) {
        const horse = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
        const leg = [[-1, 0], [-1, 0], [0, -1], [0, 1], [0, -1], [0, 1], [1, 0], [1, 0]]
        for (let k = 0; k < 8; k++) {
          const rr = r + horse[k][0], cc = c + horse[k][1]
          if (rr < 0 || rr >= 10 || cc < 0 || cc >= 9) continue
          if (board[(r + leg[k][0]) * 9 + (c + leg[k][1])] !== 0) continue
          tryMove(rr, cc)
        }
      } else if (t === 5) {
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          let rr = r + dr, cc = c + dc
          while (rr >= 0 && rr < 10 && cc >= 0 && cc < 9) {
            const tv = board[rr * 9 + cc]
            if (tv === 0) { moves.push({ from: i, to: rr * 9 + cc }); rr += dr; cc += dc }
            else { if (this.owner(tv) !== owner) moves.push({ from: i, to: rr * 9 + cc }); break }
          }
        }
      } else if (t === 6) {
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          let rr = r + dr, cc = c + dc, jumped = false
          while (rr >= 0 && rr < 10 && cc >= 0 && cc < 9) {
            const tv = board[rr * 9 + cc]
            if (tv === 0) { if (!jumped) moves.push({ from: i, to: rr * 9 + cc }); rr += dr; cc += dc; continue }
            if (!jumped) { jumped = true; rr += dr; cc += dc; continue }
            if (this.owner(tv) !== owner) moves.push({ from: i, to: rr * 9 + cc })
            break
          }
        }
      } else if (t === 7) {
        tryMove(r + dir, c)
        const crossed = owner === 0 ? r <= 4 : r >= 5
        if (crossed) { tryMove(r, c - 1); tryMove(r, c + 1) }
      }
    }
    const kType = owner === 0 ? 1 : 11
    const opp = owner === 0 ? 1 : 0
    const out: { from: number; to: number }[] = []
    for (const m of moves) {
      const nb = [...board]
      nb[m.to] = nb[m.from]; nb[m.from] = 0
      const ki = nb.indexOf(kType)
      if (ki >= 0 && !this.attacked(nb, Math.floor(ki / 9), ki % 9, opp)) out.push(m)
    }
    return out
  },
}


// ===== 围棋（13 路入门款：气/提子/自杀/打劫/数子） =====
export const GO = {
  N: 13,
  dirs: [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][],
  init(): number[] { return new Array(169).fill(0) },
  groupInfo(board: number[], start: number): { group: number[]; liberties: number[] } {
    const player = board[start]
    const group: number[] = []
    const liberties: number[] = []
    const seen = new Set<number>()
    const queue = [start]
    seen.add(start)
    while (queue.length) {
      const i = queue.pop()!
      group.push(i)
      const r = Math.floor(i / 13), c = i % 13
      for (const [dr, dc] of this.dirs) {
        const rr = r + dr, cc = c + dc
        if (rr < 0 || rr >= 13 || cc < 0 || cc >= 13) continue
        const j = rr * 13 + cc
        if (seen.has(j)) continue
        if (board[j] === 0) { liberties.push(j); seen.add(j) }
        else if (board[j] === player) { seen.add(j); queue.push(j) }
      }
    }
    return { group, liberties }
  },
  tryMove(board: number[], r: number, c: number, player: number, koPoint: number) {
    const i = r * 13 + c
    if (board[i] !== 0) return { ok: false, reason: '该位置已有棋子' }
    if (i === koPoint) return { ok: false, reason: '打劫：不能立即回提' }
    const nb = [...board]
    nb[i] = player
    const opp = player === 1 ? 2 : 1
    const captured: number[] = []
    for (const [dr, dc] of this.dirs) {
      const rr = r + dr, cc = c + dc
      if (rr < 0 || rr >= 13 || cc < 0 || cc >= 13) continue
      const j = rr * 13 + cc
      if (nb[j] === opp) {
        const info = this.groupInfo(nb, j)
        if (info.liberties.length === 0) {
          for (const g of info.group) { nb[g] = 0; captured.push(g) }
        }
      }
    }
    const mine = this.groupInfo(nb, i)
    if (mine.liberties.length === 0) return { ok: false, reason: '自杀落子禁止' }
    return { ok: true, board: nb, captured, koPoint: captured.length === 1 ? captured[0] : -1 }
  },
  score(board: number[]): { black: number; white: number } {
    let black = 0, white = 0
    for (let i = 0; i < 169; i++) {
      if (board[i] === 1) black++
      else if (board[i] === 2) white++
    }
    const seen = new Set<number>()
    for (let i = 0; i < 169; i++) {
      if (board[i] !== 0 || seen.has(i)) continue
      const queue = [i]; seen.add(i)
      const group: number[] = []
      let touchBlack = false, touchWhite = false
      while (queue.length) {
        const j = queue.pop()!
        group.push(j)
        const r = Math.floor(j / 13), c = j % 13
        for (const [dr, dc] of this.dirs) {
          const rr = r + dr, cc = c + dc
          if (rr < 0 || rr >= 13 || cc < 0 || cc >= 13) continue
          const k = rr * 13 + cc
          if (board[k] === 0) { if (!seen.has(k)) { seen.add(k); queue.push(k) } }
          else if (board[k] === 1) touchBlack = true
          else if (board[k] === 2) touchWhite = true
        }
      }
      if (touchBlack && !touchWhite) black += group.length
      else if (touchWhite && !touchBlack) white += group.length
    }
    return { black, white }
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
