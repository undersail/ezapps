// WebSocket 封装：自动重连 + 心跳 + 消息路由

export class GameWS {
  private ws: WebSocket | null = null
  private url: string
  private handlers: Record<string, (msg: any) => void> = {}
  private heartbeatTimer: number | undefined
  private closed = false

  constructor(url: string) {
    this.url = url
  }

  connect() {
    this.closed = false
    this.ws = new WebSocket(this.url)
    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data))
        const h = this.handlers[msg.type]
        if (h) h(msg)
        if (this.handlers['*']) this.handlers['*'](msg)
      } catch { /* 忽略坏消息 */ }
    }
    this.ws.onclose = () => {
      if (this.closed) return
      // 自动重连（对局房间 60s 窗口内）
      setTimeout(() => this.connect(), 2000)
    }
    this.ws.onerror = () => { try { this.ws?.close() } catch { /* 忽略 */ } }
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: 'ping' }))
    }, 20000)
  }

  on(type: string, handler: (msg: any) => void) {
    this.handlers[type] = handler
  }

  send(msg: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  close() {
    this.closed = true
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.ws?.close()
  }
}
