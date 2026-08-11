// 选项生成器：根据答案 + 知识点类型生成 4 个合理选项
// 调用时一次性洗牌，玩家一关内顺序固定（避免背题）

import type { Question } from '../types'

/**
 * 生成 4 个选项（1 正确 + 3 干扰）
 * @param answer 正确答案
 * @param knowledge 知识点标签（用于决定干扰策略）
 * @returns 4 个选项，已随机洗牌
 */
export function generateOptions(
  answer: number,
  knowledge: string[] = [],
): number[] {
  const set = new Set<number>([answer])

  // 根据知识点类型选择干扰策略
  const isMulDiv = knowledge.some((k) => k.includes('乘法') || k.includes('除法'))

  if (isMulDiv) {
    // 乘除法：用邻近乘积做干扰（容易算错）
    for (let a = 1; a <= 9; a++) {
      for (let b = 1; b <= 9; b++) {
        const p = a * b
        if (p !== answer && Math.abs(p - answer) <= 5) set.add(p)
      }
    }
  } else {
    // 加减法：答案 ± 1 ~ ± 5 的相邻整数 + 大偏移干扰
    const offsets = [-3, -2, -1, 1, 2, 3, -5, 5, -4, 4]
    for (const d of offsets) {
      const v = answer + d
      if (v >= 0 && !set.has(v)) {
        set.add(v)
        if (set.size >= 4) break
      }
    }
  }

  // 兜底：万一干扰项不够，用大偏移补足
  let pad = 1
  while (set.size < 4) {
    if (!set.has(answer + pad * 7 + 10)) set.add(answer + pad * 7 + 10)
    if (set.size < 4 && !set.has(answer - pad * 7 - 1)) set.add(answer - pad * 7 - 1)
    pad++
    if (pad > 100) break
  }

  // 一次性洗牌
  return shuffle([...set])
}

/** Fisher-Yates 洗牌 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * 给题目列表补齐 options 字段
 * 一次性洗牌：保证关卡内顺序确定，但分散答案位置
 */
export function withOptions(questions: Question[]): (Question & { options: number[] })[] {
  return questions.map((q) => ({
    ...q,
    options: generateOptions(Number(q.answer), q.knowledge),
  }))
}