// 每日挑战：固定种子生成关卡（全服同布局）
import type { RunnerLevelDef, RunnerSpawnDef } from '../engine/runnerTypes'

// mulberry32：确定性伪随机（同种子 → 同序列）
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

/** 用种子生成每日挑战关卡（1200 里程，T5 强度，全服一致） */
export function generateDailyLevel(seed: number): RunnerLevelDef {
  const rnd = mulberry32(seed)
  const spawns: RunnerSpawnDef[] = []
  const styles = ['rock', 'metal', 'orb'] as const

  // 每 42~58 里程一个 spawn（固定随机序列）
  let at = 60
  while (at < 1150) {
    const roll = rnd()
    if (roll < 0.45) {
      // 障碍
      const w = rnd() < 0.3 ? 12 + Math.floor(rnd() * 4) : 8 + Math.floor(rnd() * 3)
      spawns.push({
        at,
        x: 25 + Math.floor(rnd() * 90),
        obstacle: {
          kind: rnd() < 0.35 ? 'dive' : 'falling',
          style: styles[Math.floor(rnd() * 3)],
          width: w,
          height: w,
          fallSpeed: 0.7 + rnd() * 0.7,
          sway: rnd() < 0.4 ? 6 + rnd() * 8 : undefined,
          swaySpeed: rnd() < 0.4 ? 3 + rnd() * 2 : undefined,
        },
      })
    } else if (roll < 0.7) {
      // 宝石（10% 大块）
      spawns.push({ at, x: 25 + Math.floor(rnd() * 90), gem: true, size: rnd() < 0.1 ? 'l' : undefined })
    } else {
      // 能量块
      spawns.push({ at, x: 25 + Math.floor(rnd() * 90), energy: true })
    }
    at += 42 + Math.floor(rnd() * 17)
  }

  return {
    id: 'daily',
    chapter: 6,
    name: '每日挑战',
    introCard: '📅 今日挑战：全服同一片星空，同样的障碍！\n跑得越远排名越高，来试试今天的运气和实力！',
    length: 1200,
    baseFlow: 0.38,
    flowRange: 0.9,
    physics: { gravity: 0, drag: 0, bounce: 0.3, thrust: 0.19, maxSpeed: 1.8, boundsBehavior: 'bounce' },
    moveSpeed: 1.0,
    energyDrain: 2.5,
    bgGradient: ['#0a0518', '#1a0a30'],
    difficulty: 'T5',
    solarZones: [
      { id: 'sun1', x: 40, y: 400, width: 26, height: 40 },
      { id: 'sun2', x: 95, y: 800, width: 24, height: 38 },
    ],
    spawns,
    goal: { gems: 999 },
  }
}
