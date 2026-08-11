// 九九乘法表 Boss 题库（1-4）
// 81 句完整口诀：1×1 到 9×9
// 自动生成，每道题 4 个选项（1 正确 + 3 干扰）

import type { Question } from '../types'

function genBossQuestion(a: number, b: number): Question {
  const answer = a * b
  // 生成 3 个干扰项（相近数 + 远离数混合）
  const distractors = new Set<number>()
  // 相邻整数
  ;[answer - 1, answer + 1, answer - 2, answer + 2, answer - 3, answer + 3].forEach((n) => {
    if (n > 0 && n !== answer && n !== a && n !== b) distractors.add(n)
  })
  // 其它乘法结果干扰
  const otherProducts = new Set<number>()
  for (let i = 1; i <= 9; i++) {
    for (let j = 1; j <= 9; j++) {
      const p = i * j
      if (p !== answer && Math.abs(p - answer) <= 5) otherProducts.add(p)
    }
  }
  ;[...otherProducts].forEach((p) => distractors.add(p))

  const distractorArr = [...distractors].slice(0, 3)
  const options = [answer, ...distractorArr].sort(() => Math.random() - 0.5)
  return {
    id: `boss-1-4-${a}x${b}`,
    chapter: 1,
    level: 4,
    difficulty: 3,
    type: 'boss',
    prompt: `${a} × ${b} = ?`,
    options,
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