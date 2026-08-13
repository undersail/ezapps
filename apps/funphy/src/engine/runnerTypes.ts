// V2 跑酷模式类型定义（垂直跑酷：障碍从顶部生成下落，飞船自由移动，船头朝上）
import type { ObstacleKind, PhysicsConfig } from './types'

// 障碍物（下落流）
export interface RunnerObstacle {
  id: string
  kind: 'falling' | 'dive' | 'spin' | 'static'   // 下落方式
  style: ObstacleKind                              // 视觉形态（复用主题化体系）
  x: number
  y: number
  width: number
  height: number
  fallSpeed: number      // 基础下落速度（单位/帧）
  sway?: number          // 横向摆动幅度（正弦）
  swaySpeed?: number
  angle?: number         // 旋转体角度
  color?: string
  active: boolean
}

// 资源
export interface RunnerGem {
  id: string
  x: number
  y: number
  collected: boolean
}

export interface RunnerEnergyBlock {
  id: string
  x: number
  y: number
  collected: boolean
}

export interface RunnerSolarZone {
  id: string
  x: number
  y: number
  width: number
  height: number
}

// 生成配置（按累计里程触发）
export interface RunnerSpawnDef {
  at: number                 // 触发里程（累计推进里程）
  x: number                  // 生成横向位置（世界坐标 0~viewW）
  obstacle?: {
    kind: RunnerObstacle['kind']
    style: ObstacleKind
    width: number
    height: number
    fallSpeed: number
    sway?: number
    swaySpeed?: number
    color?: string
  }
  gem?: boolean              // 生成宝石
  energy?: boolean           // 生成能量块
}

// 关卡定义
export interface RunnerLevelDef {
  id: string
  chapter: number
  name: string
  introCard?: string         // 关卡开场卡片文案（探险模式，3s 自动消失/可跳过）
  length: number             // 通关里程（累计推进）
  baseFlow: number           // 基础流速（单位/帧）→ 障碍下落基准
  flowRange: number          // 推杆满速增加的流速
  physics: PhysicsConfig     // 环境受力（左摇杆位移模型）
  moveSpeed: number          // 左摇杆位移速度上限（单位/帧）
  energyDrain: number        // 满推力能量消耗（/秒）
  solarZones: RunnerSolarZone[]
  spawns: RunnerSpawnDef[]   // 按里程触发的生成序列
  goal: { gems: number }     // 通关目标（宝石）
  bgGradient: [string, string]
}

// 运行时状态
export interface RunnerRuntime {
  state: 'playing' | 'won' | 'lost'
  level: RunnerLevelDef
  ship: {
    x: number
    y: number
    vx: number
    vy: number
    armor: number            // 护甲
    invincible: number       // 无敌帧（受击后 1s）
  }
  maxEnergy: number          // 能量上限（能量仓升级增加）
  effDrain: number           // 实际能耗率（动力升级降低）
  dashTimer: number          // 冲刺剩余帧（>0 全油门）
  dashCooldown: number       // 冲刺冷却帧
  energy: number             // 能量 0~maxEnergy
  gems: number               // 本关宝石
  progress: number           // 累计里程
  flowSpeed: number          // 当前流速（base + 推杆）
  throttle: number           // 推杆力度 0~1（负=刹车）
  obstacles: RunnerObstacle[]
  gemsArr: RunnerGem[]
  energyBlocks: RunnerEnergyBlock[]
  nextSpawnIndex: number
  time: number
  failReason: 'armor' | 'timeout' | null
  events: string[]           // 'hit' | 'gem' | 'energy' | 'win' | 'dash'
}

// 生成器：按里程激活 spawn 定义
export function spawnRunnerEntities(runtime: RunnerRuntime, viewW: number, viewH: number): void {
  const level = runtime.level
  // 激活到达里程的生成项
  while (runtime.nextSpawnIndex < level.spawns.length) {
    const def = level.spawns[runtime.nextSpawnIndex]
    if (def.at > runtime.progress) break
    runtime.nextSpawnIndex++
    const sx = Math.min(Math.max(def.x, 8), viewW - 8)  // 钳制到视口内
    if (def.obstacle) {
      runtime.obstacles.push({
        id: `o_${def.at}_${def.x}`,
        kind: def.obstacle.kind,
        style: def.obstacle.style,
        x: sx,
        y: -20,
        width: def.obstacle.width,
        height: def.obstacle.height,
        fallSpeed: def.obstacle.fallSpeed,
        sway: def.obstacle.sway,
        swaySpeed: def.obstacle.swaySpeed,
        color: def.obstacle.color,
        active: true,
      })
    }
    if (def.gem) {
      runtime.gemsArr.push({ id: `g_${def.at}_${def.x}`, x: sx, y: -20, collected: false })
    }
    if (def.energy) {
      runtime.energyBlocks.push({ id: `e_${def.at}_${def.x}`, x: sx, y: -20, collected: false })
    }
  }
  // 更新下落
  const flow = runtime.flowSpeed
  for (const o of runtime.obstacles) {
    if (!o.active) continue
    o.y += o.fallSpeed + flow
    if (o.sway && o.swaySpeed) {
      o.x += Math.sin(runtime.time / 30 * o.swaySpeed + Number(o.id.slice(-2)) ) * o.sway * 0.05
    }
    if (o.kind === 'spin') o.angle = (o.angle ?? 0) + 0.05
    if (o.y > viewH + 30) o.active = false
  }
  for (const g of runtime.gemsArr) {
    if (!g.collected) {
      g.y += flow + 0.15
      if (g.y > viewH + 20) g.collected = true  // 回收（错过的宝石消失）
    }
  }
  for (const eb of runtime.energyBlocks) {
    if (!eb.collected) {
      eb.y += flow + 0.15
      if (eb.y > viewH + 20) eb.collected = true
    }
  }
  // 清理
  runtime.obstacles = runtime.obstacles.filter(o => o.active)
}
