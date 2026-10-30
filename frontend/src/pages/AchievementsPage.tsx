import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, MapPin, Trophy, CheckCircle, LockKey, Sparkle,
  X, GearSix, Gift, CaretLeft, Calendar, Hash,
} from '@phosphor-icons/react'
import { achievementApi, chapterApi, collectionApi } from '../api'
import type { Achievement, AchievementType, Chapter, CollectionItem } from '../api/types'
import { Header } from '../components/layout/Header'
import { Modal } from '../components/Modal'
import { SettingsModal } from '../components/SettingsModal'
import { useSettings } from '../lib/useSettings'
import { theme } from '../theme'
import { homeBg } from '../assets/home/bgs'

const ACHV_ICON = (type: AchievementType): ReactNode => {
  if (type === 'route') return <MapPin size={26} weight="duotone" />
  if (type === 'global') return <Trophy size={26} weight="duotone" />
  return <BookOpen size={26} weight="duotone" />
}

type AchvTab = 'all' | AchievementType
const TABS: { k: AchvTab; label: string; hint: string }[] = [
  { k: 'all', label: '全部', hint: '所有成就' },
  { k: 'global', label: '全局成就', hint: '跨章节累计达成' },
  { k: 'chapter', label: '章节成就', hint: '单章完成奖励' },
  { k: 'route', label: '路线成就', hint: '分支选择/结局达成' },
]

const CHAPTER_ALL = 'all'

