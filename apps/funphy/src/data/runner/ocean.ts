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
  flowRange: 0.6,            // 推杆满速 +0.6（教学关温和）
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

// 1-2 鱼群隧道（难度2）：鱼群编队摆动下落，珍珠链引导绕行
export const ocean2: RunnerLevelDef = {
  id: '1-2',
  chapter: 1,
  name: '鱼群隧道',
  introCard: '🐟 鱼群像流动的隧道，成群结队地游过。\n跟着珍珠链找到穿越的缝隙！',
  length: 1500,
  baseFlow: 0.3,
  flowRange: 0.9,
  physics: { gravity: 0.01, drag: 0.06, bounce: 0.4, thrust: 0.16, maxSpeed: 1.4, boundsBehavior: 'bounce' },
  moveSpeed: 0.9,
  energyDrain: 2.2,
  bgGradient: ['#033a4a', '#0a6a6a'],
  solarZones: [
    { id: 'sun1', x: 35, y: 500, width: 26, height: 40 },
    { id: 'sun2', x: 100, y: 1000, width: 24, height: 38 },
  ],
  spawns: [
    // ==== 教学段（0-350） ====
    { at: 60, x: 50, gem: true },
    { at: 90, x: 60, obstacle: { kind: 'falling', style: 'rock', width: 9, height: 9, fallSpeed: 0.5, sway: 6, swaySpeed: 3 } },
    { at: 150, x: 85, gem: true },
    { at: 200, x: 45, obstacle: { kind: 'falling', style: 'rock', width: 9, height: 9, fallSpeed: 0.55, sway: 8, swaySpeed: 3.5 } },
    { at: 260, x: 70, gem: true },
    { at: 310, x: 55, energy: true },
    // ==== 常规段（350-950）：鱼群编队 ====
    { at: 380, x: 40, obstacle: { kind: 'falling', style: 'rock', width: 8, height: 8, fallSpeed: 0.6, sway: 10, swaySpeed: 4 } },
    { at: 390, x: 70, obstacle: { kind: 'falling', style: 'rock', width: 8, height: 8, fallSpeed: 0.6, sway: 10, swaySpeed: 4 } },
    { at: 400, x: 100, obstacle: { kind: 'falling', style: 'rock', width: 8, height: 8, fallSpeed: 0.6, sway: 10, swaySpeed: 4 } },
    { at: 430, x: 65, gem: true },
    { at: 480, x: 50, obstacle: { kind: 'falling', style: 'rock', width: 10, height: 10, fallSpeed: 0.6, sway: 12, swaySpeed: 3.5 } },
    { at: 540, x: 90, gem: true },
    { at: 590, x: 35, obstacle: { kind: 'dive', style: 'rock', width: 8, height: 8, fallSpeed: 1.2 } },
    { at: 595, x: 75, obstacle: { kind: 'dive', style: 'rock', width: 8, height: 8, fallSpeed: 1.2 } },
    { at: 640, x: 60, energy: true },
    { at: 690, x: 45, obstacle: { kind: 'falling', style: 'rock', width: 9, height: 9, fallSpeed: 0.65, sway: 12, swaySpeed: 4 } },
    { at: 700, x: 85, obstacle: { kind: 'falling', style: 'rock', width: 9, height: 9, fallSpeed: 0.65, sway: 12, swaySpeed: 4 } },
    { at: 730, x: 65, gem: true },
    { at: 790, x: 50, obstacle: { kind: 'falling', style: 'rock', width: 10, height: 10, fallSpeed: 0.65, sway: 14, swaySpeed: 3.5 } },
    { at: 860, x: 40, gem: true },
    { at: 920, x: 70, obstacle: { kind: 'dive', style: 'rock', width: 9, height: 9, fallSpeed: 1.3 } },
    { at: 925, x: 105, obstacle: { kind: 'dive', style: 'rock', width: 9, height: 9, fallSpeed: 1.3 } },
    // ==== 收尾段（950-1500）：密集编队 ====
    { at: 990, x: 40, obstacle: { kind: 'falling', style: 'rock', width: 9, height: 9, fallSpeed: 0.7, sway: 12, swaySpeed: 4.5 } },
    { at: 1000, x: 80, obstacle: { kind: 'falling', style: 'rock', width: 9, height: 9, fallSpeed: 0.7, sway: 12, swaySpeed: 4.5 } },
    { at: 1040, x: 60, energy: true },
    { at: 1090, x: 50, obstacle: { kind: 'falling', style: 'rock', width: 11, height: 11, fallSpeed: 0.7, sway: 14, swaySpeed: 4 } },
    { at: 1100, x: 95, obstacle: { kind: 'falling', style: 'rock', width: 11, height: 11, fallSpeed: 0.7, sway: 14, swaySpeed: 4 } },
    { at: 1150, x: 70, gem: true },
    { at: 1210, x: 40, obstacle: { kind: 'dive', style: 'rock', width: 10, height: 10, fallSpeed: 1.4 } },
    { at: 1215, x: 90, obstacle: { kind: 'dive', style: 'rock', width: 10, height: 10, fallSpeed: 1.4 } },
    { at: 1270, x: 65, gem: true },
    { at: 1330, x: 50, obstacle: { kind: 'falling', style: 'rock', width: 10, height: 10, fallSpeed: 0.75, sway: 16, swaySpeed: 4.5 } },
    { at: 1340, x: 100, obstacle: { kind: 'falling', style: 'rock', width: 10, height: 10, fallSpeed: 0.75, sway: 16, swaySpeed: 4.5 } },
    { at: 1400, x: 70, gem: true },
    { at: 1450, x: 55, energy: true },
  ],
  goal: { gems: 10 },
}

