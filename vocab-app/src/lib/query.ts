import type { ExamTag, FilterKey, SortKey, WordEntry } from '../types'
import type { LearningState } from './progress'
import { parseWordMeta } from './wordDisplay'

/** 本书词表多为 1～2 次，≥2 视为高频复现 */
const HIGH_FREQ_MIN = 2

const BASE_FILTERS: FilterKey[] = [
  'all',
  'high-freq',
  'mastered',
  'unmastered',
  'cet4',
  'cet6',
  'tem4',
  'tem8',
  'ielts',
  'toefl',
  'gaokao',
  'kaoyan',
  'other',
]

const STATIC_FILTER_LABELS: Record<string, string> = {
  all: '全部',
  'high-freq': '高频',
  mastered: '已掌握',
  unmastered: '未掌握',
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

function isMastered(
  wordId: string,
  progress?: Record<string, LearningState>,
): boolean {
  return progress?.[wordId]?.status === 'mastered'
}

function isChapterFilter(filter: FilterKey): filter is `chapter-${string}` {
  return filter.startsWith('chapter-')
}

/** 从 note 提取章节筛选 key，如 chapter-1 */
export function getChapterFilterKey(note?: string): `chapter-${string}` | undefined {
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

export function getChapterFilterLabel(noteChapter: string): string {
  const numbered = noteChapter.match(/Chapter\s+(\d+)/i)
  if (numbered) return `第${numbered[1]}章`
  return noteChapter
}

/** 当前词表里出现过的章节筛选项（按章节号排序） */
export function listChapterFilters(
  words: WordEntry[],
): { key: `chapter-${string}`; label: string }[] {
  const map = new Map<string, { key: `chapter-${string}`; label: string; order: number }>()

  for (const word of words) {
    const chapter = parseWordMeta(word.note).chapter
    if (!chapter) continue
    const key = getChapterFilterKey(word.note)
    if (!key || map.has(key)) continue
    const numbered = chapter.match(/Chapter\s+(\d+)/i)
    map.set(key, {
      key,
      label: getChapterFilterLabel(chapter),
      order: numbered ? Number(numbered[1]) : 999,
    })
  }

  return [...map.values()]
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'zh'))
    .map(({ key, label }) => ({ key, label }))
}

export function buildFilterOptions(words: WordEntry[]): FilterKey[] {
  return [...BASE_FILTERS, ...listChapterFilters(words).map((c) => c.key)]
}

export function getFilterLabel(key: FilterKey, words: WordEntry[] = []): string {
  if (STATIC_FILTER_LABELS[key]) return STATIC_FILTER_LABELS[key]
  if (isChapterFilter(key)) {
    const found = listChapterFilters(words).find((c) => c.key === key)
    if (found) return found.label
    const n = key.slice('chapter-'.length)
    return /^\d+$/.test(n) ? `第${n}章` : key
  }
  return key
}

export function filterAndSortWords(
  words: WordEntry[],
  query: string,
  filter: FilterKey,
  sort: SortKey,
  progress?: Record<string, LearningState>,
): WordEntry[] {
  const q = query.trim().toLowerCase()

  let list = words.filter((word) => {
    if (filter === 'high-freq' && word.frequency < HIGH_FREQ_MIN) return false
    if (filter === 'mastered' && !isMastered(word.id, progress)) return false
    if (filter === 'unmastered' && isMastered(word.id, progress)) return false
    if (isChapterFilter(filter)) {
      if (getChapterFilterKey(word.note) !== filter) return false
    } else if (
      filter !== 'all' &&
      filter !== 'high-freq' &&
      filter !== 'mastered' &&
      filter !== 'unmastered' &&
      !word.tags.includes(filter as ExamTag)
    ) {
      return false
    }

    if (!q) return true
    return (
      word.word.toLowerCase().includes(q) ||
      word.meaning.toLowerCase().includes(q) ||
      (word.example?.toLowerCase().includes(q) ?? false) ||
      (word.note?.toLowerCase().includes(q) ?? false)
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

/** @deprecated 使用 getFilterLabel；保留静态表兼容旧引用 */
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
