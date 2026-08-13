// V2 全部关卡聚合（跨章连续解锁）
import { oceanLevels } from './ocean'
import { landLevels } from './gravity_land'
import { skyLevels } from './free_sky'
import type { RunnerLevelDef } from '../../engine/runnerTypes'

// 全部关卡（按章节顺序，探险模式连续推进）
export const runnerLevels: RunnerLevelDef[] = [...oceanLevels, ...landLevels, ...skyLevels]

// 章节元信息（大厅分组显示）
export interface RunnerChapterMeta {
  chapter: number
  title: string
  emoji: string
  color: [string, string]
}

export const runnerChapters: RunnerChapterMeta[] = [
  { chapter: 1, title: '浮力海洋', emoji: '🌊', color: ['#042f3e', '#0a5a5e'] },
  { chapter: 2, title: '重力大陆', emoji: '⛰️', color: ['#3d2b1f', '#6b4a2f'] },
  { chapter: 3, title: '自由天空', emoji: '☁️', color: ['#1e3a5f', '#3d6a9e'] },
]
