import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  SpeakerSimpleHigh, SpeakerSimpleSlash, SpeakerX, MonitorPlay, SignOut,
  GameController, UserCircle, ShieldWarning, Trash, ArrowCounterClockwise,
  WarningOctagon, GearSix, CheckCircle, TextAa, FastForward, MagicWand, Vibrate,
  HandFist, EyeSlash, FloppyDisk,
} from '@phosphor-icons/react'
import { Modal } from './Modal'
import { saveApi } from '../api'
import type { GameSaveVO } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { resetSettings, useSettings } from '../lib/useSettings'
import { theme } from '../theme'

/* ===== 设置弹窗: 顶部 4 个 tab 切换, 每次只显示一组卡片, 单屏装得下 ===== */
type SettingsTab = 'audio' | 'text' | 'story' | 'account'

const TABS: { k: SettingsTab; label: string; icon: ReactNode }[] = [
  { k: 'audio',  label: '音量演出', icon: <SpeakerSimpleHigh size={15} weight="duotone" /> },
  { k: 'text',   label: '文本自动', icon: <TextAa size={15} weight="duotone" /> },
  { k: 'story',  label: '剧情入口', icon: <MonitorPlay size={15} weight="duotone" /> },
  { k: 'account',label: '用户数据', icon: <UserCircle size={15} weight="duotone" /> },
]

