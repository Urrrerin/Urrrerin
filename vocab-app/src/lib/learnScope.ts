import type { ExamTag, FilterKey, WordEntry } from '../types'
import { getChapterKey, listChapters } from './query'
import {
  pickNewWords,
  pickReviewWords,
  type LearningState,
} from './progress'

export type ScopeKind = 'all' | 'chapter' | 'tag'
export type OrderMode = 'smart' | 'sequential'

export type LearnPrefs = {
  scopeKind: ScopeKind
  book: string
  chapter: string
  tag: FilterKey
  order: OrderMode
  drillChapter: string
}

const PREFS_KEY = 'lumos-learn-prefs-v1'

export const TAG_SCOPE_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'cet', label: '四六级' },
  { key: 'tem', label: '专四专八' },
  { key: 'ielts', label: '雅思' },
  { key: 'kaoyan', label: '考研' },
]

export const DEFAULT_LEARN_PREFS: LearnPrefs = {
  scopeKind: 'all',
  book: 'all',
  chapter: 'all',
  tag: 'cet',
  order: 'smart',
  drillChapter: '',
}

export function loadLearnPrefs(): LearnPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULT_LEARN_PREFS }
    const parsed = JSON.parse(raw) as Partial<LearnPrefs>
    return {
      ...DEFAULT_LEARN_PREFS,
      ...parsed,
    }
  } catch {
    return { ...DEFAULT_LEARN_PREFS }
  }
}

export function saveLearnPrefs(prefs: LearnPrefs): LearnPrefs {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  return prefs
}

function matchesTag(word: WordEntry, tag: FilterKey): boolean {
  if (tag === 'all') return true
  if (tag === 'cet') {
    return word.tags.includes('cet4') || word.tags.includes('cet6')
  }
  if (tag === 'tem') {
    return word.tags.includes('tem4') || word.tags.includes('tem8')
  }
  if (tag === 'ielts') return word.tags.includes('ielts')
  if (tag === 'kaoyan') return word.tags.includes('kaoyan')
  return word.tags.includes(tag as ExamTag)
}

/** 按当前范围筛出词池 */
export function filterLearnPool(
  words: WordEntry[],
  prefs: LearnPrefs,
): WordEntry[] {
  return words.filter((word) => {
    if (prefs.scopeKind === 'chapter') {
      if (prefs.chapter === 'all' || !prefs.chapter) return false
      if (prefs.book !== 'all' && (word.book || '') !== prefs.book) return false
      return getChapterKey(word.note) === prefs.chapter
    }
    if (prefs.scopeKind === 'tag') {
      return matchesTag(word, prefs.tag)
    }
    return true
  })
}

function byEntryOrder(a: WordEntry, b: WordEntry): number {
  return (a.entryOrder ?? 0) - (b.entryOrder ?? 0)
}

export function pickScopedNewWords(
  words: WordEntry[],
  progress: Record<string, LearningState>,
  prefs: LearnPrefs,
  limit: number,
): WordEntry[] {
  const pool = filterLearnPool(words, prefs)
  if (prefs.order === 'sequential') {
    return pool
      .filter((w) => !progress[w.id])
      .sort(byEntryOrder)
      .slice(0, limit)
  }
  return pickNewWords(pool, progress, limit)
}

export function pickScopedReviewWords(
  words: WordEntry[],
  progress: Record<string, LearningState>,
  prefs: LearnPrefs,
  limit: number,
): WordEntry[] {
  const pool = filterLearnPool(words, prefs)
  return pickReviewWords(pool, progress, limit)
}

/** 章节速刷：按录入顺序过本章（未掌握优先，已掌握排后） */
export function pickChapterDrillWords(
  words: WordEntry[],
  progress: Record<string, LearningState>,
  chapterKey: string,
): WordEntry[] {
  if (!chapterKey) return []
  const list = words
    .filter((w) => getChapterKey(w.note) === chapterKey)
    .sort(byEntryOrder)

  const pending = list.filter((w) => progress[w.id]?.status !== 'mastered')
  const mastered = list.filter((w) => progress[w.id]?.status === 'mastered')
  return [...pending, ...mastered]
}

export function ensureDrillChapter(
  words: WordEntry[],
  prefs: LearnPrefs,
): string {
  if (prefs.drillChapter) return prefs.drillChapter
  const chapters = listChapters(words, prefs.book)
  return chapters[0]?.key || ''
}

export function describeScope(prefs: LearnPrefs, chapterLabel?: string): string {
  if (prefs.scopeKind === 'chapter') {
    return chapterLabel || '已选章节'
  }
  if (prefs.scopeKind === 'tag') {
    return TAG_SCOPE_OPTIONS.find((t) => t.key === prefs.tag)?.label || '标签'
  }
  return '全部词库'
}

export function describeOrder(order: OrderMode): string {
  return order === 'sequential' ? '章节顺序' : '智能推荐'
}
