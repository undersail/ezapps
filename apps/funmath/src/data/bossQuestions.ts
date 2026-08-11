// 九九乘法表 Boss 题库（1-4）
// 81 句完整口诀：1×1 到 9×9
// 特性 9 改造：移除 options 字段（运行时由 utils/options.ts 生成）

import type { Question } from '../types'

function genBossQuestion(a: number, b: number): Question {
  const answer = a * b
  return {
    id: `boss-1-4-${a}x${b}`,
    chapter: 1,
    level: 4,
    difficulty: 3,
    type: 'boss',
    prompt: `${a} × ${b} = ?`,
    answer,
    knowledge: ['九九乘法表'],
    hint: `${a} × ${b} = ${answer}`,
  }
}

const bossQuestions: Question[] = []
for (let a = 1; a <= 9; a++) {
  for (let b = 1; b <= 9; b++) {
    bossQuestions.push(genBossQuestion(a, b))
  }
}

export { bossQuestions }