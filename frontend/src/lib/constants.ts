/** 全局魔法数字/字符串集中管理 —— 消除散落的硬编码 */

/* ===== 剧情演出 timing ===== */
export const TIMING = {
  /** 成就 toast 之间的间隔(ms) */
  ACHV_TOAST_GAP: 1200,
  /** 成就 toast 展示时长(ms) */
  ACHV_TOAST_DURATION: 2800,
  /** 走马灯自动推进间隔(ms) */
  MONTAGE_INTERVAL: 3600,
  /** 重选快进步长(ms) */
  FASTFORWARD_STEP: 30,
  /** 转场 hold 清除延迟(ms) */
  TRANSITION_HOLD_CLEAR: 2100,
  /** 闭眼→睁眼 自动补播延迟(ms) */
  EYES_AUTO_OPEN_DELAY: 50,
  /** 文字延迟出现(避免与背景同步突兀) */
  BG_TEXT_DELAY_MS: 280,
  /** 打字机逐字间隔(ms) */
  TYPEWRITER_MS: 45,
  /** 黑屏字幕逐字间隔(ms) */
  SUBTITLE_TYPEWRITER_MS: 42,
  /** 重选快进最大步数(防死循环) */
  FASTFORWARD_GUARD: 20,
  /** 走马灯逐行间隔(ms) */
  MONTAGE_LINE_MS: 3600,
  /** 尝试过提示展示时长(ms) */
  TRIED_NOTICE_DURATION: 1800,
  /** 收集物 toast 展示时长(ms) */
  COLLECTION_TOAST_DURATION: 2800,
  /** 日期横幅展示时长(ms) */
  DATE_BANNER_DURATION: 2000,
  /** 隐藏CG逐字间隔(ms) */
  HIDDEN_CG_TYPEWRITER_MS: 55,
  /** 转场动画总时长(ms) —— eyes_close 0.9 + eyes_open 0.5+1.2 */
  TRANSITION_TOTAL_MS: 2100,
} as const

/* ===== 左上角场景标签动画 ===== */
export const SCENE_LABEL = {
  /** 逐字浮现间隔(ms/字) */
  CHAR_IN_MS: 60,
  /** 全部浮现后维持时长(ms) */
  HOLD_MS: 1500,
  /** 逐字消失间隔(ms/字) */
  CHAR_OUT_MS: 50,
  /** 标签消失后等待多久允许下次触发(防抖, ms) */
  COOLDOWN_MS: 200,
} as const

/* ===== 存档流程图 ===== */
export const FLOW_CHART = {
  /** 节点最小宽度(px) */
  NODE_W: 170,
  /** 节点最小高度(px) */
  NODE_H: 64,
  /** 骨架节点数估算范围 */
  EST_MIN: 12,
  EST_MAX: 18,
  /** 分叉判定剩余节点数阈值 */
  TRIFORK_THRESHOLD: 3,
} as const

/* ===== localStorage key ===== */
export const LS_KEYS = {
  COLLECTIONS: 'sdustr.collections',
  SETTINGS: 'sdustr.settings',
  TOKEN: 'sdustr.token',
  USER: 'sdustr.user',
  ACHV_SHOWN: 'sdustr.achv_shown',
} as const

/* ===== sessionStorage key ===== */
export const SESSION_KEYS = {
  HUA_CHOICE_FLAGS: 'hua_choice_flags',
  HUA_FAILED_CHOICES: 'hua_failed_choices',
} as const

/* ===== 错误码 → 友好文案 ===== */
export const ERROR_COPY: Record<number | string, string> = {
  401: '登录已过期，请重新登录',
  403: '没有权限执行此操作',
  404: '请求的内容不存在',
  422: '数据格式有问题',
  500: '服务器开小差了，请稍后再试',
  502: '服务器暂时不可用',
  503: '服务器维护中',
  504: '服务器响应超时',
  NETWORK: '网络连接失败，请检查网络',
  TIMEOUT: '请求超时，请重试',
}

export function friendlyError(code: number | string, fallbackMsg?: string): string {
  return ERROR_COPY[code] ?? fallbackMsg ?? '未知错误'
}

/* ===== 场景标签文字格式化 ===== */
/** 把 "第一幕：红楼里的新居" 格式化为 "第一幕—红楼里的新居" */
export function formatSceneTitle(raw?: string): string {
  if (!raw) return '未知场景'
  // 处理冒号/：分隔
  const colonIdx = raw.indexOf('：') >= 0 ? raw.indexOf('：') : raw.indexOf(':')
  if (colonIdx >= 0) {
    return raw.slice(0, colonIdx) + '—' + raw.slice(colonIdx + 1).trim()
  }
  // 处理 "·书生线" 等后缀 —— 保留原样即可
  return raw
}
