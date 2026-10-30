import type { CSSProperties } from 'react'
import type { ResourceKind } from '../api/types'

/**
 * 资源映射�?—�?键对齐后端《后端资源引用标�?md》�?
 * 后端返回�?backgroundRef / portraitRef / cgRef(以及 effectRef 里的 scene:/cg: 后的�?
 * 都在此登�? 已接入真实素材的键带 url, 其余走安全兜�?默认氛围背景/字母占位立绘)�?
 * 素材逐步迁移后可往里填 url 即可。立绘用 WebP(带透明通道)�?
 */

// ---- 潘承�?pan) ----
import campus_road from '../assets/pan/bg/campus_road.jpg'
import qiyuan_restaurant from '../assets/pan/bg/qiyuan_restaurant.jpg'
import history_museum from '../assets/pan/bg/history_museum.jpg'
import sdu_gate_1960s from '../assets/pan/bg/sdu_gate_1960s.jpg'
import blackboard_proof from '../assets/pan/cg/blackboard_proof.jpg'
import write_letter from '../assets/pan/cg/write_letter.jpg'
import sdu_gate_1961 from '../assets/pan/cg/sdu_gate_1961.jpg'
import elder_pan from '../assets/pan/cg/elder_pan.jpg'
import review_materials from '../assets/pan/cg/review_materials.jpg'
import decide_transition from '../assets/pan/cg/decide_transition.jpg'
import young_default from '../assets/pan/portrait/young_default.webp'
import young_smile from '../assets/pan/portrait/young_smile.webp'
import young_speak from '../assets/pan/portrait/young_speak.webp'
import middle_default from '../assets/pan/portrait/middle_default.webp'
import middle_smile from '../assets/pan/portrait/middle_smile.webp'
import middle_think from '../assets/pan/portrait/middle_think.webp'
import middle_epiphany from '../assets/pan/portrait/middle_epiphany.webp'
import student_a from '../assets/pan/portrait/student_a.webp'
import student_b from '../assets/pan/portrait/student_b.webp'
import protagonist_default from '../assets/pan/portrait/protagonist_default.webp'
import protagonist_smile from '../assets/pan/portrait/protagonist_smile.webp'
import protagonist_surprised from '../assets/pan/portrait/protagonist_surprised.webp'
// ---- 路遥(lu) - 背景美术(BO1~BO11, 16:9宽屏无黑边) ----
import lu_bo1 from '../assets/lu/bg/bo1.png'    // S02 济南出发: 山大大门夕阳剪影
import lu_bo2 from '../assets/lu/bg/bo2.jpeg'   // S01 最后一课: 60年代教室讲台/马恩列画像
import lu_bo3 from '../assets/lu/bg/bo3.png'    // S10 写报告: 绿皮火车车厢雪景窗外
import lu_bo4 from '../assets/lu/bg/bo4.png'    // S03 考察图: 鲁西南古地图
import lu_bo5 from '../assets/lu/bg/bo5.png'    // S04 老族长家: 神龛/族谱/土炕
import lu_bo6 from '../assets/lu/bg/bo6.png'    // S05 王奶奶炕头: 老照片墙/针线笸箩
import lu_bo7 from '../assets/lu/bg/bo7.png'    // S07 旧祠堂废墟: 盘龙屋脊蛛网
import lu_bo8 from '../assets/lu/bg/bo8.png'    // S06 赵大叔家: 长柄大刀/拳谱/布衣
import lu_bo9 from '../assets/lu/bg/bo9.png'    // S09 归途: 草顶土坯枯柿树院
import lu_bo10 from '../assets/lu/bg/bo10.png'  // S08 档案馆: 大黑板/书柜/地球仪
import lu_bo11 from '../assets/lu/bg/bo11.png'  // S11尾声山大图书馆/运河: 水墨石桥垂柳
// ---- 路遥(lu) - 立绘 ----
import lu_yao_serious from '../assets/lu/portrait/lu_yao_serious.webp'
import lu_yao_pleased from '../assets/lu/portrait/lu_yao_pleased.webp'
import lu_yao_think from '../assets/lu/portrait/lu_yao_think.webp'
import clan_head from '../assets/lu/portrait/clan_head.webp'
import grandmother from '../assets/lu/portrait/grandmother.webp'
import zhao_uncle from '../assets/lu/portrait/zhao_uncle.webp'
import liu_oldman from '../assets/lu/portrait/liu_oldman.webp'
import teacher_yang from '../assets/lu/portrait/teacher_yang.webp'
import lu_pro_scholar from '../assets/lu/portrait/protagonist_scholar.png'     // 书生线: 冷静严肃脸
import lu_pro_practical from '../assets/lu/portrait/protagonist_practical.png' // 实干线: 惊讶行动派脸
import lu_pro_empathy from '../assets/lu/portrait/protagonist_empathy.png'     // 人情线: 微笑温柔脸
import lu_student from '../assets/lu/portrait/student_normal.png'              // 小杨(村小老师): 眼镜中山装捧书
// ---- 华岗(hua) ----
import red_building_dorm from '../assets/hua/bg/red_building_dorm.jpg'
import home_1951 from '../assets/hua/bg/home_1951.jpg'
import ceremony_square from '../assets/hua/bg/ceremony_square.jpg'
import canteen from '../assets/hua/bg/canteen.jpg'
import literature_office from '../assets/hua/bg/literature_office.jpg'
import silent_campus from '../assets/hua/bg/silent_campus.jpg'
import modern_room from '../assets/hua/bg/modern_room.jpg'
import closed_library from '../assets/hua/bg/closed_library.jpg'
import dormitory_class from '../assets/hua/bg/dormitory_class.jpg'
import train_1951 from '../assets/hua/bg/train_1951.jpg'
import admission_letter from '../assets/hua/cg/admission_letter.jpg'
import hua_gang_editing from '../assets/hua/cg/hua_gang_editing.jpg'
import scholars from '../assets/hua/cg/scholars.jpg'
import shared_ideal from '../assets/hua/cg/shared_ideal.jpg'
import hidden_manuscripts from '../assets/hua/cg/hidden_manuscripts.jpg'
import silent_running from '../assets/hua/cg/silent_running.jpg'
import scholar_report from '../assets/lu/cg/scholar_report.png'
import empathy_report from '../assets/lu/cg/empathy_report.png'
import practical_report from '../assets/lu/cg/practical_report.png'
import field_notes from '../assets/lu/cg/field_notes.jpg'
import lu_old_saber from '../assets/lu/cg/old_saber.png'     // S06 赵大叔家旧刀 CG
import hua_gang from '../assets/hua/portrait/hua_gang.webp'
import roommate from '../assets/hua/portrait/roommate.webp'
import granddaughter from '../assets/hua/portrait/granddaughter.webp'
import veteran from '../assets/hua/portrait/veteran.webp'
import professor1 from '../assets/hua/portrait/professor1.webp'
import professor2 from '../assets/hua/portrait/professor2.webp'
import senior from '../assets/hua/portrait/senior.webp'
import protagonist from '../assets/hua/portrait/protagonist.webp'

