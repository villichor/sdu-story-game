import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './auth/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import HomePage from './pages/HomePage'
import ContinuePage from './pages/ContinuePage'
import AchievementsPage from './pages/AchievementsPage'
import StoryPage from './pages/StoryPage'
import LoginCallbackPage from './pages/LoginCallbackPage'

/** 登录守卫: 未登录跳回首页(首页可看, 进入游戏/存档/成就需登录) */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a94a1', background: '#241a10' }}>加载中…</div>
  if (!user) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function AppRoutes() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login-success" element={<LoginCallbackPage />} />
        <Route path="/continue" element={<RequireAuth><ContinuePage /></RequireAuth>} />
        <Route path="/achievements" element={<RequireAuth><AchievementsPage /></RequireAuth>} />
        <Route path="/story/:saveId" element={<RequireAuth><StoryPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
