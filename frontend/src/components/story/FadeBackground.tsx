import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

interface Layer { id: string; style: CSSProperties; contain: boolean; imgUrl: string | null }
interface Props { id: string; style: CSSProperties; hold?: boolean; contain?: boolean; fast?: boolean }

/** 从背景样式里提取 url(...) 中的图片地址(纯渐变兜底时为 null) */
function bgImageUrl(style: CSSProperties): string | null {
  const img = (style as { backgroundImage?: string }).backgroundImage
  if (!img) return null
  const m = img.match(/url\((['"]?)(.*?)\1\)/)
  return m ? m[2] : null
}

/** 预加载图片(已缓存时立即返回; 失败/超时 2.5s 也放行, 不阻塞演出) */
function preload(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    const done = () => resolve()
    img.onload = done
    img.onerror = done
    img.src = url
    window.setTimeout(done, 2500)
  })
}

/**
 * 背景层:
 * - 平时(hold=false): 先预加载新图, 加载完成后再两层交叉溶解(旧背景保留到新背景 100% 淡入, 平滑无白)。
 * - 黑场转场(hold=true): 换背景发生在节点载入时 → 先"保持旧背景"不动, 等黑场全覆盖后(约0.6s)
 *   再换成新背景(黑幕里换), 随后转场"亮出"就是新背景 —— 即"先黑屏→再换背景→再睁眼"。
 * - contain=true(CG 等 4:3 插图): 黑底 + object-fit:contain 完整展示, 不裁切;
 *   contain=false(场景背景): 全屏 cover 铺满。
 */
export default function FadeBackground({ id, style, hold = false, contain = false, fast = false }: Props) {
  const [shown, setShown] = useState<Layer>(() => ({ id, style, contain, imgUrl: bgImageUrl(style) }))
  const [prev, setPrev] = useState<Layer | null>(null)
  const shownRef = useRef<Layer>(shown)
  shownRef.current = shown

  useEffect(() => {
    if (shownRef.current.id === id && shownRef.current.contain === contain) return // 已显示
    let cancelled = false
    const apply = () => {
      if (cancelled) return
      setPrev(shownRef.current)
      setShown({ id, style, contain, imgUrl: bgImageUrl(style) })
      window.setTimeout(() => setPrev(null), 1000)
    }
    if (hold) {
      // 黑场期: 保持旧背景, 等黑场全覆盖后(0.6s)再换(黑幕里换)
      const t = window.setTimeout(() => { void preload(bgImageUrl(style) ?? '').then(apply) }, 620)
      return () => { cancelled = true; clearTimeout(t) }
    }
    // 新图预加载完成后再开始淡入, 避免"淡入动画播完图才蹦出来"的硬切感
    void preload(bgImageUrl(style) ?? '').then(apply)
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, style, hold, contain])

  return (
    <>
      {prev && renderLayer(prev, fast)}
      {renderLayer(shown, fast)}
    </>
  )
}

function renderLayer(layer: Layer, fast: boolean) {
  const useContain = layer.contain && layer.imgUrl
  if (!useContain) {
    // 场景背景 / 纯渐变兜底: div 背景 cover 全屏
    return <div key={layer.id} className="bgFade" style={{ ...styles.layer, ...layer.style, animationDuration: fast ? '180ms' : undefined }} />
  }
  // CG 类插图(录取通知书 / 历史蒙太奇图片等): 必须 contain 完整展示, 不能裁切关键内容
  // 四周留的空位用深米金渐变填充, 比纯黑边更有"档案/文物感"
  return (
    <div key={layer.id} className="bgFade" style={{ ...styles.layer, ...styles.cgBackdrop, animationDuration: fast ? '180ms' : undefined }}>
      <img src={layer.imgUrl!} alt="" loading="lazy" style={styles.imgContain} />
    </div>
  )
}

const styles = {
  layer: { position: 'absolute' as const, inset: 0, backgroundSize: 'cover', backgroundPosition: 'center' },
  imgCover: { width: '100%', height: '100%', objectFit: 'cover' as const, objectPosition: 'center' as const },
  imgContain: { width: '100%', height: '100%', objectFit: 'contain' as const, objectPosition: 'center' as const },
  // CG 容器背景: 深色米金渐变 + 细微内阴影, 营造"文物档案展框"的感觉, 代替纯黑边
  cgBackdrop: {
    background: 'radial-gradient(ellipse at center, #2a241c 0%, #14110c 72%, #0b0a08 100%)',
    boxShadow: 'inset 0 0 180px rgba(0,0,0,0.75), inset 0 0 40px rgba(200,160,80,0.08)',
  },
} as const