/* ======================= 组件 ======================= */
export default function AchievementsPage() {
  const navigate = useNavigate()
  const [settings, updateSettings] = useSettings()

  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [tab, setTab] = useState<AchvTab>('all')
  const [chapterK, setChapterK] = useState<number | 'all'>('all')
  const [bookTab, setBookTab] = useState<'achv' | 'coll'>('achv')
  const [showBook, setShowBook] = useState(false)
  const [detail, setDetail] = useState<({ kind: 'achv'; data: Achievement } | { kind: 'coll'; data: CollectionItem }) | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<Achievement | CollectionItem | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    achievementApi.list().then(setAchievements).catch((e) => setError((e as Error).message))
    collectionApi.list().then(setCollections).catch(() => {})
    chapterApi.list().then(setChapters).catch(() => {})
  }, [])

  // ESC 打开/关闭 设置弹窗
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // detail/book 弹窗交给 Modal 本身的 ESC 处理
      if (detail || showBook) return
      e.preventDefault()
      setShowSettings((s) => !s)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detail, showBook])

  /* ==================== 过滤 & 统计 ==================== */
  const filtered = useMemo(() => {
    return achievements.filter((a) => {
      if (tab !== 'all' && a.type !== tab) return false
      if (chapterK !== CHAPTER_ALL && a.chapterId !== chapterK) return false
      return true
    })
  }, [achievements, tab, chapterK])

  const totalUnlocked = achievements.filter((a) => a.unlocked).length
  const progress = achievements.length ? Math.round((totalUnlocked / achievements.length) * 100) : 0
  const collUnlocked = collections.filter((c) => c.collected).length

  const chapterName = (id?: number) => chapters.find((c) => c.id === id)?.title ?? '全局成就'

  function openDetailAchv(a: Achievement) { setDetail({ kind: 'achv', data: a }) }
  function openDetailColl(c: CollectionItem) { setDetail({ kind: 'coll', data: c }) }

  return (
    <div style={styles.page}>
      <div style={{ ...styles.bg, backgroundImage: `url(${homeBg()})` }} />
      <div style={styles.scrim} />
      <Header
        title="成就" subtitle="山大记忆 · 收藏" onExit={() => navigate('/')} backTo="/" transparent
        rightExtra={
          <button
            style={styles.headerGear}
            className="lift"
            onClick={() => setShowSettings(true)}
            title="打开设置"
          >
            <GearSix size={16} weight="bold" />
          </button>
        }
      />
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      <div style={styles.content}>

        {/* ---------- 头卡：成就进度大圆 + 收集物数字 ---------- */}
        <div style={styles.hero}>
          <div style={styles.heroRing}>
            <RingPct pct={progress} />
            <div style={styles.heroRingText}>
              <div style={styles.heroPercent}>{progress}<span style={{ fontSize: 16 }}>%</span></div>
              <div style={styles.heroLabel}>记忆完成度</div>
            </div>
          </div>
          <div style={styles.heroBody}>
            <div style={styles.heroTitle}>我的山大记忆</div>
            <div style={styles.heroMeta}>
              {totalUnlocked} <span style={{ color: theme.textLight }}>/ {achievements.length} 成就解锁</span>
              <span style={{ margin: '0 10px', color: theme.border }}>·</span>
              {collUnlocked} <span style={{ color: theme.textLight }}>/ {collections.length} 物件收集</span>
            </div>
            <div style={styles.heroChips}>
              {TABS.map((t) => {
                const n = achievements.filter((a) => t.k === 'all' || a.type === t.k).filter((a) => a.unlocked).length
                const total = achievements.filter((a) => t.k === 'all' || a.type === t.k).length
                return (
                  <div key={t.k} style={styles.heroChip}>
                    <span style={styles.heroChipIcon}>{ACHV_ICON(t.k === 'all' ? 'chapter' : t.k)}</span>
                    <div>
                      <div style={styles.heroChipTitle}>{t.label}</div>
                      <div style={styles.heroChipMeta}>{n}/{total}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <button style={styles.btnPrimary} className="lift" onClick={() => { setBookTab('achv'); setShowBook(true) }}>
                <Sparkle size={14} weight="fill" /> 成就册
              </button>
              <button style={styles.btnGhost} className="lift" onClick={() => { setBookTab('coll'); setShowBook(true) }}>
                <Gift size={14} weight="bold" /> 收集物 · {collUnlocked}/{collections.length}
              </button>
              <button
                style={styles.btnTiny}
                className="lift"
                title="未解锁内容隐藏名称/描述防剧透"
                onClick={() => updateSettings({ hideUnlockedSpoilers: !settings.hideUnlockedSpoilers })}
              >
                {settings.hideUnlockedSpoilers ? <LockKey size={13} /> : <CheckCircle size={13} />}
                {settings.hideUnlockedSpoilers ? '隐藏未解锁信息' : '显示未解锁信息'}
              </button>
            </div>
          </div>
        </div>

        {/* ---------- 筛选条：分类 Tab + 章节 Chips ---------- */}
        <div style={styles.filterBar}>
          <div style={styles.tabs}>
            {TABS.map((t) => (
              <button
                key={t.k}
                title={t.hint}
                style={tab === t.k ? styles.tabActive : styles.tab}
                className="lift"
                onClick={() => setTab(t.k)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div style={styles.chips}>
            <Chip active={chapterK === 'all'} onClick={() => setChapterK('all')}>全部章节</Chip>
            {chapters.map((c) => (
              <Chip key={c.id} active={chapterK === c.id} onClick={() => setChapterK(c.id)}>{c.title}</Chip>
            ))}
          </div>
        </div>

        {/* ---------- 桌面：成就/收集物网格 ---------- */}
        <div style={styles.desk}>
          <div style={styles.deskHead}>
            <div>
              <div style={styles.deskLabel}>记忆桌面</div>
              <div style={styles.deskTip}>共 {filtered.length} 条 · 已解锁 {filtered.filter((a) => a.unlocked).length}</div>
            </div>
            {error && <p style={styles.err}>{error}</p>}
          </div>

          {filtered.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}><BookOpen size={40} weight="thin" /></div>
              <p style={styles.emptyText}>当前筛选下暂无条目。</p>
            </div>
          ) : (
            <div style={styles.grid}>
              {filtered.map((a) => (
                <AchvCard
                  key={a.id}
                  achv={a}
                  hideSpoiler={settings.hideUnlockedSpoilers}
                  chapterName={chapterName(a.chapterId)}
                  onClick={() => openDetailAchv(a)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ---------- 收集物区块（分类展示：按章节） ---------- */}
        <div style={styles.desk}>
          <div style={styles.deskHead}>
            <div>
              <div style={styles.deskLabel}>收集物柜</div>
              <div style={styles.deskTip}>剧情中拾取的物件会出现在这里 · {collUnlocked}/{collections.length}</div>
            </div>
          </div>
          {collections.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}><Gift size={40} weight="thin" /></div>
              <p style={styles.emptyText}>完成对应剧情后, 收集物会被收纳在此。</p>
            </div>
          ) : (
            <CollectionGroups
              collections={collections}
              chapters={chapters}
              hideSpoiler={settings.hideUnlockedSpoilers}
              onClick={openDetailColl}
            />
          )}
        </div>
      </div>

      {/* ========== 成就册 / 收集物册 双栏 Modal ========== */}
      {showBook && (
        <Modal title="记忆册" onClose={() => setShowBook(false)} width={780}>
          <div style={styles.bookTabs}>
            <button
              style={bookTab === 'achv' ? styles.bookTabActive : styles.bookTab}
              className="lift"
              onClick={() => setBookTab('achv')}
            >成就 · {totalUnlocked}/{achievements.length}</button>
            <button
              style={bookTab === 'coll' ? styles.bookTabActive : styles.bookTab}
              className="lift"
              onClick={() => setBookTab('coll')}
            >收集物 · {collUnlocked}/{collections.length}</button>
          </div>
          {bookTab === 'achv' ? (
            <BookAchv
              achievements={achievements}
              chapters={chapters}
              hideSpoiler={settings.hideUnlockedSpoilers}
              progress={progress}
              onOpen={openDetailAchv}
            />
          ) : (
            <BookColl collections={collections} chapters={chapters} hideSpoiler={settings.hideUnlockedSpoilers} onOpen={openDetailColl} />
          )}
        </Modal>
      )}

      {/* ========== 详情弹(成就 or 收集物) ========== */}
      {detail && (
        <Modal title={detail.kind === 'achv' ? '成就详情' : '收集物详情'} onClose={() => setDetail(null)} width={480}>
          {detail.kind === 'achv' ? (
            <DetailAchv a={detail.data} chapterName={chapterName(detail.data.chapterId)} hideSpoiler={settings.hideUnlockedSpoilers} />
          ) : (
            <DetailColl c={detail.data} hideSpoiler={settings.hideUnlockedSpoilers} />
          )}
        </Modal>
      )}

      {/* ========== 新解锁 Toast ========== */}
      {toast && (
        <div style={styles.toast}>
          <div style={styles.toastIcon}>{'unlocked' in toast ? <Trophy size={22} weight="fill" /> : <Gift size={22} weight="fill" />}</div>
          <div style={{ flex: 1 }}>
            <div style={styles.toastLabel}>{'unlocked' in toast ? '成就解锁！' : '收集到新物件！'}</div>
            <div style={styles.toastName}>{toast.name}</div>
            <div style={styles.toastDesc}>
              {'unlockedAt' in toast ? (toast as Achievement).description : (toast as CollectionItem).description}
            </div>
          </div>
          <button style={styles.toastClose} onClick={() => setToast(null)}><X size={14} /></button>
        </div>
      )}
    </div>
  )
}

/* ======================= 子组件 ======================= */

function RingPct({ pct }: { pct: number }) {
  // SVG 圆环: 2 层, 灰色底 + 山大红渐变描边
  const R = 52, C = 2 * Math.PI * R
  const dash = Math.round(C * (Math.min(100, Math.max(0, pct)) / 100))
  return (
    <svg width={130} height={130} viewBox="0 0 130 130">
      <circle cx={65} cy={65} r={R} stroke={theme.panelDeep} strokeWidth={10} fill="none" />
      <circle
        cx={65} cy={65} r={R}
        stroke={`url(#ringGrad)`}
        strokeWidth={10} fill="none"
        strokeDasharray={`${dash} ${C - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 65 65)"
      />
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={theme.gold} />
          <stop offset="100%" stopColor={theme.orange} />
        </linearGradient>
      </defs>
    </svg>
  )
}

function Chip({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lift"
      style={{
        ...styles.chip,
        background: active ? theme.gold : 'rgba(255,255,255,0.85)',
        color: active ? theme.onGold : theme.textSoft,
        borderColor: active ? theme.goldDark : theme.border,
        fontWeight: active ? 700 : 600,
        boxShadow: active ? `0 2px 8px rgba(166,30,46,0.22)` : 'none',
      }}
    >
      {children}
    </button>
  )
}

function AchvCard({
  achv, hideSpoiler, chapterName, onClick,
}: { achv: Achievement; hideSpoiler: boolean; chapterName: string; onClick: () => void }) {
  const locked = !achv.unlocked
  const shownName = !locked || !hideSpoiler ? achv.name : '??? 未解锁'
  const shownDesc = !locked || !hideSpoiler ? achv.description : '完成对应剧情后揭晓。'
  return (
    <button
      onClick={onClick}
      className="lift"
      style={{
        ...styles.card,
        background: locked ? 'rgba(238,238,237,0.65)' : '#fff',
        borderStyle: locked ? 'dashed' : 'solid',
        cursor: 'pointer',
      }}
    >
      <div style={{
        position: 'absolute', top: 12, right: 12, width: 22, height: 22,
        borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: locked ? 'rgba(118,121,127,0.15)' : 'rgba(166,30,46,0.08)',
        color: locked ? theme.lockedDark : theme.gold,
      }}>
        {locked ? <LockKey size={12} weight="bold" /> : <CheckCircle size={12} weight="fill" />}
      </div>
      <div style={{
        ...styles.cardIcon,
        filter: locked && hideSpoiler ? 'grayscale(1) blur(1.5px)' : 'none',
        opacity: locked && hideSpoiler ? 0.55 : 1,
        color: locked ? theme.lockedDark : theme.gold,
        background: locked ? 'rgba(118,121,127,0.08)' : 'rgba(166,30,46,0.08)',
      }}>
        {ACHV_ICON(achv.type)}
      </div>
      <div style={{
        fontSize: 11, color: theme.textLight, marginBottom: 2,
        display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>
        <MapPin size={10} weight="bold" /> {chapterName}
      </div>
      <div style={styles.cardTitle}>{shownName}</div>
      <div style={styles.cardDesc}>{shownDesc}</div>
      {achv.unlocked && achv.unlockedAt && (
        <div style={styles.cardDate}><Calendar size={11} /> {new Date(achv.unlockedAt).toLocaleDateString()}</div>
      )}
    </button>
  )
}

function CollectionGroups({
  collections, chapters, hideSpoiler, onClick,
}: {
  collections: CollectionItem[]; chapters: Chapter[]; hideSpoiler: boolean;
  onClick: (c: CollectionItem) => void;
}) {
  // 按 chapter 前缀分组: pan / hua / lu / 其他
  const groups = new Map<string, CollectionItem[]>()
  collections.forEach((c) => {
    const pre = c.key.split('/')[0]
    if (!groups.has(pre)) groups.set(pre, [])
    groups.get(pre)!.push(c)
  })
  const chapterByPrefix: Record<string, Chapter> = {}
  chapters.forEach((c) => {
    if (c.id === 1) chapterByPrefix['pan'] = c
    else if (c.id === 2) chapterByPrefix['hua'] = c
    else if (c.id === 3) chapterByPrefix['lu'] = c
  })
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {Array.from(groups.entries()).map(([pre, arr]) => {
        const ch = chapterByPrefix[pre]
        const n = arr.filter((c) => c.collected).length
        return (
          <div key={pre}>
            <div style={styles.groupTitle}>
              {ch ? ch.title : '通用物件'}
              <span style={styles.groupMeta}>{n}/{arr.length}</span>
            </div>
            <div style={styles.collGrid}>
              {arr.map((c) => {
                const locked = !c.collected
                const shownName = !locked || !hideSpoiler ? c.name : '??? 未收集'
                return (
                  <button key={c.key} style={{
                    ...styles.collCard,
                    background: locked ? 'rgba(238,238,237,0.6)' : '#fff',
                    borderStyle: locked ? 'dashed' : 'solid',
                  }} className="lift" onClick={() => onClick(c)}>
                    <div style={{
                      fontSize: 30, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      filter: locked && hideSpoiler ? 'blur(3px) grayscale(1)' : 'none',
                      opacity: locked && hideSpoiler ? 0.5 : 1,
                    }}>{locked && hideSpoiler ? '🔒' : c.emoji}</div>
                    <div style={styles.collName}>{shownName}</div>
                    <div style={styles.collTag} className={locked ? 'locked' : 'ok'}>
                      {locked ? <LockKey size={10} /> : <CheckCircle size={10} weight="fill" />}
                      {locked ? '未收集' : '已入柜'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DetailAchv({ a, chapterName, hideSpoiler }: { a: Achievement; chapterName: string; hideSpoiler: boolean }) {
  const locked = !a.unlocked
  const name = !locked || !hideSpoiler ? a.name : '??? 未解锁'
  const desc = !locked || !hideSpoiler ? a.description : '完成对应剧情后揭晓。'
  return (
    <div style={styles.detail}>
      <div style={{
        ...styles.detailIcon,
        color: locked ? theme.lockedDark : theme.gold,
        background: locked ? 'rgba(118,121,127,0.08)' : 'rgba(166,30,46,0.08)',
      }}>{ACHV_ICON(a.type)}</div>
      <div style={styles.detailName}>{name}</div>
      <div style={styles.detailDesc}>{desc}</div>
      <div style={styles.detailMeta}>
        <span style={styles.metaPill}><Trophy size={12} /> 类型 · {a.type === 'global' ? '全局' : a.type === 'route' ? '路线' : '章节'}</span>
        <span style={styles.metaPill}><MapPin size={12} /> {chapterName}</span>
        {a.unlocked && a.unlockedAt && (
          <span style={styles.metaPill}><Calendar size={12} /> {new Date(a.unlockedAt).toLocaleString()}</span>
        )}
      </div>
      {a.souvenir && (a.unlocked || !hideSpoiler) && (
        <div style={styles.souv}>
          <div style={styles.souvLabel}><Gift size={12} weight="bold" /> 纪念品</div>
          <div style={styles.souvText}>🎖️ {a.souvenir}</div>
        </div>
      )}
    </div>
  )
}

function DetailColl({ c, hideSpoiler }: { c: CollectionItem; hideSpoiler: boolean }) {
  const locked = !c.collected
  const name = !locked || !hideSpoiler ? c.name : '??? 未收集'
  const desc = !locked || !hideSpoiler ? c.description : '完成对应剧情后揭晓。'
  return (
    <div style={styles.detail}>
      <div style={{ fontSize: 64, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
        filter: locked && hideSpoiler ? 'blur(4px) grayscale(1)' : 'none',
        opacity: locked && hideSpoiler ? 0.55 : 1,
      }}>
        {locked && hideSpoiler ? '🔒' : c.emoji}
      </div>
      <div style={styles.detailName}>{name}</div>
      <div style={styles.detailDesc}>{desc}</div>
      <div style={styles.detailMeta}>
        <span style={styles.metaPill}><Hash size={12} /> {c.key}</span>
        {c.collected && c.collectedAt && (
          <span style={styles.metaPill}><Calendar size={12} /> {new Date(c.collectedAt).toLocaleString()}</span>
        )}
      </div>
    </div>
  )
}

function BookAchv({
  achievements, chapters, hideSpoiler, progress, onOpen,
}: {
  achievements: Achievement[]; chapters: Chapter[]; hideSpoiler: boolean; progress: number;
  onOpen: (a: Achievement) => void;
}) {
  const groups = new Map<string, Achievement[]>()
  achievements.forEach((a) => {
    const key = a.chapterId ? `ch_${a.chapterId}` : 'global'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(a)
  })
  const findCh = (id?: number) => chapters.find((c) => c.id === id)?.title ?? '全局成就'
  return (
    <div>
      <div style={styles.bookList}>
        {achievements.length === 0 && <p style={{ color: theme.textLight }}>暂无成就。</p>}
        {Array.from(groups.entries()).map(([key, arr]) => (
          <div key={key}>
            <div style={styles.bookSectionTitle}>
              {key === 'global' ? '✨ 全局成就' : findCh(arr[0].chapterId)}
              <span style={styles.groupMeta}>
                {arr.filter((a) => a.unlocked).length}/{arr.length}
              </span>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {arr.map((a) => {
                const locked = !a.unlocked
                const shown = !locked || !hideSpoiler
                return (
                  <div
                    key={a.id}
                    style={{
                      ...styles.bookItem,
                      background: locked ? 'rgba(238,238,237,0.6)' : theme.panel,
                      borderStyle: locked ? 'dashed' : 'solid',
                      cursor: 'pointer',
                    }}
                    onClick={() => onOpen(a)}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: locked ? theme.lockedDark : theme.gold,
                      background: locked ? 'rgba(118,121,127,0.08)' : 'rgba(166,30,46,0.08)',
                      filter: locked && hideSpoiler ? 'blur(1px)' : 'none',
                      opacity: locked && hideSpoiler ? 0.75 : 1,
                    }}>{ACHV_ICON(a.type)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={styles.bookName}>{shown ? a.name : '??? 未解锁'}</div>
                      <div style={styles.bookDesc}>{shown ? a.description : '完成对应剧情后揭晓。'}</div>
                    </div>
                    <span style={locked ? styles.todo : styles.done}>
                      {locked ? <LockKey size={15} weight="bold" /> : <CheckCircle size={15} weight="fill" />}
                      <span style={{ marginLeft: 4 }}>{locked ? '未完成' : '已获得'}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={styles.progress}>
        <span>收集进度</span>
        <span style={{ ...styles.progressBar, display: 'inline-block', width: 200, height: 8, borderRadius: 999, background: '#efecea', overflow: 'hidden', verticalAlign: 'middle' }}>
          <span style={{ display: 'block', width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${theme.gold}, ${theme.orange})` }} />
        </span>
        <span style={{ fontWeight: 700 }}>{progress}%</span>
      </div>
    </div>
  )
}

function BookColl({
  collections, chapters, hideSpoiler, onOpen,
}: {
  collections: CollectionItem[]; chapters: Chapter[]; hideSpoiler: boolean;
  onOpen: (c: CollectionItem) => void;
}) {
  const groups = new Map<string, CollectionItem[]>()
  collections.forEach((c) => {
    const pre = c.key.split('/')[0]
    if (!groups.has(pre)) groups.set(pre, [])
    groups.get(pre)!.push(c)
  })
  const findCh = (pre: string) => {
    if (pre === 'pan') return chapters.find((c) => c.id === 1)?.title ?? '潘承洞篇'
    if (pre === 'hua') return chapters.find((c) => c.id === 2)?.title ?? '华岗篇'
    if (pre === 'lu') return chapters.find((c) => c.id === 3)?.title ?? '路遥篇'
    return '其他物件'
  }
  return (
    <div style={styles.bookList}>
      {collections.length === 0 && <p style={{ color: theme.textLight }}>暂无收集物。</p>}
      {Array.from(groups.entries()).map(([pre, arr]) => {
        const n = arr.filter((c) => c.collected).length
        return (
          <div key={pre}>
            <div style={styles.bookSectionTitle}>
              <CaretLeft size={14} /> {findCh(pre)} · 收集物
              <span style={styles.groupMeta}>{n}/{arr.length}</span>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {arr.map((c) => {
                const locked = !c.collected
                const shown = !locked || !hideSpoiler
                return (
                  <div key={c.key} style={{
                    ...styles.bookItem,
                    background: locked ? 'rgba(238,238,237,0.6)' : theme.panel,
                    borderStyle: locked ? 'dashed' : 'solid',
                    cursor: 'pointer',
                  }} onClick={() => onOpen(c)}>
                    <div style={{ width: 40, textAlign: 'center', fontSize: 24,
                      filter: locked && hideSpoiler ? 'blur(3px) grayscale(1)' : 'none',
                      opacity: locked && hideSpoiler ? 0.55 : 1,
                    }}>{locked && hideSpoiler ? '🔒' : c.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={styles.bookName}>{shown ? c.name : '??? 未收集'}</div>
                      <div style={styles.bookDesc}>{shown ? c.description : '完成对应剧情后揭晓。'}</div>
                    </div>
                    <span style={locked ? styles.todo : styles.done}>
                      {locked ? <LockKey size={15} weight="bold" /> : <CheckCircle size={15} weight="fill" />}
                      <span style={{ marginLeft: 4 }}>{locked ? '未收集' : '已收集'}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ======================= 样式 ======================= */
const styles = {
  page: { minHeight: '100vh', color: theme.text, position: 'relative' as const },
  bg: { position: 'absolute' as const, inset: 0, backgroundSize: 'cover', backgroundPosition: 'center' },
  scrim: {
    position: 'absolute' as const, inset: 0,
    background: 'linear-gradient(180deg, rgba(250,250,249,0.55) 0%, rgba(250,250,249,0.82) 45%, rgba(246,246,244,0.96) 100%)',
  },
  content: { position: 'relative' as const, zIndex: 5, maxWidth: 1040, margin: '0 auto', padding: '28px 26px 60px', display: 'grid', gap: 28 },
  headerGear: {
    width: 34, height: 34, borderRadius: 10, cursor: 'pointer',
    background: 'rgba(255,255,255,0.85)', border: `1px solid ${theme.border}`,
    color: theme.textSoft, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },

  /* ---- 头卡 ---- */
  hero: {
    display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 28, alignItems: 'center',
    padding: '26px 28px',
    background: 'rgba(255,255,255,0.90)', border: `1px solid ${theme.border}`, borderRadius: 22,
    boxShadow: theme.e2, backdropFilter: 'blur(14px)',
  },
  heroRing: { width: 130, height: 130, position: 'relative' as const, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  heroRingText: { position: 'absolute' as const, inset: 0, display: 'grid', placeItems: 'center' },
  heroPercent: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, color: theme.gold },
  heroLabel: { fontSize: 11, color: theme.textLight, letterSpacing: 0.8, marginTop: -4 },
  heroBody: { flex: 1, minWidth: 0 },
  heroTitle: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, letterSpacing: 0.5 },
  heroMeta: { color: theme.text, fontSize: 14, marginTop: 6, fontWeight: 600 },
  heroChips: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 16 },
  heroChip: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(166,30,46,0.04)', borderRadius: 12, border: `1px solid ${theme.border}` },
  heroChipIcon: { width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', color: theme.gold, background: '#fff', boxShadow: theme.e1 },
  heroChipTitle: { fontWeight: 700, fontSize: 13 },
  heroChipMeta: { fontSize: 11, color: theme.textLight },

  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: theme.gold, color: theme.onGold, border: `1px solid ${theme.goldDark}`,
    borderRadius: 12, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', boxShadow: theme.e1,
  },
  btnGhost: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: '#fff', color: theme.text, border: `1px solid ${theme.border}`,
    borderRadius: 12, padding: '10px 18px', fontWeight: 600, cursor: 'pointer',
  },
  btnTiny: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'rgba(255,255,255,0.9)', color: theme.textSoft, border: `1px solid ${theme.border}`,
    borderRadius: 10, padding: '8px 12px', fontWeight: 600, cursor: 'pointer', fontSize: 12,
    marginLeft: 'auto', alignSelf: 'center',
  },

  /* ---- 筛选 ---- */
  filterBar: { display: 'grid', gap: 12 },
  tabs: { display: 'inline-flex', gap: 6, padding: 4, background: 'rgba(255,255,255,0.7)', borderRadius: 14, border: `1px solid ${theme.border}`, justifySelf: 'start' },
  tab: {
    border: 'none', background: 'transparent', color: theme.textSoft, borderRadius: 10,
    padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
  },
  tabActive: {
    border: 'none', background: theme.gold, color: theme.onGold, borderRadius: 10,
    padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13, boxShadow: theme.e1,
  },
  chips: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  chip: {
    padding: '7px 14px', borderRadius: 999,
    border: '1px solid', fontSize: 12, cursor: 'pointer',
  },

  /* ---- 桌面 / 卡片 ---- */
  desk: { background: 'rgba(255,255,255,0.9)', border: `1px solid ${theme.border}`, borderRadius: 22, padding: 24, boxShadow: theme.e2, backdropFilter: 'blur(14px)' },
  deskHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  deskLabel: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 },
  deskTip: { color: theme.textLight, fontSize: 12, marginTop: 2 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 },
  card: {
    position: 'relative' as const, textAlign: 'left', color: theme.text,
    display: 'flex', flexDirection: 'column', gap: 8, padding: '56px 16px 16px',
    border: `1px solid ${theme.border}`, borderRadius: 16,
  },
  cardIcon: {
    position: 'absolute' as const, top: 16, left: 16,
    width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, lineHeight: 1.3, minHeight: 36 },
  cardDesc: {
    fontSize: 12, color: theme.textSoft, lineHeight: 1.4, minHeight: 32,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  cardDate: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: theme.textLight, marginTop: 2 },

  collGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 14 },
  collCard: {
    cursor: 'pointer', color: theme.text, textAlign: 'left', padding: '16px 12px 12px',
    border: `1px solid ${theme.border}`, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center',
    background: '#fff',
  },
  collName: { fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, textAlign: 'center', minHeight: 34, lineHeight: 1.25 },
  collTag: {
    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 10px',
    borderRadius: 999, marginTop: 2,
    '&.ok': { background: 'rgba(24,121,78,0.08)', color: '#18794e' },
    '&.locked': { background: 'rgba(118,121,127,0.12)', color: theme.textLight },
  } as unknown as React.CSSProperties & Record<string, unknown>,

  groupTitle: {
    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: theme.text,
    marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8,
  },
  groupMeta: { marginLeft: 'auto', fontSize: 12, color: theme.textLight, fontWeight: 600 },

  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, minHeight: 180, color: theme.textLight },
  emptyIcon: { opacity: 0.6 },
  emptyText: { fontSize: 14 },
  err: { color: theme.error, fontSize: 13 },

  /* ---- 记忆册 Modal ---- */
  bookTabs: { display: 'inline-flex', padding: 4, background: theme.panelDeep, borderRadius: 12, marginBottom: 16, gap: 4 },
  bookTab: {
    border: 'none', background: 'transparent', color: theme.textSoft, padding: '8px 18px',
    borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
  },
  bookTabActive: {
    border: 'none', background: '#fff', color: theme.gold, padding: '8px 18px',
    borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, boxShadow: theme.e1,
  },
  bookList: { display: 'grid', gap: 16, maxHeight: 420, overflow: 'auto', paddingRight: 4 },
  bookSectionTitle: {
    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: theme.gold,
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', background: 'rgba(166,30,46,0.06)', borderRadius: 8, margin: '6px 0 8px',
  },
  bookItem: {
    display: 'flex', alignItems: 'center', gap: 14,
    background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '12px 14px',
  },
  bookName: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 },
  bookDesc: { fontSize: 12, color: theme.textSoft, marginTop: 2 },
  done: { color: '#18794e', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center' },
  todo: { color: theme.textLight, fontSize: 13, display: 'inline-flex', alignItems: 'center' },
  progress: {
    display: 'flex', alignItems: 'center', gap: 12, marginTop: 18, paddingTop: 16,
    borderTop: `1px solid ${theme.border}`, fontWeight: 600, color: theme.textSoft,
  },
  progressBar: {} as React.CSSProperties,

  /* ---- 详情弹 ---- */
  detail: { textAlign: 'center', padding: 6, display: 'grid', gap: 12, justifyItems: 'center' },
  detailIcon: { width: 72, height: 72, borderRadius: 18, display: 'grid', placeItems: 'center' },
  detailName: { fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800 },
  detailDesc: { color: theme.textSoft, fontSize: 13, lineHeight: 1.6, maxWidth: 380 },
  detailMeta: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4 },
  metaPill: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 12px', borderRadius: 999, border: `1px solid ${theme.border}`,
    fontSize: 11, color: theme.textSoft, fontWeight: 600,
  },
  souv: {
    width: '100%', marginTop: 6, padding: 14, borderRadius: 14,
    border: `1px dashed ${theme.border}`, background: 'rgba(246,246,244,0.6)',
    textAlign: 'left',
  },
  souvLabel: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: theme.textSoft, marginBottom: 4 },
  souvText: { fontSize: 16, fontWeight: 700, color: theme.gold, fontFamily: 'var(--font-display)' },

  /* ---- Toast ---- */
  toast: {
    position: 'fixed' as const, right: 28, bottom: 36, zIndex: 100,
    width: 320, padding: '14px 16px', background: '#fff',
    border: `1px solid ${theme.border}`, borderRadius: 14, boxShadow: theme.e3,
    display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center',
    animation: 'slideUp .35s cubic-bezier(.2,.8,.2,1)',
  },
  toastIcon: {
    width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center',
    background: 'linear-gradient(135deg, ' + theme.gold + ' 0%, ' + theme.orange + ' 100%)', color: '#fff',
  },
  toastLabel: { fontSize: 11, color: theme.gold, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' as const },
  toastName: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 },
  toastDesc: { fontSize: 12, color: theme.textSoft, marginTop: 2, lineHeight: 1.4 },
  toastClose: {
    alignSelf: 'flex-start', background: 'transparent', border: 'none', color: theme.textLight,
    cursor: 'pointer', padding: 4,
  },
} as const
