// V2 跑酷模式类型定义（垂直跑酷：障碍从顶部生成下落，飞船自由移动，船头朝上）
import type { ObstacleKind, PhysicsConfig } from './types'

// 障碍物（下落流）
export interface RunnerObstacle {
  id: string
  kind: 'falling' | 'dive' | 'spin' | 'static' | 'mystery'   // 下落方式（mystery=问号盲盒）
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
  size: 's' | 'm' | 'l'     // 大小档（分值 1/3/6）
  expiresIn: number         // 剩余秒（>0 显示倒计时，<=0 消失）
}

export interface RunnerEnergyBlock {
  id: string
  x: number
  y: number
  collected: boolean
  size: 's' | 'm' | 'l'     // 大小档（能量 12%/25%/40%）
  expiresIn: number         // 剩余秒
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
  mystery?: boolean          // 问号盲盒块（撞击随机奖励/惩罚）
  size?: 's' | 'm' | 'l'     // 大小档（宝石分值 1/3/6，能量块 12%/25%/40%）
  expiresIn?: number         // 秒，>0 时高处生成+消失倒计时（大块专属）
}

// 资源大小档 → 分值/能量
export function gemValue(size: 's' | 'm' | 'l' | undefined): number {
  return size === 'l' ? 6 : size === 'm' ? 3 : 1
}
export function energyValue(size: 's' | 'm' | 'l' | undefined): number {
  return size === 'l' ? 40 : size === 'm' ? 25 : 12
}

// 关卡定义
export interface RunnerLevelDef {
  id: string
  chapter: number
  name: string
  introCard?: string         // 关卡开场卡片文案（探险模式，3s 自动消失/可跳过）
  endless?: boolean          // 无限模式：无通关点，里程挑战（宇宙关）
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
  difficulty: 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6'  // 难度档（资源分级/刺激度）
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
  effLerp: number            // 加速响应系数（引擎升级更跟手 0.18→0.34）
  effInvincible: number      // 受击无敌帧（护甲升级 55→25）
  dashCooldownMax: number    // 冲刺冷却帧（引擎升级 90→45）
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
  mysteryNext: number       // 下一个盲盒块里程点（按难度间隔生成）
  autoObNext: number        // 下一个自动补障碍里程点（难度密度梯度）
  time: number
  failReason: 'armor' | 'timeout' | null
  events: string[]           // 'hit' | 'gem' | 'energy' | 'win' | 'dash'
  floatTexts: { x: number; y: number; text: string; color: string; life: number }[]  // 飘字动效（盲盒结果等）
}

// 盲盒块生成间隔（按难度档：T1 无 / T2-T3 500 / T4 400 / T5 330 / T6 280 里程）
export function mysteryInterval(difficulty: RunnerLevelDef['difficulty']): number {
  if (difficulty === 'T1') return Infinity
  if (difficulty === 'T2' || difficulty === 'T3') return 500
  if (difficulty === 'T4') return 400
  if (difficulty === 'T5') return 330
  return 280
}

// 自动补障碍间隔（难度密度梯度：T1 无 / T2 55 / T3 40 / T4 32 / T5 26 / T6 22 里程）
// 修复：原密度过低（T6 约 3-4 秒才一个障碍），加密至 1.5-2 秒/个
export function obstacleInterval(difficulty: RunnerLevelDef['difficulty']): number {
  if (difficulty === 'T1') return Infinity
  if (difficulty === 'T2') return 55
  if (difficulty === 'T3') return 40
  if (difficulty === 'T4') return 32
  if (difficulty === 'T5') return 26
  return 22
}

// 自动补障碍的基础下落速度（按难度递增，整体加快）
function obstacleFallSpeed(difficulty: RunnerLevelDef['difficulty']): number {
  if (difficulty === 'T2') return 0.6
  if (difficulty === 'T3') return 0.75
  if (difficulty === 'T4') return 0.9
  if (difficulty === 'T5') return 1.05
  return 1.2
}

