import axios from 'axios'
import type { AxiosError, AxiosRequestConfig } from 'axios'
import { AUTH_ERROR_CODES, ERROR_CODE } from './types'
import type { ApiResult } from './types'
import { friendlyError } from '../lib/constants'

/** 后端基础地址，生产环境默认同源；本地开发通过 .env.development 覆盖 */
export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

// ---------------- Token 管理 ----------------
const TOKEN_KEY = 'sdu_story_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// ---------------- 业务错误 ----------------
export class ApiError extends Error {
  code: number
  constructor(code: number, msg: string) {
    super(msg)
    this.name = 'ApiError'
    this.code = code
  }
}

/** 全局"登录态失效"事件, AuthProvider 监听后清 token 并跳登录页 */
export const UNAUTHORIZED_EVENT = 'sdu_story:unauthorized'
export function emitUnauthorized() {
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
}

// ---------------- axios 实例 ----------------
const http = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    // 业务异常也可能 HTTP 200, 必须判断 body.code === 200
    const result = response.data as ApiResult
    if (result && typeof result.code === 'number') {
      if (result.code === ERROR_CODE.SUCCESS) {
        return response // 交给 next 层取 .data
      }
      // 登录态失效 → 清 token + 广播
      if (AUTH_ERROR_CODES.has(result.code)) {
        clearToken()
        emitUnauthorized()
      }
      throw new ApiError(result.code, result.msg)
    }
    return response
  },
  (error: AxiosError<ApiResult>) => {
    const res = error.response
    if (res?.data && typeof res.data.code === 'number') {
      if (AUTH_ERROR_CODES.has(res.data.code)) {
        clearToken()
        emitUnauthorized()
      }
      throw new ApiError(res.data.code, res.data.msg)
    }
    // 网络错误/超时/连接拒绝
    let netCode: number | string = 'NETWORK'
    if (error.code === 'ECONNABORTED') netCode = 'TIMEOUT'
    else if (error.code === 'ERR_NETWORK') netCode = 'NETWORK'
    const msg = friendlyError(netCode, error.message ?? '请求失败')
    throw new ApiError(-1, msg)
  },
)

/** 统一请求入口: 自动带 token, 返回业务 data */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const res = await http.request<ApiResult<T>>(config)
  return res.data.data
}

export default http
