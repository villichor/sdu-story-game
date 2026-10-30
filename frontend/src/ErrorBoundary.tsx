import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface State { error: Error | null }

/** 顶层错误边界: 运行时崩溃时显示可读错误, 避免白屏无法定位 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error): State {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f6f4', padding: 32 }}>
          <div style={{ maxWidth: 640, background: '#fff', border: '1px solid #e0d8cc', borderRadius: 16, padding: 28, boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}>
            <h2 style={{ margin: '0 0 12px', color: '#a61e2e', fontSize: 20 }}>页面出错了</h2>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#26241f', fontSize: 13, background: '#f7f7f5', padding: 14, borderRadius: 10, margin: 0 }}>{String(this.state.error?.stack ?? this.state.error?.message)}</pre>
            <button style={{ marginTop: 18, background: '#a61e2e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontWeight: 600 }} onClick={() => location.reload()}>重新加载</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
