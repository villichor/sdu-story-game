import { useEffect, useState } from 'react'
import { theme } from '../../theme'

interface Props { text: string }

/** 逐字出现的文字(带 「」 角标), 用于黑屏字幕等 */
export default function TypedText({ text }: Props) {
  const [shown, setShown] = useState(text.length)
  useEffect(() => {
    setShown(0)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || !text) { setShown(text.length); return }
    const iv = setInterval(() => setShown((s) => (s < text.length ? s + 1 : s)), 42)
    return () => clearInterval(iv)
  }, [text])
  return (
    <span>
      <span style={br}>「</span>{text.slice(0, shown)}<span style={br}>」</span>
    </span>
  )
}

const br = { color: theme.gold, fontWeight: 700, margin: '0 4px' }
