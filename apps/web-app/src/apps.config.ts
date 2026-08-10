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
    emoji: '🚀',
    tagline: 'Flyphy Adventure',
    description: '操控飞飞在物理空间里穿行，体验速度、惯性与阻力的平衡。简单到 5 秒上手。',
    tags: ['物理', '游戏', 'BETA'],
    status: 'beta',
    path: '/funphy/',
    accent: '#9333ea',
  },
  {
    id: 'grimphy',
    title: '物理画廊',
    emoji: '🖼️',
    tagline: 'Grimphy · Card Gallery',
    description: '物理小游戏的卡片网格 Demo，每个卡片是一个独立的可玩模块。',
    tags: ['物理', 'Demo', '卡片'],
    status: 'beta',
    path: '/grimphy/',
    accent: '#06b6d4',
  },
]
