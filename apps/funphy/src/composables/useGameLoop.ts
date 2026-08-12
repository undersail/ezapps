import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { PhysicsEngine } from '../engine/PhysicsEngine'
import { SceneRenderer } from '../scenes/SceneRenderer'
import { useInput, type InputState } from './useInput'
import { useSound } from './useSound'
import * as Sound from '../utils/sound'
import type { GameRuntime, LevelDef, FeiFei, Obstacle, Collectible, Trigger, Goal, SkinDef, StarCondition, Spring, Portal, Conveyor, Hazard } from '../engine/types'
import { skins } from '../data/skins'

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : (v > max ? max : v)
}

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
      dashTimer: 0,
      dashCooldown: 0,
      dashDirX: 1,
      dashDirY: 0,
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
    
    const springs: Spring[] = (level.springs ?? []).map(s => ({
      id: s.id,
      x: s.x,
      y: s.y,
      width: s.width,
      height: s.height,
      power: s.power,
      dirX: s.dirX ?? 0,
      dirY: s.dirY ?? -1,
      cooldown: 0,
    }))
    
    const portals: Portal[] = (level.portals ?? []).map(p => ({
      id: p.id,
      pairId: p.pairId,
      x: p.x,
      y: p.y,
      radius: p.radius,
      cooldown: 0,
    }))
    
    const conveyors: Conveyor[] = (level.conveyors ?? []).map(c => ({
      id: c.id,
      x: c.x,
      y: c.y,
      width: c.width,
      height: c.height,
      forceX: c.forceX,
      forceY: c.forceY ?? 0,
    }))
    
    const hazards: Hazard[] = (level.hazards ?? []).map(h => ({
      id: h.id,
      x: h.x,
      y: h.y,
      width: h.width,
      height: h.height,
      color: h.color ?? '#ef4444',
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
      springs,
      portals,
      conveyors,
      hazards,
      goal,
      camera: { x: 0, y: 0 },
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
    
    // 根据Canvas实际尺寸计算缩放与视口
    if (renderer) {
      renderer.setWorldSize(level.worldWidth, level.worldHeight)
    }
    
    // 物理引擎：世界 = 关卡完整世界（可大于视口，相机负责平移）
    engine = new PhysicsEngine(level.physics, level.worldWidth, level.worldHeight)
    
    // 相机初始：对准飞飞出生点
    if (renderer) {
      const view = renderer.getViewSize()
      rt.camera.x = clamp(rt.feifei.pos.x - view.width / 2, 0, Math.max(0, level.worldWidth - view.width))
      rt.camera.y = clamp(rt.feifei.pos.y - view.height / 2, 0, Math.max(0, level.worldHeight - view.height))
      renderer.setCamera(rt.camera.x, rt.camera.y)
    }
    
    timeAccumulator = 0
    lastTime = performance.now()
    
    stars.value = 0
    elapsedTime.value = 0
    stardustCollected.value = 0
    totalStardustInLevel.value = rt.totalStardust
    collisions.value = 0
  }
  
  /** 冲刺触发：沿摇杆/速度方向短时爆发推力（1.6×，0.3s，冷却 1.5s） */
  function triggerDash(rt: GameRuntime): void {
    const f = rt.feifei
    if (f.dashCooldown > 0) return
    // 方向：摇杆优先，其次当前速度方向，默认向右
    let dx = f.thrustDir.x
    let dy = f.thrustDir.y
    if (dx === 0 && dy === 0) {
      const sp = Math.sqrt(f.vel.x ** 2 + f.vel.y ** 2)
      if (sp > 0.1) { dx = f.vel.x / sp; dy = f.vel.y / sp }
      else { dx = 1; dy = 0 }
    }
    const mag = Math.sqrt(dx * dx + dy * dy)
    if (mag < 0.01) return
    f.dashDirX = dx / mag
    f.dashDirY = dy / mag
    f.dashTimer = 18      // 0.3s
    f.dashCooldown = 90   // 1.5s
    if (soundState.enabled) Sound.playThrust()
  }
  
  /** 相机跟随：平滑追踪飞飞 + 速度前瞻 + 边界钳制 */
  function updateCamera(rt: GameRuntime): void {
    if (!renderer) return
    const view = renderer.getViewSize()
    const cfg = rt.level.camera ?? {}
    const lerp = cfg.lerp ?? 0.08
    const lookahead = cfg.lookahead ?? true
    
    const speed = Math.sqrt(rt.feifei.vel.x ** 2 + rt.feifei.vel.y ** 2)
    let tx = rt.feifei.pos.x
    let ty = rt.feifei.pos.y
    if (lookahead && speed > 0.1) {
      // 前瞻：朝速度方向看远一点（Alto's 式）
      const la = Math.min(speed * 3, 15)
      tx += (rt.feifei.vel.x / speed) * la
      ty += (rt.feifei.vel.y / speed) * la
    }
    
    const targetX = tx - view.width / 2
    const targetY = ty - view.height / 2
    rt.camera.x += (targetX - rt.camera.x) * lerp
    rt.camera.y += (targetY - rt.camera.y) * lerp
    rt.camera.x = clamp(rt.camera.x, 0, Math.max(0, rt.level.worldWidth - view.width))
    rt.camera.y = clamp(rt.camera.y, 0, Math.max(0, rt.level.worldHeight - view.height))
    renderer.setCamera(rt.camera.x, rt.camera.y)
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
    
    // 冲刺触发（Shift/空格 或 摇杆双击）
    if (input.dashPressed) {
      input.dashPressed = false
      triggerDash(rt)
    }
    // dash 计时递减（每物理帧一次，避免子步进加速衰减）
    if (rt.feifei.dashTimer > 0) rt.feifei.dashTimer--
    if (rt.feifei.dashCooldown > 0) rt.feifei.dashCooldown--
    
    // 固定步长物理更新（60Hz 节拍）：帧率再高物理也不会变快
    timeAccumulator += realDt
    let steps = 0
    while (timeAccumulator >= PHYSICS_FRAME && steps < MAX_PHYSICS_STEPS) {
      engine.update(rt, PHYSICS_FRAME)
      timeAccumulator -= PHYSICS_FRAME
      steps++
    }
    if (steps >= MAX_PHYSICS_STEPS) timeAccumulator = 0  // 积压过多直接丢弃（防死亡螺旋）
    
    // 消费事件 → 音效 + 屏幕震动 + 粒子
    for (const event of rt.events) {
      if (soundState.enabled) {
        if (event === 'collect') Sound.playCollect()
        else if (event === 'bounce') Sound.playBounce()
        else if (event === 'hit') Sound.playHit()
        else if (event === 'win') Sound.playWin()
        else if (event === 'spring') Sound.playBounce()
        else if (event === 'portal') Sound.playCollect()
        else if (event === 'hazard') Sound.playHit()
      }
      // 屏幕震动（幅度按事件分级）
      if (event === 'hit') renderer?.setShake(3.5)
      else if (event === 'bounce') renderer?.setShake(1.2)
      // 粒子爆发
      else if (event === 'collect') renderer?.spawnParticles(rt.feifei.pos.x, rt.feifei.pos.y, 'collect')
      else if (event === 'spring') renderer?.spawnParticles(rt.feifei.pos.x, rt.feifei.pos.y, 'spring')
    }
    rt.events.length = 0
    
    // 更新UI数据
    elapsedTime.value = rt.time
    stardustCollected.value = rt.stardust
    collisions.value = rt.collisions
    
    // 时间限制检查
    if (rt.level.timeLimit && rt.time > rt.level.timeLimit) {
      rt.state = 'lost'
    }
    
    // 失败检查（时间耗尽 / 危险区接触）
    if (rt.state === 'lost') {
      gameState.value = 'lost'
    }
    
    // 胜利检查
    if (rt.state === 'won') {
      rt.stars = calculateStars(rt)
      stars.value = rt.stars
      gameState.value = 'won'
    }
    
    // 相机跟随 + 渲染
    const skin = skins.find(s => s.id === rt.skinId) || skins[0]
    updateCamera(rt)
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
