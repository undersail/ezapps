import type { PhysicsConfig, FeiFei, Vec2, Obstacle, Collectible, Trigger, Goal, GameRuntime, Spring, Portal, Conveyor, Hazard } from './types'

export class PhysicsEngine {
  private config: PhysicsConfig
  private worldWidth: number
  private worldHeight: number
  
  constructor(config: PhysicsConfig, worldWidth: number, worldHeight: number) {
    this.config = config
    this.worldWidth = worldWidth
    this.worldHeight = worldHeight
  }

  /** 更新世界边界（适配Canvas可视范围） */
  updateWorldBounds(width: number, height: number): void {
    this.worldWidth = width
    this.worldHeight = height
  }

  /**
   * 主更新入口：子步进（每步 ≤0.5 帧单位），
   * 高速移动时防穿透（tunneling），且保持总冲量一致。
   */
  update(runtime: GameRuntime, dt: number): void {
    const steps = Math.max(1, Math.ceil(dt / 0.5))
    const h = dt / steps
    for (let i = 0; i < steps; i++) {
      this.step(runtime, h)
    }
  }

  private step(runtime: GameRuntime, dt: number): void {
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
    
    // 推力：优先使用摇杆方向（thrustDir），否则回退到4方向
    let thrust = this.config.thrust
    // 软限速（线性）：速度越接近 maxSpeed 推力效率越低，在 maxSpeed 处封顶
    // 未标注 maxSpeed 的关卡默认 1.3（约 78 单位/秒，5-6 秒横穿大世界）
    const maxS = this.config.maxSpeed ?? 1.3
    if (maxS > 0) {
      const sp = Math.sqrt(feifei.vel.x ** 2 + feifei.vel.y ** 2)
      const eff = Math.max(0, 1 - sp / maxS)
      thrust *= eff
    }
    // 冲刺：dashTimer 激活期间推力 ×1.6（计时递减在游戏循环做，避免子步进加速衰减）
    if (feifei.dashTimer > 0) {
      thrust *= 1.6
    }
    
    if (feifei.dashTimer > 0) {
      // 冲刺：强制沿冲刺方向推力（覆盖输入）
      fx += thrust * feifei.dashDirX
      fy += thrust * feifei.dashDirY
    } else if (feifei.thrustDir.x !== 0 || feifei.thrustDir.y !== 0) {
      fx += thrust * feifei.thrustDir.x
      fy += thrust * feifei.thrustDir.y
    } else {
      if (feifei.thrusting.up)    fy -= thrust
      if (feifei.thrusting.down)  fy += thrust
      if (feifei.thrusting.left)  fx -= thrust
      if (feifei.thrusting.right) fx += thrust
    }
    
    // 重力
    fy += this.config.gravity
    
    // 阻力
    const drag = this.config.drag
    fx -= feifei.vel.x * drag
    fy -= feifei.vel.y * drag
    
    // 触发区域效果
    for (const trigger of triggers) {
      // 引力井：以区域中心为圆心的圆形力场，向井心拉扯（force>0）或推离（force<0）
      if (trigger.type === 'gravity_well') {
        const cx = trigger.x + trigger.width / 2
        const cy = trigger.y + trigger.height / 2
        const R = Math.max(trigger.width, trigger.height) / 2
        const dx = cx - feifei.pos.x
        const dy = cy - feifei.pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 0.5 && dist < R) {
          const strength = trigger.params.force ?? 0.05
          fx += (dx / dist) * strength
          fy += (dy / dist) * strength
        }
        continue
      }

      if (this.isInTrigger(feifei, trigger)) {
        if (trigger.type === 'boost') {
          const boost = trigger.params.force || 0.1
          fy -= boost  // 向上加速
        } else if (trigger.type === 'slow') {
          // 按步长缩放，保证子步进下总减速效果与原来一致（dt=1 时即 0.95）
          const slowFactor = 1 - 0.05 * dt
          feifei.vel.x *= slowFactor
          feifei.vel.y *= slowFactor
        } else if (trigger.type === 'wind') {
          fx += trigger.params.forceX || 0
          fy += trigger.params.forceY || 0
        }
      }
    }
    
