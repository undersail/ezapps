// 曼曼闯天涯 · 核心类型定义

export type Difficulty = 1 | 2 | 3 | 4

export type QuestionType = 'single' | 'fill' | 'judge' | 'boss'

export type LevelStatus = 'locked' | 'unlocked' | 'passed'

/** 题目 */
export interface Question {
  id: string
  chapter: number
  level: number
  difficulty: Difficulty
  type: QuestionType
  prompt: string
  options?: (string | number)[]
  answer: string | number
  hint?: string
  knowledge: string[]
  story?: string
  /** 几何图形插图（仅第四章几何题使用） */
  figure?: FigureSpec
}

/**
 * 几何图形描述（结构化，由 utils/figures.ts 渲染为 SVG）
 */
export type FigureSpec =
  | { type: 'rect'; width: number; height: number }
  | { type: 'square'; side: number }
  | { type: 'triangle'; base: number; height: number; sides?: number[] }  // sides: 三边长度（用于显示周长题）
  | { type: 'parallelogram'; base: number; height: number }
  | { type: 'trapezoid'; upperBase: number; lowerBase: number; height: number }
  | { type: 'circle'; radius?: number; diameter?: number }
  | { type: 'cube'; length: number; width: number; height: number }
  | { type: 'squareCube'; side: number }

/** 普通关卡 */
export interface Level {
  id: string           // '1-1'
  chapter: number      // 1
  order: number        // 关卡序号（章内）1-based
  title: string
  emoji: string
  knowledge: string
  difficulty: Difficulty
  questionIds: string[] // 关联 Question.id
  passScore: number    // 过关最少答对数
  story?: string
}

/** Boss 关卡 */
export interface Boss {
  id: string           // '1-4-boss'
  chapter: number
  order: number
  title: string
  emoji: string
  pool: string[]       // 出题池 Question.id[]
  required: number     // 需答对题数
  maxRetries: number   // 单题最大重试（standard 模式）
  story?: string
  /** 限时模式（秒）：> 0 则启用倒计时，答错直接跳过 */
  timeLimit?: number
  /** Boss 模式：standard=标准（同题重出）/ time=限时（答错跳过） */
  mode?: 'standard' | 'time'
}

/** 章节 */
export interface Chapter {
  id: number
  title: string
  subtitle: string
  emoji: string
  levels: Level[]
  boss?: Boss
  unlock: 'free' | { boss: string }  // 章节解锁条件
}

/** 关卡进度状态（mock 用，后续接 localStorage） */
export interface MockProgress {
  [levelId: string]: {
    stars: 0 | 1 | 2 | 3
    passed: boolean
  }
}