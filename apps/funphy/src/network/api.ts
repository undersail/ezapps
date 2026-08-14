// funphy 联网模块：排行榜/云存档/每日挑战 API 封装
// P3：匿名 deviceId 身份 + 轨迹校验 + 迁移码；断网静默降级

const API_BASE = 'https://api.ezapps.cc/api'
// 签名密钥：构建时注入（.env → VITE_API_SECRET），不写死在代码里
const API_SECRET: string = import.meta.env.VITE_API_SECRET || ''

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

// ===== P3-1 匿名设备 ID（同一设备 = 同一身份；换设备用迁移码） =====
export function getDeviceId(): string {
  let id = localStorage.getItem('funphy_device_id')
  if (!id) {
    id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`)
    localStorage.setItem('funphy_device_id', id)
  }
  return id
}

export interface RankEntry {
  player: string
  score: number
  level: string
  ts: number
  dev?: string   // 设备指纹（前 8 位，区分同名）
  time?: number  // 用时（每日挑战同分排序）
}

export interface Trail {
  hits: number       // 受击次数
  playSeconds: number // 游玩秒数
}

/** 提交成绩（无限模式/每日挑战），带 deviceId + 轨迹 */
export async function submitRank(player: string, score: number, mode: 'endless' | 'daily', level: string, trail?: Trail, time?: number): Promise<{ rank: number; top: RankEntry[] } | null> {
  const deviceId = getDeviceId()
  const ts = Math.floor(Date.now() / 1000)
  const sig = await hmac(`${player}:${score}:${mode}:${level}:${ts}:${deviceId}`)
  return req('/rank/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player, score, mode, level, ts, sig, deviceId, trail, time }),
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

/** 上传云存档（绑定 deviceId） */
export async function submitSave(data: any): Promise<boolean> {
  const deviceId = getDeviceId()
  const ts = Math.floor(Date.now() / 1000)
  const sig = await hmac(`save:${deviceId}:${JSON.stringify(data)}:${ts}`)
  const res = await req('/save/put', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, data, ts, sig }),
  })
  return !!res?.success
}

/** 拉取云存档（当前设备） */
export async function fetchSave(): Promise<any | null> {
  const deviceId = getDeviceId()
  const res = await req(`/save/get?deviceId=${encodeURIComponent(deviceId)}`)
  return res?.data ?? null
}

/** 拉取每日挑战配置（日期 + 种子） */
export async function fetchDailyCfg(): Promise<{ date: string; seed: number; length: number } | null> {
  const res = await req('/daily/cfg')
  return res?.success ? res : null
}
