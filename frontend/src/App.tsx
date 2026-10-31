import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
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
  const location = useLocation()
  const [displayLocation, setDisplayLocation] = useState(location)
  const snapshotRef = useRef<HTMLElement | null>(null)
  const snapshotTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => () => {
    window.clearTimeout(snapshotTimerRef.current)
    snapshotRef.current?.remove()
  }, [])
  useEffect(() => {
    if (location === displayLocation) return
    const pages = new Set(['/', '/continue', '/achievements'])
    const animate = location.pathname !== displayLocation.pathname
      && pages.has(location.pathname) && pages.has(displayLocation.pathname)
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let cancelled = false
    const start = window.setTimeout(() => {
      if (!animate) {
        setDisplayLocation(location)
        return
      }
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          if (!cancelled) flushSync(() => setDisplayLocation(location))
        })
        return
      }
      const root = document.getElementById('root')
      if (!root) { setDisplayLocation(location); return }
      window.clearTimeout(snapshotTimerRef.current)
      snapshotRef.current?.remove()
      const overlay = document.createElement('div')
      overlay.className = 'page-transition-snapshot'
      overlay.setAttribute('aria-hidden', 'true')
      overlay.inert = true
      const oldPage = root.cloneNode(true) as HTMLElement
      oldPage.removeAttribute('id')
      oldPage.style.transform = `translateY(-${window.scrollY}px)`
      overlay.appendChild(oldPage)
      document.body.appendChild(overlay)
      snapshotRef.current = overlay
      flushSync(() => setDisplayLocation(location))
      requestAnimationFrame(() => overlay.classList.add('page-transition-snapshot--fading'))
      snapshotTimerRef.current = window.setTimeout(() => {
        overlay.remove()
        if (snapshotRef.current === overlay) snapshotRef.current = null
      }, 400)
    }, 0)
    return () => { cancelled = true; window.clearTimeout(start) }
  }, [location, displayLocation])

  return (
    <ErrorBoundary>
      <Routes location={displayLocation}>
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
