// V2 跑酷游戏循环：垂直跑酷（障碍下落 + 飞船自由移动 + 护甲制 + 能量）
import { ref, watch, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { RunnerLevelDef, RunnerRuntime } from '../engine/runnerTypes'
import { spawnRunnerEntities } from '../engine/runnerTypes'
import * as Sound from '../utils/sound'
import { useSound } from './useSound'

const VIEW_HEIGHT = 75          // 视口高（世界单位）
const SHIP_RADIUS = 3
const START_ARMOR = 3

export function useRunnerLoop() {
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const gameState = ref<'menu' | 'playing' | 'paused' | 'won' | 'lost'>('menu')
  const runtime = ref<RunnerRuntime | null>(null) as Ref<RunnerRuntime | null>
  const failText = ref('')

  // 输入（单摇杆模型）
  const stickX = ref(0)   // 摇杆 X：左右移动 -1~1
  const stickY = ref(0)   // 摇杆 Y：上推=加速(+1)，下拉=刹车(-1)
  const throttle = ref(0) // 派生：油门（stickY 上推为正）

  // HUD
  const armor = ref(START_ARMOR)
  const energy = ref(100)
  const gems = ref(0)
  const progressPct = ref(0)
  const elapsedTime = ref(0)

  const soundState = useSound()

  let rafId = 0
  let lastTime = 0
  let timeAccumulator = 0
  const PHYSICS_FRAME = 1 / 60
  let viewW = 140  // 视口宽（世界单位），随画布纵横比动态更新（防飞船飞出可视区）
  let viewH = VIEW_HEIGHT

  /** 画布/视口尺寸变化时同步物理边界 */
  function setViewSize(w: number, h: number): void {
    viewW = w
    viewH = h
  }

  function createRuntime(level: RunnerLevelDef): RunnerRuntime {
    return {
      state: 'playing',
      level,
      ship: { x: 70, y: 55, vx: 0, vy: 0, armor: START_ARMOR, invincible: 0 },
      energy: 100,
      gems: 0,
      progress: 0,
      flowSpeed: level.baseFlow,
      throttle: 0,
      obstacles: [],
      gemsArr: [],
      energyBlocks: [],
      nextSpawnIndex: 0,
      time: 0,
      failReason: null,
      events: [],
    }
  }

  function circleRectHit(px: number, py: number, r: number, rx: number, ry: number, rw: number, rh: number): boolean {
    const cx = Math.max(rx, Math.min(px, rx + rw))
    const cy = Math.max(ry, Math.min(py, ry + rh))
    const dx = px - cx
    const dy = py - cy
    return dx * dx + dy * dy < r * r
  }

  /** 单步物理（固定 60Hz） */
  function step(rt: RunnerRuntime, dt: number): void {
    const level = rt.level
    const ship = rt.ship
    rt.time += dt

    // ===== 单摇杆 → 位移（左右）+ 油门（上下） =====
    // 左右：水平移动
    const targetVx = stickX.value * level.moveSpeed
    ship.vx += (targetVx - ship.vx) * 0.18
    ship.x += ship.vx * dt * 60
    // 上下：加速（上推=上升+流速快）/ 刹车（下拉=下降+流速慢）
    const yStick = stickY.value
    const targetVy = -yStick * level.moveSpeed * 0.7
    ship.vy += (targetVy - ship.vy) * 0.18
    ship.y += ship.vy * dt * 60

    // 油门（派生自 stickY 上推）
    let thr = yStick
    if (rt.energy <= 0 && thr > 0) thr = 0  // 无能量只能滑行（刹车仍可用）
    rt.throttle = thr
    rt.flowSpeed = level.baseFlow + Math.max(0, thr) * level.flowRange
    if (thr < 0) rt.flowSpeed = level.baseFlow * (1 + thr * 0.7)  // 刹车减速
    // 能量消耗（推进时）
    if (thr > 0) {
      rt.energy = Math.max(0, rt.energy - level.energyDrain * thr * dt)
    }
    // 太阳能回能
    for (const z of level.solarZones) {
      if (ship.x > z.x && ship.x < z.x + z.width && ship.y > z.y && ship.y < z.y + z.height) {
        rt.energy = Math.min(100, rt.energy + 3 * dt)
      }
    }

    // 边界（视口内活动，bounce）
    if (ship.x < SHIP_RADIUS) { ship.x = SHIP_RADIUS; ship.vx = Math.abs(ship.vx) * 0.4 }
    if (ship.x > viewW - SHIP_RADIUS) { ship.x = viewW - SHIP_RADIUS; ship.vx = -Math.abs(ship.vx) * 0.4 }
    if (ship.y < SHIP_RADIUS) { ship.y = SHIP_RADIUS; ship.vy = Math.abs(ship.vy) * 0.4 }
    if (ship.y > viewH - SHIP_RADIUS) { ship.y = viewH - SHIP_RADIUS; ship.vy = -Math.abs(ship.vy) * 0.4 }

    // 无敌帧递减
    if (ship.invincible > 0) ship.invincible--

    // ===== 生成器：激活 + 下落 =====
    spawnRunnerEntities(rt, viewW, viewH)

    // ===== 碰撞 =====
    // 障碍
    if (ship.invincible <= 0) {
      for (const o of rt.obstacles) {
        if (!o.active) continue
        if (circleRectHit(ship.x, ship.y, SHIP_RADIUS, o.x - o.width / 2, o.y - o.height / 2, o.width, o.height)) {
          ship.armor--
          ship.invincible = 60
          o.active = false
          // 弹开
          ship.vx = (ship.x < o.x ? -1 : 1) * 0.8
          ship.vy = 0.6
          rt.events.push('hit')
          if (ship.armor <= 0) {
            rt.state = 'lost'
            rt.failReason = 'armor'
            failText.value = '💥 护甲耗尽！'
            gameState.value = 'lost'   // 同步 UI 状态（弹失败窗）
          }
          break
        }
      }
    }
    // 宝石
    for (const g of rt.gemsArr) {
      if (!g.collected && circleRectHit(ship.x, ship.y, SHIP_RADIUS + 1, g.x - 3, g.y - 3, 6, 6)) {
        g.collected = true
        rt.gems++
        rt.events.push('gem')
      }
    }
    // 能量块
    for (const eb of rt.energyBlocks) {
      if (!eb.collected && circleRectHit(ship.x, ship.y, SHIP_RADIUS + 1, eb.x - 3, eb.y - 3, 6, 6)) {
        eb.collected = true
        rt.energy = Math.min(100, rt.energy + 20)
        rt.events.push('energy')
      }
    }

    // ===== 进度 =====
    rt.progress += rt.flowSpeed * dt * 60  // flowSpeed 单位/帧 → 每秒 ×60
    if (rt.progress >= level.length) {
      rt.state = 'won'
      rt.events.push('win')
      gameState.value = 'won'   // 同步 UI 状态（弹通关窗）
    }

    // ===== HUD 同步 =====
    armor.value = ship.armor
    energy.value = Math.round(rt.energy)
    gems.value = rt.gems
    progressPct.value = Math.min(100, Math.round(rt.progress / level.length * 100))
    elapsedTime.value = Math.round(rt.time)
  }

  function gameLoop(ts: number): void {
    const rt = runtime.value
    if (!rt) return

    if (rt.state === 'playing') {
      if (!lastTime) lastTime = ts
      const realDt = Math.min(5, (ts - lastTime) / 16.667)  // 帧数
      lastTime = ts
      timeAccumulator += realDt

      while (timeAccumulator >= 1) {   // 每 1 帧执行一步物理（60Hz）
        step(rt, 1 / 60)               // dt = 秒
        timeAccumulator -= 1
        // 消费事件（音效）
        if (rt.events.length) {
          for (const e of rt.events) {
            if (e === 'hit') Sound.playHit()
            else if (e === 'gem') Sound.playCollect()
            else if (e === 'energy') Sound.playCollect()   // 能量块：清脆提示音
            else if (e === 'win') Sound.playWin()
          }
          rt.events.length = 0
        }
        if (rt.state !== 'playing') break
      }
    }

    rafId = requestAnimationFrame(gameLoop)
  }

  function startLevel(level: RunnerLevelDef): void {
    runtime.value = createRuntime(level)
    gameState.value = 'playing'
    lastTime = 0
    timeAccumulator = 0
    // 重置输入
    stickX.value = 0
    stickY.value = 0
    throttle.value = 0
    cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(gameLoop)
  }

  function retryLevel(): void {
    if (runtime.value) startLevel(runtime.value.level)
  }

  function backToMenu(): void {
    cancelAnimationFrame(rafId)
    runtime.value = null
    gameState.value = 'menu'   // 返回大厅
  }

  // 键盘（桌面模式）：←→ 移动，↑ 加速，↓ 刹车
  let keys = new Set<string>()
  function onKeyDown(e: KeyboardEvent) {
    keys.add(e.key.toLowerCase())
    if (e.key === 'Escape' || e.key === 'p') togglePause()
    updateStickFromKeys()
  }
  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.key.toLowerCase())
    updateStickFromKeys()
  }
  function updateStickFromKeys() {
    let x = 0, y = 0
    if (keys.has('a') || keys.has('arrowleft')) x -= 1
    if (keys.has('d') || keys.has('arrowright')) x += 1
    if (keys.has('w') || keys.has('arrowup')) y += 1       // 上推=加速
    if (keys.has('s') || keys.has('arrowdown')) y -= 1     // 下拉=刹车
    if (touchActive) return  // 触屏优先
    stickX.value = x
    stickY.value = y
  }
  let touchActive = false
  function setStickTouch(active: boolean) {
    touchActive = active
    if (!active) { stickX.value = 0; stickY.value = 0 }
  }

  // 暂停
  function togglePause() {
    if (gameState.value === 'playing') gameState.value = 'paused'
    else if (gameState.value === 'paused') gameState.value = 'playing'
  }
  function resumeGame() {
    if (gameState.value === 'paused') gameState.value = 'playing'
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
  }

  onUnmounted(() => {
    cancelAnimationFrame(rafId)
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  })

  return {
    canvasRef,
    gameState,
    runtime,
    failText,
    stickX, stickY, throttle,
    armor, energy, gems, progressPct, elapsedTime,
    soundEnabled: soundState.soundEnabled,
    toggleSound: soundState.toggleSound,
    startLevel, retryLevel, backToMenu,
    togglePause, resumeGame,
    setStickTouch, setViewSize,
  }
}
