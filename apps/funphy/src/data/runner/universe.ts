// V2 第六章：冲向宇宙 无限模式（红矮星/白矮星/黑洞，循环生成）
import type { RunnerLevelDef } from '../../engine/runnerTypes'

// 6-1 星际漫游（无限模式）：无通关点，里程挑战
// 生成序列为循环单元（500 里程一轮）：红矮星耀斑区 → 白矮星区 → 黑洞区
export const universe1: RunnerLevelDef = {
  id: '6-1',
  chapter: 6,
  name: '星际漫游',
  introCard: '🌌 太阳系已在身后！红矮星的耀斑、白矮星的高密度、黑洞的引力漩涡……\n这是无限探索模式，看你能走多远！',
  endless: true,
  length: 99999,
  baseFlow: 0.36,
  flowRange: 0.9,
  physics: { gravity: 0, drag: 0, bounce: 0.3, thrust: 0.19, maxSpeed: 1.8, boundsBehavior: 'bounce' },
  moveSpeed: 1.05,
  energyDrain: 2.4,
  bgGradient: ['#0a0518', '#1a0a30'],
  solarZones: [
    { id: 'sun1', x: 40, y: 150, width: 26, height: 40 },
    { id: 'sun2', x: 90, y: 350, width: 24, height: 38 },
  ],
  spawns: [
    // ==== 红矮星耀斑区（0-150）：慢速飘落 ====
    { at: 20, x: 50, gem: true },
    { at: 45, x: 65, obstacle: { kind: 'falling', style: 'orb', width: 11, height: 11, fallSpeed: 0.55, sway: 8, swaySpeed: 3.5 } },
    { at: 75, x: 85, gem: true },
    { at: 100, x: 45, obstacle: { kind: 'falling', style: 'orb', width: 12, height: 12, fallSpeed: 0.6, sway: 10, swaySpeed: 4 } },
    { at: 130, x: 60, energy: true },
    // ==== 白矮星区（150-350）：高密度俯冲 ====
    { at: 170, x: 40, obstacle: { kind: 'falling', style: 'metal', width: 10, height: 10, fallSpeed: 0.7, sway: 10, swaySpeed: 4 } },
    { at: 175, x: 90, obstacle: { kind: 'falling', style: 'metal', width: 10, height: 10, fallSpeed: 0.7, sway: 10, swaySpeed: 4 } },
    { at: 210, x: 65, gem: true },
    { at: 245, x: 50, obstacle: { kind: 'dive', style: 'orb', width: 10, height: 10, fallSpeed: 1.4 } },
    { at: 250, x: 95, obstacle: { kind: 'dive', style: 'orb', width: 10, height: 10, fallSpeed: 1.4 } },
    { at: 285, x: 60, energy: true },
    { at: 315, x: 40, obstacle: { kind: 'falling', style: 'metal', width: 11, height: 11, fallSpeed: 0.8, sway: 12, swaySpeed: 4.5 } },
    { at: 320, x: 100, obstacle: { kind: 'falling', style: 'metal', width: 11, height: 11, fallSpeed: 0.8, sway: 12, swaySpeed: 4.5 } },
    // ==== 黑洞区（350-500）：密集高速 ====
    { at: 365, x: 55, gem: true },
    { at: 395, x: 45, obstacle: { kind: 'dive', style: 'orb', width: 12, height: 12, fallSpeed: 1.6 } },
    { at: 400, x: 90, obstacle: { kind: 'dive', style: 'orb', width: 12, height: 12, fallSpeed: 1.6 } },
    { at: 435, x: 65, energy: true },
    { at: 460, x: 40, obstacle: { kind: 'falling', style: 'metal', width: 12, height: 12, fallSpeed: 0.9, sway: 14, swaySpeed: 5 } },
    { at: 465, x: 85, obstacle: { kind: 'falling', style: 'orb', width: 12, height: 12, fallSpeed: 0.9, sway: 14, swaySpeed: 5 } },
    { at: 465, x: 115, obstacle: { kind: 'falling', style: 'metal', width: 12, height: 12, fallSpeed: 0.9, sway: 14, swaySpeed: 5 } },
    { at: 490, x: 70, gem: true },
  ],
  goal: { gems: 999 },
}

// 第 6 章关卡列表（无限模式）
export const universeLevels: RunnerLevelDef[] = [universe1]
