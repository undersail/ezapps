import type { GameRuntime, FeiFei, FeiFeiExpression, Obstacle, Collectible, Trigger, Goal, SkinDef, Spring, Portal, Conveyor, Hazard, ObstacleKind } from '../engine/types'
import type { RunnerRuntime } from '../engine/runnerTypes'

const RUNNER_SHIP_RADIUS = 3

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : (v > max ? max : v)
}

// 收集品主题色（按章节：星尘/月尘/彩球/气泡/星光/能量块）
const COLLECT_GLOW: Record<number, string> = {
  1: '#ffd700',
  2: '#38bdf8',
  3: '#f472b6',
  4: '#67e8f9',
  5: '#c084fc',
  6: '#4ade80',
}

export class SceneRenderer {
  /** 一屏视口高度基准（世界单位）：低于此高度的世界不垂直滚动 */
  private static readonly DEFAULT_VIEW_HEIGHT = 75
  
  private ctx: CanvasRenderingContext2D
  private width: number
  private height: number
  private scale: number
  // 世界尺寸（游戏逻辑坐标）
  private worldWidth: number = 0
  private worldHeight: number = 0
  // 视口尺寸（世界单位，一屏能显示多少世界）
  private viewW: number = 0
  private viewH: number = 0
  // 相机左上角（世界坐标）
  private cameraX: number = 0
  private cameraY: number = 0
  
  // 章节背景色
  private bgGradient: [string, string] = ['#0a0a2e', '#1a1a4e']
  
  // 屏幕震动幅度（像素），每帧衰减
  private shake: number = 0
  
