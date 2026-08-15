<script setup lang="ts">
// EZChess · 经典棋类对战（M1 五子棋 MVP）
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as Net from './network/api'
import { GameWS } from './network/ws'
import { GOMOKU, REVERSI, CHECKERS, CHESS, XIANGQI } from './ai/engine'
import { aiMove } from './ai/ai'

const BOARD = 15
const stage = ref<'lobby' | 'room' | 'ai'>('lobby')

// ===== AI 教学状态 =====
const aiBoard = ref<number[]>([])
const aiTurn = ref(0)                 // 0 玩家（黑/先手），1 AI（白/后手）
const aiThinking = ref(false)
const aiOver = ref<{ winner: number; reason: string } | null>(null)
const aiLegal = ref<number[]>([])     // 玩家可落点（gomoku/reversi 高亮）
const aiCkMoves = ref<{ from: number; to: number }[]>([])
const aiSelected = ref<number | null>(null)

const aiRules = computed(() => {
  const g = curGame.value
  if (g === 'gomoku') return '规则：黑白轮流在交叉点落子，横/竖/斜率先连成 5 子者胜；棋盘下满无五连为和棋'
  if (g === 'reversi') return '规则：落子必须夹住对方棋子（横竖斜），被夹棋子翻转；无子可落自动跳过；双方都无法落子时子多者胜'
  if (g === 'chess') return '规则：车横竖、马走日、象斜走、后横竖斜、王走一格；兵直进斜吃、到底线升变；将死对方王获胜，无子可动为逼和'
  if (g === 'xiangqi') return '规则：车横竖、炮隔子打、马走日（蹩马腿）、相田字（象眼不过河）、仕九宫斜走、帅九宫直走；兵过河前直进过河后可横走；将死或困毙对方获胜'
  return '规则：棋子斜走一格；跳吃相邻对方棋子（可连跳，有吃必吃）；到达对方底线升王（可斜走任意格）；吃光对方或对方无子可动者胜'
})

// AI 教学执子颜色（按棋种：国象白先、中象红先、其余黑先）
const aiSide = computed(() => {
  const g = curGame.value
  if (g === 'chess') return { me: '白', ai: '黑', meColor: '#f8f4e6', meBorder: '#999', aiColor: '#111' }
  if (g === 'xiangqi') return { me: '红', ai: '黑', meColor: '#b91c1c', meBorder: '#b91c1c', aiColor: '#1f2937' }
  return { me: '黑', ai: '白', meColor: '#111', meBorder: '#111', aiColor: '#eee' }
})

// ===== 局面感知技巧提示 =====
const aiTipText = ref('')
const aiTipVisible = ref(false)
let aiTipTimer: ReturnType<typeof setTimeout> | null = null

function showTip(text: string) {
  if (!text) { aiTipVisible.value = false; return }
  aiTipText.value = text
  aiTipVisible.value = true
  if (aiTipTimer) clearTimeout(aiTipTimer)
  aiTipTimer = setTimeout(() => { aiTipVisible.value = false }, 6000)
}

// 五子棋：检测某方连子威胁
function gomokuThreat(board: number[], player: number): { four: boolean; three: boolean; open: boolean } {
  let four = false, three = false, open = false
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
  for (let i = 0; i < 225; i++) {
    if (board[i] !== player) continue
    const r = Math.floor(i / 15), c = i % 15
    for (const [dr, dc] of dirs) {
      let n = 1, openEnds = 0
      for (const s of [1, -1]) {
        let rr = r + dr * s, cc = c + dc * s
        while (rr >= 0 && rr < 15 && cc >= 0 && cc < 15 && board[rr * 15 + cc] === player) { n++; rr += dr * s; cc += dc * s }
        if (rr >= 0 && rr < 15 && cc >= 0 && cc < 15 && board[rr * 15 + cc] === 0) openEnds++
      }
      if (n >= 4) four = true
      if (n === 3 && openEnds >= 1) three = true
      if (n >= 3 && openEnds >= 2) open = true
    }
  }
  return { four, three, open }
}

// 生成当前局面技巧提示
function genTip(g: string, board: number[], last: string): string {
  if (g === 'gomoku') {
    const my = gomokuThreat(board, 1)
    const ai = gomokuThreat(board, 2)
    const mine = board.filter(v => v === 1).length
    const aiCount = board.filter(v => v === 2).length
    if (my.four) return '💡 你已形成冲四！下一手可直接获胜，注意别被 AI 抢先堵死'
    if (ai.four) return '💡 警告：AI 已形成冲四！你必须立刻堵住，否则下一手就输了'
    if (my.three && ai.three) return '💡 双方都有活三！优先进攻形成双三，或堵住 AI 的活三两端'
    if (my.three) return '💡 你有一个活三！可尝试在活三两端继续延伸，形成双三必杀'
    if (ai.three) return '💡 AI 形成活三，建议堵住它延伸的一端，同时为自己的活三做准备'
    // 开局建议：进入时自动弹；手动查看（局面未变）也显示
    if (mine + aiCount < 6) return (last === 'start' || last === 'manual') ? '💡 开局建议：占天元或星位（中心附近），控制棋盘中心更容易五连' : ''
    if (last === 'ai') return '💡 观察 AI 的落子方向：它通常在攻防两端权衡，注意它的连子延伸'
    return '💡 建议：落子时同时考虑进攻（自己的连子）和防守（AI 的威胁），别只攻不守'
  }
  if (g === 'reversi') {
    const corners = [0, 7, 56, 63]
    const myC = board.filter(v => v === 1).length
    const aiC = board.filter(v => v === 2).length
    const myCorner = corners.filter(i => board[i] === 1).length
    const aiCorner = corners.filter(i => board[i] === 2).length
    if (myCorner > aiCorner) return '💡 你占角领先！角子永远不会被翻转，围绕角子建立边线优势'
    if (aiCorner > myCorner) return '💡 AI 已占角，别在它角旁 2 格落子（陷阱位），尽量抢另一边'
    if (myC + aiC < 8) return (last === 'start' || last === 'manual') ? '💡 开局建议：优先抢角（4 个角），其次是边格，避免过早翻中间的子' : ''
    if (myC > aiC) return `💡 你暂时领先 ${myC}:${aiC}！但黑白棋关键在终局，继续稳占边角`
    return '💡 提示：尽量少给对方"可翻转选择"，落子后数一下对方还有几个可落点，越少越好'
  }
  if (g === 'chess') {
    const myMoves = CHESS.legalMoves(board, 0).length
    const myKing = board.indexOf(6)
    const inCheck = myKing >= 0 && CHESS.attacked(board, Math.floor(myKing / 8), myKing % 8, 1)
    if (inCheck) return '💡 警告：你的王被将军！必须立刻解将（移王/挡/吃将军子）'
    const oppKing = board.indexOf(16)
    const oppCheck = oppKing >= 0 && CHESS.attacked(board, Math.floor(oppKing / 8), oppKing % 8, 0)
    if (oppCheck) return '💡 将军！对方王被攻击，保持压力，寻找将死机会'
    const whitePieces = board.filter(v => v > 0 && v < 10).length
    const blackPieces = board.filter(v => v >= 11).length
    if (whitePieces + blackPieces === 32) return '💡 开局建议：先出动马象（中心兵先行），尽快易位保护王'
    if (myMoves < 15) return '💡 你子力紧张，优先保护高价值子（后/车），别送子'
    return '💡 提示：控制中心（d4/e4/d5/e5），先动马象后动后，别让王暴露'
  }
  if (g === 'xiangqi') {
    const myKing = board.indexOf(1)
    const inCheck = myKing >= 0 && XIANGQI.attacked(board, Math.floor(myKing / 9), myKing % 9, 1)
    if (inCheck) return '💡 警告：你的帅被将军！必须立刻解将（移帅/挡/吃将军子）'
    const oppKing = board.indexOf(11)
    const oppCheck = oppKing >= 0 && XIANGQI.attacked(board, Math.floor(oppKing / 9), oppKing % 9, 0)
    if (oppCheck) return '💡 将军！对方将帅被攻击，保持压力寻找将死机会'
    const total = board.filter(v => v !== 0).length
    if (total === 32) return '💡 开局建议：先出车马炮（炮二平五/马二进三等），车要通，别让帅暴露'
    const red = board.filter(v => v > 0 && v < 10).length
    const black = board.filter(v => v >= 11).length
    if (red < black) return `💡 你子力落后（${red}:${black}），先防守稳住，找机会兑子或反击`
    return '💡 提示：兵过河才有威力；炮需炮架；马防蹩腿；保持帅的安全最重要'
  }
  // checkers
  const myJumps = CHECKERS.moves(board, 0).filter(m => m.jump)
  if (myJumps.length) return `💡 你有 ${myJumps.length} 处跳吃机会！规则要求有吃必吃，优先跳吃对方棋子`
  const aiJumps = CHECKERS.moves(board, 1).filter(m => m.jump)
  if (aiJumps.length) return '💡 小心：AI 有跳吃机会，避免把棋子送到它可跳的位置'
  const kings = board.filter(v => v === 3).length
  if (kings) return '💡 你的王棋已就位！王可以斜走任意格、远距离跳吃，让它深入对方腹地'
  const myF = board.filter(v => v === 1 || v === 3).length
  const aiF = board.filter(v => v === 2 || v === 4).length
  if (myF > aiF) return `💡 你子数领先（${myF}:${aiF}）！继续向对方底线推进，争取升王`
  // 通用建议：进入时自动弹；手动查看（局面未变）也显示
  return (last === 'start' || last === 'manual') ? '💡 提示：棋子尽量保持抱团推进，孤子容易被对方跳吃；到达对方底线可升王' : ''
}

