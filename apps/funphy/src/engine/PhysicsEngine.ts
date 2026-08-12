import type { PhysicsConfig, FeiFei, Vec2, Obstacle, Collectible, Trigger, Goal, GameRuntime } from './types'

export class PhysicsEngine {
  private config: PhysicsConfig
  private worldWidth: number
  private worldHeight: number
  
  constructor(config: PhysicsConfig, worldWidth: number, worldHeight: number) {
    this.config = config
    this.worldWidth = worldWidth
    this.worldHeight = worldHeight
  }

  update(runtime: GameRuntime, dt: number): void {
    const { feifei, obstacles, collectibles, triggers, goal } = runtime
    
    // 1. 更新移动障碍物
    for (const obs of obstacles) {
      if (obs.type === 'moving' && obs.moveAxis && obs.moveRange && obs.moveSpeed) {
        obs.phase += obs.moveSpeed * dt
        if (obs.moveAxis === 'x') {
          obs.x = obs.originX + Math.sin(obs.phase) * obs.moveRange
        } else {
          obs.y = obs.originY + Math.sin(obs.phase) * obs.moveRange
        }
      }
    }
    
    // 2. 计算合力
    let fx = 0
    let fy = 0
    
    // 推力
    const thrust = this.config.thrust
    if (feifei.thrusting.up)    fy -= thrust
    if (feifei.thrusting.down)  fy += thrust
    if (feifei.thrusting.left)  fx -= thrust
    if (feifei.thrusting.right) fx += thrust
    
    // 重力
    fy += this.config.gravity
    
    // 阻力
    const drag = this.config.drag
    fx -= feifei.vel.x * drag
    fy -= feifei.vel.y * drag
    
    // 触发区域效果
    for (const trigger of triggers) {
      if (this.isInTrigger(feifei, trigger)) {
        if (trigger.type === 'boost') {
          const boost = trigger.params.force || 0.1
          fy -= boost  // 向上加速
        } else if (trigger.type === 'slow') {
          feifei.vel.x *= 0.95
          feifei.vel.y *= 0.95
        } else if (trigger.type === 'wind') {
          fx += trigger.params.forceX || 0
          fy += trigger.params.forceY || 0
        }
      }
    }
    
    // 3. 更新速度
    feifei.vel.x += fx * dt
    feifei.vel.y += fy * dt
    
    // 4. 更新位置
    feifei.pos.x += feifei.vel.x * dt
    feifei.pos.y += feifei.vel.y * dt
    
    // 5. 边界处理
    this.handleBounds(feifei)
    
    // 6. 碰撞检测 - 障碍物
    for (const obs of obstacles) {
      if (this.circleRectCollision(feifei, obs)) {
        this.resolveObstacleCollision(feifei, obs)
        runtime.collisions++
        feifei.hitTimer = 15
        feifei.expression = 'hit'
      }
    }
    
    // 7. 收集品检测
    for (const col of collectibles) {
      if (!col.collected) {
        const dx = feifei.pos.x - col.x
        const dy = feifei.pos.y - col.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < feifei.radius + 3) {  // 收集品半径3
          col.collected = true
          col.animTimer = 20
          if (col.type === 'stardust') {
            runtime.stardust++
          }
        }
      }
    }
    
    // 8. 终点检测
    const dx = feifei.pos.x - goal.x
    const dy = feifei.pos.y - goal.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const speed = Math.sqrt(feifei.vel.x ** 2 + feifei.vel.y ** 2)
    if (dist < feifei.radius + goal.radius) {
      if (goal.maxSpeed === undefined || speed < goal.maxSpeed) {
        runtime.state = 'won'
        feifei.expression = 'win'
        feifei.winTimer = 60
      }
    }
    
    // 9. 更新飞飞表情
    if (feifei.hitTimer > 0) {
      feifei.hitTimer--
    } else if (feifei.expression === 'hit') {
      feifei.expression = 'normal'
    }
    
    const isThrusting = feifei.thrusting.up || feifei.thrusting.down || feifei.thrusting.left || feifei.thrusting.right
    if (feifei.expression === 'normal' && isThrusting) {
      feifei.expression = 'thrust'
    } else if (feifei.expression === 'thrust' && !isThrusting) {
      feifei.expression = 'normal'
    }
    
