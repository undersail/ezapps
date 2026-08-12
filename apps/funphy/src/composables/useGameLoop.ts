import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { PhysicsEngine } from '../engine/PhysicsEngine'
import { SceneRenderer } from '../scenes/SceneRenderer'
import { useInput, type InputState } from './useInput'
import { useSound } from './useSound'
import * as Sound from '../utils/sound'
import type { GameRuntime, LevelDef, FeiFei, Obstacle, Collectible, Trigger, Goal, SkinDef, StarCondition } from '../engine/types'
import { skins } from '../data/skins'

export function useGameLoop() {
  const { input, setDirection, setJoystick, setPause } = useInput()
  const { soundEnabled: soundState } = useSound()
  
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const gameState = ref<'menu' | 'playing' | 'paused' | 'won' | 'lost'>('menu')
  const currentLevel = ref<LevelDef | null>(null)
  const runtime = ref<GameRuntime | null>(null)
  const stars = ref(0)
  const elapsedTime = ref(0)
  const stardustCollected = ref(0)
  const totalStardustInLevel = ref(0)
  const collisions = ref(0)
  
  let engine: PhysicsEngine | null = null
  let renderer: SceneRenderer | null = null
  let rafId = 0
  let timeAccumulator = 0   // 固定步长累积器
  let lastTime = 0
  const PHYSICS_FRAME = 1        // 物理步长（帧单位，对应 60Hz 固定节拍）
  const MAX_PHYSICS_STEPS = 5    // 单帧最大物理步数（防 spiral of death）
  
  function createRuntime(level: LevelDef, skinId: string): GameRuntime {
    const feifei: FeiFei = {
      id: 'feifei',
      pos: { ...level.feifei },
      vel: { x: 0, y: 0 },
      radius: 3,
      active: true,
      expression: 'normal',
      thrusting: { up: false, down: false, left: false, right: false },
      thrustDir: { x: 0, y: 0 },
      skinId,
      hitTimer: 0,
      winTimer: 0,
    }
    
    const obstacles: Obstacle[] = level.obstacles.map(o => ({
      id: o.id,
      type: o.type,
      x: o.x,
      y: o.y,
      width: o.width,
      height: o.height,
      moveAxis: o.moveAxis,
      moveRange: o.moveRange,
      moveSpeed: o.moveSpeed,
      originX: o.x,
      originY: o.y,
      color: o.color || '#4a5568',
      rounded: o.rounded ?? false,
      phase: Math.random() * Math.PI * 2,
    }))
    
    const collectibles: Collectible[] = level.collectibles.map(c => ({
      id: c.id,
      type: c.type,
      x: c.x,
      y: c.y,
      collected: false,
      animTimer: 0,
    }))
    
    const triggers: Trigger[] = level.triggers.map(t => ({
      id: t.id,
      type: t.type,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      params: t.params,
    }))
    
    const goal: Goal = {
      x: level.goal.x,
      y: level.goal.y,
      radius: level.goal.radius,
      maxSpeed: level.goal.maxSpeed,
    }
    
    const totalSd = collectibles.filter(c => c.type === 'stardust').length
    
    return {
      state: 'playing',
      level,
      feifei,
      obstacles,
      collectibles,
      triggers,
      goal,
      time: 0,
      collisions: 0,
      stardust: 0,
      totalStardust: totalSd,
      stars: 0,
      skinId,
      events: [],
    }
  }
  
  function calculateStars(rt: GameRuntime): number {
    const sc = rt.level.starConditions
    let s = 1
    
    if (sc.time) {
      const [t3, t2, t1] = sc.time
      if (rt.time <= t3) s = 3
      else if (rt.time <= t2) s = 2
      else if (rt.time <= t1) s = 1
    }
    if (sc.collisions) {
      const [c3, c2, c1] = sc.collisions
      if (rt.collisions <= c3) s = Math.max(s, 3)
      else if (rt.collisions <= c2) s = Math.max(s, 2)
      else if (rt.collisions <= c1) s = Math.max(s, 1)
      else s = 0
    }
    if (sc.speed) {
      const speed = Math.sqrt(rt.feifei.vel.x ** 2 + rt.feifei.vel.y ** 2)
      const [s3, s2, s1] = sc.speed
      if (speed <= s3) s = Math.max(s, 3)
      else if (speed <= s2) s = Math.max(s, 2)
      else if (speed <= s1) s = Math.max(s, 1)
      else s = 0
    }
    if (sc.collectibles) {
      const [c3, c2, c1] = sc.collectibles
      if (rt.stardust >= c3) s = Math.max(s, 3)
      else if (rt.stardust >= c2) s = Math.max(s, 2)
      else if (rt.stardust >= c1) s = Math.max(s, 1)
      else s = 0
    }
    
    return Math.max(0, Math.min(3, s))
  }
  
  async function startLevel(level: LevelDef, skinId: string = 'default', bgGradient?: [string, string]) {
    currentLevel.value = level
    const rt = createRuntime(level, skinId)
    runtime.value = rt
    
    // 设置章节背景色
    if (renderer && bgGradient) {
      renderer.setBgGradient(bgGradient)
    }
    
    // 先设为playing，让HUD/D-Pad显示，canvas-area被挤压到正确尺寸
    gameState.value = 'playing'
    
    // 等待Vue渲染完成，canvas-area尺寸稳定
    await nextTick()
    
    // 重新设置canvas物理尺寸（因为HUD/D-Pad出现后canvas-area变小了）
    if (canvasRef.value && renderer) {
      const rect = canvasRef.value.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvasRef.value.width = rect.width * dpr
      canvasRef.value.height = rect.height * dpr
      const ctx = canvasRef.value.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
        renderer.resize(rect.width, rect.height)
      }
    }
    
    // 根据Canvas实际尺寸计算扩展后的世界尺寸和内容偏移
    let worldW = level.worldWidth
    let worldH = level.worldHeight
    if (renderer) {
      renderer.setWorldSize(level.worldWidth, level.worldHeight)
      const vs = renderer.getVisibleWorldSize()
      worldW = vs.width
      worldH = vs.height
      applyContentOffset(rt, vs.contentOffsetX, vs.contentOffsetY)
    }
    
    engine = new PhysicsEngine(level.physics, worldW, worldH)
    
    timeAccumulator = 0
    lastTime = performance.now()
    
    stars.value = 0
    elapsedTime.value = 0
    stardustCollected.value = 0
    totalStardustInLevel.value = rt.totalStardust
    collisions.value = 0
  }
  
  /** 将所有物体坐标加上居中偏移，使世界内容在扩展后的可视范围中居中 */
  function applyContentOffset(rt: GameRuntime, ox: number, oy: number): void {
    rt.feifei.pos.x += ox
    rt.feifei.pos.y += oy
    for (const obs of rt.obstacles) {
      obs.x += ox
      obs.y += oy
      obs.originX += ox
      obs.originY += oy
    }
    for (const col of rt.collectibles) {
      col.x += ox
      col.y += oy
    }
    for (const trigger of rt.triggers) {
      trigger.x += ox
      trigger.y += oy
    }
    rt.goal.x += ox
    rt.goal.y += oy
  }
  
  function gameLoop(timestamp: number) {
    // 检查canvas CSS尺寸是否和renderer匹配，不匹配则重新设置
    if (canvasRef.value && renderer) {
      const rect = canvasRef.value.getBoundingClientRect()
      const rw = Math.round(rect.width)
      const rh = Math.round(rect.height)
      if (rw !== Math.round(renderer.getWidth()) || rh !== Math.round(renderer.getHeight())) {
        const dpr = window.devicePixelRatio || 1
        canvasRef.value.width = rect.width * dpr
        canvasRef.value.height = rect.height * dpr
        const ctx = canvasRef.value.getContext('2d')
        if (ctx) {
          ctx.scale(dpr, dpr)
          renderer.resize(rect.width, rect.height)
        }
      }
    }
    
    if (gameState.value !== 'playing' || !runtime.value || !engine || !renderer || !canvasRef.value) {
      rafId = requestAnimationFrame(gameLoop)
      return
    }
    
    const rt = runtime.value
    
    // 帧率无关：以 60fps 为基准计算实际流逝时间（帧单位），上限 5 帧防跳变
    const realDt = lastTime === 0 ? 1 : Math.min((timestamp - lastTime) / 16.667, 5)
    lastTime = timestamp
    
    // 同步输入到飞飞
    rt.feifei.thrusting.up = input.up
    rt.feifei.thrusting.down = input.down
    rt.feifei.thrusting.left = input.left
    rt.feifei.thrusting.right = input.right
    
    // 摇杆方向 → thrustDir（优先于4方向）
    if (input.joystickActive) {
      rt.feifei.thrustDir.x = input.joystickX
      rt.feifei.thrustDir.y = input.joystickY
    } else {
      rt.feifei.thrustDir.x = 0
      rt.feifei.thrustDir.y = 0
    }
    
    // 暂停
    if (input.pausePressed) {
      gameState.value = 'paused'
      input.pausePressed = false
      rafId = requestAnimationFrame(gameLoop)
      return
    }
    
    // 固定步长物理更新（60Hz 节拍）：帧率再高物理也不会变快
    timeAccumulator += realDt
    let steps = 0
    while (timeAccumulator >= PHYSICS_FRAME && steps < MAX_PHYSICS_STEPS) {
      engine.update(rt, PHYSICS_FRAME)
      timeAccumulator -= PHYSICS_FRAME
      steps++
    }
    if (steps >= MAX_PHYSICS_STEPS) timeAccumulator = 0  // 积压过多直接丢弃（防死亡螺旋）
    
    // 消费事件 → 播放音效
    if (soundState.enabled) {
      for (const event of rt.events) {
        if (event === 'collect') Sound.playCollect()
        else if (event === 'bounce') Sound.playBounce()
        else if (event === 'hit') Sound.playHit()
        else if (event === 'win') Sound.playWin()
      }
    }
    rt.events.length = 0
    
    // 更新UI数据
    elapsedTime.value = rt.time
    stardustCollected.value = rt.stardust
    collisions.value = rt.collisions
    
    // 时间限制检查
    if (rt.level.timeLimit && rt.time > rt.level.timeLimit) {
      rt.state = 'lost'
      gameState.value = 'lost'
    }
    
    // 胜利检查
    if (rt.state === 'won') {
      rt.stars = calculateStars(rt)
      stars.value = rt.stars
      gameState.value = 'won'
    }
    
    // 渲染
    const skin = skins.find(s => s.id === rt.skinId) || skins[0]
    renderer.setWorldSize(rt.level.worldWidth, rt.level.worldHeight)
    renderer.render(rt, skin)
    
    rafId = requestAnimationFrame(gameLoop)
  }
  
  function initCanvas(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    
    renderer = new SceneRenderer(ctx, rect.width, rect.height)
    
    // 开始渲染循环（即使不在游戏中也渲染背景）
    if (!rafId) {
      lastTime = performance.now()
      rafId = requestAnimationFrame(gameLoop)
    }
  }
  
  function resumeGame() {
    if (gameState.value === 'paused') {
      gameState.value = 'playing'
      lastTime = performance.now()
    }
  }
  
  function retryLevel() {
    if (currentLevel.value && runtime.value) {
      startLevel(currentLevel.value, runtime.value.skinId)
    }
  }
  
  function backToMenu() {
    gameState.value = 'menu'
    runtime.value = null
    currentLevel.value = null
  }
  
  onUnmounted(() => {
    if (rafId) cancelAnimationFrame(rafId)
  })
  
  return {
    canvasRef,
    gameState,
    currentLevel,
    runtime,
    stars,
    elapsedTime,
    stardustCollected,
    totalStardustInLevel,
    collisions,
    input,
    setDirection,
    setJoystick,
    setPause,
    initCanvas,
    startLevel,
    resumeGame,
    retryLevel,
    backToMenu,
  }
}
