// V2 成长系统：宝石累计 + 装备升级（动力/护甲/能量仓）+ 物理卡
import { ref, reactive } from 'vue'

const SAVE_KEY = 'funphy_v2_progress'

export interface Upgrades {
  engine: number   // 动力：+8% 推力 / -6% 能耗 每级
  armor: number    // 护甲：+1 护甲值 每级
  battery: number  // 能量仓：+10 能量上限 每级
}

export interface V2Progress {
  version: 2
  chapter: number          // 当前章节
  gems: number             // 宝石总累计
  upgrades: Upgrades
  cards: string[]          // 已解锁物理卡
  levels: Record<string, boolean>  // 关卡完成状态（'1-1': true）
  bestDistance: number     // 宇宙关最佳里程（后续用）
  savedAt: number          // 最后保存时间戳（云存档比较用）
}

const DEFAULT_PROGRESS: V2Progress = {
  version: 2,
  chapter: 1,
  gems: 0,
  upgrades: { engine: 0, armor: 0, battery: 0 },
  cards: [],
  levels: {},
  bestDistance: 0,
  savedAt: 0,
}

// 升级成本（宝石）：每级递增
export const UPGRADE_COST: Record<keyof Upgrades, number[]> = {
  engine: [10, 25, 50, 100],
  armor: [15, 40, 80, 160],
  battery: [20, 50, 100],
}

export const UPGRADE_NAME: Record<keyof Upgrades, string> = {
  engine: '动力引擎',
  armor: '船体护甲',
  battery: '能量仓',
}

export function loadProgress(): V2Progress {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return { ...DEFAULT_PROGRESS, upgrades: { ...DEFAULT_PROGRESS.upgrades } }
    const p = JSON.parse(raw)
    if (p.version !== 2) return { ...DEFAULT_PROGRESS, upgrades: { ...DEFAULT_PROGRESS.upgrades } }
    return {
      ...DEFAULT_PROGRESS,
      ...p,
      upgrades: { ...DEFAULT_PROGRESS.upgrades, ...(p.upgrades || {}) },
    }
  } catch {
    return { ...DEFAULT_PROGRESS, upgrades: { ...DEFAULT_PROGRESS.upgrades } }
  }
}

export function useUpgrades() {
  const progress = reactive<V2Progress>(loadProgress())
  if (!progress.savedAt) progress.savedAt = Date.now()

  // 云存档：节流上传（30 秒内只传一次），有昵称才同步
  let lastCloudSync = 0
  async function cloudUpload() {
    const nick = localStorage.getItem('funphy_nickname')
    if (!nick) return
    const now = Date.now()
    if (now - lastCloudSync < 30000) return
    lastCloudSync = now
    const { submitSave } = await import('../network/api')
    await submitSave(nick, JSON.parse(JSON.stringify(progress)))
  }

  function save() {
    progress.savedAt = Date.now()
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress))
    cloudUpload()
  }

  /** 拉取云端存档：云端比本地新 → 恢复并提示刷新（返回 true 表示已恢复） */
  async function syncCloud(): Promise<boolean> {
    const nick = localStorage.getItem('funphy_nickname')
    if (!nick) return false
    const { fetchSave } = await import('../network/api')
    const cloud = await fetchSave(nick)
    if (!cloud || !cloud.savedAt) return false
    if (cloud.savedAt > progress.savedAt) {
      Object.assign(progress, cloud)
      localStorage.setItem(SAVE_KEY, JSON.stringify(progress))
      return true
    }
    return false
  }

  /** 结算宝石（关卡完成后累计） */
  function addGems(n: number) {
    progress.gems += n
    save()
  }

  /** 升级装备：返回是否成功 */
  function upgrade(kind: keyof Upgrades): boolean {
    const costs = UPGRADE_COST[kind]
    const lv = progress.upgrades[kind]
    if (lv >= costs.length) return false  // 满级
    const cost = costs[lv]
    if (progress.gems < cost) return false  // 宝石不足
    progress.gems -= cost
    progress.upgrades[kind] = lv + 1
    save()
    return true
  }

  /** 解锁物理卡，返回是否本次新解锁 */
  function unlockCard(cardId: string): boolean {
    if (!progress.cards.includes(cardId)) {
      progress.cards.push(cardId)
      save()
      return true
    }
    return false
  }

  /** 标记关卡完成 */
  function completeLevel(levelId: string) {
    if (!progress.levels[levelId]) {
      progress.levels[levelId] = true
      save()
    }
  }

  /** 关卡是否完成 */
  function isLevelDone(levelId: string): boolean {
    return !!progress.levels[levelId]
  }

  /** 关卡是否解锁：第 1 关始终解锁，或前一关已完成 */
  function isLevelUnlocked(levelId: string, levels: { id: string }[]): boolean {
    if (levelId === levels[0]?.id) return true
    const idx = levels.findIndex(l => l.id === levelId)
    if (idx <= 0) return false
    return !!progress.levels[levels[idx - 1].id]
  }

  /** 装备效果 → 物理参数修正 */
  function applyUpgrades(params: { thrust: number; energyDrain: number; armor: number; maxEnergy: number }): typeof params {
    const u = progress.upgrades
    return {
      thrust: params.thrust * (1 + u.engine * 0.08),
      energyDrain: params.energyDrain * (1 - u.engine * 0.06),
      armor: params.armor + u.armor,
      maxEnergy: params.maxEnergy + u.battery * 10,
    }
  }

  /** 装备效果 → 操控参数（跟手性：加速响应/受击硬直/冲刺冷却） */
  function controlParams(): { lerp: number; invincible: number; dashCooldown: number } {
    const u = progress.upgrades
    return {
      lerp: 0.28 + u.engine * 0.04,            // 加速响应 0.28→0.44（更跟手）
      invincible: Math.max(25, 55 - u.armor * 10),  // 受击无敌帧 55→25
      dashCooldown: Math.max(45, 90 - u.engine * 15), // 冲刺冷却 90→45
    }
  }

  return { progress, save, addGems, upgrade, unlockCard, completeLevel, isLevelDone, isLevelUnlocked, applyUpgrades, controlParams, syncCloud, cloudUpload }
}