interface Res {
  url?: string
  source?: string
  fit?: 'cover' | 'contain'
  backgroundColor?: string
}

export const RESOURCE_SOURCE: Record<string, Res> = {
  // ================= 第一�?潘承�?pan) =================
  'pan/prologue/campus_road': { url: campus_road },
  'pan/prologue/qiyuan_restaurant': { url: qiyuan_restaurant },
  'pan/prologue/history_museum': { url: history_museum },
  'pan/act1/classroom': { url: blackboard_proof },
  'pan/act1/office': { url: review_materials },
  'pan/act1/sdu_gate_1960s': { url: sdu_gate_1960s },
  'pan/act2/office': { url: review_materials },
  'pan/act3/montage': { url: campus_road },
  'pan/act3/office': { url: review_materials },
  'pan/act1/blackboard_proof': { url: blackboard_proof },
  'pan/act1/write_letter': { url: write_letter },
  'pan/act1/decide_transition': { url: decide_transition },
  'pan/act3/sdu_gate_1961': { url: sdu_gate_1961 },
  'pan/act3/elder_pan': { url: elder_pan },
  'pan/common/review_materials': { url: review_materials },
  'pan/common/review_student_materials': { url: review_materials },
  'pan/elder/pleased': { url: middle_smile },
  'pan/elder/serious': { url: middle_default },
  'pan/middle/determined': { url: middle_default },
  'pan/middle/focused': { url: middle_think },
  'pan/middle/inspired': { url: middle_epiphany },
  'pan/middle/pleased': { url: middle_smile },
  'pan/middle/thinking': { url: middle_think },
  'pan/young/confused': { url: young_speak },
  'pan/young/determined': { url: young_default },
  'pan/young/focused': { url: young_default },
  'pan/young/normal': { url: young_default },
  'pan/young/pleased': { url: young_smile },
  'pan/young/serious': { url: young_default },
  'pan/young/thinking': { url: young_speak },
  'protagonist/confused': { url: protagonist_surprised },
  'protagonist/listening': { url: protagonist_smile },
  'protagonist/normal': { url: protagonist_default },
  'protagonist/thinking': { url: protagonist_default },
  'student/a': { url: student_a },
  'student/b': { url: student_b },

  // ================= 第二�?华岗(hua) =================
  'hua/prologue/modern_room': { url: modern_room },
  'hua/act1/home_1951': { url: home_1951 },
  'hua/act1/train_1951': { url: train_1951 },
  'hua/act1/red_building_dorm': { url: red_building_dorm },
  'hua/act2/ceremony_square': { url: ceremony_square },
  'hua/act3/canteen': { url: canteen },
  'hua/act3/literature_office': { url: literature_office },
  'hua/act3/night_desk': {},
  'hua/act3/printing_room': {},
  'hua/act3/qingdao_street': {},
  'hua/act4/closed_library': { url: closed_library },
  'hua/act4/dormitory_class': { url: dormitory_class },
  'hua/act4/silent_campus': { url: silent_campus },
  'hua/epilogue/modern_room': { url: modern_room },
  // 相册特写 CG 尚未交付(现有 cg/photo_album.jpg 是设计草�? 非游戏图); 留空 �?自动回退到节点场景背�?
  'hua/prologue/photo_album': {},
  'hua/act1/admission_letter': { url: admission_letter },
  'hua/act2/hua_gang_speech': {},  // CG �ز�δ���������ջ��˽ڵ㱳��
  'hua/act3/hua_gang_editing': { url: hua_gang_editing },
  'hua/act3/scholars': { url: scholars },
  'hua/act3/shared_ideal': { url: shared_ideal },
  'hua/act4/hidden_manuscripts': { url: hidden_manuscripts },
  'hua/act4/silent_running': { url: silent_running },
  'hua/epilogue/photo_album': {},
  'hua/granddaughter/curious': { url: granddaughter },
  'hua/hua_gang/determined': { url: hua_gang },
  'hua/hua_gang/pleased': { url: hua_gang },
  'hua/hua_gang/serious': { url: hua_gang },
  'hua/hua_gang/speaking': { url: hua_gang },
  'hua/hua_gang/teaching': { url: hua_gang },
  'hua/professor/pleased': { url: professor1 },
  'hua/professor/thinking': { url: professor1 },
  'hua/professor/worried': { url: professor2 },
  'hua/protagonist/elder_pleased': { url: protagonist },
  'hua/protagonist/elder_regretful': { url: protagonist },
  'hua/protagonist/middle_determined': { url: protagonist },
  'hua/protagonist/middle_serious': { url: protagonist },
  'hua/protagonist/young_determined': { url: protagonist },
  'hua/protagonist/young_embarrassed': { url: protagonist },
  'hua/protagonist/young_focused': { url: protagonist },
  'hua/protagonist/young_normal': { url: protagonist },
  'hua/protagonist/young_pleased': { url: protagonist },
  'hua/protagonist/young_thinking': { url: protagonist },
  'hua/roommate/afraid': { url: roommate },
  'hua/roommate/worried': { url: roommate },
  'hua/senior/normal': { url: senior },
  'hua/senior/pleased': { url: senior },
  'hua/veteran/curious': { url: veteran },
  'hua/veteran/laughing': { url: veteran },
  'hua/veteran/proud': { url: veteran },

  // ================= 第三章 路遥(lu) =================
  // 背景: 统一改用资源文档 BO 系列 16:9 宽屏原图(无黑边, 与实际场景内容一一对应)
  'lu/s01/history_classroom': { url: lu_bo2 },   // S01 最后一课: 60年代教室讲台/马恩列画像
  'lu/s02/jinan_station': { url: lu_bo1 },       // S02 济南出发: 山大大门夕阳剪影
  'lu/s03/county_map': {
    url: lu_bo4,
    fit: 'contain',
    backgroundColor: '#e8dfca',
  }, // S03 考察图为竖版档案图，完整展示标题、地点和路线
  'lu/s04/clan_head_courtyard': { url: lu_bo5 }, // S04 老族长家: 神龛/族谱/土炕茶几
  'lu/s05/grandmother_room': { url: lu_bo6 },    // S05 王奶奶炕头: 老照片墙/针线笸箩
  'lu/s06/zhao_courtyard': { url: lu_bo8 },      // S06 赵大叔家: 长柄大刀/拳谱/哑铃/布衣
  'lu/s07/isolated_courtyard': { url: lu_bo7 },  // S07 旧祠堂废墟: 盘龙屋脊/蛛网/坍屋顶(原从未正确接入)
  'lu/s08/county_archive': { url: lu_bo10 },     // S08 档案馆: 大黑板/书柜/地球仪/好好学习(原错配为 s10=运河)
  'lu/s09/winter_road': { url: lu_bo9 },         // S09 归途村院: 草顶土坯墙/枯柿子树/干柴堆
  'lu/s10/report_room': { url: lu_bo3 },         // S10 写报告: 绿皮火车车厢归途·雪景窗外(原错配 s01=校门剪影)
  'lu/epilogue/sdu_library': { url: lu_bo11 },   // S11尾声 山大图书馆/运河: 水墨石桥垂柳(原空键走渐变)
  'lu/s06/old_saber': { url: lu_old_saber },     // S06 旧刀CG: 匕首/短刀(原空键走渐变)
  'lu/s10/scholar_report': { url: scholar_report },
  'lu/s10/empathy_report': { url: empathy_report },
  'lu/s10/practical_report': { url: practical_report },
  'lu/epilogue/field_notes': { url: field_notes },
  // 立绘(原5个空键全部补全, 均为资源文档中的官方美术原图)
  'lu/clan_head/serious': { url: clan_head },
  'lu/grandmother/remembering': { url: grandmother },
  'lu/grandmother/worried': { url: grandmother },
  'lu/liu_oldman/guarded': { url: liu_oldman },
  'lu/lu_yao/elder_serious': { url: lu_yao_serious },
  'lu/lu_yao/normal': { url: lu_yao_serious },
  'lu/lu_yao/pleased': { url: lu_yao_pleased },
  'lu/lu_yao/serious': { url: lu_yao_serious },
  'lu/lu_yao/teaching': { url: lu_yao_think },
  'lu/protagonist/empathy': { url: lu_pro_empathy },     // 耳机少年·微笑温柔脸
  'lu/protagonist/practical': { url: lu_pro_practical }, // 耳机少年·惊讶张嘴脸(行动派)
  'lu/protagonist/scholar': { url: lu_pro_scholar },     // 耳机少年·冷静严肃脸
  'lu/student/normal': { url: lu_student },              // 小杨·村小老师: 眼镜中山装捧书
  'lu/teacher_yang/focused': { url: teacher_yang },
  'lu/zhao_uncle/proud': { url: zhao_uncle },
}

