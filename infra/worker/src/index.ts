// ezapps-api Worker（service-worker 格式）：排行榜 + 云存档 + 每日挑战
// P3 优化：deviceId 身份 / IP+设备限流 / 写入熔断 / 轨迹校验 / 日榜用时规则
// KV: RANK（排行榜） / SAVE（云存档）

declare global {
  const RANK: KVNamespace
  const SAVE: KVNamespace
  const API_SECRET: string | undefined   // Dashboard Secret 环境变量（可选）
}

// 签名密钥：优先读环境变量（Dashboard 配置 Secret），兜底内置（部署时同步轮换）
const SECRET: string = typeof API_SECRET !== 'undefined' && API_SECRET ? API_SECRET : '3aa76c4446df3a7bfcebd774783815d0'

const CORS_ORIGINS = ['https://ezapps.cc', 'https://ezapps.pages.dev', 'http://localhost:5174', 'http://localhost:5173']
const DAILY_WRITE_LIMIT = 800      // 每日写入熔断（免费额度 1000 的 80%）
const MAX_SCORE = 50000            // 分数上限
const MAX_TRAIL_SECONDS = 600      // 单局最长秒数

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

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** 写入熔断检查（返回是否允许写入） */
async function writeBudgetOk(): Promise<boolean> {
  const key = `daily:writes:${today()}`
  const count = parseInt((await RANK.get(key)) || '0', 10)
  if (count >= DAILY_WRITE_LIMIT) return false
  await RANK.put(key, String(count + 1), { expirationTtl: 172800 })
  return true
}

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const origin = request.headers.get('Origin')
  const headers = corsHeaders(origin)
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })

  try {
    // ===== 排行榜 TOP =====
    if (url.pathname === '/api/rank/top' && request.method === 'GET') {
      const mode = url.searchParams.get('mode') || 'endless'
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10) || 10, 100)
      const key = `rank:${mode}:all`
      const raw = await RANK.get(key)
      const list = raw ? (JSON.parse(raw) as any[]).slice(0, limit) : []
      // 返回条目带设备指纹（前 8 位）区分同名
      const out = list.map((r: any) => ({ ...r, dev: (r.deviceId || '').slice(0, 8) }))
      return new Response(JSON.stringify({ success: true, mode, list: out }), { headers })
    }

    // ===== 提交成绩 =====
    if (url.pathname === '/api/rank/submit' && request.method === 'POST') {
      const body = await request.json() as any
      const { player, score, mode, level, ts, sig, deviceId, trail, time } = body
      if (!player || typeof score !== 'number' || !mode || !level || !ts || !sig || !deviceId) {
        return new Response(JSON.stringify({ success: false, error: '参数不完整' }), { status: 400, headers })
      }
      // 基础校验（P3-4 数据卫生）
      if (score < 0 || score > MAX_SCORE || player.length > 20 || player.length < 1 || deviceId.length > 64) {
        return new Response(JSON.stringify({ success: false, error: '参数异常' }), { status: 400, headers })
      }
      if (Math.abs(Date.now() / 1000 - ts) > 600) {
        return new Response(JSON.stringify({ success: false, error: '时间戳过期' }), { status: 400, headers })
      }
      // HMAC 签名校验
      const expect = await hmac(`${player}:${score}:${mode}:${level}:${ts}:${deviceId}`, SECRET)
      if (sig !== expect) {
        return new Response(JSON.stringify({ success: false, error: '签名无效' }), { status: 403, headers })
      }
      // P3-2 限流：IP 每 60 秒 3 次 + 设备每 60 秒 1 次
      const rlIpKey = `rl:ip:${ip}`
      const rlIp = parseInt((await RANK.get(rlIpKey)) || '0', 10)
      if (rlIp >= 3) return new Response(JSON.stringify({ success: false, error: '提交太频繁' }), { status: 429, headers })
      await RANK.put(rlIpKey, String(rlIp + 1), { expirationTtl: 60 })
      const rlDevKey = `rl:dev:${deviceId}`
      if (await RANK.get(rlDevKey)) return new Response(JSON.stringify({ success: false, error: '提交太频繁' }), { status: 429, headers })
      await RANK.put(rlDevKey, '1', { expirationTtl: 60 })

      // P3-2 轨迹合理性校验（轻量）
      if (trail && typeof trail === 'object') {
        const playSeconds = trail.playSeconds || 0
        if (playSeconds > MAX_TRAIL_SECONDS) {
          return new Response(JSON.stringify({ success: false, error: '时长异常' }), { status: 400, headers })
        }
        // 分数 / 时间 比例：极限流速 ~0.46*60=27.6 里程/秒，宽松上限 40
        if (playSeconds > 10 && score / playSeconds > 40) {
          return new Response(JSON.stringify({ success: false, error: '分数异常' }), { status: 400, headers })
        }
      }

      // P3-2 写入熔断（保护免费额度）
      if (!(await writeBudgetOk())) {
        return new Response(JSON.stringify({ success: false, error: '服务器忙，请稍后再试' }), { status: 503, headers })
      }

      // P3-2 分数单调性：同设备新分 < 历史 90% 拒绝（防刷低分干扰）
      const bestKey = `best:${mode}:${deviceId}`
      const best = parseFloat((await RANK.get(bestKey)) || '0')
      if (best > 0 && score < best * 0.9) {
        return new Response(JSON.stringify({ success: false, error: '成绩低于个人记录' }), { status: 400, headers })
      }
      if (score > best) await RANK.put(bestKey, String(score))

      // 更新榜单（里程降序；daily 同里程按用时升序）
      const key = `rank:${mode}:all`
      const raw = await RANK.get(key)
      const list = raw ? JSON.parse(raw) as any[] : []
      list.push({ player, score, level, ts, deviceId, time: time || 0 })
      if (mode === 'daily') {
        list.sort((a: any, b: any) => b.score - a.score || (a.time || 0) - (b.time || 0))
      } else {
        list.sort((a: any, b: any) => b.score - a.score)
      }
      const top = list.slice(0, 100)
      await RANK.put(key, JSON.stringify(top))
      if (mode === 'daily') {
        const dkey = `rank:daily:${today()}`
        const drows = JSON.parse((await RANK.get(dkey)) || '[]') as any[]
        drows.push({ player, score, level, ts, deviceId, time: time || 0 })
        drows.sort((a: any, b: any) => b.score - a.score || (a.time || 0) - (b.time || 0))
        await RANK.put(dkey, JSON.stringify(drows.slice(0, 100)), { expirationTtl: 604800 })
      }
      const rank = top.findIndex((r: any) => r.deviceId === deviceId && r.ts === ts)
      return new Response(JSON.stringify({ success: true, rank: rank === -1 ? top.length : rank + 1, top: top.slice(0, 10).map((r: any) => ({ ...r, dev: (r.deviceId || '').slice(0, 8) })) }), { headers })
    }

    // ===== 每日挑战配置（日期 → 确定性种子，全服一致） =====
    if (url.pathname === '/api/daily/cfg' && request.method === 'GET') {
      const date = today()
      let h = 2166136261
      for (const c of 'daily-' + date) {
        h ^= c.charCodeAt(0)
        h = Math.imul(h, 16777619)
      }
      const seed = (h >>> 0) % 100000
      return new Response(JSON.stringify({ success: true, date, seed, length: 1200 }), { headers })
    }

    // ===== 云存档（P3-1：绑定 deviceId） =====
    if (url.pathname === '/api/save/get' && request.method === 'GET') {
      const dev = url.searchParams.get('deviceId') || ''
      if (!dev || dev.length > 64) return new Response(JSON.stringify({ success: false, error: '参数异常' }), { status: 400, headers })
      const raw = await SAVE.get(`save:${dev}`)
      return new Response(JSON.stringify({ success: true, data: raw ? JSON.parse(raw) : null }), { headers })
    }
    if (url.pathname === '/api/save/put' && request.method === 'POST') {
      const body = await request.json() as any
      const { data, ts, sig, deviceId } = body
      if (!deviceId || deviceId.length > 64) return new Response(JSON.stringify({ success: false, error: '参数异常' }), { status: 400, headers })
      // 存档大小限制 ≤ 20KB（P3-4 数据卫生）
      const size = JSON.stringify(data).length
      if (size > 20000) return new Response(JSON.stringify({ success: false, error: '存档过大' }), { status: 400, headers })
      const expect = await hmac(`save:${deviceId}:${JSON.stringify(data)}:${ts}`, SECRET)
      if (sig !== expect) return new Response(JSON.stringify({ success: false, error: '签名无效' }), { status: 403, headers })
      if (!(await writeBudgetOk())) {
        return new Response(JSON.stringify({ success: false, error: '服务器忙，请稍后再试' }), { status: 503, headers })
      }
      await SAVE.put(`save:${deviceId}`, JSON.stringify(data))
      return new Response(JSON.stringify({ success: true }), { headers })
    }

    // ===== 迁移码（P3-1：换设备同步存档） =====
    if (url.pathname === '/api/migrate/create' && request.method === 'POST') {
      const body = await request.json() as any
      const { deviceId } = body
      if (!deviceId || deviceId.length > 64) return new Response(JSON.stringify({ success: false, error: '参数异常' }), { status: 400, headers })
      // 6 位数字码
      const code = String(Math.floor(100000 + Math.random() * 900000))
      await RANK.put(`migrate:${code}`, deviceId, { expirationTtl: 86400 })
      return new Response(JSON.stringify({ success: true, code }), { headers })
    }
    if (url.pathname === '/api/migrate/apply' && request.method === 'POST') {
      const body = await request.json() as any
      const { code, newDeviceId } = body
      if (!code || !newDeviceId || newDeviceId.length > 64) return new Response(JSON.stringify({ success: false, error: '参数异常' }), { status: 400, headers })
      const oldDev = await RANK.get(`migrate:${code}`)
      if (!oldDev) return new Response(JSON.stringify({ success: false, error: '迁移码无效或过期' }), { status: 400, headers })
      // 复制存档 + 成绩到新设备
      const saveRaw = await SAVE.get(`save:${oldDev}`)
      if (saveRaw) await SAVE.put(`save:${newDeviceId}`, saveRaw)
      await RANK.delete(`migrate:${code}`)
      return new Response(JSON.stringify({ success: true, migrated: !!saveRaw }), { headers })
    }

    // ===== 健康检查 =====
    if (url.pathname === '/' || url.pathname === '/api/health') {
      return new Response(JSON.stringify({ success: true, name: 'ezapps-api', time: Date.now() }), { headers })
    }

    return new Response(JSON.stringify({ success: false, error: 'Not Found' }), { status: 404, headers })
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers })
  }
}

addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(handleRequest(event.request))
})