    // 传送带：区域内的持续表面推力
    for (const conv of runtime.conveyors) {
      if (feifei.pos.x > conv.x && feifei.pos.x < conv.x + conv.width &&
          feifei.pos.y > conv.y && feifei.pos.y < conv.y + conv.height) {
        fx += conv.forceX
        fy += conv.forceY
      }
    }
    
    // 3. 更新速度
    feifei.vel.x += fx * dt
    feifei.vel.y += fy * dt
    
    // 4. 更新位置
    feifei.pos.x += feifei.vel.x * dt
    feifei.pos.y += feifei.vel.y * dt
    
    // 5. 边界处理
    const prevVx = feifei.vel.x
    const prevVy = feifei.vel.y
    this.handleBounds(feifei)
    // 边界反弹音效
    if (feifei.vel.x !== prevVx || feifei.vel.y !== prevVy) {
      runtime.events.push('bounce')
    }
    
    // 6. 碰撞检测 - 障碍物
    for (const obs of obstacles) {
      // 单向平台：仅当飞飞从上方落下时碰撞（从下方/侧面穿过）
      if (obs.type === 'platform') {
        this.resolvePlatformCollision(feifei, obs, runtime)
        continue
      }
      if (this.circleRectCollision(feifei, obs)) {
        const prevSpeed = Math.sqrt(feifei.vel.x ** 2 + feifei.vel.y ** 2)
        this.resolveObstacleCollision(feifei, obs)
        // 只有速度超过阈值才算有效碰撞（防止落地后持续报警音）
        if (prevSpeed > 0.5) {
          runtime.collisions++
          feifei.hitTimer = 15
          feifei.expression = 'hit'
          runtime.events.push('hit')
        }
      }
    }
    
    // 6.2 弹力垫：接触即弹射（带冷却防连弹）
    for (const spring of runtime.springs) {
      if (spring.cooldown > 0) { spring.cooldown--; continue }
      if (this.circleRectHit(feifei, spring.x, spring.y, spring.width, spring.height)) {
        feifei.vel.x += spring.dirX * spring.power
        feifei.vel.y += spring.dirY * spring.power
        spring.cooldown = 12
        runtime.events.push('spring')
      }
    }
    
    // 6.3 传送门：接触即传送到配对门（保持速度，带冷却防来回传送）
    for (const portal of runtime.portals) {
      if (portal.cooldown > 0) { portal.cooldown--; continue }
      const pdx = feifei.pos.x - portal.x
      const pdy = feifei.pos.y - portal.y
      const pr = feifei.radius + portal.radius
      if (pdx * pdx + pdy * pdy < pr * pr) {
        const pair = runtime.portals.find(p => p.id === portal.pairId && p.id !== portal.id)
        if (pair) {
          feifei.pos.x = pair.x
          feifei.pos.y = pair.y
          portal.cooldown = 20
          pair.cooldown = 20
          runtime.events.push('portal')
        }
      }
    }
    
    // 6.4 危险区：接触即失败
    for (const hazard of runtime.hazards) {
      if (feifei.pos.x > hazard.x && feifei.pos.x < hazard.x + hazard.width &&
          feifei.pos.y > hazard.y && feifei.pos.y < hazard.y + hazard.height) {
        runtime.events.push('hazard')
        runtime.state = 'lost'
        runtime.failReason = 'hazard'
        break
      }
    }
    
