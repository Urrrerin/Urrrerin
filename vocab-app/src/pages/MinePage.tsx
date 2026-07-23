import { useState } from 'react'
import type { WordEntry } from '../types'
import { loadProgress, seedDemoReviewProgress } from '../lib/progress'

/** 改一版就换这个戳，方便确认手机是否拿到新包 */
export const APP_BUILD = '0723-f'

type Props = {
  lexiconCount: number
  words: WordEntry[]
  lexiconVersion?: string
  onProgressSeeded?: () => void
}

export function MinePage({
  lexiconCount,
  words,
  lexiconVersion = 'Azkaban Ch.1–5',
  onProgressSeeded,
}: Props) {
  const [updateMsg, setUpdateMsg] = useState<string | null>(null)

  async function forceRefresh() {
    setUpdateMsg('正在清除缓存…')
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((reg) => reg.unregister()))
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      }
      setUpdateMsg('缓存已清，即将刷新…')
      window.setTimeout(() => {
        window.location.reload()
      }, 400)
    } catch {
      setUpdateMsg('清除失败。请到 设置 → Safari → 清除历史记录与网站数据 后再打开。')
    }
  }

  function refillDemoReview() {
    seedDemoReviewProgress(words, loadProgress(), 40)
    onProgressSeeded?.()
    setUpdateMsg('已填充约 40 个待复习测试词，回「今日」查看。')
  }

  return (
    <div className="page mine-page">
      <header className="page-head">
        <p className="brand">Lumos</p>
        <h1>我的</h1>
        <p className="subtitle">版本 {APP_BUILD}</p>
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
        <h2 className="mine-title">测试数据</h2>
        <button type="button" className="secondary-btn" onClick={refillDemoReview}>
          填充待复习测试词
        </button>
      </section>

      <section className="mine-block">
        <h2 className="mine-title">更新</h2>
        <button type="button" className="secondary-btn" onClick={() => void forceRefresh()}>
          强制刷新（清缓存）
        </button>
        {updateMsg ? <p className="mine-line muted update-msg">{updateMsg}</p> : null}
        <p className="mine-line muted update-msg">
          若仍是旧版：看本页「版本」是否为 {APP_BUILD}。不是的话点强制刷新。
        </p>
      </section>
    </div>
  )
}
