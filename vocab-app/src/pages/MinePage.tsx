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
import {
  loadProgress,
  saveProgress,
  seedDemoReviewProgress,
} from '../lib/progress'
import { isSupabaseConfigured } from '../lib/supabase'
import {
  exportRecoveryCredential,
  importRecoveryCredential,
  syncNow,
  type SyncStatus,
} from '../lib/sync'
import { ENV_LABEL, isStaging } from '../lib/env'

/** 改一版就换这个戳，方便确认手机是否拿到新包 */
export const APP_BUILD = '0730-envs'

type Props = {
  lexiconCount: number
  words: WordEntry[]
  lexiconVersion?: string
  onProgressSeeded?: () => void
  onLimitsChanged?: (limits: DailyLimits) => void
  onProgressRestored?: () => void
}

function syncLabel(status: SyncStatus): string {
  switch (status) {
    case 'disabled':
      return '未配置'
    case 'syncing':
      return '同步中…'
    case 'synced':
      return '已开启'
    case 'error':
      return '失败'
    default:
      return '待命'
  }
}

export function MinePage({
  lexiconCount,
  words,
  lexiconVersion = 'Azkaban Ch.1–6',
  onProgressSeeded,
  onLimitsChanged,
  onProgressRestored,
}: Props) {
  const [updateMsg, setUpdateMsg] = useState<string | null>(null)
  const [limits, setLimits] = useState<DailyLimits>(() => loadDailyLimits())
  const [newDraft, setNewDraft] = useState(String(limits.newLimit))
  const [reviewDraft, setReviewDraft] = useState(String(limits.reviewLimit))
  const [limitsMsg, setLimitsMsg] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    isSupabaseConfigured() ? 'idle' : 'disabled',
  )
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [recoveryText, setRecoveryText] = useState('')
  const [recoveryInput, setRecoveryInput] = useState('')

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

  async function refillDemoReview() {
    const next = seedDemoReviewProgress(words, loadProgress(), 40)
    onProgressSeeded?.()
    setUpdateMsg('已填充约 40 个待复习测试词，回「今日」查看。')
    if (!isSupabaseConfigured()) return
    setSyncStatus('syncing')
    const result = await syncNow(next, loadDailyLimits())
    setSyncStatus(result.status)
  }

  async function saveLimits() {
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
    if (!isSupabaseConfigured()) return
    setSyncStatus('syncing')
    const result = await syncNow(loadProgress(), next)
    setSyncStatus(result.status)
  }

  async function resetLimits() {
    const next = saveDailyLimits(DEFAULT_DAILY_LIMITS)
    setLimits(next)
    setNewDraft(String(next.newLimit))
    setReviewDraft(String(next.reviewLimit))
    onLimitsChanged?.(next)
    setLimitsMsg('已恢复默认：新学 30 / 复习 75。')
    if (!isSupabaseConfigured()) return
    setSyncStatus('syncing')
    const result = await syncNow(loadProgress(), next)
    setSyncStatus(result.status)
  }

  async function handleCopyRecovery() {
    try {
      const token = await exportRecoveryCredential()
      setRecoveryText(token)
      await navigator.clipboard.writeText(token)
      setSyncMsg('恢复凭证已复制，请存到备忘录（清缓存后用来找回进度）。')
      setSyncStatus('synced')
    } catch (err) {
      setSyncStatus('error')
      setSyncMsg(err instanceof Error ? err.message : '导出失败')
    }
  }

  async function handleRestoreRecovery() {
    if (!recoveryInput.trim()) {
      setSyncMsg('请先粘贴恢复凭证')
      return
    }
    setSyncStatus('syncing')
    try {
      const cloud = await importRecoveryCredential(recoveryInput)
      if (!cloud) {
        setSyncStatus('error')
        setSyncMsg('云端没有找到进度')
        return
      }
      saveProgress(cloud.progress, cloud.updatedAt)
      saveDailyLimits(cloud.dailyLimits)
      onProgressRestored?.()
      setSyncStatus('synced')
      setRecoveryInput('')
      setSyncMsg('已用恢复凭证找回学习进度')
    } catch (err) {
      setSyncStatus('error')
      setSyncMsg(err instanceof Error ? err.message : '恢复失败')
    }
  }

  async function handleSyncNow() {
    if (!isSupabaseConfigured()) {
      setSyncMsg('未配置云同步密钥')
      return
    }
    setSyncStatus('syncing')
    const result = await syncNow(loadProgress(), loadDailyLimits())
    setSyncStatus(result.status)
    setSyncMsg(result.message || null)
  }

  return (
    <div className="page mine-page">
      <header className="page-head">
        <p className="brand">Lumos</p>
        {isStaging ? <p className="env-badge">测试服 · 可放心试，不影响正式进度</p> : null}
        <h1>我的</h1>
        <p className="subtitle">
          版本 {APP_BUILD} · {ENV_LABEL}
        </p>
      </header>

      <section className="mine-block">
        <h2 className="mine-title">词库</h2>
        <p className="mine-line">{lexiconVersion}</p>
        <p className="mine-line muted">{lexiconCount} 词</p>
      </section>

      <section className="mine-block">
        <h2 className="mine-title">云同步</h2>
        <p className="mine-line muted">状态：{syncLabel(syncStatus)}</p>
        <p className="mine-line muted">
          平时自动备份学习进度。清网站数据前请先复制恢复凭证。
        </p>
        {isSupabaseConfigured() ? (
          <>
            <div className="mine-actions">
              <button type="button" className="secondary-btn" onClick={() => void handleSyncNow()}>
                立即备份
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => void handleCopyRecovery()}
              >
                复制恢复凭证
              </button>
            </div>
            {recoveryText ? (
              <textarea className="recovery-box" readOnly value={recoveryText} rows={3} />
            ) : null}
            <label className="recovery-label">
              用恢复凭证找回
              <textarea
                className="recovery-box"
                value={recoveryInput}
                onChange={(e) => setRecoveryInput(e.target.value)}
                placeholder="粘贴之前复制的恢复凭证"
                rows={3}
              />
            </label>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => void handleRestoreRecovery()}
            >
              恢复云端进度
            </button>
          </>
        ) : (
          <p className="mine-line muted">
            未检测到云配置。上线需在 GitHub Secrets 填写 VITE_SUPABASE_URL /
            VITE_SUPABASE_ANON_KEY。
          </p>
        )}
        {syncMsg ? <p className="mine-line muted update-msg">{syncMsg}</p> : null}
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
          <button type="button" className="secondary-btn" onClick={() => void saveLimits()}>
            保存并立即生效
          </button>
          <button type="button" className="ghost-btn" onClick={() => void resetLimits()}>
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
        <button type="button" className="secondary-btn" onClick={() => void refillDemoReview()}>
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
