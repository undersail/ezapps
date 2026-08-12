import type { GameRuntime, FeiFei, FeiFeiExpression, Obstacle, Collectible, Trigger, Goal, SkinDef } from '../engine/types'

export class SceneRenderer {
  private ctx: CanvasRenderingContext2D
  private width: number
  private height: number
  private scale: number
  private offsetX: number = 0
  private offsetY: number = 0
  private visibleWorldWidth: number = 0
  private visibleWorldHeight: number = 0
  private contentOffsetX: number = 0
  private contentOffsetY: number = 0
  
  // 章节背景色
  private bgGradient: [string, string] = ['#0a0a2e', '#1a1a4e']
  
  // 星空背景缓存
  private stars: { x: number, y: number, size: number, brightness: number }[] = []
  
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
  }
  
  getWidth(): number { return this.width }
  getHeight(): number { return this.height }
  
  setBgGradient(colors: [string, string]): void {
    this.bgGradient = colors
  }
  
  setWorldSize(worldWidth: number, worldHeight: number): void {
    // 统一缩放，保持物体不变形
    const scaleX = this.width / worldWidth
    const scaleY = this.height / worldHeight
    this.scale = Math.min(scaleX, scaleY)
    // 可视世界范围（可能比原始世界大，用于填满Canvas）
    this.visibleWorldWidth = this.width / this.scale
    this.visibleWorldHeight = this.height / this.scale
    // 世界内容在可视范围中的偏移（居中）
    this.contentOffsetX = (this.visibleWorldWidth - worldWidth) / 2
    this.contentOffsetY = (this.visibleWorldHeight - worldHeight) / 2
    // 渲染时从Canvas左上角开始，不偏移
    this.offsetX = 0
    this.offsetY = 0
  }
  
  /** 获取当前可视世界范围和内容偏移，供物理引擎和游戏循环使用 */
  getVisibleWorldSize(): { width: number; height: number; contentOffsetX: number; contentOffsetY: number; scale: number } {
    return {
      width: this.visibleWorldWidth,
      height: this.visibleWorldHeight,
      contentOffsetX: this.contentOffsetX,
      contentOffsetY: this.contentOffsetY,
      scale: this.scale,
    }
  }
  
  render(runtime: GameRuntime, skin: SkinDef): void {
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.width, this.height)
    
    // 背景
    this.drawBackground(runtime)
    
    ctx.save()
    ctx.translate(this.offsetX, this.offsetY)
    ctx.scale(this.scale, this.scale)
    
    // 触发区域
    for (const trigger of runtime.triggers) {
      this.drawTrigger(trigger)
    }
    
    // 障碍物
    for (const obs of runtime.obstacles) {
      this.drawObstacle(obs)
    }
    
    // 收集品
    for (const col of runtime.collectibles) {
      this.drawCollectible(col)
    }
    
    // 终点
    this.drawGoal(runtime.goal)
    
    // 飞飞
    this.drawFeiFei(runtime.feifei, skin)
    
    ctx.restore()
  }
  
  private drawBackground(runtime: GameRuntime): void {
    const ctx = this.ctx
    
    // 深色太空背景（使用章节渐变色）
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height)
    gradient.addColorStop(0, this.bgGradient[0])
    gradient.addColorStop(1, this.bgGradient[1])
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.width, this.height)
    
    // 星星
    for (const star of this.stars) {
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`
      ctx.fill()
    }
  }
  
  private drawObstacle(obs: Obstacle): void {
    const ctx = this.ctx
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
  
  private drawCollectible(col: Collectible): void {
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
          this.drawStardustShape(ctx, 0, 0)
        }
        ctx.restore()
      }
      return
    }
    
    // 浮动动画
    const bob = Math.sin(Date.now() / 300 + col.x) * 1.5
    
    if (col.type === 'stardust') {
      // 发光效果
      ctx.save()
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.arc(col.x, col.y + bob, 6, 0, Math.PI * 2)
      ctx.fillStyle = '#ffd700'
      ctx.fill()
      ctx.restore()
      
      this.drawStardustShape(ctx, col.x, col.y + bob)
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
  
  private drawStardustShape(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // 五角星
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
  
  private drawGoal(goal: Goal): void {
    const ctx = this.ctx
    const pulse = Math.sin(Date.now() / 500) * 0.3 + 0.7
    
    // 发光
    ctx.save()
    ctx.globalAlpha = 0.2 * pulse
    ctx.beginPath()
    ctx.arc(goal.x, goal.y, goal.radius + 5, 0, Math.PI * 2)
    ctx.fillStyle = '#10b981'
    ctx.fill()
    ctx.restore()
    
    // 主圆
    ctx.beginPath()
    ctx.arc(goal.x, goal.y, goal.radius, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(16, 185, 129, ${pulse})`
    ctx.fill()
    
    // 速度指示灯（有maxSpeed时）
    if (goal.maxSpeed !== undefined) {
      // 这里需要知道飞飞的速度，暂时用绿色
      ctx.fillStyle = '#10b981'
      ctx.font = '6px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('🎯', goal.x, goal.y + 2)
    }
  }
  
  private drawFeiFei(feifei: FeiFei, skin: SkinDef): void {
    const ctx = this.ctx
    const { pos, expression, thrusting, thrustDir } = feifei
    
    // 被撞闪烁
    if (feifei.hitTimer > 0 && feifei.hitTimer % 4 < 2) return
    
    ctx.save()
    ctx.translate(pos.x, pos.y)
    
    // 计算朝向角度（基于速度方向）
    const speed = Math.sqrt(feifei.vel.x ** 2 + feifei.vel.y ** 2)
    let angle = 0
    if (speed > 0.1) {
      angle = Math.atan2(feifei.vel.y, feifei.vel.x)
    }
    ctx.rotate(angle)
    
    // 尾焰
    const isThrusting = (thrustDir.x !== 0 || thrustDir.y !== 0)
      || thrusting.up || thrusting.down || thrusting.left || thrusting.right
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
    const flicker = Math.random() * 0.3 + 0.7
    const flameLen = (8 + Math.random() * 4) * flicker
    
    ctx.save()
    
    // 尾焰在机身后面
    const gradient = ctx.createLinearGradient(-feifei.radius - flameLen, 0, -feifei.radius, 0)
    gradient.addColorStop(0, 'rgba(255,255,255,0)')
    gradient.addColorStop(0.5, skin.flameColor + '88')
    gradient.addColorStop(1, skin.flameColor)
    
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.moveTo(-feifei.radius, -3)
    ctx.lineTo(-feifei.radius - flameLen, 0)
    ctx.lineTo(-feifei.radius, 3)
    ctx.closePath()
    ctx.fill()
    
    ctx.restore()
  }
  
  private drawBody(ctx: CanvasRenderingContext2D, skin: SkinDef, feifei: FeiFei): void {
    const r = feifei.radius
    
    // 机身 - 圆润的航天飞机形状
    ctx.fillStyle = skin.bodyColor
    ctx.beginPath()
    // 机头
    ctx.moveTo(r + 2, 0)
    // 上半
    ctx.quadraticCurveTo(r, -r * 0.6, r * 0.3, -r * 0.7)
    ctx.quadraticCurveTo(-r * 0.3, -r * 0.65, -r, -r * 0.4)
    // 尾部
    ctx.lineTo(-r, r * 0.4)
    // 下半
    ctx.quadraticCurveTo(-r * 0.3, r * 0.65, r * 0.3, r * 0.7)
    ctx.quadraticCurveTo(r, r * 0.6, r + 2, 0)
    ctx.closePath()
    ctx.fill()
    
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.beginPath()
    ctx.ellipse(r * 0.2, -r * 0.2, r * 0.4, r * 0.15, -0.3, 0, Math.PI * 2)
    ctx.fill()
    
    // 机翼
    ctx.fillStyle = skin.bodyColor
    ctx.globalAlpha = 0.8
    // 上翼
    ctx.beginPath()
    ctx.moveTo(-r * 0.5, -r * 0.5)
    ctx.lineTo(-r * 0.8, -r * 0.9)
    ctx.lineTo(-r * 0.2, -r * 0.4)
    ctx.closePath()
    ctx.fill()
    // 下翼
    ctx.beginPath()
    ctx.moveTo(-r * 0.5, r * 0.5)
    ctx.lineTo(-r * 0.8, r * 0.9)
    ctx.lineTo(-r * 0.2, r * 0.4)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1
  }
  
  private drawExpression(ctx: CanvasRenderingContext2D, expression: FeiFeiExpression, feifei: FeiFei): void {
    const r = feifei.radius
    const eyeY = -r * 0.1
    const eyeX = r * 0.3
    const eyeSize = 2.5
    
    // 眼睛
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(eyeX, eyeY, eyeSize, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(eyeX, eyeY + r * 0.3, eyeSize, 0, Math.PI * 2)
    ctx.fill()
    
    // 瞳孔
    ctx.fillStyle = '#1a1a2e'
    ctx.beginPath()
    ctx.arc(eyeX + 0.5, eyeY, 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(eyeX + 0.5, eyeY + r * 0.3, 1.5, 0, Math.PI * 2)
    ctx.fill()
    
    // 嘴巴
    if (expression === 'thrust') {
      // 加速：张嘴
      ctx.fillStyle = '#1a1a2e'
      ctx.beginPath()
      ctx.arc(eyeX + 1, eyeY + r * 0.15, 2, 0, Math.PI)
      ctx.fill()
    } else if (expression === 'hit') {
      // 撞击：X嘴
      ctx.strokeStyle = '#1a1a2e'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(eyeX - 1, eyeY + r * 0.1)
      ctx.lineTo(eyeX + 3, eyeY + r * 0.2)
      ctx.moveTo(eyeX + 3, eyeY + r * 0.1)
      ctx.lineTo(eyeX - 1, eyeY + r * 0.2)
      ctx.stroke()
    } else if (expression === 'win') {
      // 通关：开心
      ctx.strokeStyle = '#1a1a2e'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(eyeX + 1, eyeY + r * 0.1, 3, 0, Math.PI)
      ctx.stroke()
    }
  }
  
  private generateStars(): void {
    this.stars = []
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 1.5 + 0.5,
        brightness: Math.random() * 0.5 + 0.3
      })
    }
  }
}
