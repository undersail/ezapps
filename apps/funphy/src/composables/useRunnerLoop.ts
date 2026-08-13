// V2 跑酷游戏循环：垂直跑酷（障碍下落 + 飞船自由移动 + 护甲制 + 能量）
import { ref, watch, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { RunnerLevelDef, RunnerRuntime } from '../engine/runnerTypes'
import { spawnRunnerEntities, gemValue, energyValue } from '../engine/runnerTypes'
import * as Sound from '../utils/sound'
import { useSound } from './useSound'
import { useUpgrades } from './useUpgrades'

const VIEW_HEIGHT = 75          // 视口高（世界单位）
const SHIP_RADIUS = 3
const START_ARMOR = 3

export function useRunnerLoop() {
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const upgrades = useUpgrades()
  const gameState = ref<'menu' | 'playing' | 'paused' | 'won' | 'lost'>('menu')
  const runtime = ref<RunnerRuntime | null>(null) as Ref<RunnerRuntime | null>
  const failText = ref('')

  // 输入（单摇杆模型）
  const stickX = ref(0)   // 摇杆 X：左右移动 -1~1
  const stickY = ref(0)   // 摇杆 Y：上推=加速(+1)，下拉=刹车(-1)
  const throttle = ref(0) // 派生：油门（stickY 上推为正）
  const solarTip = ref(false)  // 首次进入太阳能区提示（每关一次）

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
    // 装备效果注入（动力/护甲/能量仓升级 + 操控参数）
    const eff = upgrades.applyUpgrades({
      thrust: level.physics.thrust,
      energyDrain: level.energyDrain,
      armor: START_ARMOR,
      maxEnergy: 100,
    })
    const ctrl = upgrades.controlParams()
    return {
      state: 'playing',
      level,
      ship: { x: 70, y: 55, vx: 0, vy: 0, armor: eff.armor, invincible: 0 },
      maxEnergy: eff.maxEnergy,
      effDrain: eff.energyDrain,
      effLerp: ctrl.lerp,
      effInvincible: ctrl.invincible,
      dashCooldownMax: ctrl.dashCooldown,
      dashTimer: 0,
      dashCooldown: 0,
      energy: eff.maxEnergy,
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
    // 左右：水平移动（lerp = 加速响应，引擎升级更跟手）
    const targetVx = stickX.value * level.moveSpeed
    ship.vx += (targetVx - ship.vx) * rt.effLerp
    ship.x += ship.vx * dt * 60
    // 上下：加速（上推=上升+流速快）/ 刹车（下拉=下降+流速慢）
    const yStick = stickY.value
    // 重力（各章不同：海洋微/大陆强/轨道零）—— 上推需持续对抗
    ship.vy += level.physics.gravity * dt * 60
    const targetVy = -yStick * level.moveSpeed * 0.7
    ship.vy += (targetVy - ship.vy) * rt.effLerp
    ship.y += ship.vy * dt * 60

    // 油门（派生自 stickY 上推；冲刺时全油门）
    let thr = yStick
    if (rt.dashTimer > 0) thr = 1
    if (rt.energy <= 0 && thr > 0) thr = 0  // 无能量只能滑行（刹车仍可用）
    rt.throttle = thr
    rt.flowSpeed = level.baseFlow + Math.max(0, thr) * level.flowRange
    if (thr < 0) rt.flowSpeed = level.baseFlow * (1 + thr * 0.7)  // 刹车减速
    // 冲刺计时递减
    if (rt.dashTimer > 0) rt.dashTimer--
    if (rt.dashCooldown > 0) rt.dashCooldown--
    // 能量消耗（推进时）
    if (thr > 0) {
      rt.energy = Math.max(0, rt.energy - rt.effDrain * thr * dt)
    }
    // 太阳能回能（y=激活里程，progress 到达后生效；飞船在 x 带内 y 上部区域充能）
    for (const z of level.solarZones) {
      if (rt.progress < z.y) continue   // 未到激活里程
      if (ship.x > z.x && ship.x < z.x + z.width && ship.y < z.height) {
        rt.energy = Math.min(rt.maxEnergy, rt.energy + 3 * dt)
        // 首次进入太阳区 → 提示
        if (!solarTip.value) solarTip.value = true
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
          o.active = false
          // 问号盲盒块：不扣甲，随机奖励/惩罚
          if (o.kind === 'mystery') {
            const roll = Math.random()
            if (roll < 0.2) {           // 20% 大礼包：宝石+6
              rt.gems += 6
              rt.events.push('gem')
            } else if (roll < 0.4) {    // 20% 能量+35%
              rt.energy = Math.min(rt.maxEnergy, rt.energy + rt.maxEnergy * 0.35)
              rt.events.push('energy')
            } else if (roll < 0.55) {   // 15% 护甲+1
              if (ship.armor < 5) ship.armor++
              rt.events.push('gem')
            } else if (roll < 0.7) {    // 15% 惩罚：能量-15%
              rt.energy = Math.max(0, rt.energy - rt.maxEnergy * 0.15)
              rt.events.push('hit')
            } else {                    // 30% 惩罚：扣 1 甲（有护甲时）
              if (ship.armor > 0) ship.armor--
              rt.events.push('hit')
            }
            continue
          }
          ship.armor--
          ship.invincible = rt.effInvincible   // 无敌帧（护甲升级缩短硬直）
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
            // 无限模式：记录最佳里程
            if (level.endless) {
              const dist = Math.floor(rt.progress)
              if (dist > upgrades.progress.bestDistance) {
                upgrades.progress.bestDistance = dist
                upgrades.save()
              }
            }
          }
          break
        }
      }
    }
    // 宝石（分值按大小档 1/3/6）
    for (const g of rt.gemsArr) {
      if (!g.collected && circleRectHit(ship.x, ship.y, SHIP_RADIUS, g.x - 3, g.y - 3, 6, 6)) {
        g.collected = true
        rt.gems += gemValue(g.size)
        rt.events.push('gem')
      }
    }
    // 能量块（能量按大小档 12%/25%/40%）
    for (const eb of rt.energyBlocks) {
      if (!eb.collected && circleRectHit(ship.x, ship.y, SHIP_RADIUS + 1, eb.x - 3, eb.y - 3, 6, 6)) {
        eb.collected = true
        rt.energy = Math.min(rt.maxEnergy, rt.energy + energyValue(eb.size))
        rt.events.push('energy')
      }
    }

    // ===== 进度 =====
    rt.progress += rt.flowSpeed * dt * 60  // flowSpeed 单位/帧 → 每秒 ×60
    if (!level.endless && rt.progress >= level.length) {
      rt.state = 'won'
      rt.events.push('win')
      gameState.value = 'won'   // 同步 UI 状态（弹通关窗）
      upgrades.addGems(rt.gems) // 通关结算宝石（累计）
      upgrades.completeLevel(level.id)  // 标记关卡完成（解锁下一关）
      // 首次通关解锁物理卡：记录新卡，供通关界面自动弹出
      if (upgrades.unlockCard(level.id)) lastNewCardId.value = level.id
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

    if (rt.state === 'playing' && gameState.value === 'playing') {
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
    solarTip.value = false   // 每关重置太阳区提示
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

  // 关卡推进：返回下一关（无则 null → 回大厅）
  const currentLevelIndex = ref(0)
  const lastNewCardId = ref('')   // 本次通关新解锁的物理卡（自动弹出）
  function advanceLevel(levels: RunnerLevelDef[]): RunnerLevelDef | null {
    const idx = currentLevelIndex.value + 1
    if (idx < levels.length) {
      currentLevelIndex.value = idx
      return levels[idx]
    }
    currentLevelIndex.value = 0  // 章节完成，重置
    return null
  }
  function setLevelIndex(i: number): void {
    currentLevelIndex.value = i
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
    if (e.key === 'Shift' || e.key === 'x') dash()   // 冲刺
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

  // 冲刺：短时全油门（0.3s），消耗能量，冷却 1.5s
  function dash() {
    const rt = runtime.value
    if (!rt || rt.state !== 'playing') return
    if (rt.dashCooldown > 0) return
    if (rt.energy <= 8) return  // 能量不足
    rt.dashTimer = 18
    rt.dashCooldown = rt.dashCooldownMax   // 冲刺冷却（引擎升级缩短）
    rt.energy = Math.max(0, rt.energy - 8)
    rt.events.push('dash')
    if (soundState.soundEnabled) Sound.playThrust()
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
    upgrades, dash,
    currentLevelIndex, advanceLevel, setLevelIndex, lastNewCardId,
    solarTip,
  }
}
