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
  bestDistance: number     // 宇宙关最佳里程（后续用）
}

const DEFAULT_PROGRESS: V2Progress = {
  version: 2,
  chapter: 1,
  gems: 0,
  upgrades: { engine: 0, armor: 0, battery: 0 },
  cards: [],
  bestDistance: 0,
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

  function save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress))
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

  /** 解锁物理卡 */
  function unlockCard(cardId: string) {
    if (!progress.cards.includes(cardId)) {
      progress.cards.push(cardId)
      save()
    }
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

  return { progress, save, addGems, upgrade, unlockCard, applyUpgrades }
}
