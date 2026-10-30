import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { theme } from '../../theme'

interface Props {
  title?: string
  subtitle?: string
  /** 返回首页，不清除当前登录态 */
  onExit?: () => void
  backTo?: string
  /** 浮在场景背景上时用透明毛玻璃 */
  transparent?: boolean
  /** 右侧额外按钮(放在退出左边) */
  rightExtra?: ReactNode
}

export function Header({ title, subtitle, onExit, backTo, transparent, rightExtra }: Props) {
  return (
    <header style={transparent ? styles.headerTransparent : styles.header}>
      <div style={styles.left}>
        <Link to={backTo ?? '/'} style={styles.brand}>山大人文故事</Link>
        {title && <span style={styles.title}>{title}</span>}
        {subtitle && <span style={styles.sub}>{subtitle}</span>}
      </div>
      <div style={styles.right}>
        {rightExtra}
        {onExit && (
          <button style={styles.logout} onClick={onExit}>返回首页</button>
        )}
      </div>
    </header>
  )
}

const styles = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid ' + theme.border, background: theme.panel, position: 'sticky' as const, top: 0, zIndex: 20, boxShadow: theme.e1 },
  headerTransparent: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.68)', backdropFilter: 'blur(10px)', position: 'sticky' as const, top: 0, zIndex: 20 },
  left: { display: 'flex', alignItems: 'baseline', gap: 18 },
  right: { display: 'flex', alignItems: 'center', gap: 10 },
  brand: { fontFamily: 'var(--font-display)', color: theme.goldDark, fontWeight: 700, fontSize: 21, letterSpacing: '0.02em', textDecoration: 'none' },
  title: { color: theme.text, fontSize: 15, fontWeight: 600 },
  sub: { color: theme.textLight, fontSize: 13 },
  logout: { background: 'transparent', color: theme.textSoft, border: '1px solid ' + theme.border, borderRadius: 8, padding: '7px 18px', cursor: 'pointer', transition: 'border-color 160ms var(--ease), color 160ms var(--ease)' },
} as const
