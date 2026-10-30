import { RESOURCE_SOURCE } from '../../resources'

/**
 * 后端演出指令(effectRef 值)解析 —— 见《后端资源引用标识.md》
 *  scene:资源标识     切换场景背景
 *  cg:资源标识        展示 CG
 *  transition:xxx     转场(闭眼/睁眼/记忆/火车…)
 *  overlay:xxx        覆盖层(居中文字 / 日期字幕)
 *  montage:start      CG 走马灯
 *  collection:xxx     收集物/图鉴
 *  minigame:xxx       小游戏
 *  ending:xxx         章节完成
 */
export type EffectKind =
  | 'scene'
  | 'cg'
  | 'transition'
  | 'overlay'
  | 'montage'
  | 'collection'
  | 'minigame'
  | 'ending'

export interface EffectD {
  kind: EffectKind | 'none'
  value: string
}

const KINDS = new Set<EffectKind>(['scene', 'cg', 'transition', 'overlay', 'montage', 'collection', 'minigame', 'ending'])

/** 解析 effectRef 为一个指令 */
export function parseEffect(ref?: string | null): EffectD {
  if (!ref) return { kind: 'none', value: '' }
  const i = ref.indexOf(':')
  if (i < 0) return { kind: 'none', value: ref }
  const kind = ref.slice(0, i) as EffectKind
  const value = ref.slice(i + 1)
  if (!KINDS.has(kind)) return { kind: 'none', value: ref }
  // 火车转场(transition:train_*): 不再切换火车场景, 改为闭眼特效过渡到下一幕
  if (kind === 'transition' && value.startsWith('train')) {
    return { kind: 'transition', value: 'eyes_close_blur' }
  }
  return { kind, value }
}

/** 蒙太奇(CG 走马灯)按顺序展示的 CG 键 */
export const MONTAGE_CG = [
  'pan/act3/sdu_gate_1961',
  'pan/act1/write_letter',
  'pan/common/review_materials',
  'pan/act3/elder_pan',
]

/** 各章节的蒙太奇 CG 序列(按章节 orderIndex 取: 1=潘承洞 2=华岗 3=路遥, 无则用潘承洞篇) */
const MONTAGE_BY_CHAPTER: Record<number, string[]> = {
  1: MONTAGE_CG,
  2: ['hua/prologue/photo_album', 'hua/act3/scholars', 'hua/act3/shared_ideal', 'hua/act4/silent_running'],
  3: ['lu/epilogue/field_notes', 'lu/s06/old_saber', 'lu/s10/scholar_report', 'lu/epilogue/sdu_library'],
}

/** 蒙太奇时滚动显示的字幕 */
export const MONTAGE_CAPTIONS = ['那些年的岁月 · 一幕幕在眼前闪过', '时光的剪影', '山大人的记忆', '往昔烟云, 皆成序章']

/** 取某章节的蒙太奇 CG 序列 */
export function montageFrames(chapterId: number): string[] {
  return MONTAGE_BY_CHAPTER[chapterId] ?? MONTAGE_CG
}

/** 从资源表取某键的真实 url(无则 null) */
export function assetUrl(key: string | null | undefined): string | null {
  if (!key) return null
  // 去掉可能的前缀
  const i = key.indexOf(':')
  const clean = i >= 0 ? key.slice(i + 1) : key
  return RESOURCE_SOURCE[clean]?.url ?? null
}
