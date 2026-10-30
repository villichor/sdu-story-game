/** 全局错误边界 —— 兜底捕获子组件渲染/生命周期错误, 显示友好降级 UI */
import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { error: Error | null; info: { componentStack?: string } | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null }
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info)
    this.setState({ error, info })
  }

  reset = () => {
    this.setState({ error: null, info: null })
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#241a10', color: '#e8dcd0', padding: 24 }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <div style={{ fontSize: 20, fontFamily: 'var(--font-display)' }}>页面遇到了一些问题</div>
          <div style={{ fontSize: 13, color: '#8a94a1', maxWidth: 560, textAlign: 'center', lineHeight: 1.7 }}>
            {this.state.error.message || '未知错误'}
          </div>
          <button onClick={this.reset} style={{ padding: '8px 24px', borderRadius: 8, background: '#c89b3c', color: '#1a1510', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
            再试一次
          </button>
          <a href="/" style={{ fontSize: 13, color: '#8a94a1', textDecoration: 'underline' }}>返回首页</a>
        </div>
      )
    }
    return this.props.children
  }
}
