// 第一章题库（共 38 道，覆盖 1-1 / 1-2 / 1-3 / 1-5 四关）
// 特性 2 范围：1-1 / 1-2 / 1-3 / 1-5 的题库数据
// Boss 1-4 的 81 句九九口诀在特性 6 单独处理
//
// 设计规范：
// - 每题 4 个选项，1 个正确 + 3 个干扰
// - 干扰项合理范围，不出现负数 / 过大值
// - 难度梯度清晰

import type { Question } from '../types'

export const questions: Question[] = [
  // ==================== 1-1 加减森林（10 以内）8 题 ====================
  { id: 'q-1-1-01', chapter: 1, level: 1, difficulty: 1, type: 'single',
    prompt: '3 + 5 = ?', options: [4, 6, 7, 8], answer: 8,
    knowledge: ['10以内加法'], hint: '伸手指头数一下' },
  { id: 'q-1-1-02', chapter: 1, level: 1, difficulty: 1, type: 'single',
    prompt: '9 − 4 = ?', options: [3, 4, 5, 6], answer: 5,
    knowledge: ['10以内减法'] },
  { id: 'q-1-1-03', chapter: 1, level: 1, difficulty: 1, type: 'single',
    prompt: '2 + 7 = ?', options: [8, 9, 10, 11], answer: 9,
    knowledge: ['10以内加法'] },
  { id: 'q-1-1-04', chapter: 1, level: 1, difficulty: 1, type: 'single',
    prompt: '7 − 3 = ?', options: [2, 3, 4, 5], answer: 4,
    knowledge: ['10以内减法'] },
  { id: 'q-1-1-05', chapter: 1, level: 1, difficulty: 1, type: 'single',
    prompt: '4 + 6 = ?', options: [8, 9, 10, 11], answer: 10,
    knowledge: ['凑十法'], hint: '看到 4+6 想想凑十' },
  { id: 'q-1-1-06', chapter: 1, level: 1, difficulty: 1, type: 'single',
    prompt: '10 − 5 = ?', options: [3, 4, 5, 6], answer: 5,
    knowledge: ['10以内减法'] },
  { id: 'q-1-1-07', chapter: 1, level: 1, difficulty: 1, type: 'single',
    prompt: '5 + 5 = ?', options: [8, 9, 10, 11], answer: 10,
    knowledge: ['凑十法'] },
  { id: 'q-1-1-08', chapter: 1, level: 1, difficulty: 1, type: 'single',
    prompt: '8 − 2 = ?', options: [4, 5, 6, 7], answer: 6,
    knowledge: ['10以内减法'] },

  // ==================== 1-2 进位桥（20 以内进位/退位）10 题 ====================
  { id: 'q-1-2-01', chapter: 1, level: 2, difficulty: 2, type: 'single',
    prompt: '8 + 5 = ?', options: [11, 12, 13, 14], answer: 13,
    knowledge: ['20以内进位加法'], hint: '凑十法：8 + 2 = 10，再加 5' },
  { id: 'q-1-2-02', chapter: 1, level: 2, difficulty: 2, type: 'single',
    prompt: '9 + 6 = ?', options: [13, 14, 15, 16], answer: 15,
    knowledge: ['20以内进位加法'] },
  { id: 'q-1-2-03', chapter: 1, level: 2, difficulty: 2, type: 'single',
    prompt: '7 + 8 = ?', options: [13, 14, 15, 16], answer: 15,
    knowledge: ['20以内进位加法'] },
  { id: 'q-1-2-04', chapter: 1, level: 2, difficulty: 2, type: 'single',
    prompt: '15 − 7 = ?', options: [6, 7, 8, 9], answer: 8,
    knowledge: ['20以内退位减法'], hint: '15 − 5 = 10，再减 2' },
  { id: 'q-1-2-05', chapter: 1, level: 2, difficulty: 2, type: 'single',
    prompt: '14 − 8 = ?', options: [4, 5, 6, 7], answer: 6,
    knowledge: ['20以内退位减法'] },
  { id: 'q-1-2-06', chapter: 1, level: 2, difficulty: 2, type: 'single',
    prompt: '13 − 9 = ?', options: [3, 4, 5, 6], answer: 4,
    knowledge: ['20以内退位减法'] },
  { id: 'q-1-2-07', chapter: 1, level: 2, difficulty: 2, type: 'single',
    prompt: '6 + 7 = ?', options: [11, 12, 13, 14], answer: 13,
    knowledge: ['20以内进位加法'] },
  { id: 'q-1-2-08', chapter: 1, level: 2, difficulty: 2, type: 'single',
    prompt: '11 − 5 = ?', options: [4, 5, 6, 7], answer: 6,
    knowledge: ['20以内不退位减法'] },
  { id: 'q-1-2-09', chapter: 1, level: 2, difficulty: 2, type: 'single',
    prompt: '9 + 9 = ?', options: [16, 17, 18, 19], answer: 18,
    knowledge: ['20以内进位加法'] },
  { id: 'q-1-2-10', chapter: 1, level: 2, difficulty: 2, type: 'single',
    prompt: '16 − 9 = ?', options: [5, 6, 7, 8], answer: 7,
    knowledge: ['20以内退位减法'] },

  // ==================== 1-3 百数草原（100 以内）10 题 ====================
  { id: 'q-1-3-01', chapter: 1, level: 3, difficulty: 2, type: 'single',
    prompt: '23 + 14 = ?', options: [35, 36, 37, 38], answer: 37,
    knowledge: ['100以内加法'] },
  { id: 'q-1-3-02', chapter: 1, level: 3, difficulty: 2, type: 'single',
    prompt: '56 − 23 = ?', options: [31, 32, 33, 34], answer: 33,
    knowledge: ['100以内减法'] },
  { id: 'q-1-3-03', chapter: 1, level: 3, difficulty: 2, type: 'single',
    prompt: '45 + 27 = ?', options: [70, 71, 72, 73], answer: 72,
    knowledge: ['100以内进位加法'] },
  { id: 'q-1-3-04', chapter: 1, level: 3, difficulty: 2, type: 'single',
    prompt: '81 − 35 = ?', options: [44, 45, 46, 47], answer: 46,
    knowledge: ['100以内退位减法'] },
  { id: 'q-1-3-05', chapter: 1, level: 3, difficulty: 2, type: 'single',
    prompt: '38 + 24 = ?', options: [60, 61, 62, 63], answer: 62,
    knowledge: ['100以内进位加法'] },
  { id: 'q-1-3-06', chapter: 1, level: 3, difficulty: 2, type: 'single',
    prompt: '75 − 28 = ?', options: [45, 46, 47, 48], answer: 47,
    knowledge: ['100以内退位减法'] },
  { id: 'q-1-3-07', chapter: 1, level: 3, difficulty: 2, type: 'single',
    prompt: '64 + 19 = ?', options: [81, 82, 83, 84], answer: 83,
    knowledge: ['100以内进位加法'] },
  { id: 'q-1-3-08', chapter: 1, level: 3, difficulty: 2, type: 'single',
    prompt: '92 − 47 = ?', options: [43, 44, 45, 46], answer: 45,
    knowledge: ['100以内退位减法'] },
  { id: 'q-1-3-09', chapter: 1, level: 3, difficulty: 2, type: 'single',
    prompt: '17 + 36 = ?', options: [51, 52, 53, 54], answer: 53,
    knowledge: ['100以内进位加法'] },
  { id: 'q-1-3-10', chapter: 1, level: 3, difficulty: 2, type: 'single',
    prompt: '60 − 25 = ?', options: [33, 34, 35, 36], answer: 35,
    knowledge: ['100以内不退位减法'] },

  // ==================== 1-5 除法山谷（表内乘除法）10 题 ====================
  { id: 'q-1-5-01', chapter: 1, level: 5, difficulty: 2, type: 'single',
    prompt: '6 × 7 = ?', options: [40, 42, 44, 48], answer: 42,
    knowledge: ['表内乘法'], hint: '六七四十二' },
  { id: 'q-1-5-02', chapter: 1, level: 5, difficulty: 2, type: 'single',
    prompt: '56 ÷ 8 = ?', options: [6, 7, 8, 9], answer: 7,
    knowledge: ['表内除法'] },
  { id: 'q-1-5-03', chapter: 1, level: 5, difficulty: 2, type: 'single',
    prompt: '9 × 4 = ?', options: [32, 34, 36, 38], answer: 36,
    knowledge: ['表内乘法'], hint: '九九乘法表' },
  { id: 'q-1-5-04', chapter: 1, level: 5, difficulty: 2, type: 'single',
    prompt: '72 ÷ 9 = ?', options: [6, 7, 8, 9], answer: 8,
    knowledge: ['表内除法'] },
  { id: 'q-1-5-05', chapter: 1, level: 5, difficulty: 2, type: 'single',
    prompt: '8 × 8 = ?', options: [56, 60, 64, 72], answer: 64,
    knowledge: ['表内乘法'] },
  { id: 'q-1-5-06', chapter: 1, level: 5, difficulty: 2, type: 'single',
    prompt: '45 ÷ 5 = ?', options: [7, 8, 9, 10], answer: 9,
    knowledge: ['表内除法'] },
  { id: 'q-1-5-07', chapter: 1, level: 5, difficulty: 2, type: 'single',
    prompt: '7 × 6 = ?', options: [40, 42, 44, 48], answer: 42,
    knowledge: ['表内乘法'] },
  { id: 'q-1-5-08', chapter: 1, level: 5, difficulty: 2, type: 'single',
    prompt: '36 ÷ 6 = ?', options: [5, 6, 7, 8], answer: 6,
    knowledge: ['表内除法'] },
  { id: 'q-1-5-09', chapter: 1, level: 5, difficulty: 2, type: 'single',
    prompt: '9 × 9 = ?', options: [72, 78, 81, 84], answer: 81,
    knowledge: ['表内乘法'] },
  { id: 'q-1-5-10', chapter: 1, level: 5, difficulty: 2, type: 'single',
    prompt: '54 ÷ 6 = ?', options: [7, 8, 9, 10], answer: 9,
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