// 1-3 珊瑚迷宫（难度3）：珊瑚礁密集，窄通道走位
export const ocean3: RunnerLevelDef = {
  id: '1-3',
  chapter: 1,
  name: '珊瑚迷宫',
  introCard: '🪸 珊瑚礁层层叠叠，通道越来越窄。\n放慢速度，精准穿过缝隙！',
  length: 1200,
  baseFlow: 0.25,
  flowRange: 0.8,
  physics: { gravity: 0.01, drag: 0.07, bounce: 0.4, thrust: 0.16, maxSpeed: 1.3, boundsBehavior: 'bounce' },
  moveSpeed: 0.8,
  energyDrain: 2.0,
  bgGradient: ['#2a0a3e', '#3d1a5e'],
  solarZones: [
    { id: 'sun1', x: 40, y: 300, width: 24, height: 40 },
    { id: 'sun2', x: 85, y: 700, width: 22, height: 36 },
  ],
  spawns: [
    // ==== 教学段（0-250） ====
    { at: 50, x: 60, gem: true },
    { at: 90, x: 50, obstacle: { kind: 'falling', style: 'rock', width: 10, height: 12, fallSpeed: 0.4 } },
    { at: 140, x: 80, gem: true },
    { at: 180, x: 65, obstacle: { kind: 'falling', style: 'rock', width: 11, height: 13, fallSpeed: 0.45, sway: 5, swaySpeed: 2.5 } },
    { at: 230, x: 45, energy: true },
    // ==== 常规段（250-750）：双柱窄通道 ====
    { at: 280, x: 40, obstacle: { kind: 'falling', style: 'rock', width: 12, height: 12, fallSpeed: 0.5 } },
    { at: 290, x: 95, obstacle: { kind: 'falling', style: 'rock', width: 12, height: 12, fallSpeed: 0.5 } },
    { at: 320, x: 68, gem: true },
    { at: 370, x: 30, obstacle: { kind: 'falling', style: 'rock', width: 12, height: 14, fallSpeed: 0.5, sway: 6, swaySpeed: 3 } },
    { at: 375, x: 105, obstacle: { kind: 'falling', style: 'rock', width: 12, height: 14, fallSpeed: 0.5, sway: 6, swaySpeed: 3 } },
    { at: 420, x: 68, gem: true },
    { at: 470, x: 50, obstacle: { kind: 'falling', style: 'rock', width: 13, height: 13, fallSpeed: 0.55 } },
    { at: 540, x: 30, obstacle: { kind: 'falling', style: 'rock', width: 11, height: 13, fallSpeed: 0.55, sway: 8, swaySpeed: 3 } },
    { at: 545, x: 100, obstacle: { kind: 'falling', style: 'rock', width: 11, height: 13, fallSpeed: 0.55, sway: 8, swaySpeed: 3 } },
    { at: 590, x: 65, energy: true },
    { at: 640, x: 40, obstacle: { kind: 'falling', style: 'rock', width: 12, height: 14, fallSpeed: 0.6 } },
    { at: 650, x: 90, obstacle: { kind: 'falling', style: 'rock', width: 12, height: 14, fallSpeed: 0.6 } },
    { at: 700, x: 68, gem: true },
    // ==== 收尾段（750-1200）：三柱阵 + 移动珊瑚 ====
    { at: 780, x: 30, obstacle: { kind: 'falling', style: 'rock', width: 12, height: 14, fallSpeed: 0.55 } },
    { at: 790, x: 70, obstacle: { kind: 'falling', style: 'rock', width: 12, height: 14, fallSpeed: 0.55, sway: 10, swaySpeed: 3.5 } },
    { at: 800, x: 110, obstacle: { kind: 'falling', style: 'rock', width: 12, height: 14, fallSpeed: 0.55 } },
    { at: 850, x: 68, gem: true },
    { at: 900, x: 45, obstacle: { kind: 'falling', style: 'rock', width: 14, height: 14, fallSpeed: 0.6, sway: 8, swaySpeed: 4 } },
    { at: 905, x: 90, obstacle: { kind: 'falling', style: 'rock', width: 10, height: 10, fallSpeed: 0.65, sway: 8, swaySpeed: 4 } },
    { at: 960, x: 60, energy: true },
    { at: 1010, x: 35, obstacle: { kind: 'falling', style: 'rock', width: 13, height: 15, fallSpeed: 0.6 } },
    { at: 1020, x: 100, obstacle: { kind: 'falling', style: 'rock', width: 13, height: 15, fallSpeed: 0.6 } },
    { at: 1070, x: 68, gem: true },
    { at: 1120, x: 50, obstacle: { kind: 'falling', style: 'rock', width: 12, height: 14, fallSpeed: 0.65, sway: 10, swaySpeed: 4 } },
    { at: 1130, x: 95, obstacle: { kind: 'falling', style: 'rock', width: 12, height: 14, fallSpeed: 0.65, sway: 10, swaySpeed: 4 } },
    { at: 1170, x: 70, gem: true },
  ],
  goal: { gems: 9 },
}

