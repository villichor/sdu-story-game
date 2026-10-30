import { request } from './client'
import { mockApi } from './mock'
import type {
  Achievement,
  Chapter,
  CollectionItem,
  CurrentStoryVO,
  GameSaveVO,
  LoginResult,
  PositionResult,
  StorylineVO,
  UserInfo,
} from './types'
import { readLocalStorage, writeLocalStorage } from '../lib/useLocalStorage'
import { LS_KEYS } from '../lib/constants'

/** 是否使用本地 mock(无后端预览); 由 .env 的 VITE_USE_MOCK 控制 */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// 统一封装: mock 开则走 mock, 否则走真实接口
async function route<T>(real: () => Promise<T>, mock: () => Promise<T>): Promise<T> {
  return USE_MOCK ? mock() : real()
}

export const authApi = {
  guestLogin: () =>
    route<LoginResult>(
      () => request<LoginResult>({ method: 'post', url: '/api/auth/guest' }),
      () => mockApi.guestLogin(),
    ),
  me: () =>
    route<UserInfo>(
      () => request<UserInfo>({ method: 'get', url: '/api/user/me' }),
      () => mockApi.getMe(),
    ),
  /** 获取 SSO 登录地址(后端生成, 含正确转发/回调域名) —— 对齐 recruit 写法 */
  loginUrl: () =>
    route<Record<string, string>>(
      () => request<Record<string, string>>({ method: 'get', url: '/api/auth/login' }),
      async () => ({ loginUrl: 'https://i.sdu.edu.cn/pass-api/login/page' }),
    ),
}

export const chapterApi = {
  list: () =>
    route<Chapter[]>(
      () => request<Chapter[]>({ method: 'get', url: '/api/chapters' }),
      () => mockApi.getChapters(),
    ),
}

export const saveApi = {
  create: (saveName: string, chapterId: number) =>
    route<GameSaveVO>(
      () =>
        request<GameSaveVO>({
          method: 'post',
          url: '/api/saves',
          data: { saveName, chapterId },
        }),
      () => mockApi.createSave(saveName, chapterId),
    ),
  list: (chapterId?: number) =>
    route<GameSaveVO[]>(
      () =>
        request<GameSaveVO[]>({
          method: 'get',
          url: '/api/saves',
          params: { chapterId },
        }),
      () => mockApi.listSaves(),
    ),
  snapshot: (saveId: number, saveName: string) =>
    route<GameSaveVO>(
      () =>
        request<GameSaveVO>({
          method: 'post',
          url: `/api/saves/${saveId}/snapshot`,
          data: { saveName },
        }),
      () => mockApi.snapshotSave(saveId, saveName),
    ),
  remove: (saveId: number) =>
    route<null>(
      () => request<null>({ method: 'delete', url: `/api/saves/${saveId}` }),
      () => mockApi.deleteSave(saveId),
    ),
}

export const storyApi = {
  current: (saveId: number) =>
    route<CurrentStoryVO>(
      () => request<CurrentStoryVO>({ method: 'get', url: `/api/saves/${saveId}/current` }),
      () => mockApi.getCurrent(saveId),
    ),
  position: (saveId: number, expectedNodeId: number, expectedLineIndex: number, targetLineIndex: number) =>
    route<PositionResult>(
      () =>
        request<PositionResult>({
          method: 'patch',
          url: `/api/saves/${saveId}/position`,
          data: { expectedNodeId, expectedLineIndex, targetLineIndex },
        }),
      () => mockApi.patchPosition(saveId, expectedNodeId, expectedLineIndex, targetLineIndex),
    ),
  advance: (saveId: number, expectedNodeId: number, expectedLineIndex: number, choiceId: number | null) =>
    route<CurrentStoryVO>(
      () =>
        request<CurrentStoryVO>({
          method: 'post',
          url: `/api/saves/${saveId}/advance`,
          data: { expectedNodeId, expectedLineIndex, choiceId },
        }),
      () => mockApi.advance(saveId, expectedNodeId, expectedLineIndex, choiceId),
    ),
  storyline: (saveId: number) =>
    route<StorylineVO>(
      () => request<StorylineVO>({ method: 'get', url: `/api/saves/${saveId}/storyline` }),
      () => mockApi.getStoryline(saveId),
    ),
  rewind: (saveId: number, expectedCurrentPathId: number, targetPathId: number) =>
    route<CurrentStoryVO>(
      () =>
        request<CurrentStoryVO>({
          method: 'post',
          url: `/api/saves/${saveId}/rewind`,
          data: { expectedCurrentPathId, targetPathId },
        }),
      () => mockApi.rewind(saveId, targetPathId),
    ),
}

export const achievementApi = {
  list: (chapterId?: number) =>
    route<Achievement[]>(
      () =>
        request<Achievement[]>({
          method: 'get',
          url: '/api/achievements',
          params: { chapterId },
        }),
      () => mockApi.getAchievements(),
    ),
}

export const collectionApi = {
  add: (key: string) =>
    route<null>(
      () =>
        request<null>({
          method: 'post',
          url: '/api/collections',
          data: { key },
        }),
      async () => {
        // 后端无 collection 接口 → 前端 localStorage 兜底
        const saved = readLocalStorage<{ key: string; collected: boolean; collectedAt?: string }[]>(LS_KEYS.COLLECTIONS, [])
        if (!saved.find((c) => c.key === key)) {
          saved.push({ key, collected: true, collectedAt: new Date().toISOString() })
          writeLocalStorage(LS_KEYS.COLLECTIONS, saved)
        }
        return null
      },
    ),
  list: () =>
    route<CollectionItem[]>(
      () =>
        request<CollectionItem[]>({
          method: 'get',
          url: '/api/collections',
        }),
      async () => {
        // 后端无接口 → 用静态目录 + localStorage 补 collected 状态
        const list = await COLLECTIONS_LOCAL.list()
        return list
      },
    ),
}

/* ===== 收集物 localStorage 本地兜底 ===== */
import { COLLECTION_CATALOG } from '../resources/collections'

const COLLECTIONS_LOCAL = {
  async list(): Promise<CollectionItem[]> {
    const saved = readLocalStorage<{ key: string; collected: boolean; collectedAt?: string }[]>(LS_KEYS.COLLECTIONS, [])
    return COLLECTION_CATALOG.map((c) => {
      const s = saved.find((x) => x.key === c.key)
      return { ...c, collected: !!s?.collected, collectedAt: s?.collectedAt }
    })
  },
}

/** 成就解锁状态本地记录(给 position 接口弹成就 toast 用) */
export const achievementLocal = {
  /** 标记哪些成就ID已弹过 toast, 避免重复弹 */
  markToastShown(achvId: number) {
    const set = new Set<number>(readLocalStorage<number[]>(LS_KEYS.ACHV_SHOWN, []))
    set.add(achvId)
    writeLocalStorage(LS_KEYS.ACHV_SHOWN, [...set])
  },
  hasShown(achvId: number) {
    const set = new Set<number>(readLocalStorage<number[]>(LS_KEYS.ACHV_SHOWN, []))
    return set.has(achvId)
  },
}
