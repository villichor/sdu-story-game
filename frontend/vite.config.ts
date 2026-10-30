import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// 后端地址统一从 .env 的 VITE_SSO_BACKEND 读取(含 vite 代理 + SSO 学号登录 forward)。
// 后端是 cloudflare 临时隧道, 地址会变 —— 改了以后只需改 .env.development 的这一行。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const BACKEND = env.VITE_SSO_BACKEND || 'http://localhost:8080'
  return {
    plugins: [react()],
    server: {
      proxy: {
        // 前端请求同源 /api/… → 转发到后端, 避免开发时跨域(CORS)
        '/api': {
          target: BACKEND,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
