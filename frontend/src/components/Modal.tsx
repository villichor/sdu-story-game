import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { theme } from '../theme'

interface Props {
  title?: string
  onClose: () => void
  children: ReactNode
  width?: number
}

export function Modal({ title, onClose, children, width = 520 }: Props) {
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const timerRef = useRef<number | undefined>(undefined)
  const close = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose()
      return
    }
    setClosing(true)
    timerRef.current = window.setTimeout(onClose, 180)
  }, [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  return (
    <div style={styles.overlay} className={closing ? 'modal-overlay modal-overlay--closing' : 'modal-overlay'} onClick={close} role="dialog" aria-modal="true" aria-label={title || '弹窗'}>
      <div style={{ ...styles.panel, maxWidth: width }} className={closing ? 'modal-panel modal-panel--closing' : 'modal-panel'} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div style={styles.header}>
            <span style={styles.title}>{title}</span>
            <button style={styles.close} onClick={close} aria-label="关闭">✕</button>
          </div>
        )}
        <div style={styles.body}>{children}</div>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(22,23,26,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(2px)' },
  panel: { width: '92%', background: theme.panel, color: theme.text, borderRadius: 18, boxShadow: theme.e3, overflow: 'hidden', border: '1px solid ' + theme.border },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 26px', borderBottom: '1px solid ' + theme.border, background: theme.panel },
  title: { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, letterSpacing: '0.01em', color: theme.text },
  close: { background: 'transparent', border: 'none', color: theme.textSoft, fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 6, transition: 'color 160ms var(--ease)' },
  body: { padding: '24px 26px' },
} as const
