import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { chapterApi, saveApi } from '../api'
import type { Chapter } from '../api/types'
import { Modal } from './Modal'
import { theme } from '../theme'

export function ChapterPicker({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [picked, setPicked] = useState<Chapter | null>(null)

  useEffect(() => {
    chapterApi.list().then(setChapters).catch((e) => setError((e as Error).message))
  }, [])

  async function start() {
    if (!picked || busy) return
    setBusy(true)
    try {
      const stamp = new Date().toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      }).replaceAll('/', '-').replace(',', '')
      const save = await saveApi.create(`${picked.character} · ${stamp}`, picked.id)
      onClose()
      navigate(`/story/${save.id}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={confirm ? '开始新游戏' : '选择人物故事'} onClose={onClose}>
      {confirm ? (
        <>
          <p style={styles.confirmText}>是否开始 <b>{picked?.title}</b>?</p>
          <p style={styles.hint}>将创建一个新的独立存档，已有进度会完整保留。</p>
          <div style={styles.confirmRow}>
            <button style={styles.btn} disabled={busy} onClick={start}>{busy ? '创建中…' : '确认开始'}</button>
            <button style={styles.btnGhost} onClick={() => setConfirm(false)}>返回</button>
          </div>
        </>
      ) : (
        <div style={styles.list}>
          {error && <p style={styles.err}>{error}</p>}
          {chapters.map((c) => (
            <button key={c.id} style={styles.chapter} onClick={() => { setPicked(c); setConfirm(true) }}>
              <span style={styles.chapterTitle}>{c.title}</span>
              <span style={styles.chapterMeta}>{c.character} · {c.theme}</span>
            </button>
          ))}
          {chapters.length === 0 && <p style={styles.hint}>暂无故事(请确认后端或 VITE_USE_MOCK)</p>}
        </div>
      )}
    </Modal>
  )
}

const styles = {
  list: { display: 'grid', gap: 12 },
  chapter: { display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left', ...( { background: theme.panelDeep, color: theme.text, border: '1px solid ' + theme.border, borderRadius: 12, padding: '16px 20px', cursor: 'pointer', boxShadow: theme.e1 } as const ) },
  chapterTitle: { fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 },
  chapterMeta: { fontSize: 13, color: theme.textSoft },
  confirmText: { fontSize: 17, margin: '0 0 10px' },
  warn: { color: theme.error, fontSize: 14, margin: '0 0 20px' },
  confirmRow: { display: 'flex', gap: 12 },
  btn: { flex: 1, ...( { background: theme.gold, color: theme.onGold, border: '1px solid ' + theme.goldDark, borderRadius: 10, padding: '12px 0', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', boxShadow: theme.e1 } as const ) },
  btnGhost: { flex: 1, ...( { background: theme.panel, color: theme.textSoft, border: '1px solid ' + theme.border, borderRadius: 10, padding: '12px 0', cursor: 'pointer' } as const ) },
  err: { color: theme.error },
  hint: { color: theme.textLight },
} as const