let lastTipShown = ''
function showTipFor(last: string) {
  // 对局结束：技巧按钮显示总结（而非终局棋盘上的普通提示）
  if (aiOver.value) {
    showTip(aiSummary(curGame.value, aiBoard.value, aiOver.value.winner))
    return
  }
  const g = curGame.value
  const tip = genTip(g, aiBoard.value, last)
  if (!tip) {
    // 当前局面无需提示：不弹窗；手动点按钮时呈现"无提示"文案
    if (last === 'manual') showTip('当前局面暂无特别提示，正常下就好')
    else aiTipVisible.value = false
    return
  }
  // 局中提示与上一条相同则跳过（避免重复刷屏）；开局/手动/总结强制显示
  if (last !== 'start' && last !== 'manual' && tip === lastTipShown) return
  lastTipShown = tip
  showTip(tip)
}

function startAI() {
  stage.value = 'ai'
  curGame.value = gameId.value
  if (curGame.value === 'reversi') aiBoard.value = REVERSI.init()
  else if (curGame.value === 'checkers') aiBoard.value = CHECKERS.init()
  else if (curGame.value === 'chess') aiBoard.value = CHESS.init()
  else if (curGame.value === 'xiangqi') aiBoard.value = XIANGQI.init()
  else aiBoard.value = GOMOKU.init()
  aiTurn.value = 0
  aiOver.value = null
  aiThinking.value = false
  aiLegal.value = []
  aiCkMoves.value = []
  aiSelected.value = null
  lastMove.value = null
  refreshAILegal()
  // 开局技巧提示（落子前）
  lastTipShown = ''
  showTipFor('start')
}

function refreshAILegal() {
  if (aiOver.value) { aiLegal.value = []; aiCkMoves.value = []; return }
  if (curGame.value === 'gomoku') aiLegal.value = GOMOKU.legalMoves(aiBoard.value)
  else if (curGame.value === 'reversi') aiLegal.value = REVERSI.legalMoves(aiBoard.value, 1)
  else if (curGame.value === 'chess') aiCkMoves.value = CHESS.legalMoves(aiBoard.value, 0)
  else if (curGame.value === 'xiangqi') aiCkMoves.value = XIANGQI.legalMoves(aiBoard.value, 0)
  else aiCkMoves.value = CHECKERS.legalMoves(aiBoard.value, 0)
}

// 对局结束总结提示
function aiSummary(g: string, board: number[], winner: number): string {
  if (g === 'gomoku') {
    if (winner === 1) return '🎉 你赢了！五连达成 —— 记住：连子要同时留两个活口（双三），对手才堵不住'
    if (winner === 2) return '🤖 AI 获胜 —— 复盘重点：AI 的冲四你堵住了吗？活三要及时堵两端，别等它连起来'
    return '🤝 和棋 —— 棋盘下满没有五连，势均力敌！'
  }
  if (g === 'reversi') {
    const c1 = board.filter(v => v === 1).length
    const c2 = board.filter(v => v === 2).length
    if (winner === 1) return `🎉 你赢了（${c1}:${c2}）！—— 关键在角与边：角子不可翻，边线是根基`
    if (winner === 2) return `🤖 AI 获胜（${c1}:${c2}）—— 复盘：是不是把中间翻太多、角没抢到？`
    return `🤝 和棋（${c1}:${c2}）—— 势均力敌！`
  }
  if (g === 'chess') {
    if (winner === 1) return '🎉 你赢了！将死对方 —— 记住：先出马象、控制中心、保护王，中局再发动攻击'
    if (winner === 2) return '🤖 AI 获胜 —— 复盘：你的王安全吗？子力是否落后？将军时有没有漏掉解将？'
    return '🤝 逼和 —— 对方无子可动但未被将军，势均力敌！'
  }
  if (g === 'xiangqi') {
    if (winner === 1) return '🎉 你赢了！将死对方 —— 记住：开局先出车马炮，别让帅暴露，兵过河才有威力'
    if (winner === 2) return '🤖 AI 获胜 —— 复盘：你的帅安全吗？车马炮是否被牵制？注意飞将威胁'
    return '🤝 困毙 —— 对方无子可动，势均力敌！'
  }
  const f1 = board.filter(v => v === 1 || v === 3).length
  const f2 = board.filter(v => v === 2 || v === 4).length
  if (winner === 1) return `🎉 你赢了！—— 记住：有吃必吃，跳吃后优先继续连跳，尽快升王`
  if (winner === 2) return '🤖 AI 获胜 —— 复盘：是不是把棋子落单了？抱团推进 + 及时跳吃是取胜关键'
  return '🤝 平局 —— 势均力敌！'
}

// 本地国际象棋状态判定（AI 教学用）：返回 { over, winner(1白/2黑/0和), reason }
function chLocalStatus(board: number[], owner: number): { over: boolean; winner: number; reason: string } {
  const moves = CHESS.legalMoves(board, owner)
  const opp = owner === 0 ? 1 : 0
  const kType = owner === 0 ? 6 : 16
  const ki = board.indexOf(kType)
  const inCheck = ki >= 0 && CHESS.attacked(board, Math.floor(ki / 8), ki % 8, opp)
  if (moves.length === 0) {
    if (inCheck) return { over: true, winner: opp + 1, reason: '将死（Checkmate）' }
    return { over: true, winner: 0, reason: '逼和（Stalemate）' }
  }
  return { over: false, winner: 0, reason: '' }
}

// 本地中国象棋状态判定（AI 教学用）
function xqLocalStatus(board: number[], owner: number): { over: boolean; winner: number; reason: string } {
  const moves = XIANGQI.legalMoves(board, owner)
  const opp = owner === 0 ? 1 : 0
  const kType = owner === 0 ? 1 : 11
  const ki = board.indexOf(kType)
  const inCheck = ki >= 0 && XIANGQI.attacked(board, Math.floor(ki / 9), ki % 9, opp)
  if (moves.length === 0) {
    if (inCheck) return { over: true, winner: opp + 1, reason: '将死' }
    return { over: true, winner: 0, reason: '困毙' }
  }
  return { over: false, winner: 0, reason: '' }
}

function aiFinish(winner: number, reason: string) {
  aiOver.value = { winner, reason }
  aiLegal.value = []
  aiCkMoves.value = []
  // 对局结束：总结浮窗（绿色高亮，8 秒后自动消失，也可手动关闭）
  showTip(aiSummary(curGame.value, aiBoard.value, winner))
  if (aiTipTimer) clearTimeout(aiTipTimer)
  aiTipTimer = setTimeout(() => { aiTipVisible.value = false }, 3000)
}