  // 粒子系统（世界坐标）
  private particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string }[] = []
  
  // 视差星空缓存（屏幕空间 + 视差偏移系数）
  private stars: { x: number, y: number, size: number, brightness: number, parallax: number }[] = []
  
  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx
    this.width = width
    this.height = height
    this.scale = 1
    this.generateStars()
  }
  
  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.generateStars()
    // 视口随画布尺寸变化，重新计算
    if (this.worldWidth > 0) this.setWorldSize(this.worldWidth, this.worldHeight)
    // V2 跑酷视口：完整包含适配（140×75 世界单位整体居中，宽高取最小比例）
    this.scale = Math.min(width / 140, height / 75)
    this.viewH = 75
    this.viewW = 140
  }
  
  getWidth(): number { return this.width }
  getHeight(): number { return this.height }
  
  setBgGradient(colors: [string, string]): void {
    this.bgGradient = colors
  }
  
  setWorldSize(worldWidth: number, worldHeight: number): void {
    this.worldWidth = worldWidth
    this.worldHeight = worldHeight
    // 视口：高度固定为一屏基准（默认 75 世界单位），宽度按画布纵横比推导
    // 这样世界比视口大时相机可滚动，世界比视口小时自动居中（旧关卡无回归）
    this.viewH = Math.min(worldHeight, SceneRenderer.DEFAULT_VIEW_HEIGHT)
    const aspect = this.width / this.height
    this.viewW = Math.min(this.viewH * aspect, worldWidth)
    // 缩放：视口高度铺满画布高度
    this.scale = this.height / this.viewH
    // 相机初始在 (0,0)，由游戏循环 setCamera 控制
    this.cameraX = 0
    this.cameraY = 0
  }
  
  /** 设置相机左上角（世界坐标），自动钳制在世界范围内 */
  setCamera(x: number, y: number): void {
    this.cameraX = clamp(x, 0, Math.max(0, this.worldWidth - this.viewW))
    this.cameraY = clamp(y, 0, Math.max(0, this.worldHeight - this.viewH))
  }
  
  /** 获取视口尺寸（世界单位）和缩放，供游戏循环/相机逻辑使用 */
  getViewSize(): { width: number; height: number; scale: number } {
    return { width: this.viewW, height: this.viewH, scale: this.scale }
  }
  
  /** 屏幕震动（像素幅度） */
  setShake(amount: number): void {
    this.shake = Math.max(this.shake, amount)
  }
  
  /** 粒子爆发 */
  spawnParticles(x: number, y: number, kind: 'collect' | 'spring'): void {
    const n = kind === 'collect' ? 10 : 6
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = kind === 'collect' ? (Math.random() * 0.5 + 0.2) : (Math.random() * 0.4 + 0.1)
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (kind === 'spring' ? 0.3 : 0),
        life: 24,
        maxLife: 24,
        size: Math.random() * 1.5 + 1,
        color: kind === 'collect' ? '#ffd700' : '#fb923c',
      })
    }
    if (this.particles.length > 120) this.particles.splice(0, this.particles.length - 120)
  }
  
  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life--
      if (p.life <= 0) { this.particles.splice(i, 1); continue }
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.01  // 轻微下坠
    }
  }
  
  private drawParticles(): void {
    const ctx = this.ctx
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  
  render(runtime: GameRuntime, skin: SkinDef): void {
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.width, this.height)
    
    // 震动衰减 + 粒子更新
    this.shake *= 0.88
    if (this.shake < 0.05) this.shake = 0
    this.updateParticles()
    
    // 背景（全屏，星空视差）
    this.drawBackground(runtime)
    
    ctx.save()
    // 世界比视口大 → 相机平移；世界比视口小 → 居中（旧关卡行为不变）
    const panX = this.worldWidth > this.viewW
      ? -this.cameraX * this.scale
      : (this.width - this.worldWidth * this.scale) / 2
    const panY = this.worldHeight > this.viewH
      ? -this.cameraY * this.scale
      : (this.height - this.worldHeight * this.scale) / 2
    // 屏幕震动（像素级随机偏移）
    const shakeX = (Math.random() - 0.5) * this.shake
    const shakeY = (Math.random() - 0.5) * this.shake
    ctx.translate(panX + shakeX, panY + shakeY)
    ctx.scale(this.scale, this.scale)
    
    // 视口可见范围（世界坐标，加一点余量）
    const visL = this.cameraX - 5
    const visT = this.cameraY - 5
    const visR = this.cameraX + this.viewW + 5
    const visB = this.cameraY + this.viewH + 5
    const inView = (x: number, y: number, w: number, h: number) =>
      x + w >= visL && x <= visR && y + h >= visT && y <= visB
    
    // 触发区域（视口裁剪）
    for (const trigger of runtime.triggers) {
      if (inView(trigger.x, trigger.y, trigger.width, trigger.height)) {
        this.drawTrigger(trigger)
      }
    }
    
    // 障碍物（视口裁剪）
    for (const obs of runtime.obstacles) {
      if (inView(obs.x, obs.y, obs.width, obs.height)) {
        this.drawObstacle(obs)
      }
    }
    
    // 新实体：弹力垫/传送门/传送带/危险区（视口裁剪）
    for (const spring of runtime.springs) {
      if (inView(spring.x, spring.y, spring.width, spring.height)) this.drawSpring(spring)
    }
    for (const portal of runtime.portals) {
      if (inView(portal.x - portal.radius, portal.y - portal.radius, portal.radius * 2, portal.radius * 2)) this.drawPortal(portal)
    }
    for (const conv of runtime.conveyors) {
      if (inView(conv.x, conv.y, conv.width, conv.height)) this.drawConveyor(conv)
    }
    for (const hazard of runtime.hazards) {
      if (inView(hazard.x, hazard.y, hazard.width, hazard.height)) this.drawHazard(hazard)
    }
    
    // 收集品（视口裁剪）
    const chapter = Number(runtime.level.id.split('-')[0]) || 1
    for (const col of runtime.collectibles) {
      if (inView(col.x - 8, col.y - 8, 16, 16)) {
        this.drawCollectible(col, chapter)
      }
    }
    
    // 终点
    this.drawGoal(runtime.goal, runtime.feifei)
    
    // 飞飞
    this.drawFeiFei(runtime.feifei, skin)
    
    // 粒子（世界坐标，最上层）
    this.drawParticles()
    
    ctx.restore()
    
    // 目标指示（屏幕空间）：终点在视口外时显示边缘方向箭头
    this.drawGoalIndicator(runtime)
  }
  
  /** 屏幕边缘目标指示：终点不在视野内时显示方向箭头（大世界关卡） */
  private drawGoalIndicator(runtime: GameRuntime): void {
    const goal = runtime.goal
    const panX = this.worldWidth > this.viewW ? -this.cameraX * this.scale : (this.width - this.worldWidth * this.scale) / 2
    const panY = this.worldHeight > this.viewH ? -this.cameraY * this.scale : (this.height - this.worldHeight * this.scale) / 2
    const gx = goal.x * this.scale + panX
    const gy = goal.y * this.scale + panY
    const margin = 42
    // 终点在视野内：不显示
    if (gx > margin && gx < this.width - margin && gy > margin && gy < this.height - margin) return
    
    const cx = this.width / 2
    const cy = this.height / 2
    const dx = gx - cx
    const dy = gy - cy
    const angle = Math.atan2(dy, dx)
    // 锚点钳制到屏幕边缘（留 margin）
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)
    const tx = Math.abs((this.width / 2 - margin) / (Math.abs(cosA) > 0.01 ? cosA : 0.01))
    const ty = Math.abs((this.height / 2 - margin) / (Math.abs(sinA) > 0.01 ? sinA : 0.01))
    const t = Math.min(tx, ty)
    const ax = cx + cosA * t
    const ay = cy + sinA * t
    
    const ctx = this.ctx
    ctx.save()
    ctx.translate(ax, ay)
    ctx.rotate(angle)
    // 箭头
    ctx.fillStyle = 'rgba(16, 185, 129, 0.9)'
    ctx.beginPath()
    ctx.moveTo(10, 0)
    ctx.lineTo(-5, -7)
    ctx.lineTo(-5, 7)
    ctx.closePath()
    ctx.fill()
    // 脉冲光环
    const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7
    ctx.strokeStyle = `rgba(16, 185, 129, ${pulse * 0.6})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, 13 + pulse * 4, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
  
  // ============ V2 跑酷渲染（垂直跑酷：障碍下落流 + 自由飞船） ============
  
  /** 渲染跑酷关卡（固定视口，飞船自由移动，障碍从顶部下落） */
  renderRunner(runtime: RunnerRuntime, skin: SkinDef, upgradeLevels?: { engine: number; armor: number; battery: number }): void {
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.width, this.height)
    
    const VIEW_H = 75
    const VIEW_W = 140   // 固定视口（完整包含适配）
    const scale = this.scale  // min(width/140, height/75)
    const panX = (this.width - VIEW_W * scale) / 2
    const panY = (this.height - VIEW_H * scale) / 2
    
    // 背景渐变
    const [c1, c2] = runtime.level.bgGradient
    const grad = ctx.createLinearGradient(0, 0, 0, this.height)
    grad.addColorStop(0, c1)
    grad.addColorStop(1, c2)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, this.width, this.height)
    
    // 章节主题背景装饰（屏幕空间：鱼群/山林/云鸟/星空/行星/星云）
    this.drawChapterBackdrop(runtime.level.chapter, Date.now() / 1000, panX, panY, scale, VIEW_W, VIEW_H)
    
    ctx.save()
    ctx.translate(panX, panY)
    ctx.scale(scale, scale)
    
    // 视口背景边框（深海氛围：底部暗）
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(0, VIEW_H - 12, VIEW_W, 12)
    
    // 太阳能区（金色光柱，y=激活里程，progress 到达后显示为视口顶部竖条）
    for (const z of runtime.level.solarZones) {
      if (runtime.progress < z.y) continue   // 未到激活里程
      const pulse = Math.sin(Date.now() / 400) * 0.15 + 0.35
      ctx.fillStyle = `rgba(253, 224, 71, ${pulse})`
      ctx.fillRect(z.x, 0, z.width, Math.min(z.height, VIEW_H))
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.7)'
      ctx.lineWidth = 1
      ctx.strokeRect(z.x, 0, z.width, Math.min(z.height, VIEW_H))
    }
    
    // 障碍（复用主题形态绘制 + 章节专属元素库）
    const chapter = runtime.level.chapter
    for (const o of runtime.obstacles) {
      if (!o.active) continue
      const fake: Obstacle = {
        id: o.id,
        type: 'static',
        x: o.x - o.width / 2,
        y: o.y - o.height / 2,
        width: o.width,
        height: o.height,
        originX: 0,
        originY: 0,
        color: o.color || '',
        rounded: false,
        phase: 0,
        kind: o.style,
      }
      // 章节专属障碍形态（元素库）
      if (chapter === 1 && o.kind === 'falling') { this.drawFishObstacle(fake); continue }
      if (chapter === 3 && o.kind === 'falling') { this.drawBirdObstacle(fake); continue }
      switch (o.style) {
        case 'rock': this.drawRock(fake); break
        case 'metal': this.drawMetal(fake); break
        case 'cloud': this.drawCloud(fake); break
        case 'orb': this.drawOrb(fake); break
        case 'crystal': this.drawCrystal(fake); break
        case 'ice': this.drawIce(fake); break
        default: this.drawRock(fake)
      }
    }
    
    // 障碍阴影（下落物体拖影，增加速度感）
    for (const o of runtime.obstacles) {
      if (!o.active || o.kind !== 'dive') continue
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      ctx.beginPath()
      ctx.ellipse(o.x, o.y + o.height * 0.9, o.width * 0.4, o.height * 0.25, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // 宝石（菱形宝石：按章配色 + 💎切面高光；s/m/l 分级；l 带倒计时+星芒）
    for (const g of runtime.gemsArr) {
      if (g.collected) continue
      const bob = Math.sin(Date.now() / 300 + g.x) * 1
      const gy = g.y + bob
      const glow = COLLECT_GLOW[runtime.level.chapter] || '#ffd700'
      // 大块：消失倒计时闪烁
      let alpha = 1
      if (g.expiresIn > 0 && g.expiresIn <= 3) alpha = Math.sin(Date.now() / 150) > 0 ? 1 : 0.3
      ctx.globalAlpha = alpha
      const r = g.size === 'l' ? 3.4 : g.size === 'm' ? 2.9 : 2.3
      // 菱形主体
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.moveTo(g.x, gy - r)
      ctx.lineTo(g.x + r * 0.8, gy)
      ctx.lineTo(g.x, gy + r)
      ctx.lineTo(g.x - r * 0.8, gy)
      ctx.closePath()
      ctx.fill()
      // 💎 切面高光（白色交叉亮线）
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(g.x, gy - r * 0.6)
      ctx.lineTo(g.x + r * 0.35, gy - r * 0.1)
      ctx.lineTo(g.x, gy + r * 0.4)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(g.x - r * 0.5, gy - r * 0.2)
      ctx.lineTo(g.x + r * 0.5, gy - r * 0.2)
      ctx.stroke()
      // 光晕
      ctx.globalAlpha = alpha * 0.25
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(g.x, gy, r * 2, 0, Math.PI * 2)
      ctx.fill()
      // 大块：旋转星芒（稀有信号）
      if (g.size === 'l') {
        ctx.globalAlpha = alpha * 0.7
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 0.6
        ctx.save()
        ctx.translate(g.x, gy)
        ctx.rotate(Date.now() / 800)
        ctx.beginPath()
        for (let i = 0; i < 4; i++) {
          const a = Math.PI / 2 * i
          ctx.moveTo(0, 0)
          ctx.lineTo(Math.cos(a) * r * 2, Math.sin(a) * r * 2)
        }
        ctx.stroke()
        ctx.restore()
      }
      ctx.globalAlpha = 1
      // 大块倒计时数字（剩余 <=3 显示）
      if (g.expiresIn > 0 && g.expiresIn <= 3 && alpha === 1) {
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 5px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(String(Math.ceil(g.expiresIn)), g.x, gy - r - 2.5)
      }
    }
    
    // 能量块（圆角方块 + ⚡ 图标；s/m/l 分级；l 带倒计时+脉冲光环）
    for (const eb of runtime.energyBlocks) {
      if (eb.collected) continue
      const bob = Math.sin(Date.now() / 300 + eb.x + 2) * 1
      const ey = eb.y + bob
      let alpha = 1
      if (eb.expiresIn > 0 && eb.expiresIn <= 3) alpha = Math.sin(Date.now() / 150) > 0 ? 1 : 0.3
      ctx.globalAlpha = alpha
      const s = eb.size === 'l' ? 3.6 : eb.size === 'm' ? 3.1 : 2.6
      // 圆角方块
      ctx.fillStyle = '#4ade80'
      this.roundRectPath(eb.x - s, ey - s, s * 2, s * 2, s * 0.45)
      ctx.fill()
      // ⚡ 闪电图标（白色折线）
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      const lx = eb.x
      ctx.moveTo(lx + s * 0.2, ey - s * 0.75)
      ctx.lineTo(lx - s * 0.45, ey + s * 0.05)
      ctx.lineTo(lx - s * 0.05, ey + s * 0.05)
      ctx.lineTo(lx - s * 0.2, ey + s * 0.75)
      ctx.lineTo(lx + s * 0.45, ey - s * 0.05)
      ctx.lineTo(lx + s * 0.05, ey - s * 0.05)
      ctx.closePath()
      ctx.fill()
      // 大块：脉冲光环
      if (eb.size === 'l') {
        ctx.globalAlpha = alpha * (0.2 + Math.sin(Date.now() / 300) * 0.12)
        ctx.fillStyle = '#4ade80'
        ctx.beginPath()
        ctx.arc(eb.x, ey, s * 2.2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      // 倒计时数字
      if (eb.expiresIn > 0 && eb.expiresIn <= 3 && alpha === 1) {
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 5px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(String(Math.ceil(eb.expiresIn)), eb.x, ey - s - 2.5)
      }
    }
    
    // 飞船（新造型：船头朝上垂直飞船）
    const ship = runtime.ship
    const fakeFeifei: FeiFei = {
      id: 'feifei',
      pos: { x: ship.x, y: ship.y },
      vel: { x: ship.vx, y: ship.vy },
      radius: RUNNER_SHIP_RADIUS,
      active: true,
      expression: ship.invincible > 0 ? 'hit' : 'normal',
      thrusting: { up: false, down: false, left: false, right: false },
      thrustDir: { x: 0, y: 0 },
      skinId: 'default',
      hitTimer: 0,
      winTimer: 0,
      dashTimer: runtime.dashTimer,   // 冲刺尾焰加长
      dashCooldown: 0,
      dashDirX: 0,
      dashDirY: 0,
      upgradeLevels: upgradeLevels || { engine: 0, armor: 0, battery: 0 },  // 装备升级可见外观
    }
    // 推进时尾焰
    if (runtime.throttle > 0.05) fakeFeifei.thrusting.up = true
    this.drawFeiFei(fakeFeifei, skin)
    
    ctx.restore()
  }
  
  /** 获取跑酷视口尺寸（世界单位）和缩放 */
  getRunnerViewSize(): { width: number; height: number; scale: number } {
    return { width: this.viewW || 140, height: 75, scale: this.height / 75 }
  }
  
  private drawBackground(runtime: GameRuntime): void {
    const ctx = this.ctx
    
    // 深色太空背景（使用章节渐变色）
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height)
    gradient.addColorStop(0, this.bgGradient[0])
    gradient.addColorStop(1, this.bgGradient[1])
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.width, this.height)
    
    // 视差星星：按相机位置偏移（远景慢、近景快），超出屏幕后回绕
    for (const star of this.stars) {
      const sx = wrap(star.x - this.cameraX * star.parallax * this.scale, this.width)
      const sy = wrap(star.y - this.cameraY * star.parallax * this.scale, this.height)
      ctx.beginPath()
      ctx.arc(sx, sy, star.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`
      ctx.fill()
    }
  }
  
  private drawObstacle(obs: Obstacle): void {
    const ctx = this.ctx
    
    // 单向平台：绿色半透明，表面亮线
    if (obs.type === 'platform') {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.35)'
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height)
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)'
      ctx.fillRect(obs.x, obs.y, obs.width, 2)
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.fillRect(obs.x + 1, obs.y + 2, obs.width - 2, 1)
      return
    }
    
    // 主题形态（kind 驱动，星球主题可视化）
    switch (obs.kind) {
      case 'rock': this.drawRock(obs); return
      case 'metal': this.drawMetal(obs); return
      case 'crystal': this.drawCrystal(obs); return
      case 'ice': this.drawIce(obs); return
      case 'cloud': this.drawCloud(obs); return
      case 'bounce': this.drawBounce(obs); return
      case 'orb': this.drawOrb(obs); return
      case 'water': this.drawWater(obs); return
    }
    
    ctx.fillStyle = obs.color || '#4a5568'
    
    if (obs.rounded) {
      const r = 4
      ctx.beginPath()
      ctx.moveTo(obs.x + r, obs.y)
      ctx.lineTo(obs.x + obs.width - r, obs.y)
      ctx.quadraticCurveTo(obs.x + obs.width, obs.y, obs.x + obs.width, obs.y + r)
      ctx.lineTo(obs.x + obs.width, obs.y + obs.height - r)
      ctx.quadraticCurveTo(obs.x + obs.width, obs.y + obs.height, obs.x + obs.width - r, obs.y + obs.height)
      ctx.lineTo(obs.x + r, obs.y + obs.height)
      ctx.quadraticCurveTo(obs.x, obs.y + obs.height, obs.x, obs.y + obs.height - r)
      ctx.lineTo(obs.x, obs.y + r)
      ctx.quadraticCurveTo(obs.x, obs.y, obs.x + r, obs.y)
      ctx.closePath()
      ctx.fill()
    } else {
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height)
    }
    
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.fillRect(obs.x, obs.y, obs.width, 2)
  }
  
  // ============ 章节主题背景装饰（程序化元素库） ============
  
  /** 绘制章节主题背景：鱼群/山林/云鸟/星空/行星/星云（屏幕空间，视口内） */
  private drawChapterBackdrop(chapter: number, time: number, panX: number, panY: number, scale: number, W: number, H: number): void {
    const ctx = this.ctx
    const X = (wx: number) => panX + wx * scale
    const Y = (wy: number) => panY + wy * scale
    const S = (v: number) => v * scale
    
    switch (chapter) {
      case 1: // 浮力海洋：气泡上浮 + 鱼群剪影游动
        this.drawOceanBackdrop(time, X, Y, S, W, H)
        break
      case 2: // 重力大陆：山峦剪影 + 树木
        this.drawLandBackdrop(X, Y, S, W, H)
        break
      case 3: // 自由天空：白云飘移 + 飞鸟
        this.drawSkyBackdrop(time, X, Y, S, W, H)
        break
      case 4: // 失重轨道：星空 + 卫星
        this.drawOrbitBackdrop(time, X, Y, S, W, H)
        break
      case 5: // 行星世界：行星远景 + 星环
        this.drawPlanetBackdrop(time, X, Y, S, W, H)
        break
      case 6: // 冲向宇宙：星云 + 星星
        this.drawUniverseBackdrop(time, X, Y, S, W, H)
        break
    }
  }
  
  /** 海洋：气泡上浮 + 鱼群剪影 */
  private drawOceanBackdrop(time: number, X: (n: number) => number, Y: (n: number) => number, S: (n: number) => number, W: number, H: number): void {
    const ctx = this.ctx
    // 气泡（上浮循环）
    for (let i = 0; i < 6; i++) {
      const bx = 12 + i * 22 + (i % 3) * 4
      const by = H - ((time * 1.2 + i * 18) % (H + 8)) + 4
      const br = 1.2 + (i % 3) * 0.5
      ctx.strokeStyle = 'rgba(165, 243, 252, 0.25)'
      ctx.lineWidth = Math.max(0.5, S(0.15))
      ctx.beginPath()
      ctx.arc(X(bx), Y(by), S(br), 0, Math.PI * 2)
      ctx.stroke()
    }
    // 鱼群剪影（暗色，缓慢游动）
    for (let i = 0; i < 3; i++) {
      const fy = 18 + i * 22
      const fx = ((time * 3 + i * 40) % (W + 30)) - 15
      const fs = 3.5 + i * 0.8
      ctx.fillStyle = 'rgba(2, 30, 40, 0.5)'
      // 身体
      ctx.beginPath()
      ctx.ellipse(X(fx), Y(fy), S(fs), S(fs * 0.45), 0, 0, Math.PI * 2)
      ctx.fill()
      // 尾巴
      ctx.beginPath()
      ctx.moveTo(X(fx + fs), Y(fy))
      ctx.lineTo(X(fx + fs * 1.9), Y(fy - fs * 0.5))
      ctx.lineTo(X(fx + fs * 1.9), Y(fy + fs * 0.5))
      ctx.closePath()
      ctx.fill()
    }
  }
  
  /** 大陆：山峦剪影 + 树木 */
  private drawLandBackdrop(X: (n: number) => number, Y: (n: number) => number, S: (n: number) => number, W: number, H: number): void {
    const ctx = this.ctx
    // 远处山峦（锯齿多边形）
    ctx.fillStyle = 'rgba(30, 20, 12, 0.35)'
    ctx.beginPath()
    ctx.moveTo(X(0), Y(H))
    const peaks = [0, 18, 10, 30, 20, 42, 28, 55, 40, 70, 52, 90, 66, 110, 80, 128, 95, 140]
    for (let i = 0; i < peaks.length; i += 2) {
      ctx.lineTo(X(peaks[i]), Y(peaks[i + 1]))
    }
    ctx.lineTo(X(W), Y(H))
    ctx.closePath()
    ctx.fill()
    // 近处山峦（更暗）
    ctx.fillStyle = 'rgba(15, 10, 6, 0.4)'
    ctx.beginPath()
    ctx.moveTo(X(0), Y(H))
    const peaks2 = [0, 42, 12, 58, 30, 48, 48, 62, 66, 52, 85, 64, 100, 55, 118, 66, 140, 58]
    for (let i = 0; i < peaks2.length; i += 2) {
      ctx.lineTo(X(peaks2[i]), Y(peaks2[i + 1]))
    }
    ctx.lineTo(X(W), Y(H))
    ctx.closePath()
    ctx.fill()
    // 树木（松树形：三角树冠 + 树干）
    for (let i = 0; i < 4; i++) {
      const tx = 8 + i * 38
      const ty = 55 + (i % 2) * 5
      const ts = 3 + (i % 3)
      ctx.fillStyle = 'rgba(20, 40, 15, 0.45)'
      ctx.beginPath()
      ctx.moveTo(X(tx), Y(ty - ts * 1.6))
      ctx.lineTo(X(tx - ts * 0.8), Y(ty))
      ctx.lineTo(X(tx + ts * 0.8), Y(ty))
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(40, 25, 10, 0.5)'
      ctx.fillRect(X(tx - ts * 0.15), Y(ty), S(ts * 0.3), S(ts * 0.5))
    }
  }
  
  /** 天空：白云飘移 + 飞鸟 */
  private drawSkyBackdrop(time: number, X: (n: number) => number, Y: (n: number) => number, S: (n: number) => number, W: number, H: number): void {
    const ctx = this.ctx
    // 白云（慢速飘移）
    for (let i = 0; i < 3; i++) {
      const cx = ((time * 2.5 + i * 60) % (W + 40)) - 20
      const cy = 12 + i * 20
      const cs = 5 + i * 2
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'
      ctx.beginPath()
      ctx.arc(X(cx), Y(cy), S(cs), 0, Math.PI * 2)
      ctx.arc(X(cx + cs * 1.2), Y(cy - cs * 0.4), S(cs * 0.8), 0, Math.PI * 2)
      ctx.arc(X(cx + cs * 2), Y(cy), S(cs * 0.9), 0, Math.PI * 2)
      ctx.fill()
    }
    // 飞鸟（V 形剪影）
    for (let i = 0; i < 3; i++) {
      const bx = ((time * 5 + i * 50) % (W + 20)) - 10
      const by = 30 + i * 15
      const bs = 2.5
      const flap = Math.sin(time * 4 + i) * 0.3
      ctx.strokeStyle = 'rgba(30, 40, 60, 0.35)'
      ctx.lineWidth = Math.max(0.6, S(0.25))
      ctx.beginPath()
      ctx.moveTo(X(bx - bs), Y(by))
      ctx.quadraticCurveTo(X(bx - bs * 0.4), Y(by - bs * (0.4 + flap)), X(bx), Y(by))
      ctx.quadraticCurveTo(X(bx + bs * 0.4), Y(by - bs * (0.4 + flap)), X(bx + bs), Y(by))
      ctx.stroke()
    }
  }
  
  /** 轨道：星空 + 卫星 */
  private drawOrbitBackdrop(time: number, X: (n: number) => number, Y: (n: number) => number, S: (n: number) => number, W: number, H: number): void {
    const ctx = this.ctx
    // 星星
    for (let i = 0; i < 16; i++) {
      const sx = (i * 37 + 13) % W
      const sy = (i * 23 + 7) % H
      const tw = Math.sin(time * 2 + i) * 0.5 + 0.5
      ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + tw * 0.4})`
      ctx.beginPath()
      ctx.arc(X(sx), Y(sy), S(0.5 + (i % 3) * 0.3), 0, Math.PI * 2)
      ctx.fill()
    }
    // 卫星（小矩形 + 太阳能板）
    const satX = ((time * 2 + 30) % (W + 30)) - 15
    const satY = 20
    ctx.save()
    ctx.translate(X(satX), Y(satY))
    ctx.rotate(0.3)
    ctx.fillStyle = 'rgba(180, 190, 210, 0.3)'
    ctx.fillRect(-S(3), -S(1.5), S(6), S(3))
    ctx.fillStyle = 'rgba(100, 140, 220, 0.35)'
    ctx.fillRect(-S(7), -S(1), S(3.5), S(2))
    ctx.fillRect(S(3.5), -S(1), S(3.5), S(2))
    ctx.restore()
  }
  
  /** 行星：行星远景 + 星尘 */
  private drawPlanetBackdrop(time: number, X: (n: number) => number, Y: (n: number) => number, S: (n: number) => number, W: number, H: number): void {
    const ctx = this.ctx
    // 远处大行星（右上角，带光环）
    const px = W - 30
    const py = 20
    const pr = 16
    const grad = ctx.createRadialGradient(X(px - pr * 0.4), Y(py - pr * 0.4), S(2), X(px), Y(py), S(pr))
    grad.addColorStop(0, 'rgba(250, 160, 80, 0.5)')
    grad.addColorStop(1, 'rgba(180, 80, 40, 0.25)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(X(px), Y(py), S(pr), 0, Math.PI * 2)
    ctx.fill()
    // 光环
    ctx.strokeStyle = 'rgba(230, 200, 150, 0.3)'
    ctx.lineWidth = Math.max(1, S(0.5))
    ctx.beginPath()
    ctx.ellipse(X(px), Y(py), S(pr * 1.7), S(pr * 0.45), -0.35, 0, Math.PI * 2)
    ctx.stroke()
    // 星尘
    for (let i = 0; i < 10; i++) {
      const sx = (i * 41 + 5) % W
      const sy = (i * 29 + 10) % H
      ctx.fillStyle = 'rgba(255, 240, 200, 0.15)'
      ctx.beginPath()
      ctx.arc(X(sx), Y(sy), S(0.6), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  
  /** 宇宙：星云 + 星星 */
  private drawUniverseBackdrop(time: number, X: (n: number) => number, Y: (n: number) => number, S: (n: number) => number, W: number, H: number): void {
    const ctx = this.ctx
    // 星云（径向渐变彩色团，缓慢旋转漂移）
    const nebulas = [
      { x: 25, y: 30, r: 22, c: 'rgba(120, 60, 200, ' },
      { x: 100, y: 55, r: 18, c: 'rgba(40, 120, 200, ' },
      { x: 60, y: 12, r: 15, c: 'rgba(200, 60, 120, ' },
    ]
    for (let i = 0; i < nebulas.length; i++) {
      const n = nebulas[i]
      const drift = Math.sin(time * 0.3 + i * 2) * 3
      const ng = ctx.createRadialGradient(X(n.x + drift), Y(n.y), S(1), X(n.x + drift), Y(n.y), S(n.r))
      ng.addColorStop(0, n.c + '0.12)')
      ng.addColorStop(1, n.c + '0)')
      ctx.fillStyle = ng
      ctx.beginPath()
      ctx.arc(X(n.x + drift), Y(n.y), S(n.r), 0, Math.PI * 2)
      ctx.fill()
    }
    // 星星
    for (let i = 0; i < 20; i++) {
      const sx = (i * 29 + 7) % W
      const sy = (i * 17 + 3) % H
      const tw = Math.sin(time * 3 + i * 1.3) * 0.5 + 0.5
      ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + tw * 0.5})`
      ctx.beginPath()
      ctx.arc(X(sx), Y(sy), S(0.4 + (i % 3) * 0.35), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  
  // ============ 主题形态绘制 ============
  
  /** 圆角矩形路径（兼容旧 TS lib，不用 ctx.roundRect） */
  private roundRectPath(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx
    const rr = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + rr, y)
    ctx.arcTo(x + w, y, x + w, y + h, rr)
    ctx.arcTo(x + w, y + h, x, y + h, rr)
    ctx.arcTo(x, y + h, x, y, rr)
    ctx.arcTo(x, y, x + w, y, rr)
    ctx.closePath()
  }
  
  /** 鱼形障碍（海洋章）：椭圆身体 + 尾鳍 + 眼睛 + 背鳍 */
  private drawFishObstacle(obs: Obstacle): void {
    const ctx = this.ctx
    const cx = obs.x + obs.width / 2
    const cy = obs.y + obs.height / 2
    const w = obs.width
    const h = obs.height
    // 身体（侧视鱼）
    ctx.fillStyle = this.themeColor(obs)
    ctx.beginPath()
    ctx.ellipse(cx, cy, w * 0.42, h * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()
    // 尾巴（三角）
    ctx.beginPath()
    ctx.moveTo(cx + w * 0.36, cy)
    ctx.lineTo(cx + w * 0.55, cy - h * 0.35)
    ctx.lineTo(cx + w * 0.55, cy + h * 0.35)
    ctx.closePath()
    ctx.fill()
    // 背鳍
    ctx.beginPath()
    ctx.moveTo(cx - w * 0.1, cy - h * 0.42)
    ctx.lineTo(cx, cy - h * 0.62)
    ctx.lineTo(cx + w * 0.12, cy - h * 0.36)
    ctx.closePath()
    ctx.fill()
    // 眼睛
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(cx - w * 0.24, cy - h * 0.12, Math.max(0.8, h * 0.09), 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1a1a2e'
    ctx.beginPath()
    ctx.arc(cx - w * 0.2, cy - h * 0.12, Math.max(0.4, h * 0.045), 0, Math.PI * 2)
    ctx.fill()
    // 鳞片纹
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 0.6
    ctx.beginPath()
    ctx.arc(cx + w * 0.05, cy, h * 0.22, -Math.PI * 0.8, Math.PI * 0.8)
    ctx.stroke()
  }
  
  /** 鸟形障碍（天空章）：身体 + 双翅 + 嘴 */
  private drawBirdObstacle(obs: Obstacle): void {
    const ctx = this.ctx
    const cx = obs.x + obs.width / 2
    const cy = obs.y + obs.height / 2
    const w = obs.width
    const h = obs.height
    ctx.fillStyle = this.themeColor(obs)
    // 身体（椭圆）
    ctx.beginPath()
    ctx.ellipse(cx, cy, w * 0.3, h * 0.34, 0, 0, Math.PI * 2)
    ctx.fill()
    // 双翅（展开，V 形）
    ctx.beginPath()
    ctx.moveTo(cx - w * 0.05, cy - h * 0.15)
    ctx.quadraticCurveTo(cx - w * 0.45, cy - h * 0.5, cx - w * 0.6, cy - h * 0.15)
    ctx.quadraticCurveTo(cx - w * 0.35, cy - h * 0.1, cx - w * 0.08, cy + h * 0.05)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(cx + w * 0.05, cy - h * 0.15)
    ctx.quadraticCurveTo(cx + w * 0.45, cy - h * 0.5, cx + w * 0.6, cy - h * 0.15)
    ctx.quadraticCurveTo(cx + w * 0.35, cy - h * 0.1, cx + w * 0.08, cy + h * 0.05)
    ctx.closePath()
    ctx.fill()
    // 尾巴
    ctx.beginPath()
    ctx.moveTo(cx, cy + h * 0.28)
    ctx.lineTo(cx - w * 0.15, cy + h * 0.48)
    ctx.lineTo(cx + w * 0.15, cy + h * 0.48)
    ctx.closePath()
    ctx.fill()
    // 眼睛
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(cx + w * 0.18, cy - h * 0.14, Math.max(0.8, h * 0.08), 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1a1a2e'
    ctx.beginPath()
    ctx.arc(cx + w * 0.2, cy - h * 0.14, Math.max(0.4, h * 0.04), 0, Math.PI * 2)
    ctx.fill()
    // 嘴
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.moveTo(cx + w * 0.28, cy - h * 0.06)
    ctx.lineTo(cx + w * 0.42, cy - h * 0.01)
    ctx.lineTo(cx + w * 0.28, cy + h * 0.04)
    ctx.closePath()
    ctx.fill()
  }
  
  /** 主题色：数据标注的非默认色优先，否则用 kind 专属色板 */
  private themeColor(obs: Obstacle): string {
    const c = obs.color
    if (c && !['#6b7280', '#475569', '#64748b', '#4a5568', '#94a3b8'].includes(c)) return c
    switch (obs.kind) {
      case 'rock': return '#8b7a6b'      // 岩石棕灰
      case 'metal': return '#64748b'     // 金属蓝灰
      case 'crystal': return '#4ade80'   // 能量绿
      case 'bounce': return '#a78bfa'    // 橡胶紫
      case 'orb': return '#fb923c'       // 行星橙
      case 'ice': return '#67e8f9'       // 冰青
      case 'cloud': return '#e2e8f0'     // 云白
      case 'water': return '#22d3ee'     // 水青
      default: return c || '#4a5568'
    }
  }
  
  /** 岩石：不规则多边形 + 棱角高光（小行星/月岩） */
  private drawRock(obs: Obstacle): void {
    const ctx = this.ctx
    const x = obs.x, y = obs.y, w = obs.width, h = obs.height
    // 伪随机顶点（基于位置 seed，形状稳定）
    const seed = (obs.id.charCodeAt(0) * 31 + obs.id.charCodeAt(1) * 7) % 10
    const pts: [number, number][] = []
    const n = 6
    for (let i = 0; i < n; i++) {
      const t = i / n
      const wob = ((seed + i * 3) % 5 - 2) * 0.12
      pts.push([x + w * (t + wob * 0.5), y + h * (0.3 + ((seed * 7 + i * 13) % 5) * 0.12)])
    }
    ctx.fillStyle = this.themeColor(obs)
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1])
    ctx.closePath()
    ctx.fill()
    // 棱角高光
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    ctx.lineTo(pts[1][0], pts[1][1])
    ctx.lineTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2 - h * 0.08)
    ctx.closePath()
    ctx.fill()
  }
  
  /** 金属：直角方板 + 四角铆钉 + 顶部高光（空间站/机械） */
  private drawMetal(obs: Obstacle): void {
    const ctx = this.ctx
    ctx.fillStyle = this.themeColor(obs)
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height)
    // 顶部高光
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.fillRect(obs.x, obs.y, obs.width, 2)
    // 底部阴影
    ctx.fillStyle = 'rgba(0,0,0,0.15)'
    ctx.fillRect(obs.x, obs.y + obs.height - 2, obs.width, 2)
    // 四角铆钉
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    const d = Math.min(2, obs.height / 4)
    for (const [dx, dy] of [[2, 2], [obs.width - 2 - d, 2], [2, obs.height - 2 - d], [obs.width - 2 - d, obs.height - 2 - d]]) {
      ctx.beginPath()
      ctx.arc(obs.x + dx, obs.y + dy, d / 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  
  /** 晶体：菱形 + 半透明 + 发光脉动（月晶/能量晶） */
  private drawCrystal(obs: Obstacle): void {
    const ctx = this.ctx
    const pulse = Math.sin(Date.now() / 400 + obs.x) * 0.15 + 0.5
    const cx = obs.x + obs.width / 2
    const cy = obs.y + obs.height / 2
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(Math.PI / 4)
    ctx.fillStyle = this.themeColor(obs)
    ctx.globalAlpha = 0.55 + pulse * 0.3
    ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height)
    ctx.globalAlpha = 1
    ctx.strokeStyle = obs.color || '#4ade80'
    ctx.lineWidth = 1.5
    ctx.strokeRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height)
    ctx.restore()
    // 中心亮点
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.beginPath()
    ctx.arc(cx, cy, 1.5, 0, Math.PI * 2)
    ctx.fill()
  }
  
  /** 冰面：半透明 + 白色斜纹高光 */
  private drawIce(obs: Obstacle): void {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(103, 232, 249, 0.45)'
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height)
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = -obs.height; i < obs.width; i += 6) {
      ctx.moveTo(obs.x + i, obs.y + obs.height)
      ctx.lineTo(obs.x + i + obs.height, obs.y)
    }
    ctx.stroke()
    ctx.strokeStyle = 'rgba(165, 243, 252, 0.6)'
    ctx.strokeRect(obs.x + 0.5, obs.y + 0.5, obs.width - 1, obs.height - 1)
  }
  
  /** 云层：三圆云朵 + 半透明 */
  private drawCloud(obs: Obstacle): void {
    const ctx = this.ctx
    const cy = obs.y + obs.height / 2
    ctx.fillStyle = 'rgba(226, 232, 240, 0.55)'
    ctx.beginPath()
    ctx.arc(obs.x + obs.width * 0.3, cy, obs.height * 0.55, 0, Math.PI * 2)
    ctx.arc(obs.x + obs.width * 0.55, cy - obs.height * 0.15, obs.height * 0.65, 0, Math.PI * 2)
    ctx.arc(obs.x + obs.width * 0.75, cy, obs.height * 0.5, 0, Math.PI * 2)
    ctx.fill()
    // 底部平整
    ctx.fillStyle = 'rgba(148, 163, 184, 0.4)'
    ctx.fillRect(obs.x, cy + obs.height * 0.2, obs.width, obs.height * 0.3)
  }
  
  /** 橡胶：圆角亮色 + 高光弧（弹力游乐场） */
  private drawBounce(obs: Obstacle): void {
    const ctx = this.ctx
    ctx.fillStyle = this.themeColor(obs)
    const r = Math.min(4, obs.height / 3)
    ctx.beginPath()
    ctx.moveTo(obs.x + r, obs.y)
    ctx.lineTo(obs.x + obs.width - r, obs.y)
    ctx.quadraticCurveTo(obs.x + obs.width, obs.y, obs.x + obs.width, obs.y + r)
    ctx.lineTo(obs.x + obs.width, obs.y + obs.height - r)
    ctx.quadraticCurveTo(obs.x + obs.width, obs.y + obs.height, obs.x + obs.width - r, obs.y + obs.height)
    ctx.lineTo(obs.x + r, obs.y + obs.height)
    ctx.quadraticCurveTo(obs.x, obs.y + obs.height, obs.x, obs.y + obs.height - r)
    ctx.lineTo(obs.x, obs.y + r)
    ctx.quadraticCurveTo(obs.x, obs.y, obs.x + r, obs.y)
    ctx.closePath()
    ctx.fill()
    // 高光弧
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(obs.x + obs.width * 0.4, obs.y + obs.height * 0.35, obs.height * 0.25, Math.PI * 1.1, Math.PI * 1.6)
    ctx.stroke()
  }
  
  /** 行星体：大圆 + 表面弧线 + 光环（引力星） */
  private drawOrb(obs: Obstacle): void {
    const ctx = this.ctx
    const cx = obs.x + obs.width / 2
    const cy = obs.y + obs.height / 2
    const R = Math.min(obs.width, obs.height) / 2
    ctx.fillStyle = this.themeColor(obs)
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fill()
    // 表面弧线（经线感）
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.ellipse(cx, cy, R * 0.85, R * 0.35, 0.4, 0, Math.PI * 2)
    ctx.stroke()
    // 光环
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.ellipse(cx, cy, R * 1.35, R * 0.5, -0.3, 0, Math.PI * 2)
    ctx.stroke()
    // 高光点
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.beginPath()
    ctx.arc(cx - R * 0.3, cy - R * 0.3, R * 0.15, 0, Math.PI * 2)
    ctx.fill()
  }
  
  /** 水墙：半透明青 + 流动波纹 */
  private drawWater(obs: Obstacle): void {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(34, 211, 238, 0.35)'
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height)
    // 流动波纹
    ctx.strokeStyle = 'rgba(165, 243, 252, 0.5)'
    ctx.lineWidth = 1
    const off = (Date.now() / 50) % 8
    ctx.beginPath()
    for (let wy = obs.y + 4; wy < obs.y + obs.height - 2; wy += 6) {
      for (let wx = obs.x - 8; wx < obs.x + obs.width + 8; wx += 16) {
        ctx.moveTo(wx + ((wy + off) % 8), wy)
        ctx.lineTo(wx + 6 + ((wy + off) % 8), wy)
      }
    }
    ctx.stroke()
  }
  
  private drawCollectible(col: Collectible, chapter: number): void {
    const ctx = this.ctx
    
    if (col.collected) {
      if (col.animTimer > 0) {
        col.animTimer--
        // 收集动画：放大+淡出
        const progress = 1 - col.animTimer / 20
        const scale = 1 + progress * 2
        const alpha = 1 - progress
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.translate(col.x, col.y)
        ctx.scale(scale, scale)
        if (col.type === 'stardust') {
          this.drawStardustShape(ctx, 0, 0, chapter)
        }
        ctx.restore()
      }
      return
    }
    
    // 浮动动画
    const bob = Math.sin(Date.now() / 300 + col.x) * 1.5
    
    if (col.type === 'stardust') {
      // 发光效果（按章主题色）
      const glowColor = COLLECT_GLOW[chapter] || '#ffd700'
      ctx.save()
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.arc(col.x, col.y + bob, 6, 0, Math.PI * 2)
      ctx.fillStyle = glowColor
      ctx.fill()
      ctx.restore()
      
      this.drawStardustShape(ctx, col.x, col.y + bob, chapter)
    } else if (col.type === 'checkpoint') {
      // 检查点
      ctx.save()
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.arc(col.x, col.y + bob, 8, 0, Math.PI * 2)
      ctx.fillStyle = '#10b981'
      ctx.fill()
      ctx.restore()
      
      ctx.fillStyle = '#10b981'
      ctx.beginPath()
      ctx.arc(col.x, col.y + bob, 5, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.fillStyle = '#fff'
      ctx.font = '8px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('✓', col.x, col.y + bob + 3)
    }
  }
  
  /** 主题化收集品：每章的"星尘"形态不同 */
  private drawStardustShape(ctx: CanvasRenderingContext2D, x: number, y: number, chapter: number): void {
    switch (chapter) {
      case 2:  // 月尘：浅蓝六边形
        ctx.fillStyle = '#38bdf8'
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3 - Math.PI / 2
          const px = x + Math.cos(a) * 4
          const py = y + Math.sin(a) * 4
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
        return
      case 3:  // 彩球：粉色圆珠
        ctx.fillStyle = '#f472b6'
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.beginPath()
        ctx.arc(x - 1, y - 1, 1.5, 0, Math.PI * 2)
        ctx.fill()
        return
      case 4:  // 气泡：青色圆泡（半透明）
        ctx.strokeStyle = '#67e8f9'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = 'rgba(103, 232, 249, 0.3)'
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.beginPath()
        ctx.arc(x - 1.5, y - 1.5, 1, 0, Math.PI * 2)
        ctx.fill()
        return
      case 5:  // 星光：紫色六芒星
        ctx.fillStyle = '#c084fc'
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3 - Math.PI / 2
          const r = i % 2 === 0 ? 4.5 : 2
          const px = x + Math.cos(a) * r
          const py = y + Math.sin(a) * r
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
        return
      case 6:  // 能量块：绿色菱形
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(Math.PI / 4)
        ctx.fillStyle = '#4ade80'
        ctx.fillRect(-2.8, -2.8, 5.6, 5.6)
        ctx.restore()
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.beginPath()
        ctx.arc(x - 1, y - 1, 1, 0, Math.PI * 2)
        ctx.fill()
        return
      default:  // 星尘：金色五角星（第一章）
        ctx.fillStyle = '#ffd700'
        ctx.beginPath()
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
          const r = 4
          const px = x + Math.cos(angle) * r
          const py = y + Math.sin(angle) * r
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
        return
    }
  }
  
  /** 弹力垫：橙色，画向上箭头 */
  private drawSpring(spring: Spring): void {
    const ctx = this.ctx
    const pulse = Math.sin(Date.now() / 200) * 0.1 + 0.4
    ctx.fillStyle = `rgba(249, 115, 22, ${pulse})`
    ctx.fillRect(spring.x, spring.y, spring.width, spring.height)
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.9)'
    ctx.lineWidth = 1
    ctx.strokeRect(spring.x + 0.5, spring.y + 0.5, spring.width - 1, spring.height - 1)
    // 向上箭头
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    const cx = spring.x + spring.width / 2
    const cy = spring.y + spring.height / 2
    ctx.beginPath()
    ctx.moveTo(cx, cy - 3)
    ctx.lineTo(cx - 4, cy + 2)
    ctx.lineTo(cx + 4, cy + 2)
    ctx.closePath()
    ctx.fill()
  }
  
  /** 传送门：紫色旋转圆环 */
  private drawPortal(portal: Portal): void {
    const ctx = this.ctx
    const spin = Date.now() / 300
    ctx.save()
    ctx.translate(portal.x, portal.y)
    ctx.rotate(spin)
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.9)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, portal.radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(0, 0, portal.radius - 3, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = 'rgba(168, 85, 247, 0.15)'
    ctx.beginPath()
    ctx.arc(0, 0, portal.radius - 1, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  
  /** 传送带：蓝色底 + 流动箭头 */
  private drawConveyor(conv: Conveyor): void {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'
    ctx.fillRect(conv.x, conv.y, conv.width, conv.height)
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)'
    ctx.lineWidth = 1
    ctx.strokeRect(conv.x + 0.5, conv.y + 0.5, conv.width - 1, conv.height - 1)
    // 流动箭头（沿 forceX 方向）
    const dir = conv.forceX >= 0 ? 1 : -1
    const step = 12
    const off = (Date.now() / 40) % step
    ctx.fillStyle = 'rgba(147, 197, 253, 0.6)'
    for (let ax = conv.x + off; ax < conv.x + conv.width; ax += step) {
      const cy = conv.y + conv.height / 2
      ctx.beginPath()
      ctx.moveTo(ax, cy)
      ctx.lineTo(ax - 3 * dir, cy - 2)
      ctx.lineTo(ax - 3 * dir, cy + 2)
      ctx.closePath()
      ctx.fill()
    }
  }
  
  /** 危险区：红色半透明 + 斜纹 */
  private drawHazard(hazard: Hazard): void {
    const ctx = this.ctx
    const blink = Math.sin(Date.now() / 150) * 0.1 + 0.45
    ctx.fillStyle = `rgba(239, 68, 68, ${blink})`
    ctx.fillRect(hazard.x, hazard.y, hazard.width, hazard.height)
    // 斜纹
    ctx.strokeStyle = 'rgba(254, 202, 202, 0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = -hazard.height; i < hazard.width; i += 8) {
      ctx.moveTo(hazard.x + i, hazard.y + hazard.height)
      ctx.lineTo(hazard.x + i + hazard.height, hazard.y)
    }
    ctx.stroke()
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)'
    ctx.strokeRect(hazard.x + 0.5, hazard.y + 0.5, hazard.width - 1, hazard.height - 1)
  }
  
  private drawTrigger(trigger: Trigger): void {
    const ctx = this.ctx
    ctx.save()
    
    if (trigger.type === 'boost') {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.15)'
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)'
    } else if (trigger.type === 'slow') {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)'
    } else if (trigger.type === 'wind') {
      ctx.fillStyle = 'rgba(147, 51, 234, 0.1)'
      ctx.strokeStyle = 'rgba(147, 51, 234, 0.3)'
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    }
    
    ctx.fillRect(trigger.x, trigger.y, trigger.width, trigger.height)
    ctx.strokeRect(trigger.x, trigger.y, trigger.width, trigger.height)
    
    ctx.restore()
  }
  
  private drawGoal(goal: Goal, feifei: FeiFei): void {
    const ctx = this.ctx
    const pulse = Math.sin(Date.now() / 500) * 0.3 + 0.7
    
    // 速度指示灯（有 maxSpeed 的对接关卡）：绿=安全 黄=偏快 红=太快
    let indicatorColor = '#10b981'
    if (goal.maxSpeed !== undefined) {
      const speed = Math.sqrt(feifei.vel.x ** 2 + feifei.vel.y ** 2)
      if (speed >= goal.maxSpeed * 0.8) indicatorColor = '#ef4444'
      else if (speed >= goal.maxSpeed * 0.5) indicatorColor = '#f59e0b'
    }
    
    // 发光
    ctx.save()
    ctx.globalAlpha = 0.2 * pulse
    ctx.beginPath()
    ctx.arc(goal.x, goal.y, goal.radius + 5, 0, Math.PI * 2)
    ctx.fillStyle = indicatorColor
    ctx.fill()
    ctx.restore()
    
    // 主圆
    ctx.beginPath()
    ctx.arc(goal.x, goal.y, goal.radius, 0, Math.PI * 2)
    ctx.fillStyle = indicatorColor
    ctx.globalAlpha = pulse
    ctx.fill()
    ctx.globalAlpha = 1
    
    // 对接图标
    if (goal.maxSpeed !== undefined) {
      ctx.font = '6px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('🎯', goal.x, goal.y + 2)
    }
  }
  
  private drawFeiFei(feifei: FeiFei, skin: SkinDef): void {
    const ctx = this.ctx
    const { pos, expression } = feifei
    
    // 被撞闪烁
    if (feifei.hitTimer > 0 && feifei.hitTimer % 4 < 2) return
    
    ctx.save()
    ctx.translate(pos.x, pos.y)
    // V2：船头固定朝上，不随速度旋转
    
    // 尾焰（向下喷射 = 向上推进）
    const isThrusting = (feifei.thrustDir.x !== 0 || feifei.thrustDir.y !== 0)
      || feifei.thrusting.up || feifei.thrusting.down || feifei.thrusting.left || feifei.thrusting.right
    if (isThrusting || expression === 'thrust') {
      this.drawFlame(ctx, skin, feifei)
    }
    
    // 机身
    this.drawBody(ctx, skin, feifei)
    
    // 表情
    this.drawExpression(ctx, expression, feifei)
    
    ctx.restore()
  }
  
  private drawFlame(ctx: CanvasRenderingContext2D, skin: SkinDef, feifei: FeiFei): void {
    const r = feifei.radius
    const upg = feifei.upgradeLevels || { engine: 0, armor: 0, battery: 0 }
    const flicker = Math.random() * 0.3 + 0.7
    // 冲刺时尾焰加长加亮；引擎升级再加长
    const dashBoost = feifei.dashTimer > 0 ? 2.2 : 1
    const engineBoost = 1 + upg.engine * 0.12
    const flameLen = (7 + Math.random() * 4) * flicker * dashBoost * engineBoost
    
    ctx.save()
    
    // 尾焰从底部喷口向下喷射
    const nozzleY = r * 1.5
    const gradient = ctx.createLinearGradient(0, nozzleY, 0, nozzleY + flameLen)
    gradient.addColorStop(0, skin.flameColor)
    gradient.addColorStop(0.5, skin.flameColor + (feifei.dashTimer > 0 ? 'cc' : '88'))
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    
    // 双喷口尾焰
    ctx.fillStyle = gradient
    for (const off of [-r * 0.28, r * 0.28]) {
      ctx.beginPath()
      ctx.moveTo(off - 1.5, nozzleY)
      ctx.lineTo(off, nozzleY + flameLen)
      ctx.lineTo(off + 1.5, nozzleY)
      ctx.closePath()
      ctx.fill()
    }
    
    ctx.restore()
  }
  
  private drawBody(ctx: CanvasRenderingContext2D, skin: SkinDef, feifei: FeiFei): void {
    const r = feifei.radius
    
    // ===== X 形机翼（先画，在机身下层） =====
    ctx.fillStyle = skin.bodyColor
    ctx.globalAlpha = 0.85
    // 水平双翼
    ctx.beginPath()
    ctx.moveTo(-r * 0.25, -r * 0.5)
    ctx.lineTo(-r * 1.9, -r * 0.15)
    ctx.lineTo(-r * 1.9, r * 0.25)
    ctx.lineTo(-r * 0.25, r * 0.1)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(r * 0.25, -r * 0.5)
    ctx.lineTo(r * 1.9, -r * 0.15)
    ctx.lineTo(r * 1.9, r * 0.25)
    ctx.lineTo(r * 0.25, r * 0.1)
    ctx.closePath()
    ctx.fill()
    // 倾斜双翼（前掠）
    ctx.beginPath()
    ctx.moveTo(-r * 0.3, r * 0.3)
    ctx.lineTo(-r * 1.5, r * 1.1)
    ctx.lineTo(-r * 1.1, r * 1.4)
    ctx.lineTo(-r * 0.15, r * 0.6)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(r * 0.3, r * 0.3)
    ctx.lineTo(r * 1.5, r * 1.1)
    ctx.lineTo(r * 1.1, r * 1.4)
    ctx.lineTo(r * 0.15, r * 0.6)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1
    // 翼尖灯（推进时亮）
    const thrusting = feifei.dashTimer > 0
    ctx.fillStyle = thrusting ? '#fde68a' : 'rgba(253, 230, 138, 0.4)'
    for (const wx of [-r * 1.9, r * 1.9]) {
      ctx.beginPath()
      ctx.arc(wx, r * 0.05, 0.8, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // ===== 能量环（机身中部光环，能量仓升级更亮更粗） =====
    const upg = feifei.upgradeLevels || { engine: 0, armor: 0, battery: 0 }
    const batteryBoost = 1 + upg.battery * 0.15
    const energyPulse = Math.sin(Date.now() / 250) * 0.2 + 0.6
    ctx.strokeStyle = feifei.dashTimer > 0
      ? `rgba(253, 224, 71, ${energyPulse + 0.3})`
      : `rgba(96, 165, 250, ${energyPulse * 0.7 * batteryBoost})`
    ctx.lineWidth = (feifei.dashTimer > 0 ? 2 : 1.2) * batteryBoost
    ctx.beginPath()
    ctx.ellipse(0, r * 0.15, r * 1.35, r * 0.5, 0, 0, Math.PI * 2)
    ctx.stroke()
    
    // ===== 机身（垂直泪滴，船头朝上） =====
    ctx.fillStyle = skin.bodyColor
    ctx.beginPath()
    ctx.moveTo(0, -r * 2.0)                          // 船头尖
    ctx.quadraticCurveTo(r * 1.15, -r * 0.8, r * 0.95, r * 0.5)   // 右舷
    ctx.lineTo(r * 0.6, r * 1.6)                     // 右下（引擎区）
    ctx.lineTo(-r * 0.6, r * 1.6)                    // 左下
    ctx.quadraticCurveTo(-r * 1.15, -r * 0.8, 0, -r * 2.0)        // 左舷回船头
    ctx.closePath()
    ctx.fill()
    
    // 船头高光条
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.beginPath()
    ctx.moveTo(0, -r * 2.0)
    ctx.quadraticCurveTo(r * 0.45, -r * 0.8, r * 0.3, r * 0.3)
    ctx.lineTo(r * 0.15, r * 0.3)
    ctx.quadraticCurveTo(r * 0.25, -r * 0.8, 0, -r * 1.8)
    ctx.closePath()
    ctx.fill()
    
    // 深色边缘（左侧）
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.beginPath()
    ctx.moveTo(0, -r * 2.0)
    ctx.quadraticCurveTo(-r * 1.15, -r * 0.8, -r * 0.95, r * 0.5)
    ctx.lineTo(-r * 0.6, r * 1.6)
    ctx.lineTo(-r * 0.45, r * 1.6)
    ctx.quadraticCurveTo(-r * 0.9, -r * 0.75, 0, -r * 1.7)
    ctx.closePath()
    ctx.fill()
    
    // ===== 底部引擎喷口（双喷口） =====
    ctx.fillStyle = '#334155'
    ctx.fillRect(-r * 0.42, r * 1.45, r * 0.36, r * 0.35)
    ctx.fillRect(r * 0.06, r * 1.45, r * 0.36, r * 0.35)
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)'
    ctx.fillRect(-r * 0.42, r * 1.45, r * 0.36, r * 0.1)
    ctx.fillRect(r * 0.06, r * 1.45, r * 0.36, r * 0.1)
    
    // ===== 护甲星徽（机身后部，护甲升级可见） =====
    const upgA = feifei.upgradeLevels || { engine: 0, armor: 0, battery: 0 }
    if (upgA.armor > 0) {
      const starY = r * 1.15
      const starR = r * 0.28 + upgA.armor * 0.03
      ctx.fillStyle = upgA.armor >= 2 ? '#fbbf24' : '#e2e8f0'
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const ang = Math.PI * 2 * i / 10 - Math.PI / 2
        const rad = i % 2 === 0 ? starR : starR * 0.45
        const px = Math.cos(ang) * rad
        const py = starY + Math.sin(ang) * rad
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
      if (upgA.armor >= 3) {
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.5)'
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.arc(0, starY, starR * 1.7, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }
  
  private drawExpression(ctx: CanvasRenderingContext2D, expression: FeiFeiExpression, feifei: FeiFei): void {
    const r = feifei.radius
    // V2：表情画在上部驾驶舱窗内
    const eyeY = -r * 0.75
    const eyeX = r * 0.15
    const eyeSize = 2.2
    
    // 驾驶舱窗框（半透明）
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)'
    ctx.beginPath()
    ctx.arc(r * 0.12, -r * 0.7, r * 0.75, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.5)'
    ctx.lineWidth = 0.8
    ctx.stroke()
    
    // 眼睛
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(eyeX, eyeY, eyeSize, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(eyeX, eyeY + r * 0.35, eyeSize * 0.8, 0, Math.PI * 2)
    ctx.fill()
    
    // 瞳孔
    ctx.fillStyle = '#1a1a2e'
    ctx.beginPath()
    ctx.arc(eyeX + 0.5, eyeY, 1.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(eyeX + 0.5, eyeY + r * 0.35, 1.1, 0, Math.PI * 2)
    ctx.fill()
    
    // 嘴巴
    if (expression === 'thrust') {
      // 加速：张嘴
      ctx.fillStyle = '#1a1a2e'
      ctx.beginPath()
      ctx.arc(eyeX + 1, eyeY + r * 0.2, 1.8, 0, Math.PI)
      ctx.fill()
    } else if (expression === 'hit') {
      // 撞击：X嘴
      ctx.strokeStyle = '#1a1a2e'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(eyeX - 1, eyeY + r * 0.15)
      ctx.lineTo(eyeX + 3, eyeY + r * 0.25)
      ctx.moveTo(eyeX + 3, eyeY + r * 0.15)
      ctx.lineTo(eyeX - 1, eyeY + r * 0.25)
      ctx.stroke()
    } else if (expression === 'win') {
      // 通关：开心
      ctx.strokeStyle = '#1a1a2e'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(eyeX + 1, eyeY + r * 0.15, 2.5, 0, Math.PI)
      ctx.stroke()
    }
  }
  
  private generateStars(): void {
    this.stars = []
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 1.5 + 0.5,
        brightness: Math.random() * 0.5 + 0.3,
        parallax: Math.random() * 0.4 + 0.1,  // 0.1 远景 ~ 0.5 近景
      })
    }
  }
}

function wrap(v: number, max: number): number {
  const m = v % max
  return m < 0 ? m + max : m
}