// 1-4 深海急流（难度3）：流速快，能量压力大
export const ocean4: RunnerLevelDef = {
  id: '1-4',
  chapter: 1,
  name: '深海急流',
  introCard: '🌊 急流来袭！海水流速飞快，能量补给稀少。\n节约能量，只在关键时刻加速！',
  length: 1600,
  baseFlow: 0.45,
  flowRange: 0.7,
  physics: { gravity: 0.01, drag: 0.05, bounce: 0.4, thrust: 0.17, maxSpeed: 1.5, boundsBehavior: 'bounce' },
  moveSpeed: 0.95,
  energyDrain: 2.5,
  bgGradient: ['#021a30', '#063a52'],
  solarZones: [
    { id: 'sun1', x: 60, y: 650, width: 24, height: 36 },
  ],
  spawns: [
    // ==== 适应段（0-400）：急流速度适应 ====
    { at: 80, x: 50, gem: true },
    { at: 140, x: 70, obstacle: { kind: 'falling', style: 'rock', width: 9, height: 9, fallSpeed: 0.7, sway: 8, swaySpeed: 3.5 } },
    { at: 220, x: 85, gem: true },
    { at: 300, x: 45, obstacle: { kind: 'falling', style: 'rock', width: 10, height: 10, fallSpeed: 0.75, sway: 10, swaySpeed: 4 } },
    { at: 380, x: 65, energy: true },
    // ==== 常规段（400-1000）：俯冲为主 ====
    { at: 460, x: 40, obstacle: { kind: 'dive', style: 'rock', width: 9, height: 9, fallSpeed: 1.4 } },
    { at: 465, x: 90, obstacle: { kind: 'dive', style: 'rock', width: 9, height: 9, fallSpeed: 1.4 } },
    { at: 530, x: 68, gem: true },
    { at: 600, x: 55, obstacle: { kind: 'falling', style: 'rock', width: 10, height: 10, fallSpeed: 0.8, sway: 12, swaySpeed: 4 } },
    { at: 680, x: 35, obstacle: { kind: 'dive', style: 'rock', width: 10, height: 10, fallSpeed: 1.5 } },
    { at: 685, x: 100, obstacle: { kind: 'dive', style: 'rock', width: 10, height: 10, fallSpeed: 1.5 } },
    { at: 750, x: 68, gem: true },
    { at: 820, x: 50, obstacle: { kind: 'falling', style: 'rock', width: 11, height: 11, fallSpeed: 0.8, sway: 12, swaySpeed: 4.5 } },
    { at: 900, x: 65, energy: true },
    { at: 960, x: 40, obstacle: { kind: 'dive', style: 'rock', width: 10, height: 10, fallSpeed: 1.5 } },
    { at: 965, x: 85, obstacle: { kind: 'dive', style: 'rock', width: 10, height: 10, fallSpeed: 1.5 } },
    // ==== 收尾段（1000-1600）：高密度急流 ====
    { at: 1040, x: 68, gem: true },
    { at: 1110, x: 45, obstacle: { kind: 'falling', style: 'rock', width: 10, height: 10, fallSpeed: 0.85, sway: 14, swaySpeed: 4.5 } },
    { at: 1120, x: 95, obstacle: { kind: 'falling', style: 'rock', width: 10, height: 10, fallSpeed: 0.85, sway: 14, swaySpeed: 4.5 } },
    { at: 1190, x: 60, gem: true },
    { at: 1260, x: 35, obstacle: { kind: 'dive', style: 'rock', width: 11, height: 11, fallSpeed: 1.6 } },
    { at: 1265, x: 75, obstacle: { kind: 'dive', style: 'rock', width: 11, height: 11, fallSpeed: 1.6 } },
    { at: 1268, x: 110, obstacle: { kind: 'dive', style: 'rock', width: 11, height: 11, fallSpeed: 1.6 } },
    { at: 1340, x: 68, energy: true },
    { at: 1410, x: 50, obstacle: { kind: 'falling', style: 'rock', width: 11, height: 11, fallSpeed: 0.9, sway: 14, swaySpeed: 5 } },
    { at: 1420, x: 95, obstacle: { kind: 'falling', style: 'rock', width: 11, height: 11, fallSpeed: 0.9, sway: 14, swaySpeed: 5 } },
    { at: 1500, x: 68, gem: true },
    { at: 1550, x: 60, energy: true },
  ],
  goal: { gems: 12 },
}