function aiPlayerMove(idx: number, from?: number, to?: number) {
  if (aiOver.value || aiTurn.value !== 0 || aiThinking.value) return
  const g = curGame.value
  if (g === 'gomoku') {
    if (aiBoard.value[idx] !== 0) return   // 已有棋子位置不可落
    aiBoard.value[idx] = 1
    markMove(Math.floor(idx / 15), idx % 15)
    if (GOMOKU.checkWin(aiBoard.value, idx, 1)) return aiFinish(1, '五连获胜')
    if (!GOMOKU.legalMoves(aiBoard.value).length) return aiFinish(0, '和棋')
  } else if (g === 'reversi') {
    const flips = REVERSI.flips(aiBoard.value, idx, 1)
    if (!flips.length) return
    aiBoard.value[idx] = 1
    for (const f of flips) aiBoard.value[f] = 1
    markMove(Math.floor(idx / 8), idx % 8)
    const opp = REVERSI.legalMoves(aiBoard.value, 2)
    if (!opp.length) {
      const mine = REVERSI.legalMoves(aiBoard.value, 1)
      if (!mine.length) {
        const c1 = aiBoard.value.filter(v => v === 1).length
        const c2 = aiBoard.value.filter(v => v === 2).length
        return aiFinish(c1 > c2 ? 1 : c1 < c2 ? 2 : 0, `终局 ${c1}:${c2}`)
      }
      // 对手无子可走，我方继续
    }
  } else if (g === 'chess') {
    // 国际象棋
    if (from === undefined || to === undefined) return
    const legal = CHESS.legalMoves(aiBoard.value, 0).find(m => m.from === from && m.to === to)
    if (!legal) return
    aiBoard.value[to] = aiBoard.value[from]
    aiBoard.value[from] = 0
    if (legal.promote) aiBoard.value[to] = 5
    markMove(Math.floor(to / 8), to % 8)
    // 判断对方（黑）状态
    const st = chLocalStatus(aiBoard.value, 1)
    if (st.over) return aiFinish(st.winner, st.reason)
  } else if (g === 'xiangqi') {
    // 中国象棋
    if (from === undefined || to === undefined) return
    const legal = XIANGQI.legalMoves(aiBoard.value, 0).find(m => m.from === from && m.to === to)
    if (!legal) return
    aiBoard.value[to] = aiBoard.value[from]
    aiBoard.value[from] = 0
    markMove(Math.floor(to / 9), to % 9)
    const st = xqLocalStatus(aiBoard.value, 1)
    if (st.over) return aiFinish(st.winner, st.reason)
  } else {
    // checkers
    if (from === undefined || to === undefined) return
    const mv = aiCkMoves.value.find(m => m.from === from && m.to === to)
    if (!mv) return
    aiBoard.value = CHECKERS.apply(aiBoard.value, from, to, Math.abs(Math.floor(from / 8) - Math.floor(to / 8)) > 1 || Math.abs((from % 8) - (to % 8)) > 1)
    markMove(Math.floor(to / 8), to % 8)
    if (!CHECKERS.moves(aiBoard.value, 1).length) return aiFinish(1, '对方无子可动')
  }
  // 轮到 AI
  aiTurn.value = 1
  aiThinking.value = true
  setTimeout(aiMoveTurn, 400)
}

function aiMoveTurn() {
  if (aiOver.value) return
  const g = curGame.value
  if (g === 'reversi') {
    const mv = aiMove(g, aiBoard.value)
    if (mv.idx === -1) {
      // AI 无子可落 → 玩家继续
      if (!REVERSI.legalMoves(aiBoard.value, 1).length) {
        const c1 = aiBoard.value.filter(v => v === 1).length
        const c2 = aiBoard.value.filter(v => v === 2).length
        return aiFinish(c1 > c2 ? 1 : c1 < c2 ? 2 : 0, `终局 ${c1}:${c2}`)
      }
      aiTurn.value = 0
      aiThinking.value = false
      refreshAILegal()
      return
    }
    aiBoard.value[mv.idx!] = 2
    for (const f of REVERSI.flips(aiBoard.value, mv.idx!, 2)) aiBoard.value[f] = 2
    markMove(Math.floor(mv.idx! / 8), mv.idx! % 8)
    if (!REVERSI.legalMoves(aiBoard.value, 1).length) {
      const c1 = aiBoard.value.filter(v => v === 1).length
      const c2 = aiBoard.value.filter(v => v === 2).length
      return aiFinish(c1 > c2 ? 1 : c1 < c2 ? 2 : 0, `终局 ${c1}:${c2}`)
    }
  } else if (g === 'chess') {
    const mv = aiMove(g, aiBoard.value)
    if (mv.from === -1) return aiFinish(1, 'AI 无子可动')
    const legal = CHESS.legalMoves(aiBoard.value, 1).find(m => m.from === mv.from && m.to === mv.to)
    if (!legal) return
    aiBoard.value[mv.to!] = aiBoard.value[mv.from!]
    aiBoard.value[mv.from!] = 0
    if (legal.promote) aiBoard.value[mv.to!] = 15
    markMove(Math.floor(mv.to! / 8), mv.to! % 8)
    const st = chLocalStatus(aiBoard.value, 0)
    if (st.over) return aiFinish(st.winner, st.reason)
  } else if (g === 'xiangqi') {
    const mv = aiMove(g, aiBoard.value)
    if (mv.from === -1) return aiFinish(1, 'AI 无子可动')
    const legal = XIANGQI.legalMoves(aiBoard.value, 1).find(m => m.from === mv.from && m.to === mv.to)
    if (!legal) return
    aiBoard.value[mv.to!] = aiBoard.value[mv.from!]
    aiBoard.value[mv.from!] = 0
    markMove(Math.floor(mv.to! / 9), mv.to! % 9)
    const st = xqLocalStatus(aiBoard.value, 0)
    if (st.over) return aiFinish(st.winner, st.reason)
  } else if (g === 'gomoku') {
    const mv = aiMove(g, aiBoard.value)
    aiBoard.value[mv.idx!] = 2
    markMove(Math.floor(mv.idx! / 15), mv.idx! % 15)
    if (GOMOKU.checkWin(aiBoard.value, mv.idx!, 2)) return aiFinish(2, 'AI 五连获胜')
    if (!GOMOKU.legalMoves(aiBoard.value).length) return aiFinish(0, '和棋')
  } else {
    const mv = aiMove(g, aiBoard.value)
    if (mv.from === -1) return aiFinish(1, 'AI 无子可动')
    const jump = Math.abs(Math.floor(mv.from! / 8) - Math.floor(mv.to! / 8)) > 1
    aiBoard.value = CHECKERS.apply(aiBoard.value, mv.from!, mv.to!, jump)
    markMove(Math.floor(mv.to! / 8), mv.to! % 8)
    if (!CHECKERS.moves(aiBoard.value, 0).length) return aiFinish(2, '你无子可动')
  }
  aiTurn.value = 0
  aiThinking.value = false
  refreshAILegal()
  showTipFor('ai')
}

function aiCellClick(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const px = e.clientX - rect.left
  const py = e.clientY - rect.top
  const g = curGame.value
  if (g === 'checkers' || g === 'chess' || g === 'xiangqi') {
    if (g === 'xiangqi') {
      // 9×10 网格反算（与 drawXiangqi 一致）
      const cell = rect.width / 10
      const c = Math.round((px - rect.width / 2) / cell + 4)
      const r = Math.floor(py / cell)
      if (r < 0 || r > 9 || c < 0 || c > 8) return
      const pt = r * 9 + c
      if (aiSelected.value === null) {
        const v = aiBoard.value[pt]
        if (v > 0 && v < 10) aiSelected.value = pt   // 红方 1-7
        else aiSelected.value = null
      } else if (aiSelected.value === pt) {
        aiSelected.value = null
      } else {
        aiPlayerMove(-1, aiSelected.value, pt)
        aiSelected.value = null
      }
      return
    }
    const cell = rect.width / 8
    const r = Math.floor(py / cell), c = Math.floor(px / cell)
    if (r < 0 || r > 7 || c < 0 || c > 7) return
    const pt = r * 8 + c
    if (aiSelected.value === null) {
      // 选中己方棋子（chess 白方 1-6，跳棋 1/3）
      const v = aiBoard.value[pt]
      const mine = g === 'chess' ? (v > 0 && v < 10) : (v === 1 || v === 3)
      if (mine) aiSelected.value = pt
      else aiSelected.value = null
    } else if (aiSelected.value === pt) {
      aiSelected.value = null
    } else {
      aiPlayerMove(-1, aiSelected.value, pt)
      aiSelected.value = null
    }
    return
  }
  const size = g === 'reversi' ? 8 : 15
  const cell = rect.width / size
  const r = Math.floor(py / cell), c = Math.floor(px / cell)
  if (r < 0 || r >= size || c < 0 || c >= size) return
  aiPlayerMove(r * size + c)
}
const nickInput = ref(Net.getNickname())
const myNick = ref(Net.getNickname() || '玩家')
const deviceId = Net.getDeviceId()

