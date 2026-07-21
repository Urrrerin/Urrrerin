export type ExamTag =
  | 'cet4'
  | 'cet6'
  | 'gaokao'
  | 'tem4'
  | 'tem8'
  | 'ielts'
  | 'other'

export type WordEntry = {
  id: string
  word: string
  phonetic?: string
  meaning: string
  example?: string
  /** 在哈利波特阅读中的出现频次 */
  frequency: number
  tags: ExamTag[]
  note?: string
}

export type SortKey = 'frequency-desc' | 'frequency-asc' | 'alpha' | 'alpha-desc'
export type FilterKey = 'all' | ExamTag | 'high-freq'