// 生成器：按里程激活 spawn 定义（endless 关按循环单元触发）
export function spawnRunnerEntities(runtime: RunnerRuntime, viewW: number, viewH: number): void {
  const level = runtime.level
  // endless：里程取模循环单元长度（spawns 循环再生）
  const cycleLen = level.endless ? (level.spawns[level.spawns.length - 1]?.at ?? 500) + 300 : Infinity
  const pos = level.endless ? runtime.progress % cycleLen : runtime.progress
  // 按难度间隔生成问号盲盒（所有章节统一分配，位置随机）
  const mInt = mysteryInterval(level.difficulty)
  if (mInt !== Infinity && runtime.mysteryNext === 0) runtime.mysteryNext = mInt
  while (mInt !== Infinity && runtime.progress >= runtime.mysteryNext) {
    runtime.obstacles.push({
      id: `m_auto_${runtime.mysteryNext}`,
      kind: 'mystery',
      style: 'orb',
      x: 15 + Math.random() * (viewW - 30),
      y: -45,
      width: 10,
      height: 10,
      fallSpeed: 0.35 * (0.9 + Math.random() * 0.2),
      active: true,
    })
    runtime.mysteryNext += mInt
  }
  // 按难度自动补障碍（密度梯度：高难度关障碍更密集，与手写数据互补）
  const obInt = obstacleInterval(level.difficulty)
  if (obInt !== Infinity && runtime.autoObNext === 0) runtime.autoObNext = obInt
  while (obInt !== Infinity && runtime.progress >= runtime.autoObNext) {
    const big = Math.random() < (level.difficulty === 'T6' ? 0.55 : level.difficulty === 'T5' ? 0.45 : level.difficulty === 'T4' ? 0.35 : 0.2)
    const w = big ? 12 + Math.random() * 4 : 8 + Math.random() * 3
    runtime.obstacles.push({
      id: `o_auto_${runtime.autoObNext}`,
      kind: Math.random() < 0.4 ? 'dive' : 'falling',
      style: level.chapter === 3 ? 'cloud' : 'rock',
      x: 15 + Math.random() * (viewW - 30),
      y: -45,
      width: w,
      height: w,
      fallSpeed: obstacleFallSpeed(level.difficulty) * (0.85 + Math.random() * 0.4),
      sway: Math.random() < 0.4 ? 6 + Math.random() * 8 : undefined,
      swaySpeed: Math.random() < 0.4 ? 3 + Math.random() * 2 : undefined,
      active: true,
    })
    runtime.autoObNext += obInt
  }
  // 激活到达里程的生成项
  while (runtime.nextSpawnIndex < level.spawns.length) {
    const def = level.spawns[runtime.nextSpawnIndex]
    if (def.at > pos) break
    runtime.nextSpawnIndex++
    const sx = Math.min(Math.max(def.x, 8), viewW - 8)  // 钳制到视口内
    if (def.obstacle) {
      runtime.obstacles.push({
        id: `o_${def.at}_${def.x}`,
        kind: def.obstacle.kind,
        style: def.obstacle.style,
        x: sx,
        y: -45,   // 生成点上移：全油门时也有 ~1.1s 反应时间
        width: def.obstacle.width,
        height: def.obstacle.height,
        // 下落速度波动（±25%，同一关内快慢混合）
        fallSpeed: def.obstacle.fallSpeed * (0.8 + Math.random() * 0.5),
        sway: def.obstacle.sway,
        swaySpeed: def.obstacle.swaySpeed,
        color: def.obstacle.color,
        active: true,
      })
    }
    if (def.mystery) {
      // 问号盲盒块：慢速下落，撞击随机奖励/惩罚
      runtime.obstacles.push({
        id: `m_${def.at}_${def.x}`,
        kind: 'mystery',
        style: 'orb',
        x: sx,
        y: -45,
        width: 10,
        height: 10,
        fallSpeed: 0.35 * (0.9 + Math.random() * 0.2),
        active: true,
      })
    }
    if (def.gem) {
      // size 默认 s（1分）；大块（l）50% 高处生成 + 消失倒计时
      // 难度概率升级：T1 0% / T2-T3 10% / T4 15% / T5 20% / T6 25%
      const diffLv = level.difficulty === 'T6' ? 0.25 : level.difficulty === 'T5' ? 0.2 : level.difficulty === 'T4' ? 0.15 : level.difficulty === 'T3' || level.difficulty === 'T2' ? 0.1 : 0
      const size = def.size || (Math.random() < diffLv ? 'l' : 's')
      const high = size === 'l' && Math.random() < 0.5
      runtime.gemsArr.push({
        id: `g_${def.at}_${def.x}`,
        x: sx,
        y: high ? 8 + Math.random() * 14 : -45,   // 高处：直接出现在视口上部 y 8~22
        collected: false,
        size,
        expiresIn: def.expiresIn ?? (size === 'l' ? 10 : 0),
      })
    }
    if (def.energy) {
      // 难度概率升级：T1 0% / T2-T3 10% / T4 15% / T5 20% / T6 25%
      const diffLv = level.difficulty === 'T6' ? 0.25 : level.difficulty === 'T5' ? 0.2 : level.difficulty === 'T4' ? 0.15 : level.difficulty === 'T3' || level.difficulty === 'T2' ? 0.1 : 0
      const size = def.size || (Math.random() < diffLv ? 'l' : 'm')
      const high = size === 'l' && Math.random() < 0.5
      runtime.energyBlocks.push({
        id: `e_${def.at}_${def.x}`,
        x: sx,
        y: high ? 8 + Math.random() * 14 : -45,
        collected: false,
        size,
        expiresIn: def.expiresIn ?? (size === 'l' ? 8 : 0),
      })
    }
    // endless：一轮触发完，重置索引进入下一循环
    if (level.endless && runtime.nextSpawnIndex >= level.spawns.length) {
      runtime.nextSpawnIndex = 0
      break
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
      if (g.expiresIn > 0) {
        g.expiresIn -= 1 / 60
        if (g.expiresIn <= 0) g.collected = true   // 倒计时结束消失
      }
      if (g.y > viewH + 20) g.collected = true  // 回收（错过的宝石消失）
    }
  }
  for (const eb of runtime.energyBlocks) {
    if (!eb.collected) {
      eb.y += flow + 0.15
      if (eb.expiresIn > 0) {
        eb.expiresIn -= 1 / 60
        if (eb.expiresIn <= 0) eb.collected = true
      }
      if (eb.y > viewH + 20) eb.collected = true
    }
  }
  // 清理
  runtime.obstacles = runtime.obstacles.filter(o => o.active)
  // 飘字生命周期
  for (const ft of runtime.floatTexts) ft.life--
  runtime.floatTexts = runtime.floatTexts.filter(ft => ft.life > 0)
}