// ===== 游戏选择 =====
const GAME_LIST = [
  { id: 'gomoku', emoji: '⚫', name: '五子棋', desc: '15×15 · 先五连者胜', seats: 2 },
  { id: 'reversi', emoji: '◐', name: '黑白棋', desc: '8×8 · 翻转吃子', seats: 2 },
  { id: 'checkers', emoji: '🏁', name: '国际跳棋', desc: '8×8 · 斜走跳吃', seats: 2 },
  { id: 'chess', emoji: '♞', name: '国际象棋', desc: '8×8 · 车马象后王', seats: 2 },
  { id: 'xiangqi', emoji: '🐘', name: '中国象棋', desc: '9×10 · 楚河汉界', seats: 2 },
]
const gameId = ref('gomoku')

// ===== 大厅状态 =====
const matching = ref(false)
const rankList = ref<{ player: string; score: number; dev?: string }[]>([])
const waitingRooms = ref<{ roomId: string; owner: string }[]>([])
const roomCode = ref('')
const roomErr = ref('')
const lastMode = ref<'match' | 'friend'>('friend')   // 记录进入方式（重开时复用）
const rematchRequested = ref(false)   // 是否已请求再来一局
const offerReceived = ref(false)      // 是否收到对方邀请（按钮变"同意"）
const gameOverTipDismissed = ref(false)   // 结束总结浮窗是否已关闭

async function refreshRooms() {
  waitingRooms.value = await Net.fetchRooms(gameId.value)
}
let roomTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  refreshRank()
  refreshRooms()
  roomTimer = setInterval(() => { refreshRooms() }, 30000)
})
onUnmounted(() => { if (roomTimer) clearInterval(roomTimer) })

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
  lastMode.value = 'match'
  matching.value = true
  roomErr.value = ''
  try {
    const res = await Net.matchRoom(gameId.value, { deviceId, nick: myNick.value })
    if (!res) { roomErr.value = '网络异常，请稍后再试'; return }
    if (res.roomId) {
      if (res.waiting) roomErr.value = '已进入匹配房，等待对手加入…（120 秒超时）'
      enterRoom(res.roomId)
    }
  } finally {
    matching.value = false
  }
}

async function createRoom() {
  const seats = 2
  const res = await Net.createRoom(gameId.value, { deviceId, nick: myNick.value }, seats)
  if (res?.roomId) {
    roomCode.value = res.roomId
    enterRoom(res.roomId)
    // 弹窗提示房间号（方便发给好友）
    roomErr.value = ''
    showTip(`🏠 好友房已创建，房间号：${res.roomId}\n把房间号发给好友，输入即可加入`)
  } else {
    roomErr.value = '建房失败，请稍后再试'
  }
}

async function joinRoom() {
  const code = roomCode.value.trim().toUpperCase()
  if (!code) { roomErr.value = '请输入房间号'; return }
  // 先校验房间存在，避免不存在的房间号被当成建房
  const chk = await Net.checkRoom(code)
  if (!chk.success) {
    roomErr.value = `房间不存在（${chk.error || '请检查房间号'}）`
    return
  }
  roomErr.value = ''
  enterRoom(code)
}

