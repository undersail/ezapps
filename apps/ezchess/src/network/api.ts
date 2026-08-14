// ezchess 联网模块（app=ezchess，独立 Worker ezchess-api）
// REST：建房/匹配/房间信息；身份复用 deviceId + 昵称

const API_BASE = 'https://ezchess-api.ezapps.cc/api'

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

/** 匿名设备 ID（同 ezapps 体系，独立 key） */
export function getDeviceId(): string {
  let id = localStorage.getItem('ezchess_device_id')
  if (!id) {
    id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`)
    localStorage.setItem('ezchess_device_id', id)
  }
  return id
}

/** 昵称（与 funphy/funmath 共用） */
export function getNickname(): string {
  return localStorage.getItem('funphy_nickname') || ''
}
export function setNickname(name: string): void {
  localStorage.setItem('funphy_nickname', name.slice(0, 12))
}

export interface PlayerInfo { deviceId: string; nick: string }

/** 创建好友房 */
export async function createRoom(game: string, player: PlayerInfo, players = 2): Promise<{ roomId: string; wsUrl: string } | null> {
  const res = await req('/room/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game, players, player }),
  })
  return res?.success ? res : null
}

/** 快速匹配（返回 roomId 或 waiting） */
export async function matchRoom(game: string, player: PlayerInfo): Promise<{ roomId?: string; waiting?: boolean; opp?: string; wsUrl?: string } | null> {
  const res = await req('/room/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game, player }),
  })
  return res?.success ? res : null
}

/** 房间信息 */
export async function roomInfo(roomId: string): Promise<any | null> {
  const res = await req(`/room/info?roomId=${roomId}`)
  return res?.success ? res : null
}

/** 排行榜（ezapps-api 读，app=ezchess, mode=gomoku） */
export async function fetchTop(limit = 10): Promise<{ player: string; score: number }[] | null> {
  try {
    const res = await fetch(`https://api.ezapps.cc/api/rank/top?app=ezchess&mode=gomoku&limit=${limit}`)
    const d = await res.json()
    return d?.list ?? null
  } catch {
    return null
  }
}

export function wsUrl(roomId: string, player: PlayerInfo): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://ezchess-api.ezapps.cc/game/${roomId}/ws?deviceId=${encodeURIComponent(player.deviceId)}&nick=${encodeURIComponent(player.nick)}`
}
