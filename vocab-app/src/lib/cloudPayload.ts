import type { WordEntry } from '../types'
import type { StoredSource } from './storage'

export type CloudPayload = {
  version: 1
  words: WordEntry[]
  source: StoredSource
  updatedAt: string
}

export function isCloudPayload(value: unknown): value is CloudPayload {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    v.version === 1 &&
    Array.isArray(v.words) &&
    (v.source === 'sample' || v.source === 'import') &&
    typeof v.updatedAt === 'string'
  )
}

export function makePayload(
  words: WordEntry[],
  source: StoredSource,
  updatedAt = new Date().toISOString(),
): CloudPayload {
  return { version: 1, words, source, updatedAt }
}
