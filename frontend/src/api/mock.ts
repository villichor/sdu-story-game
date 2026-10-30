import type {
  Achievement,
  Chapter,
  CollectionItem,
  CurrentStoryVO,
  GameSaveVO,
  InteractionType,
  PositionResult,
  StoryNode,
  StorylineVO,
  UserInfo,
} from './types'
import { COLLECTION_CATALOG } from '../resources/collections'

/**
 * 本地 mock(仅当 VITE_USE_MOCK=true 时启用)。
 * 按接口文档/openapi 的测试故事图实现一个可走通的状态机, 便于无后端预览。
 * 后端联调时把 .env 的 VITE_USE_MOCK 改为 false 即可。
 */

// ---------- 注意延迟 ----------
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms))

// ---------- 章节(这里复用真实章节名) ----------
const chapters: Chapter[] = [
  { id: 1, title: '潘承洞——数学求索', theme: '求索与坚持', character: '潘承洞', orderIndex: 1 },
  { id: 2, title: '路遥——田野之间', theme: '顺线深挖', character: '路遥', orderIndex: 2 },
  { id: 3, title: '华岗——百年山大', theme: '薪火相传', character: '华岗', orderIndex: 3 },
]

// ---------- 测试故事图 ----------
function line(
  id: number,
  lineType: StoryNode['lines'][number]['lineType'],
  content: string,
  speaker: string | null = null,
  portraitRef: string | null = null,
  effectRef: string | null = null,
): StoryNode['lines'][number] {
  return { id, lineType, speaker, content, portraitRef, effectRef, orderIndex: id }
}

const NODE_ENTRY: StoryNode = {
  id: 2,
  nodeCode: 'pan_prologue_start',
  nodeType: 'normal',
  title: '序幕',
  backgroundRef: 'pan/prologue/campus_road',
  cgRef: null,
  lines: [
    line(1, 'narration', '阳光透过树梢, 你漫步在林荫路上…', null, null, 'transition:eyes_close_blur'),
    line(2, 'narration', '这天你漫步在中心校区, 闲来无事决定去校史馆参观。', null, null, 'overlay:center_text_dark'),
    line(3, 'dialogue', '潘承洞……解析数论……为哥德巴赫猜想做出重要贡献……', '主角', 'pan/young/thinking'),
  ],
  choices: [],
}

const NODE_CHOICE: StoryNode = {
  id: 3,
  nodeCode: 'pan_prologue_canteen',
  nodeType: 'normal',
  title: '序幕·食堂',
  backgroundRef: 'pan/prologue/qiyuan_restaurant',
  cgRef: null,
  lines: [
    line(3, 'narration', '回到宿舍, 该整理一下行囊了…', null, null, 'minigame:hua/organize_luggage'),
    line(4, 'dialogue', '吃什么好呢……拌面？卷饼？', '主角', 'pan/young/thinking'),
    line(5, 'narration', '你把这份滋味记进了心里。', null, null, 'collection:pan/canteen_food'),
  ],
  choices: [
    { id: 1, choiceCode: 'choose_ending_a', choiceText: '选择结局A', orderIndex: 0 },
    { id: 2, choiceCode: 'choose_ending_b', choiceText: '选择结局B', orderIndex: 1 },
  ],
}

const NODE_END_A: StoryNode = {
  id: 4,
  nodeCode: 'pan_ending_a',
  nodeType: 'chapter_end',
  title: '尾声A',
  backgroundRef: 'pan/act1/sdu_gate_1960s',
  cgRef: null,
  lines: [
    line(5, 'narration', '梦醒。过去的岁月在眼前闪过。', null, null, 'montage:start'),
    line(6, 'narration', '感谢游玩 (mock 数据)。'),
  ],
  choices: [],
}

const NODE_END_B: StoryNode = {
  id: 5,
  nodeCode: 'pan_ending_b',
  nodeType: 'chapter_end',
  title: '尾声B',
  backgroundRef: 'pan/prologue/history_museum',
  cgRef: null,
  lines: [
    line(5, 'narration', '梦醒。你回到了校史馆。'),
    line(6, 'narration', '感谢游玩 (mock 数据)。'),
  ],
  choices: [],
}

