import type { ChapterDef, LevelDef } from '../engine/types'

const inertiaStar: ChapterDef = {
  id: 1,
  title: '惯性星',
  subtitle: '牛顿第一定律',
  emoji: '🪐',
  planet: 'Inertia',
  intro: '你驾驶飞飞来到了惯性星——一个没有空气、没有摩擦力的神秘星球。在这里，推一下就永远停不下来！掌握惯性的力量，穿越小行星带，完成精准对接，才能拿到惯性星的核心物理卡。',
  bgGradient: ['#0a0a2e', '#1a1a4e'],
  levels: [
    // 1-1 太空漫步（教学关）：星尘直线引导"推一下停不下来"，软限速防新手失控
    {
      id: '1-1',
      name: '太空漫步',
      difficulty: 1,
      worldWidth: 100,
      worldHeight: 75,
      physics: { gravity: 0, drag: 0, bounce: 0.7, thrust: 0.16, maxSpeed: 1.4, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 37 },
      goal: { x: 90, y: 37, radius: 3 },
      obstacles: [
        // 终点保护：小行星围绕终点形成入口
        { id: 'o1', type: 'static', x: 82, y: 28, width: 8, height: 8, color: '#6b7280', rounded: true },
        { id: 'o2', type: 'static', x: 82, y: 46, width: 8, height: 8, color: '#6b7280', rounded: true },
        { id: 'o3', type: 'static', x: 95, y: 32, width: 5, height: 5, color: '#6b7280', rounded: true },
      ],
      collectibles: [
        // 直线引导：沿着星尘走就到终点
        { id: 's1', type: 'stardust', x: 30, y: 37 },
        { id: 's2', type: 'stardust', x: 50, y: 37 },
        { id: 's3', type: 'stardust', x: 70, y: 37 },
      ],
      triggers: [],
      starConditions: { time: [35, 50, 70] },
      isBoss: false,
    },
    // 1-2 躲避小行星（大世界滚动）：移动小行星阵 + 风区加速走廊，必须预判惯性
    {
      id: '1-2',
      name: '躲避小行星',
      difficulty: 2,
      worldWidth: 300,
      worldHeight: 75,
      physics: { gravity: 0, drag: 0, bounce: 0.7, thrust: 0.17, maxSpeed: 1.3, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 37 },
      goal: { x: 290, y: 37, radius: 3 },
      bgGradient: ['#1a0b3a', '#2d1b69'],
      obstacles: [
        // 小行星带1（x 30-95）：上下摆动的移动小行星
        { id: 'o1', type: 'moving', x: 35, y: 20, width: 8, height: 8, moveAxis: 'y', moveRange: 15, moveSpeed: 0.02, color: '#7c3aed', rounded: true },
        { id: 'o2', type: 'moving', x: 55, y: 50, width: 9, height: 9, moveAxis: 'y', moveRange: 14, moveSpeed: 0.025, color: '#7c3aed', rounded: true },
        { id: 'o3', type: 'moving', x: 75, y: 20, width: 7, height: 7, moveAxis: 'y', moveRange: 16, moveSpeed: 0.03, color: '#7c3aed', rounded: true },
        { id: 'o4', type: 'static', x: 88, y: 33, width: 8, height: 8, color: '#6b7280', rounded: true },
        // 小行星带2（x 125-170）：更多移动小行星
        { id: 'o5', type: 'moving', x: 230, y: 45, width: 8, height: 8, moveAxis: 'y', moveRange: 15, moveSpeed: 0.028, color: '#7c3aed', rounded: true },
        { id: 'o6', type: 'moving', x: 250, y: 18, width: 9, height: 9, moveAxis: 'y', moveRange: 12, moveSpeed: 0.022, color: '#7c3aed', rounded: true },
        { id: 'o7', type: 'moving', x: 268, y: 42, width: 7, height: 7, moveAxis: 'y', moveRange: 18, moveSpeed: 0.035, color: '#7c3aed', rounded: true },
        // 终点保护
        { id: 'o8', type: 'static', x: 282, y: 28, width: 7, height: 7, color: '#6b7280', rounded: true },
        { id: 'o9', type: 'static', x: 282, y: 46, width: 7, height: 7, color: '#6b7280', rounded: true },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 45, y: 32 },
        { id: 's2', type: 'stardust', x: 70, y: 50 },
        { id: 's3', type: 'stardust', x: 115, y: 25 },
        { id: 's4', type: 'stardust', x: 245, y: 48 },
        { id: 's5', type: 'stardust', x: 272, y: 30 },
      ],
      triggers: [
        // 风区加速走廊：经过时被向右推，体验"借力滑行"
        { id: 't1', type: 'wind', x: 100, y: 25, width: 15, height: 25, params: { forceX: 0.12, forceY: 0 } },
        { id: 't2', type: 'wind', x: 258, y: 25, width: 12, height: 25, params: { forceX: 0.1, forceY: 0 } },
      ],
      hazards: [
        // 危险陨石带：顶部红色区域，接触即失败，必须低飞穿过（压在风区走廊之间）
        { id: 'h1', x: 112, y: 18, width: 5, height: 35, color: '#ef4444' },
        { id: 'h2', x: 265, y: 12, width: 5, height: 30, color: '#ef4444' },
      ],
      starConditions: { collisions: [0, 1, 3], time: [45, 65, 100] },
      isBoss: false,
    },
    // 1-3 精准对接（精细控制）：限速着陆 + 速度指示灯（绿/黄/红），速度门通道
    {
      id: '1-3',
      name: '精准对接',
      difficulty: 2,
      worldWidth: 80,
      worldHeight: 60,
      physics: { gravity: 0, drag: 0, bounce: 0.7, thrust: 0.15, maxSpeed: 1.1, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 30 },
      goal: { x: 70, y: 30, radius: 3, maxSpeed: 0.8 },
      obstacles: [
        // 终点被墙壁包围，只有窄入口（速度门：高速会被弹回）
        { id: 'o1', type: 'static', x: 62, y: 10, width: 3, height: 14, color: '#475569', rounded: false },
        { id: 'o2', type: 'static', x: 62, y: 38, width: 3, height: 14, color: '#475569', rounded: false },
        { id: 'o3', type: 'static', x: 62, y: 24, width: 3, height: 6, color: '#475569', rounded: false },
        // 中间障碍：S 形通道
        { id: 'o4', type: 'static', x: 30, y: 10, width: 4, height: 18, color: '#475569', rounded: false },
        { id: 'o5', type: 'static', x: 30, y: 38, width: 4, height: 14, color: '#475569', rounded: false },
        { id: 'o6', type: 'static', x: 46, y: 22, width: 4, height: 16, color: '#475569', rounded: false },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 20, y: 15 },
        { id: 's2', type: 'stardust', x: 40, y: 48 },
        { id: 's3', type: 'stardust', x: 55, y: 18 },
      ],
      triggers: [],
      starConditions: { speed: [0.3, 0.5, 0.8], time: [30, 45, 60] },
      isBoss: false,
    },
    // 1-4 星尘收集赛（竞速收集）：30 秒限时 + 12 颗星尘 + 风区高速走廊，惯性滑行规划路线
    {
      id: '1-4',
      name: '星尘收集赛',
      difficulty: 3,
      worldWidth: 320,
      worldHeight: 100,
      physics: { gravity: 0, drag: 0, bounce: 0.7, thrust: 0.16, maxSpeed: 1.4, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 50 },
      goal: { x: 305, y: 50, radius: 3 },
      bgGradient: ['#06282e', '#0d4a42'],
      obstacles: [
        // 终点保护
        { id: 'o1', type: 'static', x: 297, y: 40, width: 7, height: 7, color: '#6b7280', rounded: true },
        { id: 'o2', type: 'static', x: 297, y: 58, width: 7, height: 7, color: '#6b7280', rounded: true },
        // 干扰小行星
        { id: 'o3', type: 'moving', x: 55, y: 25, width: 6, height: 6, moveAxis: 'y', moveRange: 15, moveSpeed: 0.025, color: '#7c3aed', rounded: true },
        { id: 'o4', type: 'moving', x: 110, y: 70, width: 6, height: 6, moveAxis: 'y', moveRange: 16, moveSpeed: 0.028, color: '#7c3aed', rounded: true },
        { id: 'o5', type: 'moving', x: 165, y: 30, width: 6, height: 6, moveAxis: 'y', moveRange: 18, moveSpeed: 0.032, color: '#7c3aed', rounded: true },
        { id: 'o6', type: 'moving', x: 280, y: 65, width: 6, height: 6, moveAxis: 'y', moveRange: 14, moveSpeed: 0.03, color: '#7c3aed', rounded: true },
      ],
      collectibles: [
        // 波浪路线：利用惯性滑行吃星尘
        { id: 's1', type: 'stardust', x: 20, y: 50 },
        { id: 's2', type: 'stardust', x: 40, y: 25 },
        { id: 's3', type: 'stardust', x: 60, y: 70 },
        { id: 's4', type: 'stardust', x: 80, y: 40 },
        { id: 's5', type: 'stardust', x: 95, y: 75 },
        { id: 's6', type: 'stardust', x: 115, y: 30 },
        { id: 's7', type: 'stardust', x: 135, y: 65 },
        { id: 's8', type: 'stardust', x: 155, y: 35 },
        { id: 's9', type: 'stardust', x: 175, y: 70 },
        { id: 's10', type: 'stardust', x: 275, y: 40 },
        { id: 's11', type: 'stardust', x: 290, y: 65 },
        { id: 's12', type: 'stardust', x: 298, y: 45 },
      ],
      triggers: [
        // 高速走廊：风区借力滑行
        { id: 't1', type: 'wind', x: 65, y: 30, width: 12, height: 40, params: { forceX: 0.15, forceY: 0 } },
        { id: 't2', type: 'wind', x: 150, y: 30, width: 12, height: 40, params: { forceX: 0.15, forceY: 0 } },
      ],
      portals: [
        // 传送门捷径：放弃下方星尘，直接跳到后半段（路线选择）
        { id: 'p1', pairId: 'p2', x: 100, y: 82, radius: 5 },
        { id: 'p2', pairId: 'p1', x: 240, y: 18, radius: 5 },
      ],
      starConditions: { collectibles: [12, 10, 8], time: [25, 40, 60] },
      timeLimit: 30,
      isBoss: false,
    },
  ],
  boss: {
    id: '1-5-boss',
    name: '惯性迷宫',
    difficulty: 4,
    worldWidth: 220,
    worldHeight: 140,
    physics: { gravity: 0, drag: 0, bounce: 0.5, thrust: 0.17, maxSpeed: 1.4, boundsBehavior: 'bounce' },
    feifei: { x: 12, y: 70 },
    goal: { x: 205, y: 70, radius: 3 },
    camera: { lookahead: false },  // 迷宫：减少前瞻晃动，稳定视野
    bgGradient: ['#2e0a14', '#4e1528'],
    obstacles: [
      // 外框墙
      { id: 'w1', type: 'static', x: 0, y: 0, width: 220, height: 3, color: '#475569', rounded: false },
      { id: 'w2', type: 'static', x: 0, y: 137, width: 220, height: 3, color: '#475569', rounded: false },
      { id: 'w3', type: 'static', x: 0, y: 0, width: 3, height: 140, color: '#475569', rounded: false },
      { id: 'w4', type: 'static', x: 217, y: 0, width: 3, height: 140, color: '#475569', rounded: false },
      // S 形隔墙：上下交替留口（底部开口 / 顶部开口）
      { id: 'w5', type: 'static', x: 40, y: 0, width: 3, height: 100, color: '#64748b', rounded: false },
      { id: 'w6', type: 'static', x: 80, y: 40, width: 3, height: 100, color: '#64748b', rounded: false },
      { id: 'w7', type: 'static', x: 120, y: 0, width: 3, height: 100, color: '#64748b', rounded: false },
      { id: 'w8', type: 'static', x: 160, y: 40, width: 3, height: 100, color: '#64748b', rounded: false },
      // 移动墙：守口，卡时机通过（相位随机）
      { id: 'wm1', type: 'moving', x: 40, y: 100, width: 3, height: 16, moveAxis: 'y', moveRange: 8, moveSpeed: 0.02, color: '#f59e0b', rounded: false },
      { id: 'wm2', type: 'moving', x: 80, y: 25, width: 3, height: 16, moveAxis: 'y', moveRange: 9, moveSpeed: 0.025, color: '#f59e0b', rounded: false },
      { id: 'wm3', type: 'moving', x: 120, y: 100, width: 3, height: 16, moveAxis: 'y', moveRange: 8, moveSpeed: 0.022, color: '#f59e0b', rounded: false },
      { id: 'wm4', type: 'moving', x: 160, y: 25, width: 3, height: 16, moveAxis: 'y', moveRange: 9, moveSpeed: 0.028, color: '#f59e0b', rounded: false },
      // 终点保护
      { id: 'w9', type: 'static', x: 195, y: 60, width: 3, height: 10, color: '#64748b', rounded: false },
      { id: 'w10', type: 'static', x: 195, y: 72, width: 3, height: 10, color: '#64748b', rounded: false },
    ],
    collectibles: [
      // 检查点：碰触后失败从该处复活
      { id: 'c1', type: 'checkpoint', x: 28, y: 70 },
      { id: 'c2', type: 'checkpoint', x: 95, y: 112 },
      { id: 'c3', type: 'checkpoint', x: 138, y: 28 },
      // 星尘：引导路线
      { id: 's1', type: 'stardust', x: 60, y: 20 },
      { id: 's2', type: 'stardust', x: 100, y: 85 },
      { id: 's3', type: 'stardust', x: 140, y: 50 },
      { id: 's4', type: 'stardust', x: 180, y: 95 },
    ],
    triggers: [
      // 加速区（黄色）：经过时向上推，帮助越过隔墙
      { id: 't1', type: 'boost', x: 20, y: 15, width: 10, height: 10, params: { force: 0.08 } },
      { id: 't3', type: 'boost', x: 135, y: 105, width: 10, height: 10, params: { force: 0.08 } },
      // 减速区（蓝色）：惯性刹车
      { id: 't2', type: 'slow', x: 75, y: 45, width: 10, height: 10, params: {} },
    ],
    starConditions: { time: [60, 90, 120] },
    timeLimit: 120,
    isBoss: true,
  },
}

