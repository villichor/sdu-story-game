/** 用户个人设置 Hook（localStorage 持久化 + 跨页/跨 Modal 实时同步）
 *  - 成就页 / 设置页 / 剧情页 都共用这份状态，改一次立刻全页生效
 *  - 数据不依赖后端（后端 UserInfo 里目前没有 settings 字段）——纯 localStorage，用户级但本地
 */
import { useCallback, useSyncExternalStore } from 'react'

export type UserSettings = {
  // 音量（三路独立，0~100）
  masterVolume: number
  bgmVolume: number
  seVolume: number
  // 文本 / 自动播放
  textSpeedMs: number    // 逐字速度(ms/字)：15最快 ~ 200慢
  autoEnabled: boolean   // 是否开启自动播放
  autoWaitMs: number     // 自动播放停顿(ms)：500 ~ 6000
  // 画面 / 演出
  effectsEnabled: boolean   // 蒙太奇/震动/特效开关
  shakeEnabled: boolean     // 屏幕震动
  // UX
  hideUnlockedSpoilers: boolean // 未解锁成就/收集物隐藏名和描述（防剧透，默认true）
}

export const DEFAULT_SETTINGS: UserSettings = {
  masterVolume: 75,
  bgmVolume: 65,
  seVolume: 80,
  textSpeedMs: 55,
  autoEnabled: false,
  autoWaitMs: 2200,
  effectsEnabled: true,
  shakeEnabled: true,
  hideUnlockedSpoilers: true,
}

const KEY = 'sdu_story_user_settings_v1'
type Listener = () => void
const listeners = new Set<Listener>()

function readSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

// 单例内存缓存（保证同一事件循环里读写一致 + 触发外部音频模块）
let snapshot: UserSettings = readSettings()

function subscribe(fn: Listener) {
  listeners.add(fn)
  // 跨 tab 同步
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = readSettings()
      listeners.forEach((l) => l())
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(fn)
    window.removeEventListener('storage', onStorage)
  }
}
function getSnapshot() {
  return snapshot
}

/** 广播给所有订阅者（SettingsModal滑一下滑杆，StoryPlayer TypedText立刻重新渲染速度） */
export function setSettings(patch: Partial<UserSettings> | ((cur: UserSettings) => UserSettings)) {
  snapshot = typeof patch === 'function'
    ? patch(snapshot)
    : { ...snapshot, ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(snapshot)) } catch { /* ignore */ }
  listeners.forEach((l) => l())
}

export function resetSettings() {
  snapshot = { ...DEFAULT_SETTINGS }
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
  listeners.forEach((l) => l())
}

export function useSettings(): [UserSettings, (p: Partial<UserSettings>) => void] {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const update = useCallback((patch: Partial<UserSettings>) => setSettings(patch), [])
  return [s, update]
}
