// funphy 联网模块：排行榜/云存档 API 封装
// 断网/失败静默降级（不影响单机游玩）

const API_BASE = 'https://api.ezapps.cc/api'
const API_SECRET = 'ezapps-funphy-rank-2026'   // 与 Worker vars 一致（防小白作弊）

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(API_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('')
}

async function req(path: string, init?: RequestInit): Promise<any> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 5000)
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...init, signal: ctrl.signal })
    return await res.json()
  } catch {
    return null   // 断网/超时：静默降级
  } finally {
    clearTimeout(timer)
  }
}

export interface RankEntry {
  player: string
  score: number
  level: string
  ts: number
}

/** 提交成绩（无限模式最佳里程 / 每日挑战） */
export async function submitRank(player: string, score: number, mode: 'endless' | 'daily', level: string): Promise<{ rank: number; top: RankEntry[] } | null> {
  const ts = Math.floor(Date.now() / 1000)
  const sig = await hmac(`${player}:${score}:${mode}:${level}:${ts}`)
  return req('/rank/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player, score, mode, level, ts, sig }),
  })
}

/** 拉取排行榜 TOP */
export async function fetchTop(mode: 'endless' | 'daily' = 'endless', limit = 10): Promise<RankEntry[] | null> {
  const res = await req(`/rank/top?mode=${mode}&limit=${limit}`)
  return res?.list ?? null
}

/** 读取昵称（localStorage 记忆） */
export function getNickname(): string {
  return localStorage.getItem('funphy_nickname') || ''
}

/** 保存昵称 */
export function setNickname(name: string): void {
  localStorage.setItem('funphy_nickname', name.slice(0, 20))
}
