/** 场景标签: 背景切换时逐字浮现 → 维持 1.5s → 逐字消失 */
import { useEffect, useRef, useState } from 'react'
import { SCENE_LABEL } from '../../lib/constants'

interface Props {
  text: string
  /** 触发动画的 token —— 每次变化都会重启动画 */
  triggerKey: string | number
}

/** 逐字淡入/淡出场景标签. 不连续触发时返回 null(标签隐藏) */
export function SceneLabel({ text, triggerKey }: Props) {
  const [visibleCount, setVisibleCount] = useState(0)   // 已浮现的字数
  const [phase, setPhase] = useState<'hidden' | 'fadingIn' | 'holding' | 'fadingOut'>('hidden')
  const timersRef = useRef<number[]>([])

  // 清理所有定时器
  const clearAll = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t))
    timersRef.current = []
  }

  useEffect(() => {
    if (!text) return
    clearAll()
    setVisibleCount(0)
    setPhase('fadingIn')

    const chars = Array.from(text) // 兼容 Unicode 代理对

    // Phase 1: 逐字浮现
    chars.forEach((_, i) => {
      const t = window.setTimeout(() => {
        setVisibleCount(i + 1)
        if (i === chars.length - 1) {
          // 全部浮现后进入维持阶段
          const holdT = window.setTimeout(() => {
            setPhase('holding')
            // Phase 3: 逐字消失
            chars.forEach((_, j) => {
              const outT = window.setTimeout(() => {
                setVisibleCount(chars.length - 1 - j)
                if (j === chars.length - 1) {
                  // 全部消失 → 隐藏
                  const doneT = window.setTimeout(() => {
                    setPhase('hidden')
                  }, 120)
                  timersRef.current.push(doneT)
                }
              }, j * SCENE_LABEL.CHAR_OUT_MS)
              timersRef.current.push(outT)
            })
            setPhase('fadingOut')
          }, SCENE_LABEL.HOLD_MS)
          timersRef.current.push(holdT)
        }
      }, i * SCENE_LABEL.CHAR_IN_MS)
      timersRef.current.push(t)
    })

    return clearAll
  }, [triggerKey, text])

  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // prefers-reduced-motion: 直接显示整段文字, 不动画
  if (reduced && phase !== 'hidden') {
    return <span style={style}> {text} </span>
  }

  if (phase === 'hidden') return null

  const chars = Array.from(text)
  return (
    <span style={style} aria-hidden={phase !== 'holding'}>
      {chars.map((ch, i) => (
        <span
          key={i}
          style={{
            opacity: i < visibleCount ? 1 : 0,
            transition: `opacity 180ms ease-out`,
          }}
        >
          {ch}
        </span>
      ))}
    </span>
  )
}

const style: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 15,
  color: 'rgba(255,255,255,0.92)',
  fontWeight: 600,
  background: 'rgba(10,10,12,0.55)',
  border: '1px solid rgba(255,255,255,0.22)',
  borderRadius: 8,
  padding: '4px 14px',
  backdropFilter: 'blur(6px)',
  letterSpacing: '0.06em',
  position: 'relative',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
}
