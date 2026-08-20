/**
 * 应用清单（数据驱动）
 * 新增 app 时只需在此加一项，主页自动出现新卡片
 */
export interface AppEntry {
  id: string
  title: string
  emoji: string
  tagline: string
  description: string
  tags: string[]
  status: 'live' | 'beta' | 'coming-soon'
  path: string
  accent: string
}

export const apps: AppEntry[] = [
  {
    id: 'funphy',
    title: '飞飞历险记',
    emoji: '✈️',
    tagline: 'Funphy Adventure',
    description: '操控飞飞在物理空间里穿行，体验速度、惯性与阻力的平衡。简单到 5 秒上手。',
    tags: ['物理', '游戏', 'BETA'],
    status: 'beta',
    path: '/funphy/',
    accent: '#9333ea',
  },
  {
    id: 'grimphy',
    title: '物理实验室',
    emoji: '🔬',
    tagline: 'Grimphy Lab',
    description: '物理实验趣味动画演示。每个卡片是一个独立的小实验，看现象、学原理。',
    tags: ['物理', 'Lab', '动画'],
    status: 'beta',
    path: '/grimphy/',
    accent: '#06b6d4',
  },
  {
    id: 'funmath',
    title: '曼曼闯天涯',
    emoji: '🧮',
    tagline: 'FunMath Adventure',
    description: '曼曼在数学王国里闯关，每答对一题前进一格。从四则运算开始，越玩越上瘾。',
    tags: ['数学', '闯关', 'BETA'],
    status: 'beta',
    path: '/funmath/',
    accent: '#10b981',
  },
  {
    id: 'ezchess',
    title: '一起来下棋',
    emoji: '♟️',
    tagline: 'EZChess',
    description: '经典棋类在线对战：五子棋/黑白棋/中国跳棋/中国象棋，实时对战、服务端权威判棋。',
    tags: ['棋类', '对战', 'BETA'],
    status: 'beta',
    path: '/ezchess/',
    accent: '#6366f1',
  },
]
