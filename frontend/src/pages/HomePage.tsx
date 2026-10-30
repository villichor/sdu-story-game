import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { CaretRight } from '@phosphor-icons/react'
import { useAuth } from '../auth/AuthContext'
import { USE_MOCK } from '../api'
import { startCasLogin } from '../lib/auth'
import { ChapterPicker } from '../components/ChapterPicker'
import { SettingsModal } from '../components/SettingsModal'
import { UserCenter } from '../components/UserCenter'
import { theme } from '../theme'
import { homeBg } from '../assets/home/bgs'

export default function HomePage() {
  const navigate = useNavigate()
  const { user, loginGuest } = useAuth()
  const [modal, setModal] = useState<'user' | 'chapter' | 'settings' | null>(null)
  const root = useRef<HTMLDivElement>(null)
  // 会话级共享随机背景(刷新才换, 页面间一致)
  const bg = homeBg()

  useEffect(() => {
    if (USE_MOCK && !user) void loginGuest().catch(() => {})
  }, [user, loginGuest])

  // GSAP 入场动效(尊重 prefers-reduced-motion)
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || !root.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo('.h-title', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' })
      gsap.fromTo('.h-menu > *', { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.12, delay: 0.15, ease: 'power3.out' })
      gsap.fromTo('.h-bg', { scale: 1.08, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.1, ease: 'power2.out' })
    }, root)
    return () => ctx.revert()
  }, [])

  // ESC 打开/关闭 设置弹窗
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (modal === null) {
        e.preventDefault()
        setModal('settings')
      } else if (modal === 'settings') {
        e.preventDefault()
        setModal(null)
      }
      // user/chapter 弹窗交给 Modal 本身的 ESC 处理
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal])

  return (
    <div ref={root} style={styles.root}>
      {/* 全屏实景风景背景(每次进入随机一张) */}
      <div className="h-bg" style={{ ...styles.bg, backgroundImage: `url(${bg})` }} />
      <div style={styles.scrim} />

      {/* 标题(左) */}
      <header style={styles.titleWrap} className="h-title">
        <h1 style={styles.title}>山大人文故事</h1>
        <p style={styles.subtitle}>穿越百年山大 · 见证山大人的求索与传承</p>
      </header>

      {/* 右上角: 用户圆钮 */}
      <button style={styles.userCircle} className="lift" onClick={() => setModal('user')} aria-label="用户中心">
        {user ? user.username.slice(0, 1) : '登'}
      </button>

      {/* 游客态: 学号/统一认证登录 */}
      {(!user || user.isGuest) && (
        <button style={styles.casBtn} className="lift" onClick={() => startCasLogin('/')}>
          学号登录
        </button>
      )}

      {/* 右下角: 菜单 */}
      <nav style={styles.menu} className="h-menu">
        <button style={styles.menuPrimary} className="lift" onClick={() => setModal('chapter')}>
          <span style={styles.menuPrimaryText}>开始新游戏</span>
          <span style={styles.menuPrimarySub}>NEW GAME</span>
        </button>
        <div style={styles.menuRow}>
          <button style={styles.menuSmall} className="lift" onClick={() => navigate('/continue')}>
            <span style={styles.menuSmallText}>继续游戏</span>
            <span style={styles.menuSmallSub}>存档</span>
          </button>
          <button style={styles.menuSmall} className="lift" onClick={() => navigate('/achievements')}>
            <span style={styles.menuSmallText}>成就</span>
            <span style={styles.menuSmallSub}>记忆册</span>
          </button>
        </div>
        <button style={styles.menuQuiet} className="lift" onClick={() => setModal('settings')}>
          <span>设置</span>
          <CaretRight size={16} weight="bold" />
        </button>
      </nav>

      {modal === 'user' && <UserCenter onClose={() => setModal(null)} />}
      {modal === 'chapter' && <ChapterPicker onClose={() => setModal(null)} />}
      {modal === 'settings' && <SettingsModal onClose={() => setModal(null)} />}
    </div>
  )
}

const styles = {
  root: { position: 'relative' as const, width: '100%', height: '100vh', overflow: 'hidden', color: theme.text, fontFamily: 'var(--font-body)' },
  bg: { position: 'absolute' as const, inset: 0, backgroundSize: 'cover', backgroundPosition: 'center', willChange: 'transform' },
  scrim: { position: 'absolute' as const, inset: 0, background: 'linear-gradient(100deg, rgba(250,250,249,0.92) 0%, rgba(250,250,249,0.6) 38%, rgba(250,250,249,0.16) 70%, rgba(250,250,249,0.04) 100%), linear-gradient(180deg, rgba(250,250,249,0.0) 62%, rgba(250,250,249,0.5) 100%)' },
  titleWrap: { position: 'absolute' as const, top: '11%', left: '8.5%', zIndex: 4 },
  title: { fontFamily: 'var(--font-display)', fontSize: 'clamp(34px, 5.2vw, 60px)', letterSpacing: '0.01em', color: theme.text, fontWeight: 800, margin: '0 0 16px', textShadow: '0 1px 0 rgba(255,255,255,0.4)' },
  subtitle: { fontSize: 15, color: theme.gold, letterSpacing: '0.18em', fontWeight: 600 },
  userCircle: { position: 'absolute' as const, top: 30, right: 34, width: 58, height: 58, borderRadius: '50%', background: theme.gold, color: theme.onGold, border: '3px solid rgba(255,255,255,0.9)', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, cursor: 'pointer', boxShadow: theme.e2 },
  casBtn: { position: 'absolute' as const, top: 100, right: 34, background: 'rgba(255,255,255,0.92)', color: theme.gold, border: '1px solid ' + theme.border, borderRadius: 10, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: theme.e1, backdropFilter: 'blur(6px)' },
  menu: { position: 'absolute' as const, right: 44, bottom: 40, width: 320, display: 'flex', flexDirection: 'column', gap: 14, zIndex: 4 },
  menuPrimary: { display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start', textAlign: 'left', padding: '20px 26px', background: theme.gold, color: theme.onGold, border: 'none', borderRadius: 16, boxShadow: '0 8px 28px rgba(166,30,46,0.32)', cursor: 'pointer' },
  menuPrimaryText: { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '0.02em' },
  menuPrimarySub: { fontSize: 11, letterSpacing: '0.22em', opacity: 0.72 },
  menuRow: { display: 'flex', gap: 14 },
  menuSmall: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start', textAlign: 'left', padding: '14px 18px', background: 'rgba(255,255,255,0.92)', color: theme.text, border: '1px solid ' + theme.border, borderRadius: 14, boxShadow: theme.e1, cursor: 'pointer', backdropFilter: 'blur(6px)' },
  menuSmallText: { fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 },
  menuSmallSub: { fontSize: 11, color: theme.textLight, letterSpacing: '0.08em' },
  menuQuiet: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 22px', textAlign: 'left', background: 'rgba(255,255,255,0.92)', color: theme.textSoft, border: '1px solid ' + theme.border, borderRadius: 14, cursor: 'pointer', fontSize: 15, fontWeight: 600, boxShadow: theme.e1, backdropFilter: 'blur(6px)' },
} as const