// 第二章：重力星
const gravityStar: ChapterDef = {
  id: 2,
  title: '重力星',
  subtitle: '重力与自由落体',
  emoji: '🌙',
  planet: 'Gravity',
  intro: '飞飞来到了重力星——一颗有引力的小行星。像月球一样，重力虽小但存在，飞飞会被向下拉。学会利用重力，从高处跳下，从低处攀升！',
  bgGradient: ['#0d1b2a', '#1b3a4b'],
  levels: [
    {
      id: '2-1', name: '登月', difficulty: 1,
      worldWidth: 100, worldHeight: 75,
      physics: { gravity: 0.03, drag: 0, bounce: 0.5, thrust: 0.17, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 65 },
      goal: { x: 90, y: 10, radius: 3 },
      obstacles: [
        { id: 'o1', type: 'static', x: 82, y: 3, width: 7, height: 7, color: '#6b7280', rounded: true },
        { id: 'o2', type: 'static', x: 95, y: 14, width: 7, height: 7, color: '#6b7280', rounded: true },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 30, y: 50 },
        { id: 's2', type: 'stardust', x: 50, y: 30 },
        { id: 's3', type: 'stardust', x: 70, y: 45 },
      ],
      triggers: [],
      starConditions: { time: [30, 45, 60] },
      isBoss: false,
    },
    {
      id: '2-2', name: '跳跃峡谷', difficulty: 2,
      worldWidth: 120, worldHeight: 75,
      physics: { gravity: 0.04, drag: 0, bounce: 0.5, thrust: 0.09, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 65 },
      goal: { x: 110, y: 65, radius: 3 },
      obstacles: [
        // 峡谷地面
        { id: 'o1', type: 'static', x: 20, y: 70, width: 30, height: 5, color: '#475569', rounded: false },
        { id: 'o2', type: 'static', x: 70, y: 70, width: 30, height: 5, color: '#475569', rounded: false },
        // 终点保护
        { id: 'o3', type: 'static', x: 102, y: 58, width: 8, height: 8, color: '#6b7280', rounded: true },
        { id: 'o4', type: 'moving', x: 105, y: 70, width: 5, height: 5, moveAxis: 'y', moveRange: 5, moveSpeed: 0.03, color: '#7c3aed', rounded: true },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 35, y: 40 },
        { id: 's2', type: 'stardust', x: 55, y: 55 },
        { id: 's3', type: 'stardust', x: 85, y: 40 },
      ],
      triggers: [],
      starConditions: { time: [35, 50, 70] },
      isBoss: false,
    },
    {
      id: '2-3', name: '多重重力', difficulty: 2,
      worldWidth: 100, worldHeight: 80,
      physics: { gravity: 0.05, drag: 0, bounce: 0.6, thrust: 0.1, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 70 },
      goal: { x: 90, y: 10, radius: 3 },
      obstacles: [
        // 平台
        { id: 'o1', type: 'static', x: 15, y: 55, width: 20, height: 3, color: '#475569', rounded: false },
        { id: 'o2', type: 'static', x: 50, y: 40, width: 20, height: 3, color: '#475569', rounded: false },
        { id: 'o3', type: 'static', x: 75, y: 25, width: 15, height: 3, color: '#475569', rounded: false },
        // 终点保护
        { id: 'o4', type: 'static', x: 83, y: 3, width: 7, height: 7, color: '#6b7280', rounded: true },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 25, y: 40 },
        { id: 's2', type: 'stardust', x: 60, y: 25 },
        { id: 's3', type: 'stardust', x: 80, y: 15 },
      ],
      triggers: [],
      starConditions: { time: [25, 40, 55] },
      isBoss: false,
    },
    {
      id: '2-4', name: '自由落体', difficulty: 3,
      worldWidth: 80, worldHeight: 100,
      physics: { gravity: 0.06, drag: 0, bounce: 0.3, thrust: 0.1, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 10 },
      goal: { x: 70, y: 90, radius: 3 },
      obstacles: [
        // 下降通道
        { id: 'o1', type: 'static', x: 25, y: 20, width: 40, height: 3, color: '#475569', rounded: false },
        { id: 'o2', type: 'static', x: 15, y: 45, width: 40, height: 3, color: '#475569', rounded: false },
        { id: 'o3', type: 'static', x: 30, y: 70, width: 40, height: 3, color: '#475569', rounded: false },
        // 终点保护
        { id: 'o4', type: 'static', x: 62, y: 82, width: 7, height: 7, color: '#6b7280', rounded: true },
        { id: 'o5', type: 'static', x: 75, y: 82, width: 7, height: 7, color: '#6b7280', rounded: true },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 50, y: 15 },
        { id: 's2', type: 'stardust', x: 30, y: 35 },
        { id: 's3', type: 'stardust', x: 55, y: 60 },
      ],
      triggers: [],
      starConditions: { time: [30, 45, 60] },
      isBoss: false,
    },
  ],
  boss: {
    id: '2-5-boss', name: '重力切换', difficulty: 4,
    worldWidth: 100, worldHeight: 80,
    physics: { gravity: 0.04, drag: 0, bounce: 0.5, thrust: 0.17, boundsBehavior: 'bounce' },
    feifei: { x: 10, y: 70 },
    goal: { x: 90, y: 10, radius: 3 },
    obstacles: [
      { id: 'w1', type: 'static', x: 0, y: 0, width: 100, height: 3, color: '#475569', rounded: false },
      { id: 'w2', type: 'static', x: 0, y: 77, width: 100, height: 3, color: '#475569', rounded: false },
      { id: 'w3', type: 'static', x: 0, y: 0, width: 3, height: 80, color: '#475569', rounded: false },
      { id: 'w4', type: 'static', x: 97, y: 0, width: 3, height: 80, color: '#475569', rounded: false },
      { id: 'w5', type: 'static', x: 25, y: 20, width: 3, height: 40, color: '#64748b', rounded: false },
      { id: 'w6', type: 'static', x: 50, y: 20, width: 3, height: 40, color: '#64748b', rounded: false },
      { id: 'w7', type: 'static', x: 75, y: 20, width: 3, height: 40, color: '#64748b', rounded: false },
      { id: 'wm1', type: 'moving', x: 35, y: 30, width: 3, height: 15, moveAxis: 'y', moveRange: 10, moveSpeed: 0.02, color: '#f59e0b', rounded: false },
      { id: 'wm2', type: 'moving', x: 60, y: 50, width: 3, height: 15, moveAxis: 'y', moveRange: 10, moveSpeed: 0.025, color: '#f59e0b', rounded: false },
    ],
    collectibles: [
      { id: 'c1', type: 'checkpoint', x: 15, y: 15 },
      { id: 'c2', type: 'checkpoint', x: 40, y: 60 },
      { id: 'c3', type: 'checkpoint', x: 65, y: 15 },
    ],
    triggers: [
      { id: 't1', type: 'gravity_well', x: 35, y: 40, width: 10, height: 10, params: { force: 0.05 } },
      { id: 't2', type: 'boost', x: 80, y: 60, width: 10, height: 10, params: { force: 0.1 } },
    ],
    starConditions: { time: [50, 75, 100] },
    isBoss: true,
  },
}

