import young_default_bust from '../assets/pan/portrait/young_default_bust.webp'
import young_smile_bust from '../assets/pan/portrait/young_smile_bust.webp'
import young_speak_bust from '../assets/pan/portrait/young_speak_bust.webp'
import middle_default_bust from '../assets/pan/portrait/middle_default_bust.webp'
import middle_smile_bust from '../assets/pan/portrait/middle_smile_bust.webp'
import middle_think_bust from '../assets/pan/portrait/middle_think_bust.webp'
import middle_epiphany_bust from '../assets/pan/portrait/middle_epiphany_bust.webp'
import student_a_bust from '../assets/pan/portrait/student_a_bust.webp'
import student_b_bust from '../assets/pan/portrait/student_b_bust.webp'
import protagonist_default_bust from '../assets/pan/portrait/protagonist_default_bust.webp'
import protagonist_smile_bust from '../assets/pan/portrait/protagonist_smile_bust.webp'
import protagonist_surprised_bust from '../assets/pan/portrait/protagonist_surprised_bust.webp'
import lu_yao_serious_bust from '../assets/lu/portrait/lu_yao_serious_bust.webp'
import lu_yao_pleased_bust from '../assets/lu/portrait/lu_yao_pleased_bust.webp'
import lu_yao_think_bust from '../assets/lu/portrait/lu_yao_think_bust.webp'
import clan_head_bust from '../assets/lu/portrait/clan_head_bust.webp'
import grandmother_bust from '../assets/lu/portrait/grandmother_bust.webp'
import zhao_uncle_bust from '../assets/lu/portrait/zhao_uncle_bust.webp'
import liu_oldman_bust from '../assets/lu/portrait/liu_oldman_bust.webp'
import teacher_yang_bust from '../assets/lu/portrait/teacher_yang_bust.webp'
import hua_gang_bust from '../assets/hua/portrait/hua_gang_bust.webp'
import roommate_bust from '../assets/hua/portrait/roommate_bust.webp'
import granddaughter_bust from '../assets/hua/portrait/granddaughter_bust.webp'
import veteran_bust from '../assets/hua/portrait/veteran_bust.webp'
import professor1_bust from '../assets/hua/portrait/professor1_bust.webp'
import professor2_bust from '../assets/hua/portrait/professor2_bust.webp'
import senior_bust from '../assets/hua/portrait/senior_bust.webp'
import protagonist_bust from '../assets/hua/portrait/protagonist_bust.webp'

// 角色立绘键 → 半身像(头+肩)素材
const BUST: Record<string, string> = {
  // pan
  'pan/elder/pleased': middle_smile_bust,
  'pan/elder/serious': middle_default_bust,
  'pan/middle/determined': middle_default_bust,
  'pan/middle/focused': middle_think_bust,
  'pan/middle/inspired': middle_epiphany_bust,
  'pan/middle/pleased': middle_smile_bust,
  'pan/middle/thinking': middle_think_bust,
  'pan/young/confused': young_speak_bust,
  'pan/young/determined': young_default_bust,
  'pan/young/focused': young_default_bust,
  'pan/young/normal': young_default_bust,
  'pan/young/pleased': young_smile_bust,
  'pan/young/serious': young_default_bust,
  'pan/young/thinking': young_speak_bust,
  'protagonist/confused': protagonist_surprised_bust,
  'protagonist/listening': protagonist_smile_bust,
  'protagonist/normal': protagonist_default_bust,
  'protagonist/thinking': protagonist_default_bust,
  'student/a': student_a_bust,
  'student/b': student_b_bust,
  // hua
  'hua/hua_gang/determined': hua_gang_bust,
  'hua/hua_gang/pleased': hua_gang_bust,
  'hua/hua_gang/serious': hua_gang_bust,
  'hua/hua_gang/speaking': hua_gang_bust,
  'hua/hua_gang/teaching': hua_gang_bust,
  'hua/roommate/afraid': roommate_bust,
  'hua/roommate/worried': roommate_bust,
  'hua/granddaughter/curious': granddaughter_bust,
  'hua/veteran/curious': veteran_bust,
  'hua/veteran/laughing': veteran_bust,
  'hua/veteran/proud': veteran_bust,
  'hua/professor/pleased': professor1_bust,
  'hua/professor/thinking': professor1_bust,
  'hua/professor/worried': professor2_bust,
  'hua/senior/normal': senior_bust,
  'hua/senior/pleased': senior_bust,
  'hua/protagonist/young_normal': protagonist_bust,
  'hua/protagonist/young_pleased': protagonist_bust,
  'hua/protagonist/young_thinking': protagonist_bust,
  'hua/protagonist/young_determined': protagonist_bust,
  'hua/protagonist/young_embarrassed': protagonist_bust,
  'hua/protagonist/young_focused': protagonist_bust,
  'hua/protagonist/middle_determined': protagonist_bust,
  'hua/protagonist/middle_serious': protagonist_bust,
  'hua/protagonist/elder_pleased': protagonist_bust,
  'hua/protagonist/elder_regretful': protagonist_bust,
  // lu
  'lu/clan_head/serious': clan_head_bust,
  'lu/grandmother/remembering': grandmother_bust,
  'lu/grandmother/worried': grandmother_bust,
  'lu/liu_oldman/guarded': liu_oldman_bust,
  'lu/lu_yao/elder_serious': lu_yao_serious_bust,
  'lu/lu_yao/normal': lu_yao_serious_bust,
  'lu/lu_yao/pleased': lu_yao_pleased_bust,
  'lu/lu_yao/serious': lu_yao_serious_bust,
  'lu/lu_yao/teaching': lu_yao_think_bust,
  'lu/teacher_yang/focused': teacher_yang_bust,
  'lu/zhao_uncle/proud': zhao_uncle_bust,
}

/** 取角色立绘键对应的半身像 url(无则 null) */
export function bustUrl(ref: string | null | undefined): string | null {
  if (!ref) return null
  const i = ref.indexOf(':')
  const key = i >= 0 ? ref.slice(i + 1) : ref
  return BUST[key] ?? null
}
