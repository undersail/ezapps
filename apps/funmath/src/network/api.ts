// funmath 联网模块：排行榜/每日挑战 API 封装（app=funmath 隔离）
// 断网/失败静默降级（不影响单机游玩）

const API_BASE = 'https://api.ezapps.cc/api'
// 签名密钥：构建时注入（.env → VITE_API_SECRET）
const API_SECRET: string = import.meta.env.VITE_API_SECRET || ''
// 应用标识（后端隔离维度）
const APP = 'funmath'

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
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** 匿名设备 ID（同一设备 = 同一身份） */
export function getDeviceId(): string {
  let id = localStorage.getItem('funmath_device_id')
  if (!id) {
    id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`)
    localStorage.setItem('funmath_device_id', id)
  }
  return id
}

export interface RankEntry {
  player: string
  score: number
  level: string
  ts: number
  dev?: string
  time?: number
}

/** 提交成绩（mode='stars' 总星榜 / 'daily' 每日挑战），带得分+用时 */
export async function submitRank(player: string, score: number, mode: 'stars' | 'daily', level: string, time?: number): Promise<{ rank: number; top: RankEntry[] } | null> {
  const deviceId = getDeviceId()
  const ts = Math.floor(Date.now() / 1000)
  const sig = await hmac(`${APP}:${player}:${score}:${mode}:${level}:${ts}:${deviceId}`)
  return req('/rank/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app: APP, player, score, mode, level, ts, sig, deviceId, time, trail: { hits: 0, playSeconds: Math.min(time || 0, 600) } }),
  })
}

/** 拉取排行榜 TOP（app=funmath） */
export async function fetchTop(mode: 'stars' | 'daily' = 'stars', limit = 10): Promise<RankEntry[] | null> {
  const res = await req(`/rank/top?app=${APP}&mode=${mode}&limit=${limit}`)
  return res?.list ?? null
}

/** 读取昵称（localStorage 记忆，与 funphy 共用一套） */
export function getNickname(): string {
  return localStorage.getItem('funphy_nickname') || ''
}

/** 保存昵称 */
export function setNickname(name: string): void {
  localStorage.setItem('funphy_nickname', name.slice(0, 20))
}

/** 拉取每日挑战配置（app=funmath：10 题） */
export async function fetchDailyCfg(): Promise<{ app: string; date: string; seed: number; length: number } | null> {
  const res = await req(`/daily/cfg?app=${APP}`)
  return res?.success ? res : null
}