// 第三章：弹力星
const bounceStar: ChapterDef = {
  id: 3,
  title: '弹力星',
  subtitle: '弹性碰撞与动量',
  emoji: '🏀',
  planet: 'Bounce',
  intro: '弹力星充满了弹性物体！飞飞撞墙、撞球都会反弹，反弹力度取决于碰撞方式。学会利用反弹，把障碍变成助力！',
  bgGradient: ['#1a0a2e', '#2e1a4e'],
  levels: [
    {
      id: '3-1', name: '弹力墙', difficulty: 1,
      worldWidth: 100, worldHeight: 75,
      physics: { gravity: 0, drag: 0, bounce: 0.95, thrust: 0.16, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 37 },
      goal: { x: 90, y: 37, radius: 3 },
      obstacles: [
        { id: 'o1', type: 'static', x: 45, y: 25, width: 8, height: 8, color: '#f59e0b', rounded: true },
        { id: 'o2', type: 'static', x: 82, y: 28, width: 7, height: 7, color: '#6b7280', rounded: true },
        { id: 'o3', type: 'static', x: 82, y: 46, width: 7, height: 7, color: '#6b7280', rounded: true },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 30, y: 20 },
        { id: 's2', type: 'stardust', x: 60, y: 55 },
        { id: 's3', type: 'stardust', x: 75, y: 20 },
      ],
      triggers: [],
      starConditions: { time: [25, 40, 55] },
      isBoss: false,
    },
    {
      id: '3-2', name: '台球飞飞', difficulty: 2,
      worldWidth: 100, worldHeight: 75,
      physics: { gravity: 0, drag: 0, bounce: 0.95, thrust: 0.15, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 37 },
      goal: { x: 90, y: 37, radius: 3 },
      obstacles: [
        { id: 'o1', type: 'static', x: 35, y: 20, width: 8, height: 8, color: '#f59e0b', rounded: true },
        { id: 'o2', type: 'static', x: 55, y: 50, width: 8, height: 8, color: '#f59e0b', rounded: true },
        { id: 'o3', type: 'static', x: 70, y: 25, width: 8, height: 8, color: '#f59e0b', rounded: true },
        { id: 'o4', type: 'static', x: 82, y: 28, width: 7, height: 7, color: '#6b7280', rounded: true },
        { id: 'o5', type: 'static', x: 82, y: 46, width: 7, height: 7, color: '#6b7280', rounded: true },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 25, y: 15 },
        { id: 's2', type: 'stardust', x: 45, y: 60 },
        { id: 's3', type: 'stardust', x: 65, y: 15 },
      ],
      triggers: [],
      starConditions: { collisions: [0, 2, 4] },
      isBoss: false,
    },
    {
      id: '3-3', name: '连锁反应', difficulty: 2,
      worldWidth: 120, worldHeight: 75,
      physics: { gravity: 0, drag: 0, bounce: 0.95, thrust: 0.15, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 37 },
      goal: { x: 110, y: 37, radius: 3 },
      obstacles: [
        { id: 'o1', type: 'static', x: 30, y: 30, width: 6, height: 6, color: '#f59e0b', rounded: true },
        { id: 'o2', type: 'static', x: 50, y: 20, width: 6, height: 6, color: '#f59e0b', rounded: true },
        { id: 'o3', type: 'static', x: 50, y: 50, width: 6, height: 6, color: '#f59e0b', rounded: true },
        { id: 'o4', type: 'static', x: 70, y: 35, width: 6, height: 6, color: '#f59e0b', rounded: true },
        { id: 'o5', type: 'static', x: 90, y: 25, width: 6, height: 6, color: '#f59e0b', rounded: true },
        { id: 'o6', type: 'static', x: 90, y: 50, width: 6, height: 6, color: '#f59e0b', rounded: true },
        { id: 'o7', type: 'static', x: 102, y: 28, width: 7, height: 7, color: '#6b7280', rounded: true },
        { id: 'o8', type: 'static', x: 102, y: 46, width: 7, height: 7, color: '#6b7280', rounded: true },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 20, y: 15 },
        { id: 's2', type: 'stardust', x: 40, y: 55 },
        { id: 's3', type: 'stardust', x: 60, y: 15 },
        { id: 's4', type: 'stardust', x: 80, y: 55 },
      ],
      triggers: [],
      starConditions: { time: [30, 45, 60] },
      isBoss: false,
    },
    {
      id: '3-4', name: '弹力跳板', difficulty: 3,
      worldWidth: 100, worldHeight: 75,
      physics: { gravity: 0, drag: 0, bounce: 0.95, thrust: 0.15, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 65 },
      goal: { x: 90, y: 10, radius: 3 },
      obstacles: [
        { id: 'o1', type: 'static', x: 25, y: 55, width: 6, height: 6, color: '#f59e0b', rounded: true },
        { id: 'o2', type: 'static', x: 45, y: 40, width: 6, height: 6, color: '#f59e0b', rounded: true },
        { id: 'o3', type: 'static', x: 65, y: 25, width: 6, height: 6, color: '#f59e0b', rounded: true },
        { id: 'o4', type: 'static', x: 82, y: 3, width: 7, height: 7, color: '#6b7280', rounded: true },
        { id: 'o5', type: 'static', x: 95, y: 14, width: 7, height: 7, color: '#6b7280', rounded: true },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 20, y: 40 },
        { id: 's2', type: 'stardust', x: 40, y: 25 },
        { id: 's3', type: 'stardust', x: 60, y: 10 },
      ],
      triggers: [],
      starConditions: { time: [25, 40, 55] },
      isBoss: false,
    },
  ],
  boss: {
    id: '3-5-boss', name: '弹力迷宫', difficulty: 4,
    worldWidth: 120, worldHeight: 90,
    physics: { gravity: 0, drag: 0, bounce: 0.95, thrust: 0.15, boundsBehavior: 'bounce' },
    feifei: { x: 10, y: 80 },
    goal: { x: 110, y: 10, radius: 3 },
    obstacles: [
      { id: 'w1', type: 'static', x: 0, y: 0, width: 120, height: 3, color: '#475569', rounded: false },
      { id: 'w2', type: 'static', x: 0, y: 87, width: 120, height: 3, color: '#475569', rounded: false },
      { id: 'w3', type: 'static', x: 0, y: 0, width: 3, height: 90, color: '#475569', rounded: false },
      { id: 'w4', type: 'static', x: 117, y: 0, width: 3, height: 90, color: '#475569', rounded: false },
      { id: 'o1', type: 'static', x: 20, y: 30, width: 8, height: 8, color: '#f59e0b', rounded: true },
      { id: 'o2', type: 'static', x: 40, y: 60, width: 8, height: 8, color: '#f59e0b', rounded: true },
      { id: 'o3', type: 'static', x: 60, y: 30, width: 8, height: 8, color: '#f59e0b', rounded: true },
      { id: 'o4', type: 'static', x: 80, y: 60, width: 8, height: 8, color: '#f59e0b', rounded: true },
      { id: 'o5', type: 'static', x: 100, y: 30, width: 8, height: 8, color: '#f59e0b', rounded: true },
    ],
    collectibles: [
      { id: 'c1', type: 'checkpoint', x: 30, y: 75 },
      { id: 'c2', type: 'checkpoint', x: 50, y: 15 },
      { id: 'c3', type: 'checkpoint', x: 70, y: 75 },
    ],
    triggers: [
      { id: 't1', type: 'boost', x: 10, y: 65, width: 10, height: 10, params: { force: 0.1 } },
      { id: 't2', type: 'boost', x: 90, y: 65, width: 10, height: 10, params: { force: 0.1 } },
    ],
    starConditions: { time: [50, 75, 100] },
    isBoss: true,
  },
}

