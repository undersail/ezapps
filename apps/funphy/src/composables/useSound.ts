import { reactive, onMounted } from 'vue'

const STORAGE_KEY = 'funphy_sound_enabled'

const state = reactive({
  enabled: true,
})

export function useSound() {
  onMounted(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved !== null) state.enabled = saved === 'true'
  })
  
  function toggle() {
    state.enabled = !state.enabled
    localStorage.setItem(STORAGE_KEY, String(state.enabled))
  }
  
  return { soundEnabled: state, toggleSound: toggle }
}
