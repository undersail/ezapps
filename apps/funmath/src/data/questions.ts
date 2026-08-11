// 第一章题库（共 38 道，覆盖 1-1 / 1-2 / 1-3 / 1-5 四关）
// 特性 9 改造：移除 options 字段（运行时由 utils/options.ts 生成）
//
// 设计规范：
// - 每题只保留正确答案 + 知识点 + 可选 hint
// - 选项在加载关卡时由 generateOptions() 生成，保证答案位置随机

import type { Question } from '../types'

export const questions: Question[] = [
  // ==================== 1-1 加减森林（10 以内）8 题 ====================
  { id: 'q-1-1-01', chapter: 1, level: 1, difficulty: 1, type: 'single',
    prompt: '3 + 5 = ?', answer: 8,
    knowledge: ['10以内加法'], hint: '伸手指头数一下' },
  { id: 'q-1-1-02', chapter: 1, level: 1, difficulty: 1, type: 'single',
    prompt: '9 − 4 = ?', answer: 5,
    knowledge: ['10以内减法'] },
  { id: 'q-1-1-03', chapter: 1, level: 1, difficulty: 1, type: 'single',
    prompt: '2 + 7 = ?', answer: 9,
    knowledge: ['10以内加法'] },
  { id: 'q-1-1-04', chapter: 1, level: 1, difficulty: 1, type: 'single',
    prompt: '7 − 3 = ?', answer: 4,
    knowledge: ['10以内减法'] },
  { id: 'q-1-1-05', chapter: 1, level: 1, difficulty: 1, type: 'single',
    prompt: '4 + 6 = ?', answer: 10,
    knowledge: ['凑十法'], hint: '看到 4+6 想想凑十' },
  { id: 'q-1-1-06', chapter: 1, level: 1, difficulty: 1, type: 'single',
    prompt: '10 − 5 = ?', answer: 5,
    knowledge: ['10以内减法'] },
  { id: 'q-1-1-07', chapter: 1, level: 1, difficulty: 1, type: 'single',
    prompt: '5 + 5 = ?', answer: 10,
    knowledge: ['凑十法'] },
  { id: 'q-1-1-08', chapter: 1, level: 1, difficulty: 1, type: 'single',
    prompt: '8 − 2 = ?', answer: 6,
    knowledge: ['10以内减法'] },

  // ==================== 1-2 进位桥（20 以内进位/退位）10 题 ====================
  { id: 'q-1-2-01', chapter: 1, level: 2, difficulty: 2, type: 'single',
    prompt: '8 + 5 = ?', answer: 13,
    knowledge: ['20以内进位加法'], hint: '凑十法：8 + 2 = 10，再加 5' },
  { id: 'q-1-2-02', chapter: 1, level: 2, difficulty: 2, type: 'single',
    prompt: '9 + 6 = ?', answer: 15,
    knowledge: ['20以内进位加法'] },
  { id: 'q-1-2-03', chapter: 1, level: 2, difficulty: 2, type: 'single',
    prompt: '7 + 8 = ?', answer: 15,
    knowledge: ['20以内进位加法'] },
  { id: 'q-1-2-04', chapter: 1, level: 2, difficulty: 2, type: 'single',
    prompt: '15 − 7 = ?', answer: 8,
    knowledge: ['20以内退位减法'], hint: '15 − 5 = 10，再减 2' },
  { id: 'q-1-2-05', chapter: 1, level: 2, difficulty: 2, type: 'single',
    prompt: '14 − 8 = ?', answer: 6,
    knowledge: ['20以内退位减法'] },
  { id: 'q-1-2-06', chapter: 1, level: 2, difficulty: 2, type: 'single',
    prompt: '13 − 9 = ?', answer: 4,
    knowledge: ['20以内退位减法'] },
  { id: 'q-1-2-07', chapter: 1, level: 2, difficulty: 2, type: 'single',
    prompt: '6 + 7 = ?', answer: 13,
    knowledge: ['20以内进位加法'] },
  { id: 'q-1-2-08', chapter: 1, level: 2, difficulty: 2, type: 'single',
    prompt: '11 − 5 = ?', answer: 6,
    knowledge: ['20以内不退位减法'] },
  { id: 'q-1-2-09', chapter: 1, level: 2, difficulty: 2, type: 'single',
    prompt: '9 + 9 = ?', answer: 18,
    knowledge: ['20以内进位加法'] },
  { id: 'q-1-2-10', chapter: 1, level: 2, difficulty: 2, type: 'single',
    prompt: '16 − 9 = ?', answer: 7,
    knowledge: ['20以内退位减法'] },

  // ==================== 1-3 百数草原（100 以内）10 题 ====================
  { id: 'q-1-3-01', chapter: 1, level: 3, difficulty: 2, type: 'single',
    prompt: '23 + 14 = ?', answer: 37,
    knowledge: ['100以内加法'] },
  { id: 'q-1-3-02', chapter: 1, level: 3, difficulty: 2, type: 'single',
    prompt: '56 − 23 = ?', answer: 33,
    knowledge: ['100以内减法'] },
  { id: 'q-1-3-03', chapter: 1, level: 3, difficulty: 2, type: 'single',
    prompt: '45 + 27 = ?', answer: 72,
    knowledge: ['100以内进位加法'] },
  { id: 'q-1-3-04', chapter: 1, level: 3, difficulty: 2, type: 'single',
    prompt: '81 − 35 = ?', answer: 46,
    knowledge: ['100以内退位减法'] },
  { id: 'q-1-3-05', chapter: 1, level: 3, difficulty: 2, type: 'single',
    prompt: '38 + 24 = ?', answer: 62,
    knowledge: ['100以内进位加法'] },
  { id: 'q-1-3-06', chapter: 1, level: 3, difficulty: 2, type: 'single',
    prompt: '75 − 28 = ?', answer: 47,
    knowledge: ['100以内退位减法'] },
  { id: 'q-1-3-07', chapter: 1, level: 3, difficulty: 2, type: 'single',
    prompt: '64 + 19 = ?', answer: 83,
    knowledge: ['100以内进位加法'] },
  { id: 'q-1-3-08', chapter: 1, level: 3, difficulty: 2, type: 'single',
    prompt: '92 − 47 = ?', answer: 45,
    knowledge: ['100以内退位减法'] },
  { id: 'q-1-3-09', chapter: 1, level: 3, difficulty: 2, type: 'single',
    prompt: '17 + 36 = ?', answer: 53,
    knowledge: ['100以内进位加法'] },
  { id: 'q-1-3-10', chapter: 1, level: 3, difficulty: 2, type: 'single',
    prompt: '60 − 25 = ?', answer: 35,
    knowledge: ['100以内不退位减法'] },

  // ==================== 1-5 除法山谷（表内乘除法）10 题 ====================
  { id: 'q-1-5-01', chapter: 1, level: 5, difficulty: 2, type: 'single',
    prompt: '6 × 7 = ?', answer: 42,
    knowledge: ['表内乘法'], hint: '六七四十二' },
  { id: 'q-1-5-02', chapter: 1, level: 5, difficulty: 2, type: 'single',
    prompt: '56 ÷ 8 = ?', answer: 7,
    knowledge: ['表内除法'] },
  { id: 'q-1-5-03', chapter: 1, level: 5, difficulty: 2, type: 'single',
    prompt: '9 × 4 = ?', answer: 36,
    knowledge: ['表内乘法'], hint: '九九乘法表' },
  { id: 'q-1-5-04', chapter: 1, level: 5, difficulty: 2, type: 'single',
    prompt: '72 ÷ 9 = ?', answer: 8,
    knowledge: ['表内除法'] },
  { id: 'q-1-5-05', chapter: 1, level: 5, difficulty: 2, type: 'single',
    prompt: '8 × 8 = ?', answer: 64,
    knowledge: ['表内乘法'] },
  { id: 'q-1-5-06', chapter: 1, level: 5, difficulty: 2, type: 'single',
    prompt: '45 ÷ 5 = ?', answer: 9,
    knowledge: ['表内除法'] },
  { id: 'q-1-5-07', chapter: 1, level: 5, difficulty: 2, type: 'single',
    prompt: '7 × 6 = ?', answer: 42,
    knowledge: ['表内乘法'] },
  { id: 'q-1-5-08', chapter: 1, level: 5, difficulty: 2, type: 'single',
    prompt: '36 ÷ 6 = ?', answer: 6,
    knowledge: ['表内除法'] },
  { id: 'q-1-5-09', chapter: 1, level: 5, difficulty: 2, type: 'single',
    prompt: '9 × 9 = ?', answer: 81,
    knowledge: ['表内乘法'] },
  { id: 'q-1-5-10', chapter: 1, level: 5, difficulty: 2, type: 'single',
    prompt: '54 ÷ 6 = ?', answer: 9,
    knowledge: ['表内除法'] },
]

/** 题库索引（按 id 快速查） */
export const questionMap: Record<string, Question> = questions.reduce(
  (acc, q) => {
    acc[q.id] = q
    return acc
  },
  {} as Record<string, Question>,
)

/** 通过题目 ID 列表获取完整题目 */
export function getQuestionsByIds(ids: string[]): Question[] {
  return ids.map((id) => questionMap[id]).filter(Boolean)
}