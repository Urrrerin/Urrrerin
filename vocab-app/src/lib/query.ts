import type { FilterKey, SortKey, WordEntry } from '../types'

/** 本书词表多为 1～2 次，≥2 视为高频复现 */
const HIGH_FREQ_MIN = 2

export function filterAndSortWords(
  words: WordEntry[],
  query: string,
  filter: FilterKey,
  sort: SortKey,
): WordEntry[] {
  const q = query.trim().toLowerCase()

  let list = words.filter((word) => {
    if (filter === 'high-freq' && word.frequency < HIGH_FREQ_MIN) return false
    if (filter !== 'all' && filter !== 'high-freq' && !word.tags.includes(filter)) {
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

export const filterLabels: Record<FilterKey, string> = {
  all: '全部',
  'high-freq': '高频',
  cet4: '四级',
  cet6: '六级',
  gaokao: '高考',
  tem4: '专四',
  tem8: '专八',
  ielts: '雅思',
  other: '其他',
}

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
  tem4: '专四',
  tem8: '专八',
  ielts: '雅思',
  other: '其他',
}
