import type { WordEntry } from '../types'
import { azkabanWords } from '../data/azkabanWords'

const STORAGE_KEY = 'potter-lexicon-words-v05'
const SOURCE_KEY = 'potter-lexicon-source-v05'
const UPDATED_KEY = 'potter-lexicon-updated-v05'

export type StoredSource = 'sample' | 'import'

export type LocalWordsState = {
  words: WordEntry[]
  source: StoredSource
  updatedAt: string | null
  hasLocalSave: boolean
}

export function loadWords(): LocalWordsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const source = (localStorage.getItem(SOURCE_KEY) as StoredSource | null) || 'sample'
    const updatedAt = localStorage.getItem(UPDATED_KEY)
    if (!raw) {
      return {
        words: azkabanWords,
        source: 'sample',
        updatedAt,
        hasLocalSave: false,
      }
    }
    const parsed = JSON.parse(raw) as WordEntry[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return {
        words: azkabanWords,
        source: 'sample',
        updatedAt,
        hasLocalSave: false,
      }
    }
    return {
      words: parsed,
      source,
      updatedAt,
      hasLocalSave: true,
    }
  } catch {
    return {
      words: azkabanWords,
      source: 'sample',
      updatedAt: null,
      hasLocalSave: false,
    }
  }
}

export function saveWords(
  words: WordEntry[],
  source: StoredSource,
  updatedAt = new Date().toISOString(),
): string {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words))
  localStorage.setItem(SOURCE_KEY, source)
  localStorage.setItem(UPDATED_KEY, updatedAt)
  return updatedAt
}

export function resetToSample(): { words: WordEntry[]; updatedAt: string } {
  const updatedAt = new Date().toISOString()
  localStorage.removeItem(STORAGE_KEY)
  localStorage.setItem(SOURCE_KEY, 'sample')
  localStorage.setItem(UPDATED_KEY, updatedAt)
  return { words: azkabanWords, updatedAt }
}
