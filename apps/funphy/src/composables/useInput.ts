import { reactive, onMounted, onUnmounted } from 'vue'

export interface InputState {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  pause: boolean
  pausePressed: boolean
}

export function useInput() {
  const input = reactive<InputState>({
    up: false,
    down: false,
    left: false,
    right: false,
    pause: false,
    pausePressed: false,
  })
  
  let keys = new Set<string>()
  
  function onKeyDown(e: KeyboardEvent) {
    const key = e.key.toLowerCase()
    keys.add(key)
    updateFromKeys()
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'escape', ' '].includes(key)) {
      e.preventDefault()
    }
  }
  
  function onKeyUp(e: KeyboardEvent) {
    const key = e.key.toLowerCase()
    keys.delete(key)
    updateFromKeys()
  }
  
  function updateFromKeys() {
    input.up = keys.has('w') || keys.has('arrowup')
    input.down = keys.has('s') || keys.has('arrowdown')
    input.left = keys.has('a') || keys.has('arrowleft')
    input.right = keys.has('d') || keys.has('arrowright')
    input.pause = keys.has('escape') || keys.has('p')
  }
  
  // 触屏 D-Pad 回调
  function setDirection(dir: 'up' | 'down' | 'left' | 'right', active: boolean) {
    input[dir] = active
  }
  
  function setPause() {
    input.pausePressed = true
    setTimeout(() => { input.pausePressed = false }, 100)
  }
  
  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
  })
  
  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
  })
  
  return { input, setDirection, setPause }
}