// ---------------- 兜底 ----------------
const GRADIENTS = [
  'linear-gradient(160deg,#e2e6ec 0%,#c3ccd6 100%)',
  'linear-gradient(160deg,#e6e4e0 0%,#cfc9c2 100%)',
  'linear-gradient(160deg,#e3e6e6 0%,#cdd4d4 100%)',
  'linear-gradient(160deg,#e6e2e4 0%,#d0c8cc 100%)',
  'linear-gradient(160deg,#e4e6e2 0%,#cbd2c8 100%)',
]

function fallbackBackground(ref?: string | null): string {
  if (!ref) return GRADIENTS[0]
  let h = 0
  for (let i = 0; i < ref.length; i++) h = (h * 31 + ref.charCodeAt(i)) >>> 0
  return GRADIENTS[h % GRADIENTS.length]
}
const fallbackPortraitName = (ref?: string | null) => {
  if (!ref) return '?'
  const seg = ref.split('/').pop() ?? '?'
  return seg.replace(/[^a-zA-Z\u4e00-\u9fff]/g, '').slice(0, 1).toUpperCase() || '?'
}

export interface ResolvedBackground { style: CSSProperties; hasReal: boolean }
export interface ResolvedPortrait { name: string; url: string | null; hasReal: boolean }
export interface ResolvedCG { hasReal: boolean }

