import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'ezapps:pinned'
const MAX = 5

interface State {
  /** 已置顶的 app id，按置顶时间正序（旧 -> 新） */
  ids: string[]
  /** id -> 置顶时间戳（毫秒） */
  at: Record<string, number>
}

function load(): State {
  if (typeof window === 'undefined') return { ids: [], at: {} }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as State
      // 防御性清洗：丢弃无效数据
      if (Array.isArray(parsed.ids) && typeof parsed.at === 'object') {
        return {
          ids: parsed.ids.filter((id) => typeof id === 'string'),
          at: parsed.at,
        }
      }
    }
  } catch {
    /* ignore */
  }
  return { ids: [], at: {} }
}

// 模块级单例：所有 usePinnedApps() 共享同一份状态
const state = ref<State>(load())

// 持久化写入（深度监听：State 内部 ids/at 都会触发）
if (typeof window !== 'undefined') {
  watch(
    state,
    (s) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
      } catch {
        /* localStorage 可能满或被禁用，忽略 */
      }
    },
    { deep: true },
  )
}

/** 已置顶 id 列表，按置顶时间倒序（最新置顶的排最前） */
const sortedIds = computed(() =>
  [...state.value.ids].sort((a, b) => (state.value.at[b] ?? 0) - (state.value.at[a] ?? 0)),
)

/** 已置顶 id 的 Set，O(1) 查询 */
const pinnedSet = computed(() => new Set(sortedIds.value))

/**
 * 切换置顶状态。
 * - 取消置顶：直接移除
 * - 新置顶：若数量超过 MAX（5），自动弹出最早置顶的那一个（覆盖最旧的）
 */
function togglePin(id: string): void {
  const cur = state.value.ids
  const at = { ...state.value.at }

  if (cur.includes(id)) {
    // 取消置顶
    delete at[id]
    state.value = { ids: cur.filter((x) => x !== id), at }
    return
  }

  let ids = [...cur, id]
  at[id] = Date.now()

  if (ids.length > MAX) {
    // 在【已置顶 + 即将被加入的新 id】里找最早置顶的
    const candidates = Object.keys(at)
    let oldestId = id
    let oldestTime = at[id]
    for (const k of candidates) {
      const t = at[k]
      if (t < oldestTime) {
        oldestTime = t
        oldestId = k
      }
    }
    if (oldestId !== id) {
      ids = ids.filter((x) => x !== oldestId)
      delete at[oldestId]
    }
  }

  state.value = { ids, at }
}

/** 清空所有置顶（暂未用，但保留接口） */
function clearPinned(): void {
  state.value = { ids: [], at: {} }
}

export function usePinnedApps() {
  return {
    /** 已置顶 id 列表（按时间倒序） */
    sortedIds,
    /** 已置顶 id 的 Set，用于 O(1) 查询 */
    pinnedSet,
    /** 是否已置顶 */
    isPinned: (id: string) => pinnedSet.value.has(id),
    /** 切换置顶 */
    togglePin,
    /** 清空 */
    clearPinned,
    /** 上限 */
    MAX,
  }
}

export type { State }
