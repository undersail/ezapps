// 游戏进度管理（localStorage 持久化）
// 模块级单例：所有 useGameProgress() 共享同一份状态

import { ref, watch } from 'vue'

const STORAGE_KEY = 'funmath:progress:v1'

export interface LevelProgress {
  /** 历史最高星级 */
  stars: 0 | 1 | 2 | 3
  /** 历史最高得分 */
  bestScore: number
  /** 累计挑战次数 */
  attempts: number
  /** 首次通关时间戳 */
  passedAt?: number
}

export interface BossProgress {
  defeated: boolean
  defeatedAt?: number
  attempts: number
}

export interface GameProgress {
  version: 1
  levels: Record<string, LevelProgress>
  bosses: Record<string, BossProgress>
  totalStars: number
  startedAt: number
  lastPlayedAt: number
}

function emptyProgress(): GameProgress {
  return {
    version: 1,
    levels: {},
    bosses: {},
    totalStars: 0,
    startedAt: Date.now(),
    lastPlayedAt: Date.now(),
  }
}

function load(): GameProgress {
  if (typeof window === 'undefined') return emptyProgress()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as GameProgress
      // 版本兼容校验
      if (parsed.version === 1) return parsed
    }
  } catch {
    /* ignore */
  }
  return emptyProgress()
}

// 模块级单例
const state = ref<GameProgress>(load())

// 持久化：深度监听 state，每次变化都写 localStorage
if (typeof window !== 'undefined') {
  watch(
    state,
    (s) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
      } catch {
        /* localStorage 满/禁用，静默忽略 */
      }
    },
    { deep: true },
  )
}

function recomputeTotalStars() {
  let sum = 0
  Object.values(state.value.levels).forEach((l) => (sum += l.stars))
  state.value.totalStars = sum
}

export function useGameProgress() {
  /**
   * 记录一次关卡完成
   * - 取历史最高星级
   * - 取历史最高得分
   * - 累计 attempts
   */
  function recordLevelComplete(
    levelId: string,
    score: number,
    _total: number,
    stars: 0 | 1 | 2 | 3,
  ): void {
    const cur = state.value.levels[levelId]
    state.value.levels[levelId] = {
      stars: Math.max(cur?.stars ?? 0, stars) as 0 | 1 | 2 | 3,
      bestScore: Math.max(cur?.bestScore ?? 0, score),
      attempts: (cur?.attempts ?? 0) + 1,
      passedAt: cur?.passedAt ?? (stars > 0 ? Date.now() : undefined),
    }
    state.value.lastPlayedAt = Date.now()
    recomputeTotalStars()
  }

  /** 记录一次挑战（未通关，不更新星级，只累加 attempts） */
  function recordLevelAttempt(levelId: string): void {
    const cur = state.value.levels[levelId]
    if (!cur) {
      state.value.levels[levelId] = {
        stars: 0,
        bestScore: 0,
        attempts: 1,
      }
    } else {
      state.value.levels[levelId] = { ...cur, attempts: cur.attempts + 1 }
    }
    state.value.lastPlayedAt = Date.now()
  }

  /** 记录击败 Boss */
  function recordBossDefeat(bossId: string): void {
    const cur = state.value.bosses[bossId]
    state.value.bosses[bossId] = {
      defeated: true,
      defeatedAt: cur?.defeatedAt ?? Date.now(),
      attempts: (cur?.attempts ?? 0) + 1,
    }
    state.value.lastPlayedAt = Date.now()
  }

  /** 记录 Boss 挑战（失败） */
  function recordBossAttempt(bossId: string): void {
    const cur = state.value.bosses[bossId]
    state.value.bosses[bossId] = {
      defeated: cur?.defeated ?? false,
      defeatedAt: cur?.defeatedAt,
      attempts: (cur?.attempts ?? 0) + 1,
    }
    state.value.lastPlayedAt = Date.now()
  }

  function getLevelStars(levelId: string): 0 | 1 | 2 | 3 {
    return state.value.levels[levelId]?.stars ?? 0
  }

  function getLevelBestScore(levelId: string): number {
    return state.value.levels[levelId]?.bestScore ?? 0
  }

  function isLevelPassed(levelId: string): boolean {
    return getLevelStars(levelId) > 0
  }

  function isBossDefeated(bossId: string): boolean {
    return state.value.bosses[bossId]?.defeated ?? false
  }

  function reset(): void {
    state.value = emptyProgress()
  }

  return {
    state,
    recordLevelComplete,
    recordLevelAttempt,
    recordBossDefeat,
    recordBossAttempt,
    getLevelStars,
    getLevelBestScore,
    isLevelPassed,
    isBossDefeated,
    reset,
  }
}

/** 用于 MapView：判断章节是否解锁 */
export function isChapterUnlocked(
  chapterUnlock: 'free' | { boss: string },
  isBossDefeated: (bossId: string) => boolean,
): boolean {
  if (chapterUnlock === 'free') return true
  return isBossDefeated(chapterUnlock.boss)
}