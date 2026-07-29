import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/** iOS 主屏幕版有独立缓存；打开/切回前台时检查更新（由 PWA 插件注入的 sw 负责） */
function watchForAppUpdates() {
  if (!('serviceWorker' in navigator)) return
  const check = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      await registration?.update()
    } catch {
      // ignore
    }
  }
  void check()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check()
  })
  window.setInterval(() => {
    void check()
  }, 60_000)
}

watchForAppUpdates()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