function enterRoom(id: string) {
  roomId.value = id
  ;(window as any).__ccRoom = id   // 调试用：暴露完整房间号
  stage.value = 'room'
  // 立即按大厅选择设置棋种，避免先渲染五子棋再切换（闪烁）
  curGame.value = GAME_LIST.find(g => g.id === gameId.value) ? gameId.value : 'gomoku'
  // 预渲染初始棋盘（等待/开赛前就能看到棋子布局，开赛后由服务端 state 覆盖）
  const g = curGame.value
  board.value = g === 'chess' ? CHESS.init() : g === 'xiangqi' ? XIANGQI.init() : g === 'reversi' ? REVERSI.init() : g === 'checkers' ? CHECKERS.init() : []
  gameOver.value = null
  players.value = []
  timers.value = []
  phase.value = 'WAITING'
  lastMsg.value = ''
  selected.value = null
  lastMove.value = null

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
    // 再来一局重开（FINISHED → PLAYING）：清空结算状态
    if (m.phase === 'PLAYING') {
      if (gameOver.value) gameOver.value = null
      rematchRequested.value = false
      offerReceived.value = false
      gameOverTipDismissed.value = false
      lastMsg.value = '新的一局开始！'
    }
  })
  gameWs.on('move_ok', (m) => {
    if (m.board) board.value = m.board
    if (typeof m.nextTurn === 'number') turn.value = m.nextTurn
    if (m.check) lastMsg.value = '⚔️ 将军！'
    // 最后一步标识（五子棋 move={r,c}，其他 move={from,to}）
    if (m.move) {
      if (typeof m.move.r === 'number') {
        lastMove.value = { r: m.move.r, c: m.move.c }
      } else if (typeof m.move.to === 'number') {
        const n = curGame.value === 'xiangqi' ? 9 : 8
        lastMove.value = { r: Math.floor(m.move.to / n), c: m.move.to % n }
      }
      // 自己落子音效
      if (m.seat === mySeat.value) playMoveSound()
    }
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
    // 总结浮窗 8 秒后自动消失（显示底部结算卡）
    setTimeout(() => { gameOverTipDismissed.value = true }, 3000)
  })
  gameWs.on('opponent_left', (m) => { lastMsg.value = `对手掉线，等待重连…（${m.graceSeconds || 60}s）` })
  gameWs.on('player_reconnected', () => { lastMsg.value = '对手已重连！' })
  gameWs.on('rematch_offer', (m) => {
    if (m.seat !== mySeat.value) {
      offerReceived.value = true
      lastMsg.value = rematchRequested.value ? '' : '对方想再来一局，点击「🤝 同意再来一局」！'
      // 浮窗显眼提示（对局结束页棋盘中央）
      if (!rematchRequested.value) {
        showTip('🤝 对方想再来一局，点击下方「同意」按钮！')
      }
    }
    // 双方同意后服务端会广播新 state（PLAYING）→ 自动重开
  })
  gameWs.on('room_closed', (m) => {
    lastMsg.value = m.reason || '房间已关闭'
    phase.value = 'FINISHED'
    setTimeout(() => { backToLobby() }, 1500)
  })
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

  if (curGame.value === 'xiangqi') {
    // 9×10：点己方棋子选中 → 点目标格移动（服务端校验马脚/炮架/将军）
    const cell = rect.width / 10
    const c = Math.round((px - rect.width / 2) / cell + 4)
    const r = Math.floor(py / cell)
    if (r < 0 || r > 9 || c < 0 || c > 8) return
    const pt = r * 9 + c
    const v = board.value[pt]
    if (selected.value === null) {
      if (v > 0 && v < 10 && mySeat.value === 0) selected.value = pt
      else if (v >= 11 && mySeat.value === 1) selected.value = pt
      else selected.value = null
    } else if (selected.value === pt) {
      selected.value = null
    } else {
      if (board.value[pt] !== 0 && (board.value[pt] > 0 && board.value[pt] < 10 ? 0 : 1) === mySeat.value) { selected.value = pt; return }
      ws.value?.send({ type: 'move', from: selected.value, to: pt })
      selected.value = null
    }
    return
  }
  if (curGame.value === 'chess') {
    // 8×8：点己方棋子选中 → 点目标格移动（服务端校验将军）
    const cell = rect.width / 8
    const r = Math.floor(py / cell), c = Math.floor(px / cell)
    if (r < 0 || r > 7 || c < 0 || c > 7) return
    const pt = r * 8 + c
    const v = board.value[pt]
    if (selected.value === null) {
      if (v > 0 && v < 10 && mySeat.value === 0) selected.value = pt
      else if (v >= 11 && mySeat.value === 1) selected.value = pt
      else selected.value = null
    } else if (selected.value === pt) {
      selected.value = null
    } else {
      if (board.value[pt] !== 0 && (board.value[pt] > 0 && board.value[pt] < 10 ? 0 : 1) === mySeat.value) { selected.value = pt; return }
      ws.value?.send({ type: 'move', from: selected.value, to: pt })
      selected.value = null
    }
    return
  }
  if (curGame.value === 'checkers') {
    // 8×8 黑白格：点己方棋子选中 → 点目标格移动
    const cell = rect.width / 8
    const r = Math.floor(py / cell), c = Math.floor(px / cell)
    if (r < 0 || r > 7 || c < 0 || c > 7) return
    const pt = r * 8 + c
    const v = board.value[pt]
    const isMine = (v === 1 && mySeat.value === 0) || (v === 2 && mySeat.value === 1) || (v === 3 && mySeat.value === 0) || (v === 4 && mySeat.value === 1)
    if (selected.value === null) {
      if (isMine) selected.value = pt
    } else if (selected.value === pt) {
      selected.value = null
    } else if (isMine) {
      selected.value = pt  // 换选
    } else if (v === 0) {
      ws.value?.send({ type: 'move', from: selected.value, to: pt })
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
  refreshRooms()
  rematchRequested.value = false
  gameOverTipDismissed.value = false
}

// 再来一局：发送同意请求，双方同意后服务端重开
function requestRematch() {
  if (phase.value !== 'FINISHED' || rematchRequested.value) return
  const wasOffer = offerReceived.value
  rematchRequested.value = true
  offerReceived.value = false
  lastMsg.value = wasOffer ? '已同意再来一局！' : '已发送再来一局请求，等待对方同意…'
  ws.value?.send({ type: 'rematch' })
}

// 对局结束总结（在线对局：胜负 + 积分）
const rematchSummary = computed(() => {
  const g = gameOver.value
  if (!g) return ''
  const score = g.scores?.[mySeat.value] ?? g.scores?.[0] ?? 0
  const base = g.winner === 0 ? '🤝 和棋' : (g.winner - 1 === mySeat.value ? '🎉 你赢了！' : '😢 你输了')
  return `${base} ${g.reason || ''} · 积分 ${score} 分`
})

function fmtTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ===== Canvas 棋盘渲染 =====
const canvasRef = ref<HTMLCanvasElement | null>(null)
// 活跃棋盘（AI 教学用本地棋盘，联网对局用 WS 棋盘）
const activeBoard = computed(() => (stage.value === 'ai' ? aiBoard.value : board.value))

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

  if (curGame.value === 'checkers') {
    drawCheckers(ctx, size)
  } else if (curGame.value === 'chess') {
    drawChess(ctx, size)
  } else if (curGame.value === 'xiangqi') {
    drawXiangqi(ctx, size)
  } else if (curGame.value === 'reversi') {
    drawReversi(ctx, size)
  } else {
    drawGomoku(ctx, size)
  }

  // 选中棋子高亮（跳棋/国象/中象点选反馈）
  if (selected.value !== null && phase.value === 'PLAYING' && !gameOver.value) {
    const g = curGame.value
    const s = selected.value
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.setLineDash([6, 4])
    if (g === 'xiangqi') {
      const cell = size / 10, cx = size / 2
      ctx.beginPath(); ctx.arc(cx + ((s % 9) - 4) * cell, cell * (Math.floor(s / 9) + 0.5), cell * 0.46, 0, Math.PI * 2); ctx.stroke()
    } else if (g === 'chess' || g === 'checkers') {
      const cell = size / 8
      ctx.beginPath(); ctx.arc((s % 8) * cell + cell / 2, Math.floor(s / 8) * cell + cell / 2, cell * 0.46, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.setLineDash([])
  }

  // 最后一步标识（所有棋种统一：金黄色高亮圈，与棋子颜色区分）
  if (lastMove.value && !aiOver.value) {
    const g = curGame.value
    const lm = lastMove.value
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.98)'   // 琥珀金
    ctx.lineWidth = 3.5
    if (g === 'gomoku') {
      const cell = size / (BOARD + 1)
      const pad = cell
      ctx.beginPath(); ctx.arc(pad + lm.c * cell, pad + lm.r * cell, cell * 0.42, 0, Math.PI * 2); ctx.stroke()
    } else if (g === 'reversi') {
      const cell = size / 8
      ctx.beginPath(); ctx.arc(lm.c * cell + cell / 2, lm.r * cell + cell / 2, cell * 0.44, 0, Math.PI * 2); ctx.stroke()
    } else if (g === 'xiangqi') {
      const cell = size / 10
      const cx = size / 2
      ctx.beginPath(); ctx.arc(cx + (lm.c - 4) * cell, cell * (lm.r + 0.5), cell * 0.42, 0, Math.PI * 2); ctx.stroke()
    } else {
      const cell = size / 8
      ctx.beginPath(); ctx.arc(lm.c * cell + cell / 2, lm.r * cell + cell / 2, cell * 0.44, 0, Math.PI * 2); ctx.stroke()
    }
  }

  // AI 教学：合法落点提示（玩家回合）
  if (stage.value === 'ai' && aiTurn.value === 0 && !aiOver.value) {
    if (curGame.value === 'checkers' || curGame.value === 'chess' || curGame.value === 'xiangqi') {
      const isXq = curGame.value === 'xiangqi'
      const cell = isXq ? size / 10 : size / 8
      const cx = size / 2
      const px = (pt: number) => isXq ? cx + ((pt % 9) - 4) * cell : ((pt % 8) * cell + cell / 2)
      const py = (pt: number) => isXq ? cell * (Math.floor(pt / 9) + 0.5) : (Math.floor(pt / 8) * cell + cell / 2)
      if (aiSelected.value === null) {
        // 第一步：高亮所有可移动的棋子（紫色圆圈）
        const movable = new Set(aiCkMoves.value.map(m => m.from))
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.95)'
        ctx.lineWidth = 2.5
        for (const from of movable) {
          ctx.beginPath(); ctx.arc(px(from), py(from), cell * 0.4, 0, Math.PI * 2); ctx.stroke()
        }
      } else {
        // 第二步：高亮该棋子可去的目标位置
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 3
        ctx.beginPath(); ctx.arc(px(aiSelected.value), py(aiSelected.value), cell * 0.36, 0, Math.PI * 2); ctx.stroke()
        ctx.fillStyle = 'rgba(99, 102, 241, 0.5)'
        for (const m of aiCkMoves.value) {
          if (m.from === aiSelected.value) {
            ctx.beginPath(); ctx.arc(px(m.to), py(m.to), cell * 0.18, 0, Math.PI * 2); ctx.fill()
          }
        }
      }
    } else {
      const n = curGame.value === 'reversi' ? 8 : 15
      const cell = size / (n + (curGame.value === 'reversi' ? 0 : 1))
      const pad = curGame.value === 'reversi' ? 0 : cell
      const off = curGame.value === 'reversi' ? cell / 2 : 0   // 黑白棋点在方格中心，五子棋在交叉点
      ctx.fillStyle = 'rgba(99, 102, 241, 0.45)'
      for (const i of aiLegal.value) {
        const r = Math.floor(i / n), c = i % n
        ctx.beginPath(); ctx.arc(pad + c * cell + off, pad + r * cell + off, 4.5, 0, Math.PI * 2); ctx.fill()
      }
    }
  }
}

