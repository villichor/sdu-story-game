// 与后端接口文档 / 默认模块.openapi.json 对齐的类型定义
// 参考:资源文档/sdu-story-game-interface.md

/** 统一响应体 { code, data, msg, success } */
export interface ApiResult<T = unknown> {
  code: number
  data: T
  msg: string
  success?: boolean
}

/** 业务状态码(非 200 即业务异常, 前端需判断 code) */
export const ERROR_CODE = {
  SUCCESS: 200,
  PARAM_ERROR: 40000,
  LINE_INDEX_INVALID: 40001,
  CHOICE_REQUIRED: 40002,
  CHOICE_NOT_ALLOWED: 40003,
  REWIND_NOT_ALLOWED: 40004,
  UNAUTHORIZED: 40100,
  TOKEN_INVALID: 40101,
  TOKEN_EXPIRED: 40102,
  USER_NOT_FOUND: 40400,
  CHAPTER_NOT_FOUND: 40401,
  SAVE_NOT_FOUND: 40402,
  NODE_NOT_FOUND: 40403,
  CHOICE_NOT_FOUND: 40404,
  PATH_NOT_FOUND: 40405,
  STORY_STATE_CONFLICT: 40901,
  CHAPTER_FINISHED: 40902,
  SAVE_NAME_CONFLICT: 40903,
  SERVER_ERROR: 50000,
  STORY_CONFIG_ERROR: 50001,
} as const

export const AUTH_ERROR_CODES = new Set<number>([
  ERROR_CODE.UNAUTHORIZED,
  ERROR_CODE.TOKEN_INVALID,
  ERROR_CODE.TOKEN_EXPIRED,
])

// ---------------- 登录 / 用户 ----------------
export interface LoginResult {
  token: string
}

export interface UserInfo {
  id: number
  username: string
  isGuest: boolean
  studentId: string | null
  avatarUrl: string | null
  createdAt?: string
  updatedAt?: string
}

// ---------------- 章节 ----------------
export interface Chapter {
  id: number
  title: string
  theme: string
  character: string
  orderIndex: number
}

// ---------------- 存档 ----------------
export interface GameSaveVO {
  id: number
  saveName: string
  chapterId: number
  chapterTitle: string
  character: string
  currentNodeId: number
  currentNodeTitle: string
  currentLineIndex: number
  completionRate: number
  createdAt: string
  updatedAt: string
}

// ---------------- 剧情 ----------------
export type InteractionType = 'playing' | 'linear' | 'choice' | 'finished'
export type NodeType = 'normal' | 'route_end' | 'chapter_end'
export type LineType = 'dialogue' | 'narration' | 'effect'

/** 台词内联资源键: portraitRef / effectRef / backgroundRef / cgRef */
export interface StoryLine {
  id: number
  lineType: LineType
  speaker: string | null
  content: string
  portraitRef: string | null
  effectRef: string | null
  orderIndex: number
}

export interface ChoiceOption {
  id: number
  choiceCode: string
  choiceText: string
  orderIndex: number
}

export interface StoryNode {
  id: number
  nodeCode: string
  nodeType: NodeType
  title: string
  backgroundRef: string | null
  cgRef: string | null
  lines: StoryLine[]
  choices: ChoiceOption[]
}

export interface CurrentStoryVO {
  saveId: number
  chapterId: number
  currentLineIndex: number
  completionRate: number
  interactionType: InteractionType
  node: StoryNode
}

/** PATCH /position 返回 */
export interface PositionResult {
  saveId: number
  nodeId: number
  currentLineIndex: number
  interactionType: InteractionType
  choices?: ChoiceOption[]
  unlockedAchievements?: Achievement[]
}

// ---------------- 故事路径 / 回溯 ----------------
export interface StoryPathNode {
  pathId: number
  stepIndex: number
  nodeId: number
  nodeCode: string
  nodeType: NodeType
  title: string
  progressPercent: number
  choiceCode: string | null
  choiceText: string | null
  visitedAt: string
  current: boolean
}

export interface StorylineVO {
  saveId: number
  chapterId: number
  currentPathId: number
  currentNodeId: number
  nodes: StoryPathNode[]
}

// ---------------- 成就 ----------------
export type AchievementType = 'chapter' | 'route' | 'global'

export interface Achievement {
  id: number
  name: string
  description: string
  icon: string
  type: AchievementType
  chapterId?: number
  souvenir?: string
  unlocked: boolean
  unlockedAt?: string
}

/** 剧情中收集的"收集物"(collection:指令) */
export interface CollectionItem {
  key: string
  name: string
  description: string
  emoji: string
  collected: boolean
  collectedAt?: string
}

/** 剧情接口只返回资源键, 前端负责键 -> 素材 映射 + 缺失兜底 */
export type ResourceKind = 'background' | 'portrait' | 'cg' | 'effect'
