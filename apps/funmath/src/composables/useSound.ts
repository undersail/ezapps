// 音效开关管理（localStorage 持久化）
// 模块级单例：所有 useSound() 共享同一份状态

import { ref, watch } from 'vue'
import { playSound as play, setSoundEnabled as apply, getSoundEnabled } from '../utils/sound'
import type { SoundType } from '../utils/sound'

const STORAGE_KEY = 'funmath:soundEnabled'

// 模块级 ref
const enabled = ref(true)

// 初始化（从 localStorage 读取）
if (typeof window !== 'undefined') {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      enabled.value = stored === 'true'
    }
  } catch {
    /* ignore */
  }
  apply(enabled.value)
}

// 持久化
watch(enabled, (v) => {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(v))
    } catch {
      /* ignore */
    }
  }
  apply(v)
})

export function useSound() {
  return {
    enabled,
    toggle() {
      enabled.value = !enabled.value
      // 开启时播放一次 click 让用户听到反馈
      if (enabled.value) play('click')
    },
    play,
  }
}

/** 用于在非组件上下文（如 composable）中读取当前状态 */
export function soundEnabledNow(): boolean {
  return getSoundEnabled()
}

/** 导出类型 */
export type { SoundType }