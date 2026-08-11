// 章节配置（V1：只实现第一章详细内容，2-6 章先占位）
// 后续可在特性 N 中逐步填充

import type { Chapter } from '../types'

export const chapters: Chapter[] = [
  // ==================== 第一章：数与运算（基础） ====================
  {
    id: 1,
    title: '数与运算',
    subtitle: '基础篇',
    emoji: '🏰',
    unlock: 'free',
    levels: [
      {
        id: '1-1',
        chapter: 1,
        order: 1,
        title: '加减森林',
        emoji: '🍄',
        knowledge: '10 以内加减法',
        difficulty: 1,
        questionIds: [], // 特性 2 填充
        passScore: 6,
        story: '曼曼进入森林，吐数字的小蘑菇挡在路上。',
      },
      {
        id: '1-2',
        chapter: 1,
        order: 2,
        title: '进位桥',
        emoji: '🌉',
        knowledge: '20 以内进位加 / 退位减',
        difficulty: 2,
        questionIds: [],
        passScore: 8,
        story: '森林深处有一座桥，要凑十才能过。',
      },
      {
        id: '1-3',
        chapter: 1,
        order: 3,
        title: '百数草原',
        emoji: '🌾',
        knowledge: '100 以内加减法',
        difficulty: 2,
        questionIds: [],
        passScore: 8,
        story: '小精灵们在草原上算数。',
      },
      {
        id: '1-5',
        chapter: 1,
        order: 4,
        title: '除法山谷',
        emoji: '⛰️',
        knowledge: '表内乘除法（含逆运算）',
        difficulty: 2,
        questionIds: [],
        passScore: 8,
        story: '山谷回响着乘除互逆的口诀。',
      },
    ],
    boss: {
      id: '1-4-boss',
      chapter: 1,
      order: 5,
      title: '九九乘法魔王',
      emoji: '👑',
      pool: [], // 特性 6 填充 81 句
      required: 20,
      maxRetries: 3,
      story: '九九真言之主，要掌握所有口诀才能击败。',
    },
  },

  // ==================== 占位章节 ====================
  {
    id: 2,
    title: '数与运算',
    subtitle: '进阶篇',
    emoji: '🏯',
    unlock: { boss: '1-4-boss' },
    levels: [],
  },
  {
    id: 3,
    title: '代数思维',
    subtitle: '找规律 · 简单方程',
    emoji: '🧮',
    unlock: { boss: '2-?-boss' },
    levels: [],
  },
  {
    id: 4,
    title: '几何图形',
    subtitle: '周长 · 面积 · 体积',
    emoji: '📐',
    unlock: { boss: '3-?-boss' },
    levels: [],
  },
  {
    id: 5,
    title: '应用题',
    subtitle: '鸡兔同笼 · 植树 · 和差倍',
    emoji: '🌳',
    unlock: { boss: '4-?-boss' },
    levels: [],
  },
  {
    id: 6,
    title: '奥数思维',
    subtitle: '数论 · 计数 · 推理',
    emoji: '🏆',
    unlock: { boss: '5-?-boss' },
    levels: [],
  },
]