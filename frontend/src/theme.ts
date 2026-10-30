/** 设计令牌「山大红 · 视觉小说」v2 —— 中性底座 + 山大红单一点睛 (与 index.css 对齐) */
export const theme = {
  // 炭黑文字(冷)
  text: '#16171a',
  textSoft: '#4d4f54',
  textLight: '#85878d',
  onGold: '#ffffff',
  // 山大红(唯一强调色)
  gold: '#a61e2e',
  goldLight: '#f2d3d7',
  goldDark: '#871823',
  redWash: 'rgba(166,30,46,0.08)',
  // 中性面板
  panel: '#ffffff',
  panelDeep: '#ececeb',
  border: '#dcdcdb',
  // 山大红(次要互动/当前分支)
  cyan: '#a61e2e',
  cyanDark: '#871823',
  cyanText: '#ffffff',
  // 灰(未解锁)
  locked: '#b9bbc0',
  lockedDark: '#8d9095',
  // 山大红系(下一章节浅染)
  orange: '#c9707a',
  orangeDark: '#a6363f',
  // 其他
  error: '#c1282f',
  bg: '#f6f6f4',
  bgDeep: '#ececeb',
  white: '#ffffff',
  // 纵深(中性有偏移阴影)
  e1: '0 1px 2px rgba(22,23,26,0.05), 0 3px 8px rgba(22,23,26,0.04)',
  e2: '0 2px 6px rgba(22,23,26,0.06), 0 14px 34px rgba(22,23,26,0.08)',
  e3: '0 4px 12px rgba(22,23,26,0.08), 0 26px 60px rgba(22,23,26,0.13)',
} as const

/** 主按钮(山大红) */
export const btnGold = {
  background: theme.gold,
  color: theme.onGold,
  border: '1px solid ' + theme.goldDark,
  borderRadius: '12px',
  fontWeight: 600,
  boxShadow: theme.e1,
  cursor: 'pointer',
} as const

/** 剧情播放页半透明对话框(中性白) */
export const dialogueBox = {
  background: 'rgba(255,255,255,0.88)',
  border: '1px solid ' + theme.border,
  borderRadius: '16px',
  backdropFilter: 'blur(8px)',
  boxShadow: theme.e2,
} as const
