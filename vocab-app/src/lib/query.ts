import type { FilterKey, SortKey, WordEntry } from '../types'

export function filterAndSortWords(
  words: WordEntry[],
  query: string,
  filter: FilterKey,
  sort: SortKey,
): WordEntry[] {
  const q = query.trim().toLowerCase()

  let list = words.filter((word) => {
    if (filter === 'high-freq' && word.frequency < 20) return false
    if (filter === 'cet4' && !word.tags.includes('cet4')) return false
    if (filter === 'cet6' && !word.tags.includes('cet6')) return false
    if (filter === 'gaokao' && !word.tags.includes('gaokao')) return false
    if (filter === 'other' && !word.tags.includes('other')) return false

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
      case 'frequency-asc':
        return a.frequency - b.frequency || a.word.localeCompare(b.word)
      case 'alpha':
        return a.word.localeCompare(b.word)
      case 'alpha-desc':
        return b.word.localeCompare(a.word)
      case 'frequency-desc':
      default:
        return b.frequency - a.frequency || a.word.localeCompare(b.word)
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
  other: '其他',
}

export const sortLabels: Record<SortKey, string> = {
  'frequency-desc': '频次高→低',
  'frequency-asc': '频次低→高',
  alpha: 'A → Z',
  'alpha-desc': 'Z → A',
}

export const tagLabels: Record<string, string> = {
  cet4: '四级',
  cet6: '六级',
  gaokao: '高考',
  other: '其他',
}
