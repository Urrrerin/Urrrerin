import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isStaging = env.VITE_APP_ENV === 'staging'
  const appName = isStaging ? 'Lumos 测试服' : 'Lumos'

  return {
    // 相对路径：正式根目录与 /staging/ 子目录都能用
    base: './',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
        },
        manifest: {
          name: appName,
          short_name: isStaging ? 'Lumos测' : 'Lumos',
          description: isStaging
            ? 'Lumos 测试环境（不影响正式进度）'
            : '哈利波特阅读生词 · 复习词典',
          theme_color: '#f7f3ea',
          background_color: '#f7f3ea',
          display: 'standalone',
          orientation: 'portrait',
          lang: 'zh-CN',
          start_url: './',
          icons: [
            {
              src: 'pwa-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),
    ],
  }
})
