export type ExamTag =
  | 'cet4'
  | 'cet6'
  | 'gaokao'
  | 'kaoyan'
  | 'tem4'
  | 'tem8'
  | 'ielts'
  | 'toefl'
  | 'other'

export type WordEntry = {
  id: string
  word: string
  phonetic?: string
  /** 主词性，如 n. / v. / adj.；多词性时以 meaning 多行为准 */
  pos?: string
  meaning: string
  example?: string
  /** 在哈利波特阅读中的出现频次 */
  frequency: number
  tags: ExamTag[]
  note?: string
  /** 所属书目；多书词库时用于筛选 */
  book?: string
  /** HTML 录入顺序；默认排序用。不等于稳定 wordId */
  entryOrder?: number
}

export type SortKey =
  | 'entry-order'
  | 'frequency-desc'
  | 'frequency-asc'
  | 'alpha'
  | 'alpha-desc'

export type FilterKey =
  | 'all'
  | ExamTag
  | 'high-freq'
  | 'mastered'
  | 'unmastered'

export type TabKey = 'today' | 'library' | 'mine'
