export type ExamTag =
  | 'cet4'
  | 'cet6'
  | 'kaoyan'
  | 'tem4'
  | 'tem8'
  | 'ielts'
  | 'gaokao'
  | 'other'

export type WordEntry = {
  id: string
  word: string
  phonetic?: string
  /** 词性，如 n. / v. / adj. / adv. / phr. */
  pos?: string
  meaning: string
  example?: string
  /** 在哈利波特阅读中的出现频次 */
  frequency: number
  tags: ExamTag[]
  note?: string
}

export type SortKey = 'frequency-desc' | 'frequency-asc' | 'alpha' | 'alpha-desc'
export type FilterKey = 'all' | ExamTag | 'high-freq'
