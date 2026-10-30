import { useCallback, useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { theme } from '../../theme'
import room from '../../assets/hua/minigame/room.jpg'
import item_sheet from '../../assets/hua/minigame/item_sheet.png'
import item_mug from '../../assets/hua/minigame/item_mug.png'
import item_pen from '../../assets/hua/minigame/item_pen.png'
import item_book from '../../assets/hua/minigame/item_book.png'

/**
 * 华岗篇·第一幕「整理行囊」·GSAP 增强版 v3。
 * 优化:
 *  - 内心独白改为"点击继续"字幕(旧版 3.2s 自动消失, 根本读不完)
 *  - 完成后夕阳旁白改为点击继续(旧版 2.6s 自动跳过)
 *  - 拖拽改为 window 级指针监听, 指针移出画面也不丢事件
 *  - 拖拽/选中物品时空投放区金色高亮提示; 落位物品由投放区贴图展示
 */

interface Item {
  id: string; name: string; img: string; zone: string;
  monologue: string; // 飞书文档版完整内心独白
}

const ITEMS: Item[] = [
  {
    id: 'sheet', name: '粗布床单', img: item_sheet, zone: 'bed',
    monologue: '这床板真硬，木条缝隙大得能塞进一根手指。不过没关系，比起以前家里漏雨的土炕，这已经是天堂了。只要把床单铺平整，拍一拍，晚上就能伴着窗外的海浪声入梦。',
  },
  {
    id: 'mug', name: '搪瓷茶缸', img: item_mug, zone: 'tl',
    monologue: '桌子有些摇晃，桌面上还有几道刻痕，大概是往届学长留下的。但这没关系，擦干净了，它就是我的阵地。搪瓷缸子磕碰出的声响，就是新生活的序曲。',
  },
  {
    id: 'pen', name: '钢笔与笔记本', img: item_pen, zone: 'center',
    monologue: '笔墨要备齐。听说这里的教授们学问极大，华校长更是学识渊博。我得把每一堂课的精华都记下来，绝不能辜负这来之不易的机会。',
  },
  {
    id: 'book', name: '旧书《社会发展史》', img: item_book, zone: 'tr',
    monologue: '最后，把这本翻旧了的书放在手边。在这个崭新的时代里，它是我从过去带来的锚。无论环境怎么变，只要翻开书页，心就能静下来。',
  },
]

/** 完成后的夕阳旁白(飞书文档版) */
const SUNSET_NARRATION = '夕阳的余晖透过吱呀作响的木窗棂洒进宿舍，给斑驳的墙壁镀上了一层金边。看着整洁的桌面，你长舒了一口气。虽然条件简陋，但空气中弥漫着一种蓬勃向上的朝气。'

// 投放区位置百分比 —— 按 room.jpg 实际画面校准 (床板/桌面区域)
const ZONES: Record<string, { label: string; left: string; top: string; width: string; height: string }> = {
  bed:    { label: '硬板床',    left: '5%',  top: '58%', width: '41%', height: '32%' },
  tl:     { label: '书桌·左上',  left: '53%', top: '41%', width: '9%',  height: '12%' },
  center: { label: '书桌·中央',  left: '62%', top: '49%', width: '14%', height: '12%' },
  tr:     { label: '书桌·右上',  left: '72%', top: '39%', width: '13%', height: '13%' },
}

export default function MinigameLuggage({ onComplete }: { onComplete: () => void }) {
  const [placed, setPlaced]       = useState<Record<string, string>>({})   // zone → itemId
  const [selected, setSelected]   = useState<string | null>(null)
  const [dragItem, setDragItem]   = useState<string | null>(null)
  const [monologue, setMonologue] = useState<string | null>(null)
  const [finished, setFinished]   = useState(false)

  const rootRef   = useRef<HTMLDivElement>(null)
  const itemRefs  = useRef<Record<string, HTMLDivElement | null>>({})
  const zoneRefs  = useRef<Record<string, HTMLDivElement | null>>({})
  // GSAP 的 x/y 是相对元素"自然布局位置"(物品栏槽位)的偏移。
  // 拖拽/落位都必须以按下时的自然位置为基准, 否则会飞到错误的固定位置。
  const naturalRectRef  = useRef<Record<string, DOMRect>>({})
  const grabOffsetRef   = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  // 区分"拖拽"与"点选": 位移超过阈值才算拖拽, 避免松手后的 click 误切换选中态
  const downPosRef = useRef<{ x: number; y: number } | null>(null)
  const suppressClickRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  /** 物品落位 */
  const place = useCallback((itemId: string, zoneId: string) => {
    const item  = ITEMS.find((i) => i.id === itemId)!
    const zoneEl = zoneRefs.current[zoneId]
    const itemEl = itemRefs.current[itemId]
    if (!zoneEl || !itemEl || placed[zoneId]) return

    if (item.zone === zoneId) {
      // 正确：GSAP 回弹落位 → 显示内心独白(点击继续)
      // 目标偏移 = 投放区中心 - 物品自然位置(物品栏槽位), 这样动画终点才正确
      const zoneRect = zoneEl.getBoundingClientRect()
      const natural = naturalRectRef.current[itemId] ?? itemEl.getBoundingClientRect()
      const x = zoneRect.left + zoneRect.width / 2 - (natural.left + natural.width / 2)
      const y = zoneRect.top + zoneRect.height / 2 - (natural.top + natural.height / 2)
      gsap.to(itemEl, {
        x, y, scale: 1.0, rotate: 0,
        duration: 0.55, ease: 'back.out(1.6)',
        onComplete: () => {
          setPlaced((p) => ({ ...p, [zoneId]: itemId }))
          setMonologue(item.monologue)
          gsap.to(zoneEl, {
            boxShadow: '0 0 0 3px rgba(210,175,105,0.9), 0 0 24px rgba(210,175,105,0.55)',
            duration: 0.35,
          })
        },
      })
    } else {
      // 错误：原地抖动(相对位移) → 弹回物品栏原位 + 顶部 toast
      gsap.to(itemEl, {
        keyframes: [
          { x: '-=14', duration: 0.06 },
          { x: '+=28', duration: 0.06 },
          { x: '-=24', duration: 0.05 },
          { x: '+=20', duration: 0.05 },
          { x: '-=10', duration: 0.12 },
        ],
        duration: 0.35, ease: 'power2.out',
        onComplete: () => gsap.to(itemEl, { x: 0, y: 0, rotate: 0, scale: 1, duration: 0.32, ease: 'back.inOut(1.2)' }),
      })
      showTopToast('这个位置不太对，再看看？')
    }
  }, [placed])

  /** 独白点击继续: 收起独白; 若已全部归置则进入夕阳收尾 */
  const dismissMonologue = useCallback(() => {
    setMonologue(null)
    if (Object.keys(placed).length === ITEMS.length) setFinished(true)
  }, [placed])

  /** 顶部错误 toast */
  const showTopToast = (text: string) => {
    const root = rootRef.current
    if (!root) return
    root.querySelectorAll('.luggage-toast-error').forEach((n) => n.remove())
    const div = document.createElement('div')
    div.className = 'luggage-toast-error'
    div.textContent = text
    Object.assign(div.style, {
      position: 'absolute', top: '22%', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(166,30,46,0.94)', color: '#fff', padding: '10px 22px',
      borderRadius: 10, fontSize: 14, fontWeight: 600, zIndex: 99,
      boxShadow: theme.e1, pointerEvents: 'none',
    })
    root.appendChild(div)
    gsap.fromTo(div, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.25 })
    window.setTimeout(() => {
      gsap.to(div, { autoAlpha: 0, duration: 0.25, onComplete: () => div.remove() })
    }, 1400)
  }

  /** 物品按下: 进入拖拽候选(位移超阈值才算真拖拽, 否则视为点选) */
  const onItemPointerDown = (itemId: string, e: React.PointerEvent) => {
    if (Object.values(placed).includes(itemId) || finished || monologue) return
    e.preventDefault()
    downPosRef.current = { x: e.clientX, y: e.clientY }
    suppressClickRef.current = false
    const el = itemRefs.current[itemId]
    if (el) {
      // 记录按下时的自然布局位置与抓取偏移(指针相对元素中心的距离), 供拖拽时换算
      naturalRectRef.current[itemId] = el.getBoundingClientRect()
      const rect = naturalRectRef.current[itemId]
      grabOffsetRef.current = {
        x: e.clientX - (rect.left + rect.width / 2),
        y: e.clientY - (rect.top + rect.height / 2),
      }
      gsap.to(el, { scale: 1.15, boxShadow: '0 14px 32px rgba(0,0,0,0.4)', duration: 0.18, ease: 'power2.out' })
    }
    setDragItem(itemId)
  }

  // 拖拽中: window 级监听, 指针移出画面也能跟随/落点判定
  useEffect(() => {
    if (!dragItem) return
    const move = (e: PointerEvent) => {
      const el = itemRefs.current[dragItem]
      const down = downPosRef.current
      if (!el) return
      // 位移超过 6px 才算真拖拽(否则视为点选)
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) suppressClickRef.current = true
      // GSAP x/y 是相对元素自然位置的偏移: 目标中心 = 指针 - 抓取偏移, 再减去自然中心
      const natural = naturalRectRef.current[dragItem]
      if (!natural) return
      const targetCx = e.clientX - grabOffsetRef.current.x
      const targetCy = e.clientY - grabOffsetRef.current.y
      const natCx = natural.left + natural.width / 2
      const natCy = natural.top + natural.height / 2
      gsap.set(el, { x: targetCx - natCx, y: targetCy - natCy, rotate: -6 })
    }
    const up = (e: PointerEvent) => {
      const root = rootRef.current
      if (root) {
        const rootRect = root.getBoundingClientRect()
        const ex = e.clientX - rootRect.left
        const ey = e.clientY - rootRect.top
        let hitZone: string | null = null
        for (const zid of Object.keys(ZONES)) {
          const zr = zoneRefs.current[zid]?.getBoundingClientRect()
          if (!zr) continue
          const zx = zr.left - rootRect.left
          const zy = zr.top - rootRect.top
          if (ex >= zx && ex <= zx + zr.width && ey >= zy && ey <= zy + zr.height) { hitZone = zid; break }
        }
        if (hitZone) {
          place(dragItem, hitZone)
          setSelected(null)
        } else if (suppressClickRef.current) {
          // 真拖拽但没接住 → 弹回原位
          const el = itemRefs.current[dragItem]
          if (el) gsap.to(el, { x: 0, y: 0, scale: 1, rotate: 0, boxShadow: '', duration: 0.35, ease: 'back.inOut(1.2)' })
        } else {
          // 纯点击(点选模式): 切换选中态
          const el = itemRefs.current[dragItem]
          if (el) gsap.to(el, { scale: 1, boxShadow: '', duration: 0.18 })
          setSelected((prev) => (prev === dragItem ? null : dragItem))
        }
      }
      setDragItem(null)
      downPosRef.current = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [dragItem, place])

  /** 点选模式 (移动端 fallback): 点物品选中 → 点投放区放置 */
  const onZoneClick = (zoneId: string) => {
    if (!selected || placed[zoneId] || finished || monologue) return
    place(selected, zoneId)
    setSelected(null)
  }

  const placedCount = Object.keys(placed).length

  return (
    <div ref={rootRef} style={styles.root}>
      {/* 房间背景 */}
      <div style={{ ...styles.roomBg, backgroundImage: `url(${room})` }} />

      {/* 投放区 */}
      {Object.entries(ZONES).map(([zid, z]) => {
        const filled = !!placed[zid]
        const itemDone = filled ? ITEMS.find((i) => i.id === placed[zid]) : null
        return (
          <div
            key={zid}
            ref={(el) => { zoneRefs.current[zid] = el }}
            onClick={() => onZoneClick(zid)}
            style={{
              ...styles.zone,
              left: z.left, top: z.top, width: z.width, height: z.height,
              ...(filled ? styles.zoneFilled : {}),
              ...(!filled && (selected || dragItem) ? styles.zoneHint : {}),
            }}
          >
            {filled && itemDone ? (
              <div style={styles.zoneDoneWrap}>
                <img src={itemDone.img} alt="" style={styles.zoneDoneImg} />
                <span style={styles.zoneDoneLabel}>✓ 已归置</span>
              </div>
            ) : (
              <div style={styles.zoneLabel}>{z.label}</div>
            )}
          </div>
        )
      })}

      {/* 顶部标题 */}
      <div style={styles.topHint}>
        整理行囊
        <span style={{ ...styles.subHint, color: selected ? theme.goldLight : 'rgba(255,255,255,0.92)' }}>
          {selected ? '· 点击高亮区域放置' : '· 把物品拖到正确的位置'}
        </span>
        <span style={styles.progress}>{placedCount}/{ITEMS.length}</span>
      </div>

      {/* 底部物品栏 */}
      <div style={styles.tray}>
        {ITEMS.map((item) => {
          const placedDone  = Object.values(placed).includes(item.id)
          const isDragging  = dragItem === item.id
          return (
            <div
              key={item.id}
              ref={(el) => { itemRefs.current[item.id] = el }}
              onPointerDown={(e) => !placedDone && onItemPointerDown(item.id, e)}
              style={{
                ...styles.option,
                ...(placedDone   ? styles.optionDone     : {}),
                ...(isDragging   ? styles.optionDragging : {}),
                ...(selected === item.id && !placedDone ? styles.optionSelected : {}),
              }}
            >
              <img src={item.img} alt={item.name} style={styles.optionImg} draggable={false} />
              <span style={styles.optionTxt}>{placedDone ? '✓ ' : ''}{item.name}</span>
            </div>
          )
        })}
      </div>

      {/* 内心独白: 点击继续(读完再动, 不再自动消失) */}
      {monologue && (
        <div style={styles.monologueOverlay} onClick={dismissMonologue} role="button" aria-label="继续">
          <div style={styles.monologueBox}>{monologue}</div>
          <div style={styles.monologueHint}>▸ 点击继续</div>
        </div>
      )}

      {/* 夕阳收尾: 点击继续进入下一场 */}
      {finished && (
        <div style={styles.sunsetOverlay} onClick={() => onCompleteRef.current()} role="button" aria-label="继续">
          <div style={styles.sunsetBox}>{SUNSET_NARRATION}</div>
          <div style={styles.monologueHint}>▸ 点击继续</div>
        </div>
      )}
    </div>
  )
}

const styles = {
  root:  { position: 'absolute' as const, inset: 0, zIndex: 12, overflow: 'hidden', userSelect: 'none' as const, touchAction: 'none' as const },
  roomBg:{ position: 'absolute' as const, inset: 0, backgroundSize: 'cover' as const, backgroundPosition: 'center' as const },
  zone:  { position: 'absolute' as const, borderRadius: 12, border: '2px dashed rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.25s ease' },
  zoneHint: { border: `2px dashed ${theme.goldLight}`, background: 'rgba(210,175,105,0.18)', boxShadow: `inset 0 0 20px ${theme.gold}33` },
  zoneFilled: { border: `2px solid ${theme.gold}`, background: 'rgba(20,20,22,0.4)', boxShadow: `0 0 0 2px ${theme.gold}55` },
  zoneLabel: { color: '#fff', fontSize: 13, fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.75)', opacity: 0.85 },
  zoneDoneWrap: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2, pointerEvents: 'none' as const, animation: 'fadeIn 400ms var(--ease)' },
  zoneDoneImg: { width: 72, height: 54, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' },
  zoneDoneLabel: { color: theme.goldLight, fontSize: 11, fontWeight: 700 },
  topHint: { position: 'absolute' as const, top: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 5, background: 'rgba(20,20,22,0.7)', color: '#fff', borderRadius: 10, padding: '8px 22px', fontSize: 16, fontWeight: 700, letterSpacing: '0.05em', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 8 },
  subHint: { fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.92)', textShadow: '0 1px 3px rgba(0,0,0,0.6)' },
  progress: { fontSize: 13, fontWeight: 700, color: theme.goldLight, background: 'rgba(210,175,105,0.16)', borderRadius: 8, padding: '2px 10px' },
  tray: { position: 'absolute' as const, left: 0, right: 0, bottom: 0, zIndex: 6, background: 'linear-gradient(180deg, rgba(20,20,22,0.0) 0%, rgba(20,20,22,0.25) 100%)', padding: '20px 24px 20px', display: 'flex', gap: 22, justifyContent: 'center', flexWrap: 'wrap' as const, alignItems: 'center' },
  option: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4, padding: '10px 14px', background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 12, boxShadow: theme.e1, cursor: 'grab', willChange: 'transform' },
  optionDone: { opacity: 0, cursor: 'default', pointerEvents: 'none' as const },
  optionDragging: { boxShadow: '0 14px 32px rgba(0,0,0,0.45)' },
  optionSelected: { border: `2px solid ${theme.gold}`, boxShadow: `0 0 0 3px ${theme.gold}44` },
  optionImg: { width: 128, height: 86, objectFit: 'contain', pointerEvents: 'none' as const },
  optionTxt: { fontSize: 13, fontWeight: 600, color: theme.text, maxWidth: 140, textAlign: 'center' as const },
  monologueOverlay: { position: 'absolute' as const, inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 18, background: 'rgba(8,8,10,0.55)', padding: '0 12%', cursor: 'pointer', animation: 'fadeIn 300ms var(--ease)' },
  monologueBox: { background: 'rgba(10,10,12,0.82)', color: '#fff', borderRadius: 14, padding: '22px 32px', fontSize: 17, lineHeight: 2, maxWidth: 760, fontFamily: 'var(--font-display)', textShadow: '0 1px 6px rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', boxShadow: theme.e2, animation: 'rise 360ms var(--ease)' },
  monologueHint: { fontSize: 12, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.1em' },
  sunsetOverlay: { position: 'absolute' as const, inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 18, padding: '0 12%', cursor: 'pointer', background: 'linear-gradient(180deg, rgba(255,140,80,0.06) 0%, rgba(255,140,80,0.3) 55%, rgba(255,100,60,0.62) 100%)', animation: 'fadeIn 900ms var(--ease)' },
  sunsetBox: { background: 'rgba(10,10,12,0.6)', color: '#fff', borderRadius: 14, padding: '22px 32px', fontSize: 17, lineHeight: 2, maxWidth: 760, textAlign: 'center' as const, fontFamily: 'var(--font-display)', textShadow: '0 1px 6px rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', boxShadow: theme.e2, animation: 'rise 500ms var(--ease)' },
} as const
