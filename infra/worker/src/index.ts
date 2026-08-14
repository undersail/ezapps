// ezapps-api Worker（service-worker 格式）：排行榜 + 云存档
// KV: RANK（排行榜） / SAVE（云存档）— 通过全局变量注入

declare global {
  const RANK: KVNamespace
  const SAVE: KVNamespace
}

// 签名密钥（前端可见，防小白作弊；高防需服务端权威计分）
const API_SECRET = 'ezapps-funphy-rank-2026'

const CORS_ORIGINS = ['https://ezapps.cc', 'https://ezapps.pages.dev', 'http://localhost:5174', 'http://localhost:5173']

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

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const origin = request.headers.get('Origin')
  const headers = corsHeaders(origin)

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })

  try {
    // ===== 排行榜 TOP =====
    if (url.pathname === '/api/rank/top' && request.method === 'GET') {
      const mode = url.searchParams.get('mode') || 'endless'
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10) || 10, 100)
      const key = `rank:${mode}:all`
      const raw = await RANK.get(key)
      const list = raw ? (JSON.parse(raw) as any[]).slice(0, limit) : []
      return new Response(JSON.stringify({ success: true, mode, list }), { headers })
    }

    // ===== 提交成绩 =====
    if (url.pathname === '/api/rank/submit' && request.method === 'POST') {
      const body = await request.json() as any
      const { player, score, mode, level, ts, sig } = body
      if (!player || typeof score !== 'number' || !mode || !level || !ts || !sig) {
        return new Response(JSON.stringify({ success: false, error: '参数不完整' }), { status: 400, headers })
      }
      if (score < 0 || score > 50000 || player.length > 20 || player.length < 1) {
        return new Response(JSON.stringify({ success: false, error: '分数异常' }), { status: 400, headers })
      }
      if (Math.abs(Date.now() / 1000 - ts) > 600) {
        return new Response(JSON.stringify({ success: false, error: '时间戳过期' }), { status: 400, headers })
      }
      const expect = await hmac(`${player}:${score}:${mode}:${level}:${ts}`, API_SECRET)
      if (sig !== expect) {
        return new Response(JSON.stringify({ success: false, error: '签名无效' }), { status: 403, headers })
      }
      const lastKey = `last:${mode}:${player}`
      const last = await RANK.get(lastKey)
      if (last && Date.now() / 1000 - parseFloat(last) < 30) {
        return new Response(JSON.stringify({ success: false, error: '提交太频繁' }), { status: 429, headers })
      }
      await RANK.put(lastKey, String(Date.now() / 1000), { expirationTtl: 60 })

      const key = `rank:${mode}:all`
      const raw = await RANK.get(key)
      const list = raw ? JSON.parse(raw) as any[] : []
      list.push({ player, score, level, ts })
      list.sort((a: any, b: any) => b.score - a.score)
      const top = list.slice(0, 100)
      await RANK.put(key, JSON.stringify(top))
      if (mode === 'daily') {
        const dkey = `rank:daily:${new Date().toISOString().slice(0, 10)}`
        const drows = JSON.parse((await RANK.get(dkey)) || '[]') as any[]
        drows.push({ player, score, level, ts })
        drows.sort((a: any, b: any) => b.score - a.score)
        await RANK.put(dkey, JSON.stringify(drows.slice(0, 100)))
      }
      const rank = top.findIndex((r: any) => r.player === player && r.ts === ts)
      return new Response(JSON.stringify({ success: true, rank: rank === -1 ? top.length : rank + 1, top: top.slice(0, 10) }), { headers })
    }

    // ===== 云存档（P1）=====
    if (url.pathname === '/api/save/get' && request.method === 'GET') {
      const player = url.searchParams.get('player') || ''
      const raw = await SAVE.get(`save:${player}`)
      return new Response(JSON.stringify({ success: true, data: raw ? JSON.parse(raw) : null }), { headers })
    }
    if (url.pathname === '/api/save/put' && request.method === 'POST') {
      const body = await request.json() as any
      const { player, data, ts, sig } = body
      const expect = await hmac(`save:${player}:${JSON.stringify(data)}:${ts}`, API_SECRET)
      if (sig !== expect) return new Response(JSON.stringify({ success: false, error: '签名无效' }), { status: 403, headers })
      await SAVE.put(`save:${player}`, JSON.stringify(data))
      return new Response(JSON.stringify({ success: true }), { headers })
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