function stripDirective(ref: string | null | undefined): string | null {
  if (!ref) return null
  const i = ref.indexOf(':')
  return i >= 0 ? ref.slice(i + 1) : ref
}

export const resource = {
  background(ref?: string | null): ResolvedBackground {
    const key = stripDirective(ref)
    const src = key ? RESOURCE_SOURCE[key] : undefined
    if (src?.url) {
      return {
        style: {
          backgroundImage: `url(${src.url})`,
          backgroundSize: src.fit ?? 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: src.backgroundColor,
        },
        hasReal: true,
      }
    }
    return { style: { background: fallbackBackground(key), backgroundSize: 'cover', backgroundPosition: 'center' }, hasReal: false }
  },
  portrait(ref?: string | null): ResolvedPortrait {
    const key = stripDirective(ref)
    const src = key ? RESOURCE_SOURCE[key] : undefined
    return { name: fallbackPortraitName(key), url: src?.url ?? null, hasReal: !!src?.url }
  },
  cg(ref?: string | null): ResolvedCG {
    const key = stripDirective(ref)
    const src = key ? RESOURCE_SOURCE[key] : undefined
    return { hasReal: !!src?.url }
  },
  effect(ref?: string | null): boolean {
    return !!ref
  },
}

export type { ResourceKind }
