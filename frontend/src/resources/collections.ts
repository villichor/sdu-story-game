import type { CollectionItem } from '../api/types'

/** 收集物目录(后端 collection: 键 → 名称/描述/图标) */
export const COLLECTION_CATALOG: CollectionItem[] = [
  { key: 'pan/canteen_food', name: '食堂的一餐', description: '齐园食堂的拌面与卷饼, 是那个年代最踏实的滋味。', emoji: '🍜', collected: false },
  { key: 'pan/proof_notes', name: '演算手稿', description: '泛黄的稿纸, 写满了对哥德巴赫猜想的执着。', emoji: '📐', collected: false },
  { key: 'hua/cigarette_box_outline', name: '华岗的烟盒纸提纲', description: '藏在烟盒里的提纲, 是老先生深夜伏案的注脚。', emoji: '📜', collected: false },
  { key: 'hua/scholars_gallery', name: '名家群像', description: '一张张面孔, 是那个年代沉甸甸的嘱托。', emoji: '🖼️', collected: false },
  { key: 'hua/veteran_student', name: '志愿军学员', description: '他从战火中走来, 只为坐到这间教室里。', emoji: '🎖️', collected: false },
  { key: 'hua/senior_student', name: '华大学长', description: '他从华东大学赶来, 是那个动荡年代里最早抵达新山大的人。', emoji: '🎓', collected: false },
  { key: 'hua/young_scholar', name: '青年学子', description: '求知的目光, 照亮了图书馆里的每个夜晚。', emoji: '📚', collected: false },
  { key: 'lu/evidence_chain', name: '证据链条', description: '一环扣一环, 把那些被遗忘的姓名重新连起来。', emoji: '⛓️', collected: false },
  { key: 'lu/old_saber', name: '老军刀', description: '刀鞘上的锈迹, 藏着一段不肯开口的历史。', emoji: '🗡️', collected: false },
  { key: 'lu/oral_history_1', name: '口述史·一', description: '老人家浑浊的眼睛里, 忽然有了光。', emoji: '🗣️', collected: false },
  { key: 'lu/oral_history_2', name: '口述史·二', description: '两段口述彼此印证, 拼出失踪者的下落。', emoji: '🗣️', collected: false },
]

const BY_KEY = new Map(COLLECTION_CATALOG.map((c) => [c.key, c]))

/** 依据 collection: 指令取值解析收集物名称(无则返回原键) */
export function collectionName(key: string): string {
  const i = key.indexOf(':')
  const k = i >= 0 ? key.slice(i + 1) : key
  const item = BY_KEY.get(k)
  return item ? item.name : k
}
