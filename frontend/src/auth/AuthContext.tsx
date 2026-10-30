import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi } from '../api'
import { clearToken, getToken, setToken, UNAUTHORIZED_EVENT } from '../api/client'
import type { UserInfo } from '../api/types'

interface AuthState {
  user: UserInfo | null
  loading: boolean
  isGuest: boolean
  /** 游客登录 */
  loginGuest: () => Promise<void>
  /** 统一认证回调: 用后端返回的 token 建立登录态 */
  loginToken: (token: string) => Promise<void>
  /** 清登录态 */
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const handleUnauthorized = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [handleUnauthorized])

  // 恢复登录态: 已有 token 则拉取用户信息
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => {
        clearToken()
      })
      .finally(() => setLoading(false))
  }, [])

  const loginGuest = useCallback(async () => {
    const { token } = await authApi.guestLogin()
    setToken(token)
    const me = await authApi.me()
    setUser(me)
  }, [])

  const loginToken = useCallback(async (token: string) => {
    setToken(token)
    const me = await authApi.me()
    setUser(me)
    setLoading(false)
  }, [])

  const value = useMemo<AuthState>(
    () => ({ user, loading, isGuest: !!user?.isGuest, loginGuest, loginToken, logout }),
    [user, loading, loginGuest, loginToken, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 <AuthProvider> 内使用')
  return ctx
}