const nodeMap = new Map<number, StoryNode>([
  [2, NODE_ENTRY],
  [3, NODE_CHOICE],
  [4, NODE_END_A],
  [5, NODE_END_B],
])

// ---------- 存档状态 ----------
interface MockSaveState {
  save: GameSaveVO
  nodeId: number
  lineIndex: number
  history: number[] // pathId 简化: 访问过的节点
}

const states = new Map<number, MockSaveState>()
let saveSeq = 100

function touchCurrent(state: MockSaveState): CurrentStoryVO {
  const node = nodeMap.get(state.nodeId)!
  return {
    saveId: state.save.id,
    chapterId: state.save.chapterId,
    currentLineIndex: state.lineIndex,
    completionRate: state.save.completionRate,
    interactionType: resolveInteraction(node, state.lineIndex),
    node,
  }
}

function resolveInteraction(node: StoryNode, lineIndex: number): InteractionType {
  if (node.lines.length > lineIndex) return 'playing'
  if (node.nodeType === 'chapter_end') return 'finished'
  if (node.choices.length > 0) return 'choice'
  return 'linear'
}

// ---------- 预置演示存档(真实系统由用户创建, 数量不限) ----------
function seedSave(id: number, saveName: string, chapterId: number, nodeId: number, history: number[], lineIndex: number, completionRate: number) {
  const ch = chapters.find((c) => c.id === chapterId)!
  const node = nodeMap.get(nodeId)!
  const save: GameSaveVO = {
    id,
    saveName,
    chapterId,
    chapterTitle: ch.title,
    character: ch.character,
    currentNodeId: nodeId,
    currentNodeTitle: node.title,
    currentLineIndex: lineIndex,
    completionRate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  states.set(id, { save, nodeId, lineIndex, history })
}
seedSave(101, '存档一', 1, 3, [2, 3], 2, 50)
seedSave(102, '存二 · 田野', 2, 2, [2], 0, 0)

// ---------- 收集物(collection: 指令) ----------
const _collected = new Set<string>()
export const mockCollectionApi = {
  async add(key: string): Promise<null> {
    await delay(120)
    _collected.add(key)
    return null
  },
  async list(): Promise<CollectionItem[]> {
    await delay()
    return COLLECTION_CATALOG.map((c) => ({ ...c, collected: _collected.has(c.key), collectedAt: _collected.has(c.key) ? new Date().toISOString() : undefined }))
  },
}

// ---------- mock 实现 ----------
export const mockApi = {
  async guestLogin() {
    await delay()
    return { token: 'mock-token-' + Date.now() }
  },
  async getMe(): Promise<UserInfo> {
    await delay()
    return {
      id: 1,
      username: '游客001',
      isGuest: true,
      studentId: null,
      avatarUrl: null,
    }
  },
  async getChapters(): Promise<Chapter[]> {
    await delay()
    return chapters
  },
  async createSave(saveName: string, chapterId: number): Promise<GameSaveVO> {
    await delay()
    const chapter = chapters.find((c) => c.id === chapterId)!
    const save: GameSaveVO = {
      id: ++saveSeq,
      saveName,
      chapterId,
      chapterTitle: chapter.title,
      character: chapter.character,
      currentNodeId: NODE_ENTRY.id,
      currentNodeTitle: NODE_ENTRY.title,
      currentLineIndex: 0,
      completionRate: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    states.set(save.id, { save, nodeId: NODE_ENTRY.id, lineIndex: 0, history: [NODE_ENTRY.id] })
    return save
  },
  async listSaves(): Promise<GameSaveVO[]> {
    await delay()
    return [...states.values()].map((s) => s.save).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },
  async snapshotSave(saveId: number, saveName: string): Promise<GameSaveVO> {
    await delay()
    const source = states.get(saveId)
    if (!source) throw new Error('存档不存在')
    const now = new Date().toISOString()
    const save: GameSaveVO = {
      ...source.save,
      id: ++saveSeq,
      saveName,
      createdAt: now,
      updatedAt: now,
    }
    states.set(save.id, {
      save,
      nodeId: source.nodeId,
      lineIndex: source.lineIndex,
      history: [...source.history],
    })
    return save
  },
  async deleteSave(saveId: number): Promise<null> {
    await delay()
    states.delete(saveId)
    return null
  },
  async getCurrent(saveId: number): Promise<CurrentStoryVO> {
    await delay()
    const s = states.get(saveId)
    if (!s) throw new Error('存档不存在')
    return touchCurrent(s)
  },
  async patchPosition(
    saveId: number,
    expectedNodeId: number,
    expectedLineIndex: number,
    targetLineIndex: number,
  ): Promise<PositionResult> {
    await delay()
    const s = states.get(saveId)
    if (!s) throw new Error('存档不存在')
    if (s.nodeId !== expectedNodeId || s.lineIndex !== expectedLineIndex) {
      throw new Error('位置校验失败(STORY_STATE_CONFLICT)')
    }
    s.lineIndex = targetLineIndex
    const node = nodeMap.get(s.nodeId)!
    const interaction = resolveInteraction(node, s.lineIndex)
    return {
      saveId,
      nodeId: s.nodeId,
      currentLineIndex: s.lineIndex,
      interactionType: interaction,
      choices: interaction === 'choice' ? node.choices : [],
      unlockedAchievements: [],
    }
  },
  async advance(
    saveId: number,
    _expectedNodeId: number,
    _expectedLineIndex: number,
    choiceId: number | null,
  ): Promise<CurrentStoryVO> {
    await delay()
    const s = states.get(saveId)
    if (!s) throw new Error('存档不存在')
    if (choiceId === null) {
      // linear → 下一节点(测试入口 → 测试选择)
      s.nodeId = NODE_CHOICE.id
    } else {
      // choice → 对应结局
      s.nodeId = choiceId === 1 ? NODE_END_A.id : NODE_END_B.id
    }
    s.lineIndex = 0
    s.history.push(s.nodeId)
    s.save.currentNodeId = s.nodeId
    s.save.currentNodeTitle = nodeMap.get(s.nodeId)!.title
    const node = nodeMap.get(s.nodeId)!
    s.save.completionRate = node.nodeType === 'chapter_end' ? 100 : 50
    return touchCurrent(s)
  },
  async getStoryline(saveId: number): Promise<StorylineVO> {
    await delay()
    const s = states.get(saveId)
    if (!s) throw new Error('存档不存在')
    const nodes = s.history.map((nodeId, idx) => {
      const n = nodeMap.get(nodeId)!
      return {
        pathId: idx + 1,
        stepIndex: idx,
        nodeId,
        nodeCode: n.nodeCode,
        nodeType: n.nodeType,
        title: n.title,
        progressPercent: n.nodeType === 'chapter_end' ? 100 : idx * 34,
        choiceCode: null,
        choiceText: null,
        visitedAt: s.save.updatedAt,
        current: idx === s.history.length - 1,
      }
    })
    return {
      saveId,
      chapterId: s.save.chapterId,
      currentPathId: nodes.length,
      currentNodeId: s.nodeId,
      nodes,
    }
  },
  async rewind(saveId: number, targetPathId: number): Promise<CurrentStoryVO> {
    await delay()
    const s = states.get(saveId)
    if (!s) throw new Error('存档不存在')
    const idx = Math.max(0, Math.min(s.history.length - 1, targetPathId - 1))
    s.nodeId = s.history[idx]
    s.lineIndex = 0
    return touchCurrent(s)
  },
  async getAchievements(): Promise<Achievement[]> {
    await delay()
    return [
      { id: 1, name: '求索之心', description: '完成潘承洞故事', icon: 'book', type: 'chapter', chapterId: 1, souvenir: '数学求索纪念章', unlocked: true, unlockedAt: '2026-08-01T12:00:00' },
      { id: 2, name: '百年见证', description: '探索全部历史建筑', icon: 'map', type: 'route', chapterId: 3, souvenir: '百年山大纪念章', unlocked: false },
      { id: 3, name: '山大之歌', description: '完成音乐章节', icon: 'music', type: 'chapter', chapterId: 4, souvenir: '山大之歌纪念章', unlocked: false },
    ]
  },
}
