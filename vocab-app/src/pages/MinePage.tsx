import { useState } from 'react'
import type { WordEntry } from '../types'
import {
  DEFAULT_DAILY_LIMITS,
  NEW_LIMIT_RANGE,
  REVIEW_LIMIT_RANGE,
  loadDailyLimits,
  saveDailyLimits,
  type DailyLimits,
} from '../lib/dailyLimits'
import { loadProgress, seedDemoReviewProgress } from '../lib/progress'

/** 改一版就换这个戳，方便确认手机是否拿到新包 */
export const APP_BUILD = '0725-a'

type Props = {
  lexiconCount: number
  words: WordEntry[]
  lexiconVersion?: string
  onProgressSeeded?: () => void
  onLimitsChanged?: (limits: DailyLimits) => void
}

export function MinePage({
  lexiconCount,
  words,
  lexiconVersion = 'Azkaban Ch.1–6',
  onProgressSeeded,
  onLimitsChanged,
}: Props) {
  const [updateMsg, setUpdateMsg] = useState<string | null>(null)
  const [limits, setLimits] = useState<DailyLimits>(() => loadDailyLimits())
  const [newDraft, setNewDraft] = useState(String(limits.newLimit))
  const [reviewDraft, setReviewDraft] = useState(String(limits.reviewLimit))
  const [limitsMsg, setLimitsMsg] = useState<string | null>(null)

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

  function saveLimits() {
    const parsedNew = Number(newDraft)
    const parsedReview = Number(reviewDraft)
    if (!Number.isFinite(parsedNew) || !Number.isFinite(parsedReview)) {
      setLimitsMsg('请输入有效数字。')
      return
    }
    const next = saveDailyLimits({
      newLimit: parsedNew,
      reviewLimit: parsedReview,
    })
    setLimits(next)
    setNewDraft(String(next.newLimit))
    setReviewDraft(String(next.reviewLimit))
    onLimitsChanged?.(next)
    setLimitsMsg(
      `已保存：新学 ${next.newLimit} / 复习 ${next.reviewLimit}，今日队列已按新上限重新生成。`,
    )
  }

  function resetLimits() {
    const next = saveDailyLimits(DEFAULT_DAILY_LIMITS)
    setLimits(next)
    setNewDraft(String(next.newLimit))
    setReviewDraft(String(next.reviewLimit))
    onLimitsChanged?.(next)
    setLimitsMsg('已恢复默认：新学 30 / 复习 75。')
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
        <label className="mine-field">
          <span className="mine-field-label">每日新词</span>
          <input
            type="number"
            inputMode="numeric"
            min={NEW_LIMIT_RANGE.min}
            max={NEW_LIMIT_RANGE.max}
            value={newDraft}
            onChange={(e) => {
              setNewDraft(e.target.value)
              setLimitsMsg(null)
            }}
          />
          <span className="mine-field-hint">
            {NEW_LIMIT_RANGE.min}–{NEW_LIMIT_RANGE.max}
          </span>
        </label>
        <label className="mine-field">
          <span className="mine-field-label">每日复习上限</span>
          <input
            type="number"
            inputMode="numeric"
            min={REVIEW_LIMIT_RANGE.min}
            max={REVIEW_LIMIT_RANGE.max}
            value={reviewDraft}
            onChange={(e) => {
              setReviewDraft(e.target.value)
              setLimitsMsg(null)
            }}
          />
          <span className="mine-field-hint">
            {REVIEW_LIMIT_RANGE.min}–{REVIEW_LIMIT_RANGE.max}
          </span>
        </label>
        <div className="mine-actions">
          <button type="button" className="secondary-btn" onClick={saveLimits}>
            保存并立即生效
          </button>
          <button type="button" className="ghost-btn" onClick={resetLimits}>
            恢复默认
          </button>
        </div>
        {limitsMsg ? <p className="mine-line muted update-msg">{limitsMsg}</p> : null}
        <p className="mine-line muted">
          当前生效：新学 {limits.newLimit} · 复习 {limits.reviewLimit}
        </p>
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