// 第四章：阻力星
const dragStar: ChapterDef = {
  id: 4,
  title: '阻力星',
  subtitle: '摩擦力与空气阻力',
  emoji: '🌫️',
  planet: 'Drag',
  intro: '阻力星有大气层！飞飞在空中飞行时受到空气阻力，速度越快阻力越大，下落速度有上限。像在水中一样，学会利用阻力！',
  bgGradient: ['#1a2e0a', '#2e4e1a'],
  levels: [
    {
      id: '4-1', name: '大气层飞行', difficulty: 1,
      worldWidth: 100, worldHeight: 75,
      physics: { gravity: 0, drag: 0.02, bounce: 0.5, thrust: 0.12, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 37 },
      goal: { x: 90, y: 37, radius: 3 },
      obstacles: [
        { id: 'o1', type: 'static', x: 82, y: 28, width: 7, height: 7, color: '#6b7280', rounded: true },
        { id: 'o2', type: 'static', x: 82, y: 46, width: 7, height: 7, color: '#6b7280', rounded: true },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 30, y: 25 },
        { id: 's2', type: 'stardust', x: 50, y: 50 },
        { id: 's3', type: 'stardust', x: 70, y: 30 },
      ],
      triggers: [],
      starConditions: { time: [25, 40, 55] },
      isBoss: false,
    },
    {
      id: '4-2', name: '水中穿行', difficulty: 2,
      worldWidth: 100, worldHeight: 75,
      physics: { gravity: 0.02, drag: 0.04, bounce: 0.3, thrust: 0.15, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 37 },
      goal: { x: 90, y: 37, radius: 3 },
      obstacles: [
        { id: 'o1', type: 'static', x: 40, y: 20, width: 6, height: 6, color: '#6b7280', rounded: true },
        { id: 'o2', type: 'static', x: 60, y: 50, width: 6, height: 6, color: '#6b7280', rounded: true },
        { id: 'o3', type: 'static', x: 82, y: 28, width: 7, height: 7, color: '#6b7280', rounded: true },
        { id: 'o4', type: 'static', x: 82, y: 46, width: 7, height: 7, color: '#6b7280', rounded: true },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 25, y: 15 },
        { id: 's2', type: 'stardust', x: 50, y: 60 },
        { id: 's3', type: 'stardust', x: 75, y: 20 },
      ],
      triggers: [],
      starConditions: { time: [30, 45, 60] },
      isBoss: false,
    },
    {
      id: '4-3', name: '风洞', difficulty: 2,
      worldWidth: 100, worldHeight: 75,
      physics: { gravity: 0, drag: 0.03, bounce: 0.5, thrust: 0.12, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 37 },
      goal: { x: 90, y: 37, radius: 3 },
      obstacles: [
        { id: 'o1', type: 'static', x: 82, y: 28, width: 7, height: 7, color: '#6b7280', rounded: true },
        { id: 'o2', type: 'static', x: 82, y: 46, width: 7, height: 7, color: '#6b7280', rounded: true },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 30, y: 25 },
        { id: 's2', type: 'stardust', x: 50, y: 50 },
        { id: 's3', type: 'stardust', x: 70, y: 30 },
      ],
      triggers: [
        { id: 't1', type: 'wind', x: 20, y: 30, width: 15, height: 15, params: { force: 0.05 } },
        { id: 't2', type: 'wind', x: 60, y: 30, width: 15, height: 15, params: { force: -0.05 } },
      ],
      starConditions: { time: [25, 40, 55] },
      isBoss: false,
    },
    {
      id: '4-4', name: '终端速度', difficulty: 3,
      worldWidth: 80, worldHeight: 100,
      physics: { gravity: 0.05, drag: 0.05, bounce: 0.3, thrust: 0.15, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 10 },
      goal: { x: 70, y: 90, radius: 3 },
      obstacles: [
        { id: 'o1', type: 'static', x: 25, y: 30, width: 20, height: 3, color: '#475569', rounded: false },
        { id: 'o2', type: 'static', x: 40, y: 55, width: 20, height: 3, color: '#475569', rounded: false },
        { id: 'o3', type: 'static', x: 62, y: 82, width: 7, height: 7, color: '#6b7280', rounded: true },
        { id: 'o4', type: 'static', x: 75, y: 82, width: 7, height: 7, color: '#6b7280', rounded: true },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 30, y: 15 },
        { id: 's2', type: 'stardust', x: 50, y: 40 },
        { id: 's3', type: 'stardust', x: 35, y: 70 },
      ],
      triggers: [],
      starConditions: { time: [25, 40, 55] },
      isBoss: false,
    },
  ],
  boss: {
    id: '4-5-boss', name: '暴风雪', difficulty: 4,
    worldWidth: 100, worldHeight: 80,
    physics: { gravity: 0.03, drag: 0.04, bounce: 0.4, thrust: 0.12, boundsBehavior: 'bounce' },
    feifei: { x: 10, y: 70 },
    goal: { x: 90, y: 10, radius: 3 },
    obstacles: [
      { id: 'w1', type: 'static', x: 0, y: 0, width: 100, height: 3, color: '#475569', rounded: false },
      { id: 'w2', type: 'static', x: 0, y: 77, width: 100, height: 3, color: '#475569', rounded: false },
      { id: 'w3', type: 'static', x: 0, y: 0, width: 3, height: 80, color: '#475569', rounded: false },
      { id: 'w4', type: 'static', x: 97, y: 0, width: 3, height: 80, color: '#475569', rounded: false },
      { id: 'o1', type: 'static', x: 25, y: 20, width: 3, height: 40, color: '#64748b', rounded: false },
      { id: 'o2', type: 'static', x: 50, y: 20, width: 3, height: 40, color: '#64748b', rounded: false },
      { id: 'o3', type: 'static', x: 75, y: 20, width: 3, height: 40, color: '#64748b', rounded: false },
    ],
    collectibles: [
      { id: 'c1', type: 'checkpoint', x: 15, y: 15 },
      { id: 'c2', type: 'checkpoint', x: 40, y: 60 },
      { id: 'c3', type: 'checkpoint', x: 65, y: 15 },
    ],
    triggers: [
      { id: 't1', type: 'wind', x: 10, y: 30, width: 15, height: 20, params: { force: 0.08 } },
      { id: 't2', type: 'wind', x: 40, y: 50, width: 15, height: 20, params: { force: -0.08 } },
      { id: 't3', type: 'wind', x: 70, y: 30, width: 15, height: 20, params: { force: 0.08 } },
    ],
    starConditions: { time: [50, 75, 100] },
    isBoss: true,
  },
}

