import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarBlank,
  CheckCircle,
  Clock,
  Copy,
  FloppyDisk,
  GameController,
  GearSix,
  Play,
  Plus,
  Trash,
  WarningOctagon,
} from '@phosphor-icons/react'
import { saveApi } from '../api'
import type { GameSaveVO } from '../api/types'
import { ChapterPicker } from '../components/ChapterPicker'
import { Header } from '../components/layout/Header'
import { Modal } from '../components/Modal'
import { SettingsModal } from '../components/SettingsModal'
import { HOME_BGS, homeBg } from '../assets/home/bgs'
import { theme } from '../theme'

function chapterCover(chapterId: number): string {
  return HOME_BGS[Math.max(0, chapterId - 1) % HOME_BGS.length] ?? HOME_BGS[0]
}

function formatTime(value: string): string {
  if (!value) return '时间未知'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

function snapshotName(save: GameSaveVO): string {
  const stamp = new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date()).replaceAll('/', '-').replace(',', '')
  return `${save.character || '故事'} · ${stamp}`
}

function SaveListItem({
  save,
  index,
  active,
  onSelect,
}: {
  save: GameSaveVO
  index: number
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className="save-list-item"
      style={{
        ...styles.listItem,
        ...(active ? styles.listItemActive : {}),
      }}
      onClick={onSelect}
      aria-pressed={active}
    >
      <span style={styles.slotNumber}>{String(index + 1).padStart(2, '0')}</span>
      <span
        style={{
          ...styles.thumb,
          backgroundImage: `linear-gradient(90deg, transparent 55%, rgba(18,19,22,0.24)), url(${chapterCover(save.chapterId)})`,
        }}
      />
      <span style={styles.listCopy}>
        <span style={styles.listName}>{save.saveName}</span>
        <span style={styles.listScene}>{save.chapterTitle} · {save.currentNodeTitle || '章节开端'}</span>
        <span style={styles.listTime}><Clock size={12} /> {formatTime(save.updatedAt)}</span>
      </span>
      <span style={styles.listPercent}>{save.completionRate}%</span>
    </button>
  )
}