// ===== 五子棋棋盘 =====
function drawGomoku(ctx: CanvasRenderingContext2D, size: number) {
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
      const v = activeBoard.value[r * BOARD + c]
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

    }
  }
}
// ===== 中国象棋棋盘（9×10 + 汉字棋子 + 楚河汉界） =====
const XQ_GLYPH: Record<number, string> = {
  1: '帅', 2: '仕', 3: '相', 4: '马', 5: '车', 6: '炮', 7: '兵',
  11: '将', 12: '士', 13: '象', 14: '马', 15: '车', 16: '炮', 17: '卒',
}
function drawXiangqi(ctx: CanvasRenderingContext2D, size: number) {
  const cell = size / 10   // 10 行网格（含楚河汉界）
  const cx = size / 2
  // 底色（木纹）
  ctx.fillStyle = '#e8c98a'
  ctx.fillRect(0, 0, size, size)
  // 竖线（楚河汉界处断开：上 5 行 / 下 5 行）
  ctx.strokeStyle = '#8b5a2b'
  ctx.lineWidth = 1.2
  for (let c = 0; c < 9; c++) {
    ctx.beginPath()
    ctx.moveTo(cx + (c - 4) * cell, cell * 0.5)
    ctx.lineTo(cx + (c - 4) * cell, cell * 4.5)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx + (c - 4) * cell, cell * 5.5)
    ctx.lineTo(cx + (c - 4) * cell, size - cell * 0.5)
    ctx.stroke()
  }
  // 横线：上 5 行 + 下 5 行（楚河汉界带空白）
  for (let r = 0; r < 5; r++) {
    ctx.beginPath()
    ctx.moveTo(size * 0.5 - 4 * cell, cell * (r + 0.5))
    ctx.lineTo(size * 0.5 + 4 * cell, cell * (r + 0.5))
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(size * 0.5 - 4 * cell, cell * (r + 5.5))
    ctx.lineTo(size * 0.5 + 4 * cell, cell * (r + 5.5))
    ctx.stroke()
  }
  // 九宫斜线（4 格正方形对角相连：交叉点 c3-c5，红 r7-9 / 黑 r0-2）
  ctx.beginPath()
  ctx.moveTo(cx - cell, cell * 7.5); ctx.lineTo(cx + cell, cell * 9.5)
  ctx.moveTo(cx + cell, cell * 7.5); ctx.lineTo(cx - cell, cell * 9.5)
  ctx.moveTo(cx - cell, cell * 0.5); ctx.lineTo(cx + cell, cell * 2.5)
  ctx.moveTo(cx + cell, cell * 0.5); ctx.lineTo(cx - cell, cell * 2.5)
  ctx.stroke()
  // 楚河汉界
  ctx.fillStyle = '#8b5a2b'
  ctx.font = `bold ${cell * 0.42}px "KaiTi", "STKaiti", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('楚 河', size * 0.5 - cell * 2, cell * 5)
  ctx.fillText('汉 界', size * 0.5 + cell * 2, cell * 5)
  // 棋子（圆形 + 汉字）
  for (let i = 0; i < activeBoard.value.length; i++) {
    const v = activeBoard.value[i]
    if (!v) continue
    const r = Math.floor(i / 9), c = i % 9
    const x = cx + (c - 4) * cell, y = cell * (r + 0.5)
    const isRed = XIANGQI.owner(v) === 0
    ctx.beginPath()
    ctx.arc(x, y, cell * 0.42, 0, Math.PI * 2)
    ctx.fillStyle = '#f8ecd0'
    ctx.fill()
    ctx.strokeStyle = isRed ? '#b91c1c' : '#1f2937'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.font = `bold ${cell * 0.48}px "KaiTi", "STKaiti", serif`
    ctx.fillStyle = isRed ? '#b91c1c' : '#1f2937'
    ctx.fillText(XQ_GLYPH[v] || '', x, y + 1)
  }
}

// ===== 国际象棋棋盘（8×8 + Unicode 棋子） =====
const CHESS_GLYPH: Record<number, string> = {
  1: '♙', 2: '♖', 3: '♘', 4: '♗', 5: '♕', 6: '♔',      // 白方（空心符号）
  11: '♟', 12: '♜', 13: '♞', 14: '♝', 15: '♛', 16: '♚',  // 黑方（实心符号）
}
function drawChess(ctx: CanvasRenderingContext2D, size: number) {
  const cell = size / 8
  // 棋盘底色（白格/绿格交替）
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#f0d9b5' : '#b58863'
      ctx.fillRect(c * cell, r * cell, cell, cell)
    }
  }
  // 棋子（Unicode 符号，程序化绘制）
  for (let i = 0; i < activeBoard.value.length; i++) {
    const v = activeBoard.value[i]
    if (!v) continue
    const r = Math.floor(i / 8), c = i % 8
    const x = c * cell + cell / 2, y = r * cell + cell / 2
    ctx.font = `bold ${cell * 0.72}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const isWhite = CHESS.owner(v) === 0
    ctx.fillStyle = isWhite ? '#f8f4e6' : '#2b2b2b'
    // 阴影
    ctx.fillStyle = isWhite ? '#f8f4e6' : '#1a1a1a'
    ctx.fillText(CHESS_GLYPH[v] || '', x, y + 1)
    ctx.fillStyle = isWhite ? '#ffffff' : '#3a3a3a'
    ctx.fillText(CHESS_GLYPH[v] || '', x, y)
    ctx.strokeStyle = isWhite ? '#555' : '#000'
    ctx.lineWidth = 0.8
    ctx.strokeText(CHESS_GLYPH[v] || '', x, y)
  }
}

// ===== 国际跳棋棋盘（8×8 黑白格） =====
function drawCheckers(ctx: CanvasRenderingContext2D, size: number) {
  const cell = size / 8
  // 浅色底
  ctx.fillStyle = '#e8c98a'
  ctx.fillRect(0, 0, size, size)
  // 深色格
  ctx.fillStyle = '#8a5a2b'
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) ctx.fillRect(c * cell, r * cell, cell, cell)
    }
  }
  // 格子线
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 0; i <= 8; i++) {
    ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, size)
    ctx.moveTo(0, i * cell); ctx.lineTo(size, i * cell)
  }
  ctx.stroke()
  // 棋子（1/3 黑方，2/4 白方；3/4 为王）
  for (let i = 0; i < activeBoard.value.length; i++) {
    const v = activeBoard.value[i]
    if (!v || v === -1) continue
    const r = Math.floor(i / 8), c = i % 8
    const x = c * cell + cell / 2, y = r * cell + cell / 2
    const isBlack = v === 1 || v === 3
    ctx.fillStyle = isBlack ? '#3a3a3a' : '#f5f0e6'
    ctx.beginPath(); ctx.arc(x, y, cell * 0.36, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = isBlack ? '#111' : '#b0a890'
    ctx.lineWidth = 1.5
    ctx.stroke()
    if (v === 3 || v === 4) {
      // 王棋：金色内环
      ctx.strokeStyle = '#ffd700'
      ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.arc(x, y, cell * 0.2, 0, Math.PI * 2); ctx.stroke()
    }
    if (selected.value === i) {
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 3.5
      ctx.beginPath(); ctx.arc(x, y, cell * 0.36, 0, Math.PI * 2); ctx.stroke()
    }
  }
}

const lastMove = ref<{ r: number; c: number } | null>(null)