function SettingsView({ onClose, currentSaveId }: { onClose: () => void; currentSaveId?: number }) {
  const [settings, updateSettings] = useSettings()
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [saves, setSaves] = useState<GameSaveVO[]>([])
  const [tab, setTab] = useState<SettingsTab>('audio')
  const [dangerMsg, setDangerMsg] = useState<{ title: string; desc: string; onConfirm: () => Promise<void> } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    saveApi.list().then(setSaves).catch(() => setSaves([]))
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const totalSaves = saves.length

  const previewSentence = useMemo(() => '先生所言极是。吾辈当以继往圣之绝学, 为往世开太平。', [])

  function textSpeedLabel(ms: number) {
    if (ms <= 20) return '极速'
    if (ms <= 40) return '极快'
    if (ms <= 60) return '稍快'
    if (ms <= 90) return '舒适'
    if (ms <= 140) return '从容'
    if (ms <= 180) return '慢速'
    return '缓缓'
  }
  function autoLabel(ms: number) {
    const s = (ms / 1000).toFixed(1)
    return `${s}s 后自动`
  }

  async function confirmResetProgress() {
    setDangerMsg({
      title: '重置全部进度？',
      desc: '这将删除所有本地设置与所有云端存档、清空所有成就/收集物本地显示状态。此操作无法撤销。',
      onConfirm: async () => {
        // 逐个删除存档(后端)
        try {
          await Promise.all(saves.map((s) => saveApi.remove(s.id)))
        } catch { /* ignore */ }
        // 清本地设置
        resetSettings()
        // 登出并回到首页
        logout()
        setTimeout(() => navigate('/'), 300)
        setToast('所有进度和设置已重置')
      },
    })
  }

  async function confirmClearSaves() {
    setDangerMsg({
      title: '删除全部存档？',
      desc: `将删除你账号下的所有 ${totalSaves} 个存档(章节进度)。账号、设置、成就不会被清除。`,
      onConfirm: async () => {
        await Promise.allSettled(saves.map((s) => saveApi.remove(s.id)))
        setSaves([])
        setToast(`已删除 ${totalSaves} 个存档`)
      },
    })
  }

  async function confirmLogoutAccount() {
    setDangerMsg({
      title: '退出登录？',
      desc: '当前账号的设置会保存在本机浏览器，再次登录会生效。',
      onConfirm: async () => {
        logout()
        onClose?.()
        setTimeout(() => navigate('/'), 200)
      },
    })
  }

  async function saveCurrentProgress() {
    if (!currentSaveId || saving) return
    const source = saves.find((save) => save.id === currentSaveId)
    const stamp = new Date().toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).replaceAll('/', '-').replace(',', '')
    const saveName = `${source?.character ?? '故事'} · ${stamp}`
    setSaving(true)
    try {
      const snapshot = await saveApi.snapshot(currentSaveId, saveName)
      setSaves((current) => [snapshot, ...current])
      setToast('当前进度已另存为新存档')
    } catch (error) {
      setToast(`保存失败：${(error as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  /* ========== 单卡内容(按当前 tab 渲染) ========== */
  const card = (() => {
    if (tab === 'audio') {
      return (
        <section style={styles.card}>
          <h2 style={styles.cardHead}>
            <SpeakerSimpleHigh size={18} weight="duotone" /> 音量与演出
          </h2>
          <div style={styles.group}>
            <VolumeSlider
              label="总音量"
              icon={<SpeakerSimpleHigh size={16} />}
              value={settings.masterVolume}
              onInput={(n) => updateSettings({ masterVolume: n })}
            />
            <VolumeSlider
              label="背景音量 (BGM)"
              icon={<SpeakerSimpleSlash size={16} />}
              value={settings.bgmVolume}
              onInput={(n) => updateSettings({ bgmVolume: n })}
            />
            <VolumeSlider
              label="音效音量 (SE)"
              icon={<SpeakerX size={16} />}
              value={settings.seVolume}
              onInput={(n) => updateSettings({ seVolume: n })}
            />
          </div>
          <div style={styles.divider} />
          <h3 style={styles.cardSubHead}><MagicWand size={15} /> 演出开关</h3>
          <div style={styles.group}>
            <ToggleRow
              label="特效 / 转场蒙太奇"
              hint="关闭后, 闪屏、震动、CG 切出等演出都会用淡入淡出替代, 适合对光敏感的玩家"
              value={settings.effectsEnabled}
              onToggle={(v) => updateSettings({ effectsEnabled: v })}
              icon={<MagicWand size={16} />}
            />
            <ToggleRow
              label="屏幕震动"
              hint="关闭后, 选项/打斗等场景的屏幕小幅度晃动会被禁用"
              value={settings.shakeEnabled}
              onToggle={(v) => updateSettings({ shakeEnabled: v })}
              icon={<Vibrate size={16} />}
            />
          </div>
        </section>
      )
    }
    if (tab === 'text') {
      return (
        <section style={styles.card}>
          <h2 style={styles.cardHead}>
            <TextAa size={18} weight="duotone" /> 文本与自动播放
          </h2>
          <div style={styles.group}>
            <SliderRow
              label="逐字速度"
              icon={<HandFist size={16} />}
              min={15} max={200} step={1}
              value={settings.textSpeedMs}
              labelRight={textSpeedLabel(settings.textSpeedMs)}
              onInput={(n) => updateSettings({ textSpeedMs: n })}
            />
            <ToggleRow
              label="默认开启自动播放"
              hint="进入剧情页后自动播放, 点屏幕或按空格可暂停"
              value={settings.autoEnabled}
              onToggle={(v) => updateSettings({ autoEnabled: v })}
              icon={<FastForward size={16} />}
            />
            {settings.autoEnabled && (
              <SliderRow
                label="自动播放停顿"
                icon={<FastForward size={16} />}
                min={500} max={6000} step={100}
                value={settings.autoWaitMs}
                labelRight={autoLabel(settings.autoWaitMs)}
                onInput={(n) => updateSettings({ autoWaitMs: n })}
              />
            )}
          </div>
          <div style={styles.divider} />
          <div>
            <div style={{ fontSize: 12, color: theme.textSoft, marginBottom: 8 }}>预览句子(随"逐字速度"变化, 数字越小越快):</div>
            <div style={styles.previewBox}>{previewSentence}</div>
          </div>
        </section>
      )
    }
    if (tab === 'story') {
      return (
        <section style={styles.card}>
          <h2 style={styles.cardHead}>
            <MonitorPlay size={18} weight="duotone" /> 剧情快捷入口
            <span style={styles.cardHeadMeta}>{totalSaves} 个存档</span>
          </h2>
          <div style={styles.group}>
          {currentSaveId && (
            <NavLink
              label={saving ? '正在保存…' : '保存当前进度'}
              icon={<FloppyDisk size={16} />}
              onClick={() => void saveCurrentProgress()}
              meta="将当前位置复制为一个可独立继续的新存档"
              disabled={saving}
            />
          )}
          <NavLink label={currentSaveId ? '管理存档' : '存档管理'} icon={<GameController size={16} />} onClick={() => { onClose?.(); navigate('/continue') }} meta="查看、继续或删除全部存档" />
          <NavLink label="记忆 / 收藏" icon={<GearSix size={16} />} onClick={() => { onClose?.(); navigate('/achievements') }} meta="成就 & 收集物柜" />
          <NavLink label="退出游玩" icon={<SignOut size={16} />} onClick={() => { onClose?.(); navigate('/') }} meta="返回首页, 存档自动保留" />
          <ToggleRow
              label="隐藏未解锁内容信息"
              hint="在成就和收集物页, 未解锁的条目标题/描述/图片会显示为问号, 防止被剧透; 成就页也能单独开关此选项"
              value={settings.hideUnlockedSpoilers}
              onToggle={(v) => updateSettings({ hideUnlockedSpoilers: v })}
              icon={<EyeSlash size={16} />}
            />
          </div>
        </section>
      )
    }
    // tab === 'account'
    return (
      <section style={styles.card}>
        <h2 style={styles.cardHead}>
          <UserCircle size={18} weight="duotone" /> 用户与数据
          <span style={styles.cardHeadMeta}>{user?.isGuest ? '游客登录' : `学号: ${user?.studentId ?? '—'}`}</span>
        </h2>
        <div style={styles.group}>
          <InfoRow label="账号名" value={user?.username ?? 'guest'} />
          <InfoRow label="当前版本" value="v1.0 · 山大人文故事" />
        </div>
        <div style={styles.divider} />
        <div style={styles.groupDanger}>
          <DangerBtn
            level="minor"
            icon={<ArrowCounterClockwise size={15} />}
            title="恢复默认设置"
            desc="仅还原滑杆/开关, 不碰存档与登录态"
            onClick={() => { resetSettings(); setToast('已恢复默认设置') }}
          />
          <DangerBtn
            level="warn"
            icon={<Trash size={15} />}
            title={`删除全部 ${totalSaves} 个存档`}
            desc="清空存档列表, 账号与设置保留"
            disabled={totalSaves === 0}
            onClick={confirmClearSaves}
          />
          <DangerBtn
            level="danger"
            icon={<ShieldWarning size={15} />}
            title="重置全部进度"
            desc="清空存档 + 恢复默认设置 + 退出账号"
            onClick={confirmResetProgress}
          />
          <DangerBtn
            level="minor"
            icon={<UserCircle size={15} />}
            title="退出当前账号"
            desc="返回首页, 再次访问需登录"
            onClick={confirmLogoutAccount}
          />
        </div>
      </section>
    )
  })()

  const tabBar = (
    <div style={styles.tabs}>
      {TABS.map((t) => (
        <button
          key={t.k}
          style={tab === t.k ? styles.tabActive : styles.tab}
          className="settings-control"
          onClick={() => setTab(t.k)}
        >
          <span style={styles.tabIcon}>{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  )

  const body = (
    <div style={styles.body}>
      {tabBar}
      <div style={styles.cardWrap}>{card}</div>

      {/* ========== 危险操作确认 ========== */}
      {dangerMsg && (
        <Modal title="" onClose={() => setDangerMsg(null)} width={460}>
          <div style={styles.dangerModal}>
            <div style={styles.dangerBadge}>
              <WarningOctagon size={20} weight="fill" />
            </div>
            <div style={styles.dangerTitle}>{dangerMsg.title}</div>
            <p style={styles.dangerDesc}>{dangerMsg.desc}</p>
            <div style={styles.dangerActions}>
              <button style={styles.cancelBtn} className="settings-control" onClick={() => setDangerMsg(null)}>取消</button>
              <button
                style={styles.dangerBtn}
                className="settings-control"
                onClick={async () => {
                  try { await dangerMsg.onConfirm() } finally { setDangerMsg(null) }
                }}
              >确认执行</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )

  return (
    <>
      {body}
      {toast && (
        <div style={styles.toast}>
          <CheckCircle size={16} weight="fill" />
          <span>{toast}</span>
        </div>
      )}
    </>
  )
}

/* ================= Modal 封装 ================= */
export function SettingsModal({ onClose, currentSaveId }: { onClose: () => void; currentSaveId?: number }) {
  return (
    <Modal title="设置" onClose={onClose} width={620}>
      <SettingsView onClose={onClose} currentSaveId={currentSaveId} />
    </Modal>
  )
}

/* ================= 小组件 ================= */

function VolumeSlider({
  label, value, onInput, icon,
}: { label: string; value: number; onInput: (n: number) => void; icon: ReactNode }) {
  return (
    <div style={styles.row}>
      <div style={styles.rowIcon}>{icon}</div>
      <div style={styles.rowLabel}>{label}</div>
      <input
        type="range" min={0} max={100} step={1} value={value}
        style={styles.range}
        onChange={(e) => onInput(Number(e.target.value))}
      />
      <div style={styles.rowValue}>
        <span style={styles.rowValueN}>{value}</span>
        <span style={styles.rowValueUnit}>/ 100</span>
      </div>
    </div>
  )
}
function SliderRow({
  label, value, onInput, min, max, step, labelRight, icon,
}: {
  label: string; value: number; onInput: (n: number) => void;
  min: number; max: number; step?: number; labelRight: string; icon: ReactNode;
}) {
  return (
    <div style={styles.row}>
      <div style={styles.rowIcon}>{icon}</div>
      <div style={styles.rowLabel}>{label}</div>
      <input
        type="range" min={min} max={max} step={step ?? 1} value={value}
        style={styles.range}
        onChange={(e) => onInput(Number(e.target.value))}
      />
      <div style={styles.rowPill}>{labelRight}</div>
    </div>
  )
}

function ToggleRow({
  label, hint, value, onToggle, icon,
}: { label: string; hint?: string; value: boolean; onToggle: (v: boolean) => void; icon: ReactNode }) {
  return (
    <div style={styles.row}>
      <div style={styles.rowIcon}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={styles.rowLabel}>{label}</div>
        {hint && <div style={styles.rowHint}>{hint}</div>}
      </div>
      <button
        style={{ ...styles.toggle, background: value ? theme.gold : theme.locked }}
        className="settings-control"
        onClick={() => onToggle(!value)}
        aria-label={label}
      >
        <span style={{ ...styles.toggleKnob, transform: `translateX(${value ? 22 : 0}px)` }} />
      </button>
    </div>
  )
}

function NavLink({
  label, meta, onClick, icon, disabled,
}: { label: string; meta?: string; onClick: () => void; icon: ReactNode; disabled?: boolean }) {
  return (
    <button
      style={{ ...styles.navLink, opacity: disabled ? 0.55 : 1, cursor: disabled ? 'wait' : 'pointer' }}
      className="settings-control"
      onClick={onClick}
      disabled={disabled}
    >
      <div style={styles.rowIcon}>{icon}</div>
      <div style={{ flex: 1, textAlign: 'left' }}>
        <div style={styles.rowLabel}>{label}</div>
        {meta && <div style={styles.rowHint}>{meta}</div>}
      </div>
      <span style={styles.rowChevron}>›</span>
    </button>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.row}>
      <div style={{ ...styles.rowIcon, background: 'rgba(22,23,26,0.04)' }}><GearSix size={15} /></div>
      <div style={styles.rowLabel}>{label}</div>
      <div style={styles.infoValue}>{value}</div>
    </div>
  )
}

function DangerBtn({
  level, icon, title, desc, onClick, disabled,
}: {
  level: 'minor' | 'warn' | 'danger';
  icon: ReactNode; title: string; desc: string; onClick: () => void; disabled?: boolean;
}) {
  const palette = {
    minor: { bg: '#fff', fg: theme.text, bd: theme.border },
    warn:  { bg: 'rgba(196,101,26,0.06)', fg: '#9a5613', bd: 'rgba(196,101,26,0.35)' },
    danger:{ bg: 'rgba(193,40,47,0.06)', fg: theme.error, bd: 'rgba(193,40,47,0.35)' },
  }[level]
  return (
    <button
      style={{
        ...styles.dangerItem,
        background: palette.bg, border: `1px solid ${palette.bd}`, color: palette.fg,
        opacity: disabled ? 0.55 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      disabled={disabled}
      className="settings-control"
      onClick={onClick}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center',
          background: level === 'minor' ? 'rgba(22,23,26,0.05)' : 'rgba(255,255,255,0.6)',
          color: palette.fg,
        }}>{icon}</div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
          <div style={{ fontSize: 12, color: theme.textSoft, marginTop: 3 }}>{desc}</div>
        </div>
      </div>
      <span style={styles.rowChevron}>›</span>
    </button>
  )
}

/* ================= 样式 ================= */
const styles = {
  body: {
    display: 'flex', flexDirection: 'column', gap: 16,
  } as React.CSSProperties,
  tabs: {
    display: 'flex', gap: 6, padding: 4,
    background: 'rgba(22,23,26,0.04)', borderRadius: 12,
  } as React.CSSProperties,
  tab: {
    flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '10px 8px', borderRadius: 9, border: 'none', background: 'transparent',
    color: theme.textSoft, fontWeight: 600, fontSize: 12, cursor: 'pointer',
    transition: 'background .15s, color .15s',
  } as React.CSSProperties,
  tabActive: {
    flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '10px 8px', borderRadius: 9, border: 'none',
    background: '#fff', color: theme.gold,
    fontWeight: 700, fontSize: 12, cursor: 'pointer',
    boxShadow: theme.e1,
  } as React.CSSProperties,
  tabIcon: { display: 'inline-flex', alignItems: 'center' },
  cardWrap: { display: 'flex' },
  card: {
    flex: 1, background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 18, padding: '18px 18px 14px',
    boxShadow: theme.e1, display: 'flex', flexDirection: 'column', gap: 12,
  },
  cardHead: {
    display: 'flex', alignItems: 'center', gap: 8,
    margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16,
  },
  cardHeadMeta: {
    marginLeft: 'auto', fontSize: 12, color: theme.textLight, fontWeight: 600,
  },
  cardSubHead: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    margin: 0, color: theme.text, fontWeight: 700, fontSize: 13,
  },
  group: { display: 'grid', gap: 10 },
  groupDanger: { display: 'grid', gap: 10, marginTop: 4 },
  divider: { height: 1, background: theme.border, margin: '2px 0' },
  row: {
    display: 'grid', gridTemplateColumns: '32px 130px 1fr auto',
    alignItems: 'center', gap: 12,
    minHeight: 40,
  } as React.CSSProperties,
  rowIcon: {
    width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center',
    background: 'rgba(166,30,46,0.07)', color: theme.gold,
  },
  rowLabel: { fontWeight: 600, fontSize: 13 },
  rowHint: { fontSize: 11, color: theme.textLight, marginTop: 2, lineHeight: 1.4 },
  rowValue: {
    minWidth: 56, textAlign: 'right',
  },
  rowValueN: {
    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: theme.gold,
  },
  rowValueUnit: { fontSize: 11, color: theme.textLight, marginLeft: 2 },
  rowPill: {
    padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700,
    background: 'rgba(166,30,46,0.08)', color: theme.gold,
  },
  rowChevron: { fontSize: 20, color: theme.textLight },
  range: { accentColor: theme.gold, height: 4 },
  toggle: {
    width: 48, height: 28, borderRadius: 999, position: 'relative' as const,
    cursor: 'pointer', border: 'none', padding: 0, transition: 'background .2s',
  },
  toggleKnob: {
    position: 'absolute' as const, top: 3, left: 3, width: 22, height: 22,
    borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    transition: 'transform .2s cubic-bezier(.2,.8,.2,1)',
  },
  navLink: {
    ...({
      display: 'grid', gridTemplateColumns: '32px 1fr auto',
      alignItems: 'center', gap: 12,
      minHeight: 48, padding: '0 10px 0 0',
      background: 'transparent', border: 'none', borderBottom: `1px dashed ${theme.border}`,
      cursor: 'pointer', color: theme.text, textAlign: 'left',
    } as React.CSSProperties),
  },
  infoValue: {
    textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700, color: theme.text, fontSize: 13,
  },
  previewBox: {
    padding: '14px 16px', borderRadius: 12, border: `1px solid ${theme.border}`,
    background: 'rgba(246,246,244,0.6)',
    color: theme.text, fontSize: 14, lineHeight: 1.6, fontFamily: 'var(--font-body)',
  },
  dangerItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 12px 12px 14px', borderRadius: 12, textAlign: 'left',
  } as React.CSSProperties,

  /* --- 危险操作 Modal --- */
  dangerModal: {
    display: 'grid', gap: 14, justifyItems: 'start',
  },
  dangerBadge: {
    width: 42, height: 42, borderRadius: 12, background: 'rgba(193,40,47,0.1)', color: theme.error,
    display: 'grid', placeItems: 'center',
  },
  dangerTitle: {
    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: theme.error,
  },
  dangerDesc: {
    margin: 0, color: theme.textSoft, fontSize: 13, lineHeight: 1.6,
  },
  dangerActions: {
    justifySelf: 'end', display: 'inline-flex', gap: 10, marginTop: 4,
  },
  cancelBtn: {
    background: '#fff', color: theme.text, border: `1px solid ${theme.border}`,
    borderRadius: 10, padding: '9px 18px', fontWeight: 600, cursor: 'pointer',
  },
  dangerBtn: {
    background: theme.error, color: '#fff', border: `1px solid #8b191e`,
    borderRadius: 10, padding: '9px 18px', fontWeight: 700, cursor: 'pointer',
    boxShadow: theme.e1,
  },

  toast: {
    position: 'fixed' as const, left: '50%', transform: 'translateX(-50%)', bottom: 40, zIndex: 150,
    padding: '10px 16px', background: '#fff', color: theme.text,
    border: `1px solid ${theme.border}`, borderRadius: 12, boxShadow: theme.e3,
    display: 'inline-flex', alignItems: 'center', gap: 8,
    fontWeight: 600, fontSize: 13,
  },
} as const
