import { reactive } from 'vue'
import type { GameProgress } from '../engine/types'

const SCHEMA_VERSION = 1
const STORAGE_KEY = 'funphy_progress'

function createDefaultProgress(): GameProgress {
  return {
    version: SCHEMA_VERSION,
    levels: {},
    stardust: 0,
    totalStardust: 0,
    cards: [],
    skinId: 'default',
    unlockedSkins: ['default'],
    unlockedChapters: [1],
  }
}

function loadProgress(): GameProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (data.version === SCHEMA_VERSION) return data
    }
  } catch {}
  return createDefaultProgress()
}

function saveProgress(progress: GameProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {}
}

const progress = reactive(loadProgress())

export function useGameProgress() {
  function save() {
    saveProgress(progress)
  }
  
  function completeLevel(levelId: string, stars: number, time: number, stardust: number): void {
    const existing = progress.levels[levelId]
    if (!existing || stars > existing.stars) {
      progress.levels[levelId] = { stars, bestTime: time, completed: true }
    }
    progress.stardust += stardust
    progress.totalStardust += stardust
    save()
  }
  
  function unlockCard(cardId: string): void {
    if (!progress.cards.includes(cardId)) {
      progress.cards.push(cardId)
      save()
    }
  }
  
  function setSkin(skinId: string): void {
    progress.skinId = skinId
    save()
  }
  
  function unlockSkin(skinId: string): void {
    if (!progress.unlockedSkins.includes(skinId)) {
      progress.unlockedSkins.push(skinId)
      save()
    }
  }
  
  function isLevelCompleted(levelId: string): boolean {
    return progress.levels[levelId]?.completed ?? false
  }
  
  function getLevelStars(levelId: string): number {
    return progress.levels[levelId]?.stars ?? 0
  }
  
  function resetProgress(): void {
    Object.assign(progress, createDefaultProgress())
    save()
  }
  
  return {
    progress,
    completeLevel,
    unlockCard,
    setSkin,
    unlockSkin,
    isLevelCompleted,
    getLevelStars,
    resetProgress,
  }
}
