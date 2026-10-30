import { useAuth } from '../auth/AuthContext'
import { startCasLogin } from '../lib/auth'
import { Modal } from './Modal'
import { theme } from '../theme'

export function UserCenter({ onClose }: { onClose: () => void }) {
  const { user, loginGuest, logout } = useAuth()

  return (
    <Modal title="登录 / 注册" onClose={onClose}>
      {/* 用户信息面板 */}
      <div style={styles.info}>
        <div style={styles.avatar}>{user ? user.username.slice(0, 1) : '?'}</div>
        <div style={styles.rows}>
          <Row label="用户名" value={user ? user.username : '未登录'} />
          <Row label="登录方式" value={!user ? '未登录' : user.isGuest ? '游客' : '统一认证'} />
          {user?.studentId && <Row label="学号" value={user.studentId} />}
        </div>
      </div>

      {/* 三个操作按钮 */}
      <div style={styles.actions}>
        {(!user || user.isGuest) && (
          <button style={styles.btn} onClick={() => startCasLogin('/')}>
            学号登录
          </button>
        )}
        {!user && (
          <button style={styles.btn} onClick={() => void loginGuest().then(onClose)}>
            游客体验
          </button>
        )}
        {user && (
          <button style={styles.btnDanger} onClick={() => { logout(); onClose() }}>
            退出登录
          </button>
        )}
      </div>
      <p style={styles.hint}>
        {!user ? '请选择学号统一认证登录，或以游客身份体验。' : user.isGuest ? '当前为游客，可切换至学号统一认证。' : '已通过学号统一认证登录。'}
      </p>
    </Modal>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <span style={styles.rowValue}>{value}</span>
    </div>
  )
}

const styles = {
  info: { display: 'flex', gap: 22, alignItems: 'center', marginBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: '50%', background: theme.cyan, color: theme.cyanText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, flexShrink: 0 },
  rows: { flex: 1, display: 'grid', gap: 8 },
  row: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed ' + theme.border, paddingBottom: 6 },
  rowLabel: { color: theme.textSoft },
  rowValue: { fontWeight: 600 },
  actions: { display: 'flex', gap: 12 },
  btn: { flex: 1, ...( { background: theme.gold, color: theme.onGold, border: '1px solid ' + theme.goldDark, borderRadius: 10, padding: '12px 0', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', boxShadow: theme.e1 } as const ) },
  btnDanger: { flex: 1, ...( { background: theme.panel, color: theme.error, border: '1px solid ' + theme.error, borderRadius: 10, padding: '12px 0', fontWeight: 600, cursor: 'pointer' } as const ) },
  hint: { marginTop: 18, fontSize: 12, color: theme.textLight },
} as const
