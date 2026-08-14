// 每日挑战：种子选题（全服同 10 题）
import { questions } from '../data/questions'
import type { Question } from '../types'

// mulberry32：确定性伪随机
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 按种子从题库抽 N 题（同种子 → 同题组，全服一致） */
export function pickDailyQuestions(seed: number, count = 10): Question[] {
  const rnd = mulberry32(seed)
  const pool = [...questions]
  const picked: Question[] = []
  while (picked.length < count && pool.length > 0) {
    const idx = Math.floor(rnd() * pool.length)
    picked.push(pool.splice(idx, 1)[0])
  }
  return picked
}