    // 6.5 碰撞后静止检测：如果飞飞速度被归零但紧贴障碍物，抵消重力以防微弹
    if (feifei.vel.x === 0 && feifei.vel.y === 0) {
      for (const obs of obstacles) {
        // 检查飞飞是否紧贴障碍物表面（极小间隙）
        const gap = this.getGapToObstacle(feifei, obs)
        if (gap < 2) {
          // 飞飞紧贴障碍物，抵消重力分量（防止重力拉回形成微弹）
          // 重力已在上面的合力计算中加入了fy，这里需要从vel中减去
          feifei.vel.y -= this.config.gravity * dt
          break
        }
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
          } else if (col.type === 'checkpoint') {
            // 检查点：记录复活位置
            runtime.respawnPoint = { x: col.x, y: col.y }
          }
          runtime.events.push('collect')
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
        runtime.events.push('win')
      }
    }
    
    // 9. 更新飞飞表情
    if (feifei.hitTimer > 0) {
      feifei.hitTimer--
    } else if (feifei.expression === 'hit') {
      feifei.expression = 'normal'
    }
    
    const isThrusting = (feifei.thrustDir.x !== 0 || feifei.thrustDir.y !== 0)
      || feifei.thrusting.up || feifei.thrusting.down || feifei.thrusting.left || feifei.thrusting.right
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
  
  /** 圆-矩形相交检测（不带推出） */
  private circleRectHit(feifei: FeiFei, rx: number, ry: number, rw: number, rh: number): boolean {
    const nearestX = Math.max(rx, Math.min(feifei.pos.x, rx + rw))
    const nearestY = Math.max(ry, Math.min(feifei.pos.y, ry + rh))
    const dx = feifei.pos.x - nearestX
    const dy = feifei.pos.y - nearestY
    return (dx * dx + dy * dy) < (feifei.radius * feifei.radius)
  }
  
  /** 单向平台碰撞：仅当飞飞从上方落到平台表面时站立/反弹 */
  private resolvePlatformCollision(feifei: FeiFei, obs: Obstacle, runtime: GameRuntime): void {
    const r = feifei.radius
    // 水平重叠
    if (feifei.pos.x + r <= obs.x || feifei.pos.x - r >= obs.x + obs.width) return
    // 飞飞底部已到达平台顶面（且中心尚未深穿）
    const bottom = feifei.pos.y + r
    if (bottom < obs.y || bottom > obs.y + 6) return
    // 仅向下运动时生效（向上/悬停穿过）
    if (feifei.vel.y <= 0) return
    
    // 落到平台表面：轻量碰撞计数
    feifei.pos.y = obs.y - r
    const impact = feifei.vel.y
    if (impact > 0.8) {
      feifei.vel.y = -impact * this.config.bounce * 0.3
      runtime.collisions++
      feifei.hitTimer = 8
      runtime.events.push('hit')
    } else {
      feifei.vel.y = 0
    }
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
      // 沿推出方向给微小速度（防止多障碍夹击时速度归零死锁）
      feifei.vel.x = dx * 0.3
      feifei.vel.y = dy * 0.3
    } else {
      // 正常推出
      const nx = dx / dist
      const ny = dy / dist
      // 推出距离：确保飞飞完全离开障碍物表面，留出足够间隙防止重力拉回
      const pushDist = r + 1.0
      feifei.pos.x = nearestX + nx * pushDist
      feifei.pos.y = nearestY + ny * pushDist
      
      // 计算法向速度分量（指向障碍物表面方向为负）
      const dot = feifei.vel.x * nx + feifei.vel.y * ny
      
      // 速度处理：如果法向速度朝向障碍物（dot < 0）
      if (dot < 0) {
        // 法向速度极小时：消除法向分量（贴面静止），保留切向速度
        const REST_THRESHOLD = 0.5
        if (Math.abs(dot) < REST_THRESHOLD) {
          feifei.vel.x -= dot * nx
          feifei.vel.y -= dot * ny
        } else {
          // 正常反弹
          feifei.vel.x -= 2 * dot * nx * this.config.bounce
          feifei.vel.y -= 2 * dot * ny * this.config.bounce
          // 速度衰减
          feifei.vel.x *= 0.85
          feifei.vel.y *= 0.85
        }
      }
      
      // 碰撞后速度极小时直接归零（彻底防止抖动）
      const speedAfter = Math.sqrt(feifei.vel.x ** 2 + feifei.vel.y ** 2)
      if (speedAfter < 0.15) {
        feifei.vel.x = 0
        feifei.vel.y = 0
      }
    }
  }
  
  private isInTrigger(feifei: FeiFei, trigger: Trigger): boolean {
    return feifei.pos.x > trigger.x && 
           feifei.pos.x < trigger.x + trigger.width &&
           feifei.pos.y > trigger.y && 
           feifei.pos.y < trigger.y + trigger.height
  }
  
  /** 计算飞飞到障碍物表面的最小间隙距离（正数=有间隙，0=贴合，负数=穿透） */
  private getGapToObstacle(feifei: FeiFei, obs: Obstacle): number {
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
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    return dist - r
  }
}