    // 10. 更新时间
    runtime.time += dt / 60  // dt=1 at 60fps, so time in seconds
  }
  
  private handleBounds(feifei: FeiFei): void {
    const r = feifei.radius
    const b = this.config.bounce
    
    if (this.config.boundsBehavior === 'bounce') {
      if (feifei.pos.x - r < 0) { feifei.pos.x = r; feifei.vel.x *= -b }
      if (feifei.pos.x + r > this.worldWidth) { feifei.pos.x = this.worldWidth - r; feifei.vel.x *= -b }
      if (feifei.pos.y - r < 0) { feifei.pos.y = r; feifei.vel.y *= -b }
      if (feifei.pos.y + r > this.worldHeight) { feifei.pos.y = this.worldHeight - r; feifei.vel.y *= -b }
    } else if (this.config.boundsBehavior === 'wrap') {
      if (feifei.pos.x < -r) feifei.pos.x = this.worldWidth + r
      if (feifei.pos.x > this.worldWidth + r) feifei.pos.x = -r
      if (feifei.pos.y < -r) feifei.pos.y = this.worldHeight + r
      if (feifei.pos.y > this.worldHeight + r) feifei.pos.y = -r
    }
  }
  
  private circleRectCollision(feifei: FeiFei, obs: Obstacle): boolean {
    const cx = feifei.pos.x
    const cy = feifei.pos.y
    const r = feifei.radius
    const rx = obs.x
    const ry = obs.y
    const rw = obs.width
    const rh = obs.height
    
    const nearestX = Math.max(rx, Math.min(cx, rx + rw))
    const nearestY = Math.max(ry, Math.min(cy, ry + rh))
    const dx = cx - nearestX
    const dy = cy - nearestY
    return (dx * dx + dy * dy) < (r * r)
  }
  
  private resolveObstacleCollision(feifei: FeiFei, obs: Obstacle): void {
    const cx = feifei.pos.x
    const cy = feifei.pos.y
    const r = feifei.radius
    const rx = obs.x
    const ry = obs.y
    const rw = obs.width
    const rh = obs.height
    
    // 找到最近点
    const nearestX = Math.max(rx, Math.min(cx, rx + rw))
    const nearestY = Math.max(ry, Math.min(cy, ry + rh))
    
    // 计算推出方向
    let dx = cx - nearestX
    let dy = cy - nearestY
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    if (dist < 0.001) {
      // 飞飞中心在矩形内部，推出到最近的边
      const distLeft = cx - rx
      const distRight = rx + rw - cx
      const distTop = cy - ry
      const distBottom = ry + rh - cy
      const minDist = Math.min(distLeft, distRight, distTop, distBottom)
      if (minDist === distLeft) { dx = -1; dy = 0 }
      else if (minDist === distRight) { dx = 1; dy = 0 }
      else if (minDist === distTop) { dx = 0; dy = -1 }
      else { dx = 0; dy = 1 }
      feifei.pos.x += dx * (r + 1)
      feifei.pos.y += dy * (r + 1)
    } else {
      // 正常推出
      const nx = dx / dist
      const ny = dy / dist
      feifei.pos.x = nearestX + nx * (r + 0.5)
      feifei.pos.y = nearestY + ny * (r + 0.5)
      
      // 反弹速度
      const dot = feifei.vel.x * nx + feifei.vel.y * ny
      if (dot < 0) {
        feifei.vel.x -= 2 * dot * nx * this.config.bounce
        feifei.vel.y -= 2 * dot * ny * this.config.bounce
        // 速度衰减
        feifei.vel.x *= 0.85
        feifei.vel.y *= 0.85
      }
    }
  }
  
  private isInTrigger(feifei: FeiFei, trigger: Trigger): boolean {
    return feifei.pos.x > trigger.x && 
           feifei.pos.x < trigger.x + trigger.width &&
           feifei.pos.y > trigger.y && 
           feifei.pos.y < trigger.y + trigger.height
  }
}
