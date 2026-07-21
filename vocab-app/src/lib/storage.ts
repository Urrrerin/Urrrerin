import type { WordEntry } from '../types'
import { sampleWords } from '../data/sampleWords'

const STORAGE_KEY = 'potter-lexicon-words-v05'
const SOURCE_KEY = 'potter-lexicon-source-v05'

export type StoredSource = 'sample' | 'import'

export function loadWords(): { words: WordEntry[]; source: StoredSource } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const source = (localStorage.getItem(SOURCE_KEY) as StoredSource | null) || 'sample'
    if (!raw) return { words: sampleWords, source: 'sample' }
    const parsed = JSON.parse(raw) as WordEntry[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { words: sampleWords, source: 'sample' }
    }
    return { words: parsed, source }
  } catch {
    return { words: sampleWords, source: 'sample' }
  }
}

export function saveWords(words: WordEntry[], source: StoredSource): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words))
  localStorage.setItem(SOURCE_KEY, source)
}

export function resetToSample(): WordEntry[] {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.setItem(SOURCE_KEY, 'sample')
  return sampleWords
}