// ===== 落子音效（Web Audio 程序化生成，无音频文件） =====
let audioCtx: AudioContext | null = null
function playMoveSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const t = audioCtx.currentTime
    const o = audioCtx.createOscillator()
    const g = audioCtx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(620, t)
    o.frequency.exponentialRampToValueAtTime(380, t + 0.09)
    g.gain.setValueAtTime(0.18, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
    o.connect(g).connect(audioCtx.destination)
    o.start(t); o.stop(t + 0.15)
  } catch { /* 音频不可用则静默 */ }
}
// 记录最后一步 + 落子音效
function markMove(r: number, c: number) {
  lastMove.value = { r, c }
  playMoveSound()
}

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
    const v = activeBoard.value[r * RV2 + c]
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
  const cell = (size - pad * 2) / 16   // 17 行 / 13 列网格
  const X = (c: number) => pad + c * cell
  const Y = (r: number) => pad + r * cell
  ctx.fillStyle = '#f5e6c8'
  ctx.fillRect(0, 0, size, size)

  // 有效点（121 点六角星）
  const lens = [1, 2, 3, 4, 13, 12, 11, 10, 9, 10, 11, 12, 13, 4, 3, 2, 1]
  const valid = new Set<number>()
  for (let r = 0; r < 17; r++) {
    const len = lens[r]
    const c0 = r < 4 ? 8 - r : (r < 9 ? r - 4 : (r < 13 ? 13 - len : 9 - len))
    for (let i = 0; i < len; i++) valid.add(r * 17 + (c0 + i))
  }
  const inValid = (r: number, c: number) => valid.has(r * 17 + c)

  // 六角星区域填充（12 顶点：6 凸角 + 6 凹角）
  ctx.fillStyle = '#e8c98a'
  ctx.beginPath()
  const outline = [[0, 8], [3, 9], [4, 12], [8, 12], [12, 12], [13, 9], [16, 8], [13, 7], [12, 0], [8, 0], [4, 0], [3, 7]]
  ctx.moveTo(X(outline[0][1]), Y(outline[0][0]))
  for (const [r, c] of outline.slice(1)) ctx.lineTo(X(c), Y(r))
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(139,90,43,0.7)'
  ctx.lineWidth = 3
  ctx.stroke()

  // 蜂窝网格连线（右/下/右下 3 方向去重）
  ctx.strokeStyle = 'rgba(139,90,43,0.3)'
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

  // 营地：实色三角角区（标准中国跳棋样式）+ 圆点
  const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']
  const camps = [
    [[0, 8], [1, 7], [1, 8], [2, 6], [2, 7], [2, 8], [3, 5], [3, 6], [3, 7], [3, 8]],
    [[4, 9], [4, 10], [4, 11], [4, 12], [5, 10], [5, 11], [5, 12], [6, 11], [6, 12], [7, 12]],
    [[9, 12], [10, 11], [10, 12], [11, 10], [11, 11], [11, 12], [12, 9], [12, 10], [12, 11], [12, 12]],
    [[13, 5], [13, 6], [13, 7], [13, 8], [14, 6], [14, 7], [14, 8], [15, 7], [15, 8], [16, 8]],
    [[9, 0], [10, 0], [10, 1], [11, 0], [11, 1], [11, 2], [12, 0], [12, 1], [12, 2], [12, 3]],
    [[4, 0], [4, 1], [4, 2], [4, 3], [5, 0], [5, 1], [5, 2], [6, 0], [6, 1], [7, 0]],
  ]
  const campTris = [
    [[0, 8], [3, 5], [3, 8]],
    [[4, 9], [4, 12], [7, 12]],
    [[9, 12], [12, 9], [12, 12]],
    [[13, 5], [13, 8], [16, 8]],
    [[9, 0], [12, 0], [12, 3]],
    [[4, 0], [4, 3], [7, 0]],
  ]
  campTris.forEach((tri, i) => {
    ctx.fillStyle = COLORS[i] + '30'
    ctx.beginPath()
    ctx.moveTo(X(tri[0][1]), Y(tri[0][0]))
    ctx.lineTo(X(tri[1][1]), Y(tri[1][0]))
    ctx.lineTo(X(tri[2][1]), Y(tri[2][0]))
    ctx.closePath()
    ctx.fill()
  })
  camps.forEach((pts, i) => {
    ctx.fillStyle = COLORS[i] + '40'
    for (const [r, c] of pts) {
      ctx.beginPath(); ctx.arc(X(c), Y(r), cell * 0.4, 0, Math.PI * 2); ctx.fill()
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
  for (let pt = 0; pt < activeBoard.value.length; pt++) {
    const v = activeBoard.value[pt]
    if (!v || v === -1) continue
    const r = Math.floor(pt / 17), c = pt % 17
    ctx.fillStyle = COLORS[(v - 1) % 6]
    ctx.beginPath(); ctx.arc(X(c), Y(r), cell * 0.36, 0, Math.PI * 2); ctx.fill()
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
        <p class="tag">经典棋类 · 在线对战 · AI 教学 · 服务端权威判棋</p>
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
          @click="gameId = g.id; refreshRooms()"
        >
          <span class="game-pick__emoji">{{ g.emoji }}</span>
          <div>
            <h3>{{ g.name }}</h3>
            <p>{{ g.desc }}</p>
          </div>
        </button>
      </div>

      <!-- 对战入口（两组策略：快速对战 / 好友对战） -->
      <div class="game-card">
        <div class="game-card__head">
          <span class="game-card__emoji">{{ GAME_LIST.find(g => g.id === gameId)?.emoji }}</span>
          <div>
            <h3>{{ GAME_LIST.find(g => g.id === gameId)?.name }}</h3>
            <p>{{ GAME_LIST.find(g => g.id === gameId)?.desc }} · 每方 15 分钟，超时判负</p>
          </div>
        </div>

        <!-- AI 教学入口（对战大厅上方） -->
        <button class="btn btn-ai btn-block btn-ai-top" @click="startAI">🤖 AI 教学 · 和 AI 下棋，边下边学规则</button>

        <!-- 策略一：快速对战 -->
        <div class="mode-box">
          <h4 class="mode-title">🎮 对战大厅</h4>
          <button class="btn btn-primary btn-block" :disabled="matching" @click="match">
            {{ matching ? '匹配中…' : '⚡ 快速匹配' }}
          </button>
          <p class="mode-note">自动配对同样点了「快速匹配」的玩家，约 120 秒内开赛</p>
          <!-- 等待中的房间（同组：直接选房加入） -->
          <div class="rooms-box" v-if="waitingRooms.length">
            <h4>等待中的房间（{{ waitingRooms.length }}）</h4>
            <div class="rooms-list">
              <button v-for="r in waitingRooms" :key="r.roomId" class="room-row" @click="enterRoom(r.roomId)">
                <span class="room-row__owner">{{ r.owner }}</span>
                <span class="room-row__id">房间 {{ r.roomId.slice(0, 8) }}</span>
                <span class="room-row__go">加入 →</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 策略二：好友对战 -->
        <div class="mode-box">
          <h4 class="mode-title">🤝 好友对战</h4>
          <button class="btn btn-block" @click="createRoom">🏠 创建房间</button>
          <p class="mode-note">创建房间并把房间号发给好友，好友输入房间号加入</p>
          <div class="join-row">
            <input v-model="roomCode" placeholder="输入好友房间号" @keyup.enter="joinRoom" />
            <button class="btn" @click="joinRoom">加入</button>
          </div>
        </div>

        <p v-if="roomErr" class="hint">{{ roomErr }}</p>
      </div>

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

      <!-- 返回主页 -->
      <footer class="lobby-foot">
        <a href="/">← 返回 ezapps 主页</a>
      </footer>
    </section>

    <!-- ===== AI 教学页 ===== -->
    <section v-else-if="stage === 'ai'" class="room">
      <header class="room-head ai-head">
        <div class="ai-title-row">
          <span class="room-title ai-title">🤖 AI 教学 · {{ GAME_LIST.find(g => g.id === curGame)?.name }}</span>
          <span class="room-id ai-desc">你执{{ aiSide.me }}（先手）vs AI · {{ aiThinking ? 'AI 思考中…' : '对局中' }}</span>
          <p class="ai-rules">{{ aiRules }}</p>
        </div>
        <div class="ai-btns">
          <button class="btn back" @click="stage = 'lobby'">← 大厅</button>
          <button class="btn" @click="showTipFor('manual')">💡 技巧</button>
          <button class="btn" @click="startAI">🔄 重开</button>
        </div>
      </header>

      <div class="players">
        <div class="player-chip" :class="{ active: aiTurn === 0 && !aiOver }">
          <span class="dot" :style="{ background: aiSide.meColor, borderColor: aiSide.meBorder }"></span>
          <span>你<small>（{{ aiSide.me }}）</small></span>
        </div>
        <div class="player-chip" :class="{ active: aiTurn === 1 && !aiOver }">
          <span class="dot" :style="{ background: aiSide.aiColor, borderColor: '#94a3b8' }"></span>
          <span>🤖 AI<small>（{{ aiSide.ai }}）</small></span>
        </div>
      </div>

      <div class="board-wrap">
        <canvas ref="canvasRef" class="board" @click="aiCellClick"></canvas>
        <!-- 技巧提示浮窗（棋盘中央悬浮） -->
        <transition name="tip">
          <div v-if="aiTipVisible" class="ai-tip" :class="{ 'ai-tip--over': aiOver }">
            <span class="ai-tip__text">{{ aiTipText }}</span>
            <button class="ai-tip__close" @click="aiTipVisible = false">✕</button>
          </div>
        </transition>
      </div>

      <p class="status" v-if="!aiOver">
        <template v-if="aiThinking">AI 思考中…</template>
        <template v-else-if="curGame === 'checkers' || curGame === 'chess' || curGame === 'xiangqi'">
          {{ aiSelected === null ? '第 1 步：点击紫色圆圈的可走棋子' : '第 2 步：点击紫色圆点选择目标位置' }}
        </template>
        <template v-else>轮到你落子（紫色圆点为可落位置）</template>
      </p>
      <p class="status warn">{{ aiOver ? '' : '提示：点击可落点下棋，AI 会教你规则' }}</p>

      <div v-if="aiOver" class="over-box">
        <h2>{{ aiOver.winner === 0 ? '🤝 和棋' : aiOver.winner === 1 ? '🎉 你赢了！' : '🤖 AI 获胜' }}</h2>
        <p>{{ aiOver.reason }}</p>
      </div>
    </section>

    <!-- ===== 对局页 ===== -->
    <section v-else class="room">
      <header class="room-head ai-head">
        <div class="ai-title-row">
          <span class="room-title ai-title">{{ GAME_LIST.find(g => g.id === curGame)?.emoji }} {{ GAME_LIST.find(g => g.id === curGame)?.name }} 对战</span>
          <span class="room-id ai-desc">房间 {{ roomId.slice(0, 8) }} · {{ phase === 'PLAYING' ? '对局中' : phase === 'FINISHED' ? '已结束' : '等待玩家…' }}</span>
          <p class="ai-rules">{{ aiRules }}</p>
        </div>
        <div class="ai-btns">
          <button class="btn back" @click="backToLobby">← 大厅</button>
          <template v-if="phase === 'FINISHED'">
            <button class="btn" :disabled="rematchRequested" @click="requestRematch">
              {{ rematchRequested ? '等待对方同意…' : (offerReceived ? '🤝 同意再来一局' : '🤝 再来一局') }}
            </button>
          </template>
          <template v-else>
            <button class="btn danger" :disabled="phase !== 'PLAYING'" @click="resign">认输</button>
          </template>
        </div>
      </header>

      <!-- 玩家栏 -->
      <div class="players">
        <div v-for="p in players" :key="p.seat" class="player-chip" :class="{ me: p.seat === mySeat, active: phase === 'PLAYING' && turn === p.seat }">
          <span class="dot" :style="{ background: p.seat === 0 ? '#111' : '#eee' }"></span>
          <span>{{ p.nick }}<small v-if="p.seat === mySeat">（我）</small></span>
          <span v-if="timers[p.seat] !== undefined" class="timer">{{ fmtTime(timers[p.seat]) }}</span>
        </div>
      </div>

      <!-- 棋盘 + 对局结束总结浮窗 -->
      <div class="board-wrap">
        <canvas ref="canvasRef" class="board" @click="cellClick"></canvas>
        <transition name="tip">
          <div v-if="(gameOver && !gameOverTipDismissed) || aiTipVisible" class="ai-tip" :class="{ 'ai-tip--over': gameOver && !gameOverTipDismissed }">
            <span class="ai-tip__text">{{ aiTipVisible && aiTipText ? aiTipText : rematchSummary }}</span>
            <button v-if="offerReceived && !rematchRequested" class="ai-tip__agree" @click="requestRematch">✅ 同意</button>
            <button class="ai-tip__close" @click="gameOverTipDismissed = true; aiTipVisible = false">✕</button>
          </div>
        </transition>
      </div>

      <!-- 状态提示（棋子图标按当前落子方颜色） -->
      <p class="status" v-if="!gameOver">
        <template v-if="phase === 'PLAYING'">
          {{ turn === mySeat ? '轮到你落子' : '等待对方落子…' }}
          <span class="turn-dot" :style="{ background: turn === 0 ? '#111' : '#f5f0e6', borderColor: turn === 0 ? '#111' : '#999' }"></span>
        </template>
        <template v-else>{{ phase === 'FINISHED' ? '对局结束' : '等待开局（满 2 人自动开始）' }}</template>
      </p>
      <p class="status warn">{{ lastMsg }}</p>

      <!-- 结算 -->
      <div v-if="gameOver && gameOverTipDismissed" class="over-box">
        <h2>{{ gameOver.winner === 0 ? '🤝 和棋' : (gameOver.winner - 1 === mySeat ? '🎉 你赢了！' : '😢 你输了') }}</h2>
        <p>{{ gameOver.reason }} · 积分：{{ gameOver.scores[mySeat] ?? gameOver.scores[0] }} 分</p>
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
.game-card__head { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; min-height: 52px; }
.game-card__emoji { font-size: 2rem; }
.game-card h3 { margin: 0; }
.game-card p { margin: 2px 0 0; color: #64748b; font-size: 0.82rem; min-height: 1.4em; }
.game-card__actions { display: flex; gap: 8px; }
.mode-box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 14px; background: #fff; }
.mode-title { margin: 0 0 14px; font-size: 0.9rem; color: #475569; }
.btn-ai { padding: 11px; border-color: #10b981; color: #059669; background: #ecfdf5; }
.btn-ai:hover { background: #d1fae5; }
.btn-ai-top { margin-bottom: 14px; font-size: 0.92rem; }
.ai-head { display: flex; flex-direction: column; gap: 10px; max-width: min(92vw, 480px); margin: 0 auto 14px; }
.ai-title-row { text-align: center; display: flex; flex-direction: column; gap: 4px; }
.ai-title { font-size: 1.15rem; }
.ai-desc { margin: 0; font-size: 0.82rem; color: #94a3b8; }
.ai-rules { margin: 6px 0 0; font-size: 0.76rem; color: #64748b; line-height: 1.7; background: #f8fafc; border-radius: 8px; padding: 8px 12px; text-align: left; }
.ai-btns { display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 8px; }
.ai-btns .btn { flex: 1; text-align: center; }
.ai-tip { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(360px, 82%); background: rgba(30, 41, 59, 0.92); color: #f1f5f9; padding: 14px 40px 14px 16px; border-radius: 14px; font-size: 0.85rem; line-height: 1.65; box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4); z-index: 99; pointer-events: auto; }
.ai-tip--over { background: rgba(16, 185, 129, 0.95); font-weight: bold; }
.ai-tip__text { white-space: pre-line; }
.ai-tip__close { position: absolute; top: 8px; right: 8px; background: rgba(0, 0, 0, 0.22); border: none; color: #fff; font-size: 0.8rem; cursor: pointer; padding: 4px 8px; border-radius: 50%; line-height: 1; }
.ai-tip__close:hover { background: rgba(0, 0, 0, 0.4); color: #fff; }
.ai-tip--over .ai-tip__close { background: rgba(255, 255, 255, 0.28); color: #fff; }
.ai-tip--over .ai-tip__close:hover { background: rgba(255, 255, 255, 0.45); }
.ai-tip__agree { display: block; margin-top: 10px; background: #10b981; border: none; color: #fff; font-weight: bold; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; }
.ai-tip__agree:hover { background: #059669; }
.tip-enter-active, .tip-leave-active { transition: opacity 0.3s; }
.tip-enter-from, .tip-leave-to { opacity: 0; }
.over-actions { display: flex; gap: 10px; justify-content: center; margin-top: 14px; }
.btn-block { display: block; width: 100%; padding: 11px; font-size: 0.95rem; }
.mode-note { margin: 12px 0 0; font-size: 0.76rem; color: #94a3b8; line-height: 1.6; }
.mode-box .join-row { margin: 12px 0 0; }
.mode-box .join-row input { max-width: none; }
.join-row button { white-space: nowrap; min-width: 64px; }
.game-card__note { margin-top: 12px; padding: 10px 12px; background: #f1f5f9; border-radius: 10px; font-size: 0.78rem; color: #64748b; line-height: 1.6; }
.game-card__note p { margin: 0; }
.game-card__note b { color: #475569; }
.game-picker { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px; }
.game-pick { display: flex; gap: 8px; align-items: center; padding: 10px 12px; border: 2px solid #e2e8f0; border-radius: 14px; background: #fff; cursor: pointer; text-align: left; }
@media (max-width: 420px) { .game-picker { grid-template-columns: repeat(2, 1fr); } }
.game-pick.on { border-color: #6366f1; background: #eef2ff; }
.game-pick__emoji { font-size: 1.6rem; }
.game-pick h3 { margin: 0; font-size: 0.95rem; }
.game-pick p { margin: 2px 0 0; font-size: 0.72rem; color: #64748b; min-height: 2em; line-height: 1.1; }
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
.lobby-foot { text-align: center; margin-top: 18px; }
.lobby-foot a { color: #64748b; text-decoration: none; font-size: 0.85rem; padding: 6px 14px; border-radius: 10px; }
.lobby-foot a:hover { background: #eef2ff; color: #4338ca; }
.rooms-box { margin-top: 14px; padding-top: 12px; border-top: 1px dashed #e2e8f0; }
.rooms-box h4 { margin: 0 0 10px; font-size: 0.82rem; color: #64748b; }
.rooms-list { display: flex; flex-direction: column; gap: 8px; }
.room-row { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; cursor: pointer; font-size: 0.88rem; text-align: left; }
.room-row:hover { border-color: #6366f1; background: #eef2ff; }
.room-row__owner { font-weight: bold; }
.room-row__id { color: #94a3b8; font-size: 0.78rem; flex: 1; }
.room-row__go { color: #6366f1; font-weight: bold; font-size: 0.82rem; }

.room-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.room-info { flex: 1; text-align: center; }
.room-title { font-weight: bold; font-size: 1.05rem; margin-right: 8px; }
.room-id, .room-phase { color: #64748b; font-size: 0.78rem; margin-right: 6px; }
.players { display: flex; justify-content: center; gap: 12px; margin-bottom: 12px; }
.player-chip { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: #f1f5f9; font-size: 0.85rem; border: 2px solid transparent; transition: background .2s, color .2s, border-color .2s; }
.player-chip.active { border-color: #6366f1; background: #e0e7ff; color: #3730a3; }
.player-chip.active .dot { border-color: #3730a3; }
.player-chip .dot { width: 14px; height: 14px; border-radius: 50%; border: 1px solid #94a3b8; }
.timer { color: #dc2626; font-weight: bold; font-size: 0.8rem; }
.board-wrap { display: flex; justify-content: center; position: relative; }
.board { width: min(92vw, 480px); height: min(92vw, 480px); border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); cursor: pointer; touch-action: none; }
.status { text-align: center; color: #475569; font-size: 0.9rem; margin: 12px 0 4px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.turn-dot { display: inline-block; width: 16px; height: 16px; border-radius: 50%; border: 2px solid; vertical-align: middle; }
.status.warn { color: #d97706; font-size: 0.8rem; min-height: 1.2em; }
.over-box { text-align: center; margin-top: 14px; padding: 18px; border-radius: 16px; background: #eef2ff; }
.over-box h2 { margin: 0 0 8px; }
.over-box p { margin: 0 0 12px; color: #64748b; }
</style>
