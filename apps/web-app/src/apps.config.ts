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
  /** live / beta / coming-soon */
  status: 'live' | 'beta' | 'coming-soon'
  /** 相对根路径的入口 */
  path: string
  /** 卡片主色（CSS color） */
  accent: string
}

export const apps: AppEntry[] = [
  {
    id: 'funphy',
    title: '物理实验室',
    emoji: '⚛️',
    tagline: 'Fun Physics Lab',
    description:
      '用互动小游戏理解物理概念。每款小游戏对应一个核心知识点——重力、光学、电磁、波动……在玩耍中把抽象变可玩。',
    tags: ['物理', '教育', '游戏化', 'BETA'],
    status: 'beta',
    path: '/funphy/',
    accent: '#9333ea',
  },
]