// 第五章：引力星
const orbitStar: ChapterDef = {
  id: 5,
  title: '引力星',
  subtitle: '万有引力与轨道',
  emoji: '🌀',
  planet: 'Orbit',
  intro: '太空中有多颗星球，每颗都有引力！飞飞需要利用引力绕行或弹射，像真正的航天器一样在星间穿梭！',
  bgGradient: ['#2e0a1a', '#4e1a2e'],
  levels: [
    {
      id: '5-1', name: '单星环绕', difficulty: 1,
      worldWidth: 100, worldHeight: 75,
      physics: { gravity: 0, drag: 0, bounce: 0.7, thrust: 0.15, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 37 },
      goal: { x: 90, y: 37, radius: 3 },
      obstacles: [
        { id: 'o1', type: 'static', x: 82, y: 28, width: 7, height: 7, color: '#6b7280', rounded: true },
        { id: 'o2', type: 'static', x: 82, y: 46, width: 7, height: 7, color: '#6b7280', rounded: true },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 30, y: 25 },
        { id: 's2', type: 'stardust', x: 50, y: 50 },
        { id: 's3', type: 'stardust', x: 70, y: 30 },
      ],
      triggers: [
        { id: 't1', type: 'gravity_well', x: 45, y: 30, width: 15, height: 15, params: { force: 0.03 } },
      ],
      starConditions: { time: [25, 40, 55] },
      isBoss: false,
    },
    {
      id: '5-2', name: '双星系统', difficulty: 2,
      worldWidth: 100, worldHeight: 75,
      physics: { gravity: 0, drag: 0, bounce: 0.7, thrust: 0.15, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 37 },
      goal: { x: 90, y: 37, radius: 3 },
      obstacles: [
        { id: 'o1', type: 'static', x: 82, y: 28, width: 7, height: 7, color: '#6b7280', rounded: true },
        { id: 'o2', type: 'static', x: 82, y: 46, width: 7, height: 7, color: '#6b7280', rounded: true },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 25, y: 20 },
        { id: 's2', type: 'stardust', x: 50, y: 55 },
        { id: 's3', type: 'stardust', x: 75, y: 20 },
      ],
      triggers: [
        { id: 't1', type: 'gravity_well', x: 30, y: 25, width: 12, height: 12, params: { force: 0.04 } },
        { id: 't2', type: 'gravity_well', x: 60, y: 40, width: 12, height: 12, params: { force: -0.04 } },
      ],
      starConditions: { time: [25, 40, 55] },
      isBoss: false,
    },
    {
      id: '5-3', name: '拉格朗日点', difficulty: 2,
      worldWidth: 120, worldHeight: 75,
      physics: { gravity: 0, drag: 0, bounce: 0.7, thrust: 0.15, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 37 },
      goal: { x: 110, y: 37, radius: 3 },
      obstacles: [
        { id: 'o1', type: 'static', x: 102, y: 28, width: 7, height: 7, color: '#6b7280', rounded: true },
        { id: 'o2', type: 'static', x: 102, y: 46, width: 7, height: 7, color: '#6b7280', rounded: true },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 30, y: 20 },
        { id: 's2', type: 'stardust', x: 60, y: 55 },
        { id: 's3', type: 'stardust', x: 90, y: 20 },
      ],
      triggers: [
        { id: 't1', type: 'gravity_well', x: 25, y: 30, width: 15, height: 15, params: { force: 0.05 } },
        { id: 't2', type: 'gravity_well', x: 55, y: 30, width: 15, height: 15, params: { force: -0.05 } },
        { id: 't3', type: 'gravity_well', x: 85, y: 30, width: 15, height: 15, params: { force: 0.05 } },
      ],
      starConditions: { time: [30, 45, 60] },
      isBoss: false,
    },
    {
      id: '5-4', name: '引力弹弓', difficulty: 3,
      worldWidth: 100, worldHeight: 75,
      physics: { gravity: 0, drag: 0, bounce: 0.7, thrust: 0.05, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 65 },
      goal: { x: 90, y: 10, radius: 3 },
      obstacles: [
        { id: 'o1', type: 'static', x: 82, y: 3, width: 7, height: 7, color: '#6b7280', rounded: true },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 25, y: 50 },
        { id: 's2', type: 'stardust', x: 50, y: 30 },
        { id: 's3', type: 'stardust', x: 75, y: 45 },
      ],
      triggers: [
        { id: 't1', type: 'gravity_well', x: 40, y: 40, width: 20, height: 20, params: { force: 0.06 } },
        { id: 't2', type: 'boost', x: 75, y: 30, width: 10, height: 10, params: { force: 0.1 } },
      ],
      starConditions: { time: [25, 40, 55] },
      isBoss: false,
    },
  ],
  boss: {
    id: '5-5-boss', name: '三体问题', difficulty: 4,
    worldWidth: 120, worldHeight: 90,
    physics: { gravity: 0, drag: 0, bounce: 0.7, thrust: 0.15, boundsBehavior: 'bounce' },
    feifei: { x: 10, y: 80 },
    goal: { x: 110, y: 10, radius: 3 },
    obstacles: [
      { id: 'w1', type: 'static', x: 0, y: 0, width: 120, height: 3, color: '#475569', rounded: false },
      { id: 'w2', type: 'static', x: 0, y: 87, width: 120, height: 3, color: '#475569', rounded: false },
      { id: 'w3', type: 'static', x: 0, y: 0, width: 3, height: 90, color: '#475569', rounded: false },
      { id: 'w4', type: 'static', x: 117, y: 0, width: 3, height: 90, color: '#475569', rounded: false },
    ],
    collectibles: [
      { id: 'c1', type: 'checkpoint', x: 30, y: 75 },
      { id: 'c2', type: 'checkpoint', x: 60, y: 15 },
      { id: 'c3', type: 'checkpoint', x: 90, y: 50 },
    ],
    triggers: [
      { id: 't1', type: 'gravity_well', x: 30, y: 30, width: 20, height: 20, params: { force: 0.06 } },
      { id: 't2', type: 'gravity_well', x: 60, y: 50, width: 20, height: 20, params: { force: -0.06 } },
      { id: 't3', type: 'gravity_well', x: 90, y: 30, width: 20, height: 20, params: { force: 0.06 } },
    ],
    starConditions: { time: [50, 75, 100] },
    isBoss: true,
  },
}