export default function ContinuePage() {
  const navigate = useNavigate()
  const [saves, setSaves] = useState<GameSaveVO[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showChapterPicker, setShowChapterPicker] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<GameSaveVO | null>(null)
  const [busyAction, setBusyAction] = useState<'copy' | 'delete' | null>(null)

  const loadSaves = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await saveApi.list()
      const sorted = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      setSaves(sorted)
      setActiveId((current) => sorted.some((save) => save.id === current) ? current : (sorted[0]?.id ?? null))
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSaves()
  }, [loadSaves])

  const activeSave = useMemo(
    () => saves.find((save) => save.id === activeId) ?? null,
    [activeId, saves],
  )

  async function duplicateSave() {
    if (!activeSave || busyAction) return
    setBusyAction('copy')
    setError('')
    try {
      const copied = await saveApi.snapshot(activeSave.id, snapshotName(activeSave))
      setSaves((current) => [copied, ...current])
      setActiveId(copied.id)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusyAction(null)
    }
  }

  async function deleteSave() {
    if (!deleteTarget || busyAction) return
    const targetId = deleteTarget.id
    setBusyAction('delete')
    setError('')
    try {
      await saveApi.remove(targetId)
      setSaves((current) => {
        const next = current.filter((save) => save.id !== targetId)
        setActiveId((active) => active === targetId ? (next[0]?.id ?? null) : active)
        return next
      })
      setDeleteTarget(null)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div style={styles.page}>
      <div style={{ ...styles.bg, backgroundImage: `url(${homeBg()})` }} />
      <div style={styles.scrim} />
      <Header
        title="存档"
        subtitle="选择一段记录继续"
        onExit={() => navigate('/')}
        backTo="/"
        transparent
        rightExtra={(
          <button
            type="button"
            style={styles.settingsButton}
            className="save-manager-action"
            onClick={() => setShowSettings(true)}
            title="打开设置"
            aria-label="打开设置"
          >
            <GearSix size={17} weight="bold" />
          </button>
        )}
      />

      <main style={styles.content}>
        <div style={styles.pageHead}>
          <div>
            <p style={styles.eyebrow}>游戏记录</p>
            <h1 style={styles.heading}>存档管理</h1>
            <p style={styles.lead}>每个存档都是独立的故事进度，可随时复制、继续或删除。</p>
          </div>
          <button
            type="button"
            style={styles.newButton}
            className="save-manager-action"
            onClick={() => setShowChapterPicker(true)}
          >
            <Plus size={17} weight="bold" /> 新建故事
          </button>
        </div>

        {error && <div style={styles.error}><WarningOctagon size={16} /> {error}</div>}

        <section className="save-manager-layout" style={styles.manager} aria-label="存档管理">
          <aside style={styles.listPane}>
            <div style={styles.listHeader}>
              <span>全部存档</span>
              <span style={styles.count}>{saves.length}</span>
            </div>
            <div className="save-manager-list" style={styles.list}>
              {loading && [0, 1, 2, 3].map((item) => (
                <div key={item} className="skeleton" style={styles.skeleton} />
              ))}
              {!loading && saves.map((save, index) => (
                <SaveListItem
                  key={save.id}
                  save={save}
                  index={index}
                  active={save.id === activeId}
                  onSelect={() => setActiveId(save.id)}
                />
              ))}
              {!loading && saves.length === 0 && (
                <div style={styles.listEmpty}>
                  <FloppyDisk size={32} weight="thin" />
                  <span>还没有存档</span>
                </div>
              )}
            </div>
          </aside>

          <div style={styles.detailPane}>
            {activeSave ? (
              <>
                <div
                  style={{
                    ...styles.preview,
                    backgroundImage: `url(${chapterCover(activeSave.chapterId)})`,
                  }}
                >
                  <div style={styles.previewShade} />
                  <div style={styles.previewCaption}>
                    <span style={styles.character}>{activeSave.character}</span>
                    <span style={styles.sceneTitle}>{activeSave.currentNodeTitle || '章节开端'}</span>
                  </div>
                </div>

                <div style={styles.detailBody}>
                  <div style={styles.detailTitleRow}>
                    <div style={{ minWidth: 0 }}>
                      <p style={styles.detailKicker}>选中存档</p>
                      <h2 style={styles.detailTitle}>{activeSave.saveName}</h2>
                    </div>
                    <span style={styles.status}>
                      <CheckCircle size={14} weight="fill" />
                      {activeSave.completionRate >= 100 ? '已完成' : '游玩中'}
                    </span>
                  </div>

                  <dl style={styles.metadata}>
                    <div style={styles.metaRow}>
                      <dt style={styles.metaLabel}>章节</dt>
                      <dd style={styles.metaValue}>{activeSave.chapterTitle}</dd>
                    </div>
                    <div style={styles.metaRow}>
                      <dt style={styles.metaLabel}>当前场景</dt>
                      <dd style={styles.metaValue}>{activeSave.currentNodeTitle || '章节开端'}</dd>
                    </div>
                    <div style={styles.metaRow}>
                      <dt style={styles.metaLabel}>建立时间</dt>
                      <dd style={styles.metaValue}><CalendarBlank size={14} /> {formatTime(activeSave.createdAt)}</dd>
                    </div>
                    <div style={styles.metaRow}>
                      <dt style={styles.metaLabel}>最近保存</dt>
                      <dd style={styles.metaValue}><Clock size={14} /> {formatTime(activeSave.updatedAt)}</dd>
                    </div>
                  </dl>

                  <div style={styles.progressBlock}>
                    <div style={styles.progressHead}>
                      <span>章节进度</span>
                      <strong>{activeSave.completionRate}%</strong>
                    </div>
                    <div style={styles.progressTrack}>
                      <div style={{ ...styles.progressFill, width: `${Math.max(2, activeSave.completionRate)}%` }} />
                    </div>
                  </div>

                  <div className="save-detail-actions" style={styles.actions}>
                    <button
                      type="button"
                      style={styles.primaryButton}
                      className="save-manager-action"
                      onClick={() => navigate(`/story/${activeSave.id}`)}
                    >
                      <Play size={16} weight="fill" /> 继续游戏
                    </button>
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      className="save-manager-action"
                      disabled={busyAction !== null}
                      onClick={() => void duplicateSave()}
                    >
                      <Copy size={16} /> {busyAction === 'copy' ? '复制中…' : '复制存档'}
                    </button>
                    <button
                      type="button"
                      style={styles.deleteButton}
                      className="save-manager-action"
                      disabled={busyAction !== null}
                      onClick={() => setDeleteTarget(activeSave)}
                    >
                      <Trash size={16} /> 删除
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={styles.detailEmpty}>
                <GameController size={52} weight="thin" />
                <h2 style={styles.emptyTitle}>从一段新故事开始</h2>
                <p style={styles.emptyCopy}>新建的记录会独立保存，不会覆盖其他存档。</p>
                <button
                  type="button"
                  style={styles.primaryButton}
                  className="save-manager-action"
                  onClick={() => setShowChapterPicker(true)}
                >
                  <Plus size={16} weight="bold" /> 新建故事
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {showSettings && (
        <SettingsModal
          onClose={() => {
            setShowSettings(false)
            void loadSaves()
          }}
        />
      )}
      {showChapterPicker && <ChapterPicker onClose={() => setShowChapterPicker(false)} />}
      {deleteTarget && (
        <Modal title="删除存档" onClose={() => setDeleteTarget(null)} width={440}>
          <div style={styles.confirmBody}>
            <div style={styles.confirmIcon}><Trash size={22} /></div>
            <div>
              <h3 style={styles.confirmTitle}>确定删除“{deleteTarget.saveName}”吗？</h3>
              <p style={styles.confirmCopy}>此存档的当前位置和选择记录会永久删除，其他存档不受影响。</p>
            </div>
            <div style={styles.confirmActions}>
              <button type="button" style={styles.secondaryButton} className="save-manager-action" onClick={() => setDeleteTarget(null)}>取消</button>
              <button type="button" style={styles.deleteConfirmButton} className="save-manager-action" disabled={busyAction === 'delete'} onClick={() => void deleteSave()}>
                {busyAction === 'delete' ? '删除中…' : '确认删除'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', color: theme.text, position: 'relative' as const, overflowX: 'hidden' as const },
  bg: { position: 'fixed' as const, inset: 0, backgroundSize: 'cover', backgroundPosition: 'center' },
  scrim: { position: 'fixed' as const, inset: 0, background: 'rgba(247,246,242,0.88)', backdropFilter: 'blur(5px)' },
  content: { position: 'relative' as const, zIndex: 5, width: 'min(1180px, calc(100% - 40px))', margin: '0 auto', padding: '34px 0 52px' },
  pageHead: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 22 },
  eyebrow: { margin: '0 0 5px', color: theme.gold, fontSize: 12, fontWeight: 700 },
  heading: { margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: 1.15, fontWeight: 800 },
  lead: { margin: '8px 0 0', color: theme.textSoft, fontSize: 13 },
  manager: { minHeight: 610, display: 'grid', gridTemplateColumns: 'minmax(310px, 0.42fr) minmax(0, 0.58fr)', border: `1px solid ${theme.border}`, background: 'rgba(255,255,255,0.92)', boxShadow: theme.e2, overflow: 'hidden' },
  listPane: { minWidth: 0, borderRight: `1px solid ${theme.border}`, background: 'rgba(246,246,244,0.74)' },
  listHeader: { height: 54, padding: '0 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${theme.border}`, fontSize: 13, fontWeight: 700 },
  count: { minWidth: 26, height: 22, padding: '0 7px', display: 'grid', placeItems: 'center', border: `1px solid ${theme.border}`, color: theme.textSoft, fontSize: 11 },
  list: { maxHeight: 554, overflowY: 'auto' as const, scrollbarGutter: 'stable' as const },
  listItem: { width: '100%', minHeight: 112, display: 'grid', gridTemplateColumns: '36px 104px minmax(0, 1fr) auto', alignItems: 'center', gap: 12, padding: '12px 14px', border: 'none', borderBottom: `1px solid ${theme.border}`, background: 'transparent', color: theme.text, textAlign: 'left' as const, cursor: 'pointer', fontFamily: 'inherit', position: 'relative' as const },
  listItemActive: { background: '#fff', boxShadow: `inset 4px 0 0 ${theme.gold}` },
  slotNumber: { alignSelf: 'start', paddingTop: 3, color: theme.textLight, fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700 },
  thumb: { display: 'block', width: 104, aspectRatio: '16 / 10', backgroundSize: 'cover', backgroundPosition: 'center', border: `1px solid ${theme.border}`, boxShadow: theme.e1 },
  listCopy: { minWidth: 0, display: 'grid', gap: 5 },
  listName: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, fontWeight: 750, fontSize: 14 },
  listScene: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, color: theme.textSoft, fontSize: 12 },
  listTime: { display: 'inline-flex', alignItems: 'center', gap: 4, color: theme.textLight, fontSize: 11 },
  listPercent: { alignSelf: 'end', color: theme.gold, fontSize: 12, fontWeight: 800 },
  skeleton: { height: 112, margin: 0, borderRadius: 0, borderBottom: `1px solid ${theme.border}` },
  listEmpty: { minHeight: 260, display: 'grid', placeContent: 'center', justifyItems: 'center', gap: 10, color: theme.textLight, fontSize: 13 },
  detailPane: { minWidth: 0, display: 'flex', flexDirection: 'column' as const, background: '#fff' },
  preview: { minHeight: 300, flex: '0 0 48%', position: 'relative' as const, backgroundSize: 'cover', backgroundPosition: 'center', overflow: 'hidden' },
  previewShade: { position: 'absolute' as const, inset: 0, background: 'linear-gradient(180deg, rgba(10,9,8,0.02) 42%, rgba(10,9,8,0.72) 100%)' },
  previewCaption: { position: 'absolute' as const, left: 28, right: 28, bottom: 24, display: 'grid', gap: 4, color: '#fff' },
  character: { fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.78)' },
  sceneTitle: { fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 800, textShadow: '0 2px 12px rgba(0,0,0,0.4)' },
  detailBody: { padding: '24px 28px 26px', display: 'grid', gap: 20 },
  detailTitleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18 },
  detailKicker: { margin: '0 0 4px', color: theme.textLight, fontSize: 11 },
  detailTitle: { margin: 0, overflowWrap: 'anywhere' as const, fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1.25, fontWeight: 800 },
  status: { flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 9px', border: '1px solid rgba(24,121,78,0.24)', color: '#18794e', background: 'rgba(24,121,78,0.06)', fontSize: 11, fontWeight: 700 },
  metadata: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 26px', margin: 0 },
  metaRow: { minWidth: 0, display: 'grid', gap: 4 },
  metaLabel: { color: theme.textLight, fontSize: 11 },
  metaValue: { margin: 0, minWidth: 0, display: 'flex', alignItems: 'center', gap: 5, overflowWrap: 'anywhere' as const, color: theme.text, fontSize: 13, fontWeight: 650 },
  progressBlock: { display: 'grid', gap: 8 },
  progressHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: theme.textSoft, fontSize: 12 },
  progressTrack: { height: 7, overflow: 'hidden', background: '#ebe8e3' },
  progressFill: { height: '100%', maxWidth: '100%', background: theme.gold, transition: 'width 240ms ease' },
  actions: { display: 'grid', gridTemplateColumns: '1.25fr 1fr auto', gap: 10 },
  primaryButton: { minHeight: 42, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '0 18px', border: `1px solid ${theme.goldDark}`, background: theme.gold, color: theme.onGold, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { minHeight: 42, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '0 16px', border: `1px solid ${theme.border}`, background: '#fff', color: theme.text, fontFamily: 'inherit', fontWeight: 650, cursor: 'pointer' },
  deleteButton: { minHeight: 42, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '0 14px', border: '1px solid rgba(193,40,47,0.24)', background: 'rgba(193,40,47,0.04)', color: theme.error, fontFamily: 'inherit', fontWeight: 650, cursor: 'pointer' },
  newButton: { minHeight: 42, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '0 17px', border: `1px solid ${theme.goldDark}`, background: theme.gold, color: theme.onGold, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' },
  settingsButton: { width: 36, height: 36, display: 'grid', placeItems: 'center', border: `1px solid ${theme.border}`, background: 'rgba(255,255,255,0.9)', color: theme.gold, cursor: 'pointer' },
  error: { marginBottom: 14, padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 7, border: '1px solid rgba(193,40,47,0.22)', background: 'rgba(255,255,255,0.9)', color: theme.error, fontSize: 12 },
  detailEmpty: { flex: 1, minHeight: 520, display: 'grid', placeContent: 'center', justifyItems: 'center', gap: 13, padding: 30, color: theme.textLight, textAlign: 'center' as const },
  emptyTitle: { margin: 0, color: theme.text, fontFamily: 'var(--font-display)', fontSize: 21 },
  emptyCopy: { margin: '0 0 6px', fontSize: 13 },
  confirmBody: { display: 'grid', gridTemplateColumns: '48px 1fr', gap: 14, alignItems: 'start' },
  confirmIcon: { width: 44, height: 44, display: 'grid', placeItems: 'center', background: 'rgba(193,40,47,0.08)', color: theme.error },
  confirmTitle: { margin: '2px 0 7px', fontFamily: 'var(--font-display)', fontSize: 17 },
  confirmCopy: { margin: 0, color: theme.textSoft, fontSize: 13, lineHeight: 1.6 },
  confirmActions: { gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  deleteConfirmButton: { minHeight: 42, padding: '0 18px', border: '1px solid #a91f28', background: theme.error, color: '#fff', fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' },
} as const