// 1-5 冲出水面（章末关）：综合考验，宝石目标拉满
export const ocean5: RunnerLevelDef = {
  id: '1-5',
  chapter: 1,
  name: '冲出水面',
  introCard: '☀️ 海面就在上方！这是冲出海洋的最后一程。\n收集足够的珍珠，向光明全速冲刺！',
  length: 1500,
  baseFlow: 0.3,
  flowRange: 0.9,
  physics: { gravity: 0.01, drag: 0.05, bounce: 0.4, thrust: 0.17, maxSpeed: 1.5, boundsBehavior: 'bounce' },
  moveSpeed: 0.9,
  energyDrain: 2.2,
  bgGradient: ['#03303a', '#0b6a6a'],
  solarZones: [
    { id: 'sun1', x: 50, y: 400, width: 28, height: 44 },
    { id: 'sun2', x: 90, y: 900, width: 26, height: 40 },
    { id: 'sun3', x: 65, y: 1350, width: 30, height: 50 },
  ],
  spawns: [
    // ==== 开场（0-300） ====
    { at: 60, x: 50, gem: true },
    { at: 100, x: 70, gem: true },
    { at: 140, x: 55, obstacle: { kind: 'falling', style: 'rock', width: 9, height: 9, fallSpeed: 0.55, sway: 8, swaySpeed: 3 } },
    { at: 200, x: 85, gem: true },
    { at: 260, x: 45, obstacle: { kind: 'falling', style: 'rock', width: 10, height: 10, fallSpeed: 0.6, sway: 10, swaySpeed: 3.5 } },
    // ==== 中段（300-900）：综合障碍 ====
    { at: 330, x: 68, gem: true },
    { at: 390, x: 40, obstacle: { kind: 'falling', style: 'rock', width: 10, height: 10, fallSpeed: 0.6, sway: 10, swaySpeed: 4 } },
    { at: 400, x: 90, obstacle: { kind: 'falling', style: 'rock', width: 10, height: 10, fallSpeed: 0.6, sway: 10, swaySpeed: 4 } },
    { at: 460, x: 65, energy: true },
    { at: 520, x: 50, obstacle: { kind: 'dive', style: 'rock', width: 9, height: 9, fallSpeed: 1.3 } },
    { at: 525, x: 100, obstacle: { kind: 'dive', style: 'rock', width: 9, height: 9, fallSpeed: 1.3 } },
    { at: 590, x: 68, gem: true },
    { at: 650, x: 40, obstacle: { kind: 'falling', style: 'rock', width: 11, height: 11, fallSpeed: 0.65, sway: 12, swaySpeed: 4 } },
    { at: 720, x: 85, gem: true },
    { at: 790, x: 55, obstacle: { kind: 'falling', style: 'rock', width: 11, height: 11, fallSpeed: 0.7, sway: 12, swaySpeed: 4.5 } },
    { at: 800, x: 100, obstacle: { kind: 'falling', style: 'rock', width: 11, height: 11, fallSpeed: 0.7, sway: 12, swaySpeed: 4.5 } },
    { at: 860, x: 70, energy: true },
    // ==== 冲刺段（900-1500）：海面在望 ====
    { at: 930, x: 68, gem: true },
    { at: 990, x: 45, obstacle: { kind: 'dive', style: 'rock', width: 10, height: 10, fallSpeed: 1.4 } },
    { at: 995, x: 85, obstacle: { kind: 'dive', style: 'rock', width: 10, height: 10, fallSpeed: 1.4 } },
    { at: 1060, x: 60, gem: true },
    { at: 1120, x: 40, obstacle: { kind: 'falling', style: 'rock', width: 11, height: 11, fallSpeed: 0.7, sway: 14, swaySpeed: 4.5 } },
    { at: 1130, x: 90, obstacle: { kind: 'falling', style: 'rock', width: 11, height: 11, fallSpeed: 0.7, sway: 14, swaySpeed: 4.5 } },
    { at: 1190, x: 68, gem: true },
    { at: 1250, x: 50, obstacle: { kind: 'dive', style: 'rock', width: 11, height: 11, fallSpeed: 1.5 } },
    { at: 1255, x: 100, obstacle: { kind: 'dive', style: 'rock', width: 11, height: 11, fallSpeed: 1.5 } },
    { at: 1320, x: 65, energy: true },
    { at: 1380, x: 60, gem: true },
    { at: 1420, x: 75, gem: true },
    { at: 1460, x: 55, obstacle: { kind: 'falling', style: 'rock', width: 10, height: 10, fallSpeed: 0.7, sway: 10, swaySpeed: 4 } },
    { at: 1470, x: 95, obstacle: { kind: 'falling', style: 'rock', width: 10, height: 10, fallSpeed: 0.7, sway: 10, swaySpeed: 4 } },
  ],
  goal: { gems: 14 },
}

// 第 1 章关卡列表
export const oceanLevels: RunnerLevelDef[] = [ocean1, ocean2, ocean3, ocean4, ocean5]
