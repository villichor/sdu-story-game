import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { consumeCasRedirect } from '../lib/auth'
import { theme } from '../theme'

/** 统一认证登录回调: /auth/callback?token=... (成功) 或 ?error=... (失败) */
export default function LoginCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { loginToken } = useAuth()
  const [msg, setMsg] = useState('正在确认登录结果…')

  useEffect(() => {
    const error = params.get('error')
    const token = params.get('token')
    const redirect = consumeCasRedirect()
    ;(async () => {
      if (error) {
        setMsg('登录失败: ' + (error === 'missing_code' ? '缺少授权码' : error === 'cas_login_failed' ? '统一认证登录失败' : error))
        const t = setTimeout(() => navigate('/', { replace: true }), 2400)
        return () => clearTimeout(t)
      }
      if (token) {
        try {
          await loginToken(token)
          setMsg('登录成功, 正在返回…')
          const t = setTimeout(() => navigate(redirect, { replace: true }), 700)
          return () => clearTimeout(t)
        } catch (e) {
          setMsg('登录成功, 但拉取用户资料失败: ' + (e as Error).message)
          const t = setTimeout(() => navigate('/', { replace: true }), 2600)
          return () => clearTimeout(t)
        }
      }
      setMsg('未收到授权结果, 返回首页…')
      const t = setTimeout(() => navigate('/', { replace: true }), 1800)
      return () => clearTimeout(t)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.spinner} />
        <p style={styles.msg}>{msg}</p>
      </div>
    </div>
  )
}

const styles = {
  root: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.bg },
  card: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, background: theme.panel, border: '1px solid ' + theme.border, borderRadius: 18, padding: '40px 56px', boxShadow: theme.e2 },
  spinner: { width: 40, height: 40, borderRadius: '50%', border: '4px solid ' + theme.border, borderTopColor: theme.gold, animation: 'spin 0.9s linear infinite' },
  msg: { color: theme.textSoft, fontSize: 15, maxWidth: 360, textAlign: 'center' },
} as const