// 第六章：能量星
const energyStar: ChapterDef = {
  id: 6,
  title: '能量星',
  subtitle: '动能与势能转换',
  emoji: '⚡',
  planet: 'Energy',
  intro: '能量星有地形起伏，飞飞需要利用动能和势能的转换来前进。部分关卡没有推力，完全靠能量转换！你能守住能量守恒的法则吗？',
  bgGradient: ['#2e1a0a', '#4e2e1a'],
  levels: [
    {
      id: '6-1', name: '滑坡', difficulty: 1,
      worldWidth: 100, worldHeight: 75,
      physics: { gravity: 0.05, drag: 0.01, bounce: 0.3, thrust: 0.17, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 10 },
      goal: { x: 90, y: 65, radius: 3 },
      obstacles: [
        { id: 'o1', type: 'static', x: 82, y: 55, width: 7, height: 7, color: '#6b7280', rounded: true },
        { id: 'o2', type: 'static', x: 95, y: 58, width: 7, height: 7, color: '#6b7280', rounded: true },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 30, y: 25 },
        { id: 's2', type: 'stardust', x: 50, y: 45 },
        { id: 's3', type: 'stardust', x: 70, y: 30 },
      ],
      triggers: [],
      starConditions: { time: [25, 40, 55] },
      isBoss: false,
    },
    {
      id: '6-2', name: '弹弓', difficulty: 2,
      worldWidth: 100, worldHeight: 75,
      physics: { gravity: 0.05, drag: 0.01, bounce: 0.8, thrust: 0.16, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 65 },
      goal: { x: 90, y: 10, radius: 3 },
      obstacles: [
        { id: 'o1', type: 'static', x: 45, y: 40, width: 6, height: 6, color: '#f59e0b', rounded: true },
        { id: 'o2', type: 'static', x: 82, y: 3, width: 7, height: 7, color: '#6b7280', rounded: true },
        { id: 'o3', type: 'static', x: 95, y: 14, width: 7, height: 7, color: '#6b7280', rounded: true },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 25, y: 50 },
        { id: 's2', type: 'stardust', x: 50, y: 30 },
        { id: 's3', type: 'stardust', x: 75, y: 45 },
      ],
      triggers: [],
      starConditions: { time: [25, 40, 55] },
      isBoss: false,
    },
    {
      id: '6-3', name: '过山车', difficulty: 2,
      worldWidth: 120, worldHeight: 80,
      physics: { gravity: 0.06, drag: 0.01, bounce: 0.3, thrust: 0.17, maxSpeed: 1.3, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 10 },
      goal: { x: 110, y: 70, radius: 3 },
      obstacles: [
        { id: 'o1', type: 'static', x: 20, y: 25, width: 25, height: 3, color: '#475569', rounded: false },
        { id: 'o2', type: 'static', x: 55, y: 45, width: 25, height: 3, color: '#475569', rounded: false },
        { id: 'o3', type: 'static', x: 85, y: 30, width: 20, height: 3, color: '#475569', rounded: false },
        { id: 'o4', type: 'static', x: 102, y: 62, width: 7, height: 7, color: '#6b7280', rounded: true },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 35, y: 15 },
        { id: 's2', type: 'stardust', x: 65, y: 35 },
        { id: 's3', type: 'stardust', x: 95, y: 20 },
      ],
      triggers: [],
      starConditions: { time: [30, 45, 60] },
      isBoss: false,
    },
    {
      id: '6-4', name: '能量守恒', difficulty: 3,
      worldWidth: 100, worldHeight: 80,
      physics: { gravity: 0.05, drag: 0.005, bounce: 0.5, thrust: 0.17, maxSpeed: 1.3, boundsBehavior: 'bounce' },
      feifei: { x: 10, y: 70 },
      goal: { x: 90, y: 10, radius: 3 },
      obstacles: [
        // 单向平台：逐级向上跳（能量守恒：动能↔势能）
        { id: 'o1', type: 'platform', x: 15, y: 55, width: 20, height: 3, color: '#10b981', rounded: false },
        { id: 'o2', type: 'platform', x: 45, y: 40, width: 20, height: 3, color: '#10b981', rounded: false },
        { id: 'o3', type: 'platform', x: 70, y: 25, width: 15, height: 3, color: '#10b981', rounded: false },
        { id: 'o4', type: 'static', x: 82, y: 3, width: 7, height: 7, color: '#6b7280', rounded: true },
        { id: 'o5', type: 'static', x: 95, y: 14, width: 7, height: 7, color: '#6b7280', rounded: true },
      ],
      collectibles: [
        { id: 's1', type: 'stardust', x: 25, y: 40 },
        { id: 's2', type: 'stardust', x: 55, y: 25 },
        { id: 's3', type: 'stardust', x: 80, y: 15 },
      ],
      triggers: [],
      starConditions: { time: [30, 45, 60] },
      isBoss: false,
    },
  ],
  boss: {
    id: '6-5-boss', name: '永动机陷阱', difficulty: 4,
    worldWidth: 120, worldHeight: 90,
    physics: { gravity: 0.05, drag: 0.005, bounce: 0.6, thrust: 0.17, maxSpeed: 1.3, boundsBehavior: 'bounce' },
    feifei: { x: 10, y: 80 },
    goal: { x: 110, y: 10, radius: 3 },
    obstacles: [
      { id: 'w1', type: 'static', x: 0, y: 0, width: 120, height: 3, color: '#475569', rounded: false },
      { id: 'w2', type: 'static', x: 0, y: 87, width: 120, height: 3, color: '#475569', rounded: false },
      { id: 'w3', type: 'static', x: 0, y: 0, width: 3, height: 90, color: '#475569', rounded: false },
      { id: 'w4', type: 'static', x: 117, y: 0, width: 3, height: 90, color: '#475569', rounded: false },
      // 单向平台梯田：逐级向上，配合 boost 弹跳
      { id: 'o1', type: 'platform', x: 25, y: 55, width: 20, height: 3, color: '#10b981', rounded: false },
      { id: 'o2', type: 'platform', x: 55, y: 40, width: 20, height: 3, color: '#10b981', rounded: false },
      { id: 'o3', type: 'platform', x: 85, y: 25, width: 20, height: 3, color: '#10b981', rounded: false },
    ],
    collectibles: [
      { id: 'c1', type: 'checkpoint', x: 30, y: 75 },
      { id: 'c2', type: 'checkpoint', x: 60, y: 15 },
      { id: 'c3', type: 'checkpoint', x: 90, y: 50 },
    ],
    triggers: [
      { id: 't1', type: 'boost', x: 10, y: 65, width: 10, height: 10, params: { force: 0.1 } },
      { id: 't2', type: 'slow', x: 45, y: 20, width: 10, height: 10, params: {} },
    ],
    starConditions: { time: [50, 75, 100] },
    isBoss: true,
  },
}

export const chapters: ChapterDef[] = [inertiaStar, gravityStar, bounceStar, dragStar, orbitStar, energyStar]
