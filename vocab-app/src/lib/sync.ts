import type { Session } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from './supabase'
import {
  isCloudPayload,
  makePayload,
  type CloudPayload,
} from './cloudPayload'
import type { StoredSource } from './storage'
import type { WordEntry } from '../types'

export type SyncStatus =
  | 'disabled'
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'error'

export type LocalBundle = {
  words: WordEntry[]
  source: StoredSource
  updatedAt: string | null
  hasLocalSave: boolean
}

async function ensureAnonSession(): Promise<Session | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  const { data: existing, error: getError } = await supabase.auth.getSession()
  if (getError) throw getError
  if (existing.session) return existing.session

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return data.session
}

async function findProgressRow(userId: string) {
  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('user_progress')
    .select('id, payload, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function pullCloudPayload(): Promise<CloudPayload | null> {
  if (!isSupabaseConfigured()) return null
  const session = await ensureAnonSession()
  if (!session) return null

  const row = await findProgressRow(session.user.id)
  if (!row?.payload) return null
  return isCloudPayload(row.payload) ? row.payload : null
}

export async function pushCloudPayload(payload: CloudPayload): Promise<void> {
  if (!isSupabaseConfigured()) return
  const supabase = getSupabase()
  if (!supabase) return

  const session = await ensureAnonSession()
  if (!session) throw new Error('未登录，无法同步')

  const existing = await findProgressRow(session.user.id)
  const updatedAt = payload.updatedAt

  if (existing?.id) {
    const { error } = await supabase
      .from('user_progress')
      .update({
        payload,
        updated_at: updatedAt,
      })
      .eq('id', existing.id)
    if (error) throw error
    return
  }

  const { error } = await supabase.from('user_progress').insert({
    user_id: session.user.id,
    payload,
    updated_at: updatedAt,
  })
  if (error) throw error
}

function pickWinner(
  local: LocalBundle,
  cloud: CloudPayload | null,
): 'local' | 'cloud' | 'none' {
  if (!cloud) return local.hasLocalSave || local.source === 'import' ? 'local' : 'none'
  if (!local.hasLocalSave && local.source === 'sample') return 'cloud'

  const localTs = local.updatedAt ? Date.parse(local.updatedAt) : 0
  const cloudTs = Date.parse(cloud.updatedAt) || 0

  if (cloud.source === 'import' && local.source === 'sample' && !local.hasLocalSave) {
    return 'cloud'
  }
  if (cloudTs > localTs) return 'cloud'
  if (localTs > cloudTs) return 'local'
  // same timestamp: prefer import over sample
  if (local.source === 'import' && cloud.source !== 'import') return 'local'
  if (cloud.source === 'import' && local.source !== 'import') return 'cloud'
  return 'local'
}

export type BootstrapResult = {
  words: WordEntry[]
  source: StoredSource
  updatedAt: string
  status: SyncStatus
  message?: string
}

/** 启动时：匿名登录 + 和云端对齐 */
export async function bootstrapSync(local: LocalBundle): Promise<BootstrapResult> {
  if (!isSupabaseConfigured()) {
    return {
      words: local.words,
      source: local.source,
      updatedAt: local.updatedAt || new Date().toISOString(),
      status: 'disabled',
      message: '未配置云同步',
    }
  }

  try {
    await ensureAnonSession()
    const cloud = await pullCloudPayload()
    const winner = pickWinner(local, cloud)

    if (winner === 'cloud' && cloud) {
      return {
        words: cloud.words,
        source: cloud.source,
        updatedAt: cloud.updatedAt,
        status: 'synced',
        message: '已从云端恢复',
      }
    }

    const updatedAt = local.updatedAt || new Date().toISOString()
    const payload = makePayload(local.words, local.source, updatedAt)

    if (winner === 'local' || (winner === 'none' && !cloud)) {
      await pushCloudPayload(payload)
    }

    return {
      words: local.words,
      source: local.source,
      updatedAt,
      status: 'synced',
      message: winner === 'local' ? '已备份到云端' : '云同步已开启',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '同步失败'
    return {
      words: local.words,
      source: local.source,
      updatedAt: local.updatedAt || new Date().toISOString(),
      status: 'error',
      message,
    }
  }
}

export async function syncNow(
  words: WordEntry[],
  source: StoredSource,
  updatedAt = new Date().toISOString(),
): Promise<{ status: SyncStatus; message?: string; updatedAt: string }> {
  if (!isSupabaseConfigured()) {
    return { status: 'disabled', updatedAt, message: '未配置云同步' }
  }
  try {
    await pushCloudPayload(makePayload(words, source, updatedAt))
    return { status: 'synced', updatedAt, message: '已备份到云端' }
  } catch (err) {
    return {
      status: 'error',
      updatedAt,
      message: err instanceof Error ? err.message : '同步失败',
    }
  }
}

/** 恢复凭证：清缓存后可粘贴找回同一云端身份 */
export async function exportRecoveryCredential(): Promise<string> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('未配置云同步')

  const session = await ensureAnonSession()
  if (!session?.refresh_token) throw new Error('没有可导出的登录态')

  const blob = {
    v: 1 as const,
    refresh_token: session.refresh_token,
    access_token: session.access_token,
  }
  return btoa(JSON.stringify(blob))
}

export async function importRecoveryCredential(raw: string): Promise<CloudPayload | null> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('未配置云同步')

  let parsed: { v: number; refresh_token: string; access_token?: string }
  try {
    parsed = JSON.parse(atob(raw.trim()))
  } catch {
    throw new Error('恢复凭证格式不对')
  }
  if (!parsed?.refresh_token) throw new Error('恢复凭证缺少 refresh_token')

  const { error } = await supabase.auth.setSession({
    refresh_token: parsed.refresh_token,
    access_token: parsed.access_token || '',
  })
  if (error) throw error

  return pullCloudPayload()
}
