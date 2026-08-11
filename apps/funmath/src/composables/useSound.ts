// 音效开关管理（localStorage 持久化）
// 模块级单例：所有 useSound() 共享同一份状态
// 关键：返回 reactive 包装的对象，让模板中 sound.enabled 自动 unwrap 成 boolean

import { ref, reactive, watch } from 'vue'
import { playSound as play, setSoundEnabled as apply } from '../utils/sound'
import type { SoundType } from '../utils/sound'

const STORAGE_KEY = 'funmath:soundEnabled'

// 模块级 ref
const _enabled = ref(true)

// 初始化（从 localStorage 读取）
if (typeof window !== 'undefined') {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      _enabled.value = stored === 'true'
    }
  } catch {
    /* ignore */
  }
  apply(_enabled.value)
}

// 持久化
watch(_enabled, (v) => {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(v))
    } catch {
      /* ignore */
    }
  }
  apply(v)
})

// 关键：用 reactive 包一层，让模板中 sound.enabled 自动 unwrap
const sound = reactive({
  enabled: _enabled,
  toggle() {
    _enabled.value = !_enabled.value
    // 开启时播放一次 click 让用户听到反馈
    if (_enabled.value) play('click')
  },
  play,
})

export function useSound() {
  return sound
}

/** 导出类型 */
export type { SoundType }