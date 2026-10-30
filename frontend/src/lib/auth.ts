import { authApi } from '../api'
import { clearToken } from '../api/client'

/**
 * 山东大学统一认证登录(SDU Pass) —— 对齐 recruit 项目的写法。
 * 流程: 调后端 GET /api/auth/login 拿 SSO 登录地址(后端自带正确的 forward/回调域名)
 *       → window.location.href = 该地址 → Pass 登录后携 code 回后端回调
 *       → 后端换 token 后 302 到前端 /auth/callback?token=... (失败 ?error=...)。
 * 说明见《sdu pass.docx》。
 */

export const LOGIN_REDIRECT_KEY = 'sdu_story:login_redirect'

/** 从后端返回的 map 里探测 SSO 登录地址(兼容常见键名, 对齐 recruit 的 pickUrlFromMap) */
function pickUrlFromMap(map: Record<string, string>): string | null {
  for (const key of ['url', 'loginUrl', 'authorizationUrl', 'authorizeUrl', 'redirectUrl', 'authUrl']) {
    const v = map?.[key]
    if (typeof v === 'string' && v) return v
  }
  for (const v of Object.values(map ?? {})) {
    if (typeof v === 'string' && /^https?:\/\//.test(v)) return v
  }
  return null
}

/** 拿 SSO 登录地址: 直接用后端口径构造 forward(后端回调地址) */
export async function getLoginUrl(): Promise<string> {
  // 先尝试调后端(如果以后后端补了 /api/auth/login 可直接用它)
  try {
    const map = await authApi.loginUrl()
    const url = pickUrlFromMap(map)
    if (url) return url
  } catch {
    /* 后端没有 /api/auth/login → 用 forward 构造 */
  }
  // 核心: forward 必须是"后端回调地址本身"(SDU Pass 注册的是 EXACT 完全匹配), 不能带前端 origin
  // 后端回调在 AuthController.casCallback: GET /api/auth/cas/callback
  // 所以 forward = ${后端baseURL}/api/auth/cas/callback
  const configuredBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
  const backendOrigin = new URL(configuredBase || '/', window.location.origin).origin
  const cb = `${backendOrigin}/api/auth/cas/callback`
  return `https://i.sdu.edu.cn/pass-api/login/page?forward=${encodeURIComponent(cb)}`
}

/** 发起登录: 记录回跳地址 → 跳 SSO 登录页 */
export async function startCasLogin(redirect?: string): Promise<void> {
  // 切换到学号登录时先移除游客登录态，避免失败回跳后仍显示为游客。
  clearToken()
  try {
    sessionStorage.setItem(LOGIN_REDIRECT_KEY, redirect ?? window.location.pathname)
  } catch {
    /* 忽略 */
  }
  const url = await getLoginUrl()
  window.location.href = url
}

/** 读取并消费登录回跳地址 */
export function consumeCasRedirect(): string {
  try {
    const v = sessionStorage.getItem(LOGIN_REDIRECT_KEY)
    sessionStorage.removeItem(LOGIN_REDIRECT_KEY)
    return v && v.startsWith('/') && !v.startsWith('//') ? v : '/'
  } catch {
    return '/'
  }
}
