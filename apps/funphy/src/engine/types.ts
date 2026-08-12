// 物理配置
export interface PhysicsConfig {
  gravity: number       // 向下加速度（game units/frame²）
  drag: number          // 阻力系数（每帧 v *= (1 - drag)）
  bounce: number        // 弹性系数（0=无弹性，1=完美弹性）
  thrust: number        // 推力大小（game units/frame²）
  boundsBehavior: 'bounce' | 'wrap' | 'none'  // 边界行为
}

// 2D向量
export interface Vec2 {
  x: number
  y: number
}

// 实体基类
export interface Entity {
  id: string
  pos: Vec2
  vel: Vec2
  radius: number
  active: boolean
}

// 飞飞状态
export type FeiFeiExpression = 'normal' | 'thrust' | 'hit' | 'win'

// 飞飞实体
export interface FeiFei extends Entity {
  expression: FeiFeiExpression
  thrusting: { up: boolean, down: boolean, left: boolean, right: boolean }
  skinId: string
  hitTimer: number  // 被撞后的闪烁计时
  winTimer: number  // 通关动画计时
}

// 障碍物类型
export type ObstacleType = 'static' | 'moving' | 'wall'

// 障碍物定义
export interface ObstacleDef {
  id: string
  type: ObstacleType
  x: number
  y: number
  width: number
  height: number
  // 移动障碍物参数
  moveAxis?: 'x' | 'y'
  moveRange?: number
  moveSpeed?: number
  // 样式
  color?: string
  rounded?: boolean
}

// 运行时障碍物
export interface Obstacle {
  id: string
  type: ObstacleType
  x: number
  y: number
  width: number
  height: number
  moveAxis?: 'x' | 'y'
  moveRange?: number
  moveSpeed?: number
  originX: number
  originY: number
  color: string
  rounded: boolean
  phase: number  // 移动相位
}

// 收集品类型
export type CollectibleType = 'stardust' | 'checkpoint'

// 收集品定义
export interface CollectibleDef {
  id: string
  type: CollectibleType
  x: number
  y: number
}

// 运行时收集品
export interface Collectible {
  id: string
  type: CollectibleType
  x: number
  y: number
  collected: boolean
  animTimer: number  // 收集动画
}

// 特殊区域类型
export type TriggerType = 'boost' | 'slow' | 'gravity_well' | 'wind'

// 触发区域定义
export interface TriggerDef {
  id: string
  type: TriggerType
  x: number
  y: number
  width: number
  height: number
  params: Record<string, number>  // 额外参数
}

// 运行时触发区域
export interface Trigger {
  id: string
  type: TriggerType
  x: number
  y: number
  width: number
  height: number
  params: Record<string, number>
}

// 终点定义
export interface GoalDef {
  x: number
  y: number
  radius: number
  maxSpeed?: number  // 最大着陆速度（对接关卡用）
}

// 运行时终点
export interface Goal {
  x: number
  y: number
  radius: number
  maxSpeed?: number
}

// 星星条件
export interface StarCondition {
  time?: [number, number, number]  // 3星/2星/1星的时间阈值（秒）
  collisions?: [number, number, number]  // 3星/2星/1星的碰撞次数
  speed?: [number, number, number]  // 3星/2星/1星的速度阈值
  collectibles?: [number, number, number]  // 3星/2星/1星的收集数量
  energy?: [number, number, number]  // 3星/2星/1星的剩余能量百分比
}

// 关卡定义
export interface LevelDef {
  id: string
  name: string
  difficulty: number  // 1-4
  worldWidth: number
  worldHeight: number
  physics: PhysicsConfig
  feifei: Vec2  // 起始位置
  goal: GoalDef
  obstacles: ObstacleDef[]
  collectibles: CollectibleDef[]
  triggers: TriggerDef[]
  starConditions: StarCondition
  timeLimit?: number  // 秒
  isBoss: boolean
}

// 章节定义
export interface ChapterDef {
  id: number
  title: string
  subtitle: string
  emoji: string
  planet: string
  levels: LevelDef[]
  boss: LevelDef
}

// 游戏状态
export type GameState = 'menu' | 'playing' | 'paused' | 'won' | 'lost'

// 游戏运行时数据
export interface GameRuntime {
  state: GameState
  level: LevelDef
  feifei: FeiFei
  obstacles: Obstacle[]
  collectibles: Collectible[]
  triggers: Trigger[]
  goal: Goal
  time: number
  collisions: number
  stardust: number
  totalStardust: number
  stars: number
  skinId: string
}

// 物理卡
export interface PhysicsCard {
  id: string
  chapter: number
  level: number
  isBoss: boolean
  intuitionName: string
  formalName: string
  intuitionDesc: string
  formula: string
  lifeExample: string
}

// 飞飞皮肤
export interface SkinDef {
  id: string
  name: string
  bodyColor: string
  flameColor: string
  flameShape: 'normal' | 'fire' | 'ice' | 'leaf' | 'star' | 'nebula' | 'shadow' | 'rainbow'
  unlockType: 'default' | 'stardust' | 'boss'
  unlockValue: number  // stardust数量或boss的chapter号
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

// 进度数据
export interface GameProgress {
  version: number
  levels: Record<string, { stars: number, bestTime: number, completed: boolean }>
  stardust: number
  totalStardust: number
  cards: string[]  // 解锁的物理卡ID列表
  skinId: string
  unlockedSkins: string[]
  unlockedChapters: number[]
}
