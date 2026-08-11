// 程序化音效合成（Web Audio API）
// 无音频文件依赖，所有音效用 OscillatorNode 实时合成
//
// 浏览器 autoplay policy：第一次调用必须在用户交互事件中触发

export type SoundType =
  | 'click'         // 按钮点击 / 选关
  | 'correct'       // 答对
  | 'wrong'         // 答错
  | 'hint'          // 讲解卡弹出
  | 'complete'      // 关卡通关
  | 'boss-defeat'   // Boss 通关
  | 'boss-fail'     // Boss 失败
  | 'unlock'        // 章节解锁

let audioCtx: AudioContext | null = null
let _enabled = true

/** 懒加载 AudioContext（首次用户交互时创建） */
function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AC = (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
    if (!AC) return null
    try {
      audioCtx = new AC()
    } catch {
      return null
    }
  }
  // 某些浏览器在首次交互前会 suspend，需要 resume
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/**
 * 播放单个音调
 */
function playTone(
  freq: number,
  duration: number,
  delay = 0,
  volume = 0.18,
  type: OscillatorType = 'sine',
) {
  const ctx = ensureCtx()
  if (!ctx) return
  const now = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  // ADSR 包络：快速 attack、自然 decay
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(volume, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + duration + 0.05)
}

/**
 * 播放序列音（多个音调按间隔依次播放）
 */
function playSequence(
  freqs: number[],
  noteGap = 0.1,
  duration = 0.2,
  type: OscillatorType = 'sine',
  volume = 0.18,
) {
  freqs.forEach((f, i) => playTone(f, duration, i * noteGap, volume, type))
}

// ==================== 8 种音效 ====================

/** click: 短促高频点击音 */
function playClick() {
  playTone(1320, 0.05, 0, 0.12, 'sine')
}

/** correct: 上行三和弦 C5-E5-G5（答对上扬） */
function playCorrect() {
  playSequence([523.25, 659.25, 783.99], 0.08, 0.18, 'sine', 0.15)
}

/** wrong: 双音下行（答错低沉） */
function playWrong() {
  playTone(220, 0.15, 0, 0.18, 'square')
  playTone(196, 0.25, 0.08, 0.14, 'square')
}

/** hint: 单音提示（讲解卡弹出） */
function playHint() {
  playTone(880, 0.12, 0, 0.1, 'triangle')
}

/** complete: 4 音上升音阶（关卡通关） */
function playComplete() {
  playSequence([523.25, 659.25, 783.99, 1046.50], 0.07, 0.22, 'sine', 0.16)
}

/** boss-defeat: 6 音凯旋音阶（Boss 通关） */
function playBossDefeat() {
  playSequence(
    [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98],
    0.09, 0.25, 'sine', 0.18,
  )
}

/** boss-fail: 4 音下行（低沉失败感） */
function playBossFail() {
  playSequence([392, 329.63, 293.66, 261.63], 0.13, 0.3, 'triangle', 0.16)
}

/** unlock: 3 音上行琶音（章节解锁） */
function playUnlock() {
  playSequence([523.25, 659.25, 783.99], 0.08, 0.2, 'sine', 0.15)
}

const soundMap: Record<SoundType, () => void> = {
  click: playClick,
  correct: playCorrect,
  wrong: playWrong,
  hint: playHint,
  complete: playComplete,
  'boss-defeat': playBossDefeat,
  'boss-fail': playBossFail,
  unlock: playUnlock,
}

/**
 * 播放指定音效
 * 如果音效被禁用或 AudioContext 不可用，静默返回
 */
export function playSound(type: SoundType): void {
  if (!_enabled) return
  const fn = soundMap[type]
  if (fn) fn()
}

/** 启用/禁用音效 */
export function setSoundEnabled(v: boolean): void {
  _enabled = v
}

/** 当前是否启用 */
export function getSoundEnabled(): boolean {
  return _enabled
}