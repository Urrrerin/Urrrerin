import { useState } from 'react'

type Props = {
  lexiconCount: number
  lexiconVersion?: string
}

export function MinePage({ lexiconCount, lexiconVersion = 'Azkaban Ch.1–5' }: Props) {
  const [updateMsg, setUpdateMsg] = useState<string | null>(null)

  async function checkUpdate() {
    setUpdateMsg('正在检查…')
    try {
      if (!('serviceWorker' in navigator)) {
        setUpdateMsg('当前环境不支持自动更新，请用 Safari 打开网页版后重新「添加到主屏幕」。')
        return
      }
      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg) {
        setUpdateMsg('未找到缓存服务，请关闭 App 后重新打开一次。')
        return
      }
      await reg.update()
      const hasWaiting = Boolean(reg.waiting)
      const hasInstalling = Boolean(reg.installing)
      if (hasWaiting || hasInstalling) {
        setUpdateMsg('发现新版本。请完全关掉本 App 再打开（上滑清掉），即可用上新版。')
      } else {
        setUpdateMsg('已是最新，或新版本正在下载。若仍像旧版：关掉 App 再开一次。')
      }
    } catch {
      setUpdateMsg('检查失败。可稍后再试，或用 Safari 打开网页后重新固定到主屏幕。')
    }
  }

  return (
    <div className="page mine-page">
      <header className="page-head">
        <p className="brand">Lumos</p>
        <h1>我的</h1>
      </header>

      <section className="mine-block">
        <h2 className="mine-title">词库</h2>
        <p className="mine-line">{lexiconVersion}</p>
        <p className="mine-line muted">{lexiconCount} 词</p>
      </section>

      <section className="mine-block">
        <h2 className="mine-title">学习</h2>
        <p className="mine-line">每日新词 30</p>
        <p className="mine-line muted">每日复习上限 75</p>
      </section>

      <section className="mine-block">
        <h2 className="mine-title">更新</h2>
        <button type="button" className="secondary-btn" onClick={() => void checkUpdate()}>
          检查更新
        </button>
        {updateMsg ? <p className="mine-line muted update-msg">{updateMsg}</p> : null}
      </section>
    </div>
  )
}
