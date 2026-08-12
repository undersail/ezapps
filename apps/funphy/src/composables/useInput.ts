import { reactive, onMounted, onUnmounted } from 'vue'

export interface InputState {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  pause: boolean
  pausePressed: boolean
  // 摇杆方向（归一化向量 + magnitude）
  joystickX: number  // -1 ~ 1
  joystickY: number  // -1 ~ 1
  joystickActive: boolean
  dashPressed: boolean  // 冲刺按键（Shift/空格，一次性事件）
  retryPressed: boolean // 快速重试（R 键，一次性事件）
}

export function useInput() {
  const input = reactive<InputState>({
    up: false,
    down: false,
    left: false,
    right: false,
    pause: false,
    pausePressed: false,
    joystickX: 0,
    joystickY: 0,
    joystickActive: false,
    dashPressed: false,
    retryPressed: false,
  })
  
  let keys = new Set<string>()
  
  function onKeyDown(e: KeyboardEvent) {
    const key = e.key.toLowerCase()
    keys.add(key)
    updateFromKeys()
    // 一次性事件
    if (key === 'shift' || key === ' ') input.dashPressed = true
    if (key === 'r') input.retryPressed = true
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'escape', ' ', 'shift'].includes(key)) {
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
  
  // 摇杆回调
  function setJoystick(x: number, y: number, active: boolean) {
    input.joystickX = x
    input.joystickY = y
    input.joystickActive = active
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
  
  return { input, setDirection, setJoystick, setPause }
}
