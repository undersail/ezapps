// V2 第一章：浮力海洋 关卡数据
import type { RunnerLevelDef } from '../../engine/runnerTypes'

// 1-1 海面初航（教学关）：低密度障碍，珍珠链引导，太阳能区教学
export const ocean1: RunnerLevelDef = {
  id: '1-1',
  chapter: 1,
  name: '海面初航',
  introCard: '🌊 阳光穿过海面，鱼群在礁石间穿梭。\n收集珍珠升级两栖船体，为冲出海洋做准备！',
  length: 1350,              // 累计里程（baseFlow 0.25 下约 90 秒通关）
  baseFlow: 0.25,            // 基础流速（慢，教学）
  flowRange: 0.8,            // 推杆满速 +0.8
  physics: { gravity: 0.01, drag: 0.06, bounce: 0.4, thrust: 0.16, maxSpeed: 1.4, boundsBehavior: 'bounce' },
  moveSpeed: 0.85,           // 左摇杆位移上限（海洋较慢）
  energyDrain: 2.0,          // 满推力 2 能量/秒
  bgGradient: ['#042f3e', '#0a5a5e'],
  solarZones: [
    { id: 'sun1', x: 40, y: 220, width: 30, height: 50 },   // 中部太阳能区（教学）
    { id: 'sun2', x: 120, y: 420, width: 26, height: 44 },  // 后段太阳能区
  ],
  spawns: [
    // ==== 教学段（里程 0-80）：单独礁石，无压力 ====
    { at: 68, x: 55, gem: true },
    { at: 90, x: 45, obstacle: { kind: 'falling', style: 'rock', width: 9, height: 9, fallSpeed: 0.45 } },
    { at: 126, x: 80, gem: true },
    { at: 162, x: 70, obstacle: { kind: 'falling', style: 'rock', width: 9, height: 9, fallSpeed: 0.5, sway: 6, swaySpeed: 3 } },
    { at: 198, x: 40, gem: true },
    { at: 234, x: 95, gem: true },
    { at: 261, x: 60, obstacle: { kind: 'falling', style: 'rock', width: 10, height: 10, fallSpeed: 0.55 } },
    { at: 297, x: 80, energy: true },

    // ==== 常规段（80-200）：礁石+能量块，开始要求走位 ====
    { at: 405, x: 50, obstacle: { kind: 'falling', style: 'rock', width: 10, height: 10, fallSpeed: 0.6, sway: 8, swaySpeed: 3.5 } },
    { at: 441, x: 90, gem: true },
    { at: 486, x: 35, obstacle: { kind: 'falling', style: 'rock', width: 11, height: 11, fallSpeed: 0.65 } },
    { at: 486, x: 75, obstacle: { kind: 'falling', style: 'rock', width: 9, height: 9, fallSpeed: 0.6 } },
    { at: 522, x: 110, gem: true },
    { at: 567, x: 60, energy: true },
    { at: 603, x: 45, obstacle: { kind: 'dive', style: 'rock', width: 8, height: 8, fallSpeed: 1.1 } },   // 俯冲鱼
    { at: 603, x: 85, obstacle: { kind: 'dive', style: 'rock', width: 8, height: 8, fallSpeed: 1.1 } },
    { at: 666, x: 70, gem: true },
    { at: 711, x: 50, obstacle: { kind: 'falling', style: 'rock', width: 12, height: 12, fallSpeed: 0.6, sway: 10, swaySpeed: 3 } },
    { at: 756, x: 95, gem: true },
    { at: 801, x: 40, energy: true },
    { at: 846, x: 60, obstacle: { kind: 'falling', style: 'rock', width: 10, height: 10, fallSpeed: 0.7, sway: 8, swaySpeed: 4 } },

    // ==== 收尾段（200-300）：编队密集，太阳能区补给 ====
    { at: 945, x: 45, obstacle: { kind: 'dive', style: 'rock', width: 9, height: 9, fallSpeed: 1.2 } },
    { at: 963, x: 85, obstacle: { kind: 'dive', style: 'rock', width: 9, height: 9, fallSpeed: 1.2 } },
    { at: 990, x: 65, gem: true },
    { at: 1044, x: 40, obstacle: { kind: 'falling', style: 'rock', width: 11, height: 11, fallSpeed: 0.65, sway: 9, swaySpeed: 3.5 } },
    { at: 1044, x: 80, obstacle: { kind: 'falling', style: 'rock', width: 11, height: 11, fallSpeed: 0.65, sway: 9, swaySpeed: 3.5 } },
    { at: 1098, x: 60, energy: true },
    { at: 1143, x: 50, obstacle: { kind: 'falling', style: 'rock', width: 10, height: 10, fallSpeed: 0.75, sway: 12, swaySpeed: 4 } },
    { at: 1179, x: 100, gem: true },
    { at: 1233, x: 35, obstacle: { kind: 'dive', style: 'rock', width: 10, height: 10, fallSpeed: 1.3 } },
    { at: 1251, x: 95, obstacle: { kind: 'dive', style: 'rock', width: 10, height: 10, fallSpeed: 1.3 } },
    { at: 1287, x: 65, gem: true },
    { at: 1323, x: 50, energy: true },
  ],
  goal: { gems: 8 },
}

// 关卡列表（后续章节逐章补充）
export const runnerLevels: RunnerLevelDef[] = [ocean1]
