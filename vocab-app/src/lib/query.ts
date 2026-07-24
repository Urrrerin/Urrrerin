import type { FilterKey, SortKey, WordEntry } from '../types'
import type { LearningState } from './progress'
import { parseWordMeta } from './wordDisplay'

/** 本书词表多为 1～2 次，≥2 视为高频复现 */
const HIGH_FREQ_MIN = 2

export const CHIP_FILTERS: FilterKey[] = [
  'all',
  'high-freq',
  'mastered',
  'unmastered',
  'cet',
  'tem',
  'ielts',
  'kaoyan',
]

const STATIC_FILTER_LABELS: Record<FilterKey, string> = {
  all: '全部',
  'high-freq': '高频',
  mastered: '已掌握',
  unmastered: '未掌握',
  cet: '四六级',
  tem: '专四专八',
  ielts: '雅思',
  kaoyan: '考研',
}

export type ScopeFilter = {
  book: string
  chapter: string
}

function isMastered(
  wordId: string,
  progress?: Record<string, LearningState>,
): boolean {
  return progress?.[wordId]?.status === 'mastered'
}

/** 从 note 提取章节 key，如 chapter-1 */
export function getChapterKey(note?: string): string | undefined {
  const chapter = parseWordMeta(note).chapter
  if (!chapter) return undefined
  const numbered = chapter.match(/Chapter\s+(\d+)/i)
  if (numbered) return `chapter-${numbered[1]}`
  const slug = chapter
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return slug ? `chapter-${slug}` : undefined
}

export function getChapterLabel(noteChapter: string): string {
  const numbered = noteChapter.match(/Chapter\s+(\d+)/i)
  if (!numbered) return noteChapter
  const zh = noteChapter.split(' · ')[1]?.trim()
  return zh ? `第${numbered[1]}章 · ${zh}` : `第${numbered[1]}章`
}

export function listBooks(words: WordEntry[]): string[] {
  const set = new Set<string>()
  for (const word of words) {
    if (word.book?.trim()) set.add(word.book.trim())
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'zh'))
}

export function listChapters(
  words: WordEntry[],
  book: string = 'all',
): { key: string; label: string }[] {
  const map = new Map<string, { key: string; label: string; order: number }>()
  const multiBook = listBooks(words).length > 1

  for (const word of words) {
    if (book !== 'all' && (word.book || '') !== book) continue
    const chapter = parseWordMeta(word.note).chapter
    if (!chapter) continue
    const key = getChapterKey(word.note)
    if (!key || map.has(key)) continue
    const numbered = chapter.match(/Chapter\s+(\d+)/i)
    let label = getChapterLabel(chapter)
    if (multiBook && book === 'all' && word.book) {
      label = `${word.book} · ${label}`
    }
    map.set(key, {
      key,
      label,
      order: numbered ? Number(numbered[1]) : 999,
    })
  }

  return [...map.values()]
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'zh'))
    .map(({ key, label }) => ({ key, label }))
}

export function getFilterLabel(key: FilterKey): string {
  return STATIC_FILTER_LABELS[key] || key
}

export function filterAndSortWords(
  words: WordEntry[],
  query: string,
  filter: FilterKey,
  sort: SortKey,
  progress?: Record<string, LearningState>,
  scope: ScopeFilter = { book: 'all', chapter: 'all' },
): WordEntry[] {
  const q = query.trim().toLowerCase()

  let list = words.filter((word) => {
    if (scope.book !== 'all' && (word.book || '') !== scope.book) return false
    if (scope.chapter !== 'all' && getChapterKey(word.note) !== scope.chapter) {
      return false
    }

    if (filter === 'high-freq' && word.frequency < HIGH_FREQ_MIN) return false
    if (filter === 'mastered' && !isMastered(word.id, progress)) return false
    if (filter === 'unmastered' && isMastered(word.id, progress)) return false
    if (filter === 'cet' && !word.tags.some((t) => t === 'cet4' || t === 'cet6')) {
      return false
    }
    if (filter === 'tem' && !word.tags.some((t) => t === 'tem4' || t === 'tem8')) {
      return false
    }
    if (filter === 'ielts' && !word.tags.includes('ielts')) return false
    if (filter === 'kaoyan' && !word.tags.includes('kaoyan')) return false

    if (!q) return true
    return (
      word.word.toLowerCase().includes(q) ||
      word.meaning.toLowerCase().includes(q) ||
      (word.example?.toLowerCase().includes(q) ?? false) ||
      (word.note?.toLowerCase().includes(q) ?? false) ||
      (word.book?.toLowerCase().includes(q) ?? false)
    )
  })

  list = [...list].sort((a, b) => {
    switch (sort) {
      case 'entry-order': {
        const ao = a.entryOrder ?? Number.MAX_SAFE_INTEGER
        const bo = b.entryOrder ?? Number.MAX_SAFE_INTEGER
        return ao - bo || a.word.localeCompare(b.word)
      }
      case 'frequency-asc':
        return a.frequency - b.frequency || a.word.localeCompare(b.word)
      case 'alpha':
        return a.word.localeCompare(b.word)
      case 'alpha-desc':
        return b.word.localeCompare(a.word)
      case 'frequency-desc':
        return b.frequency - a.frequency || a.word.localeCompare(b.word)
      default:
        return 0
    }
  })

  return list
}

/** @deprecated 使用 getFilterLabel */
export const filterLabels: Record<string, string> = STATIC_FILTER_LABELS

export const sortLabels: Record<SortKey, string> = {
  'entry-order': '默认（录入顺序）',
  'frequency-desc': '频次高→低',
  'frequency-asc': '频次低→高',
  alpha: 'A → Z',
  'alpha-desc': 'Z → A',
}

export const tagLabels: Record<string, string> = {
  cet4: '四级',
  cet6: '六级',
  gaokao: '高考',
  kaoyan: '考研',
  tem4: '专四',
  tem8: '专八',
  ielts: '雅思',
  toefl: '托福',
  other: '其他',
}
