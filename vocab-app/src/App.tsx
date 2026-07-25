import { useEffect, useMemo, useState } from 'react'
import type { FilterKey, SortKey, TabKey, WordEntry } from './types'
import { loadWords } from './lib/storage'
import { loadProgress, type LearningState } from './lib/progress'
import {
  CHIP_FILTERS,
  filterAndSortWords,
  getFilterLabel,
  listBooks,
  listChapters,
  sortLabels,
} from './lib/query'
import { splitMeaningLines } from './lib/wordDisplay'
import { TodayPage } from './pages/TodayPage'
import { MinePage } from './pages/MinePage'
import { WordDetailView } from './components/WordDetailView'
import './App.css'

const SORTS: SortKey[] = [
  'entry-order',
  'frequency-desc',
  'frequency-asc',
  'alpha',
  'alpha-desc',
]

type TodayMode = 'home' | 'review' | 'learn'

function withEntryOrder(words: WordEntry[]): WordEntry[] {
  return words.map((word, index) => ({
    ...word,
    entryOrder: word.entryOrder ?? index + 1,
  }))
}

function ListMeaning({ word }: { word: WordEntry }) {
  const lines = splitMeaningLines(word.word, word.meaning, word.pos).filter(
    (line) => !line.label,
  )

  if (lines.length === 0) {
    return <span className="meaning-lines">{word.meaning}</span>
  }

  return (
    <span className="meaning-lines">
      {lines.map((line, i) => (
        <span key={`${line.pos ?? 'm'}-${i}`} className="meaning-line">
          {line.pos ? <span className="meaning-pos">{line.pos}</span> : null}
          <span className="meaning-text">{line.senses.join('；')}</span>
        </span>
      ))}
    </span>
  )
}

function App() {
  const [tab, setTab] = useState<TabKey>('today')
  const [todayMode, setTodayMode] = useState<TodayMode>('home')
  const [words, setWords] = useState<WordEntry[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [bookFilter, setBookFilter] = useState('all')
  const [chapterFilter, setChapterFilter] = useState('all')
  const [sort, setSort] = useState<SortKey>('entry-order')
  const [selected, setSelected] = useState<WordEntry | null>(null)
  const [progressTick, setProgressTick] = useState(0)
  const [limitsTick, setLimitsTick] = useState(0)
  const [progress, setProgress] = useState<Record<string, LearningState>>({})

  useEffect(() => {
    setWords(withEntryOrder(loadWords()))
  }, [])

  useEffect(() => {
    setProgress(loadProgress())
  }, [progressTick, tab])

  const books = useMemo(() => listBooks(words), [words])
  const chapters = useMemo(
    () => listChapters(words, bookFilter),
    [words, bookFilter],
  )

  useEffect(() => {
    if (bookFilter !== 'all' && !books.includes(bookFilter)) {
      setBookFilter('all')
      setChapterFilter('all')
    }
  }, [bookFilter, books])

  useEffect(() => {
    if (
      chapterFilter !== 'all' &&
      !chapters.some((c) => c.key === chapterFilter)
    ) {
      setChapterFilter('all')
    }
  }, [chapterFilter, chapters])

  const visible = useMemo(
    () =>
      filterAndSortWords(words, query, filter, sort, progress, {
        book: bookFilter,
        chapter: chapterFilter,
      }),
    [words, query, filter, sort, progress, bookFilter, chapterFilter],
  )

  function switchTab(next: TabKey) {
    setTab(next)
    if (next !== 'today') setTodayMode('home')
  }

  return (
    <div className="app has-tabbar">
      <div className="atmosphere" aria-hidden="true" />

      {tab === 'today' ? (
        <TodayPage
          words={words}
          mode={todayMode}
          onMode={setTodayMode}
          progressTick={progressTick}
          limitsTick={limitsTick}
        />
      ) : null}

      {tab === 'library' ? (
        <div className="page library-page">
          <header className="page-head">
            <p className="brand">Lumos</p>
            <h1>词库</h1>
          </header>

          <div className="meta-row">
            <span className="pill">阿兹卡班词表 · {words.length} 词</span>
          </div>

          <section className="controls" aria-label="搜索与筛选">
            <label className="search">
              <span className="sr-only">搜索单词</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索单词 / 释义"
                enterKeyHint="search"
              />
            </label>

            <div className="scope-filters" aria-label="书目与章节">
              <label className="scope-field">
                <span>书目</span>
                <select
                  value={bookFilter}
                  onChange={(e) => {
                    setBookFilter(e.target.value)
                    setChapterFilter('all')
                  }}
                >
                  <option value="all">全部书目</option>
                  {books.map((book) => (
                    <option key={book} value={book}>
                      {book}
                    </option>
                  ))}
                </select>
              </label>
              <label className="scope-field">
                <span>章节</span>
                <select
                  value={chapterFilter}
                  onChange={(e) => setChapterFilter(e.target.value)}
                >
                  <option value="all">全部章节</option>
                  {chapters.map((chapter) => (
                    <option key={chapter.key} value={chapter.key}>
                      {chapter.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="filters" role="tablist" aria-label="标签筛选">
              {CHIP_FILTERS.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filter === key}
                  className={filter === key ? 'chip active' : 'chip'}
                  onClick={() => setFilter(key)}
                >
                  {getFilterLabel(key)}
                </button>
              ))}
            </div>

            <label className="sort">
              <span>排序</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                {SORTS.map((key) => (
                  <option key={key} value={key}>
                    {sortLabels[key]}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <p className="result-count">
            显示 {visible.length} / {words.length}
          </p>

          <main className="list" aria-label="词汇列表">
            {visible.length === 0 ? (
              <div className="empty">
                <p>没有匹配的单词</p>
                <p className="empty-hint">试试清空搜索，或切换筛选条件</p>
              </div>
            ) : (
              visible.map((word, index) => (
                <button
                  key={word.id}
                  type="button"
                  className="word-row"
                  style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
                  onClick={() => setSelected(word)}
                >
                  <span className="word-main">
                    <span className="word">{word.word}</span>
                    {word.phonetic ? (
                      <span className="phonetic">{word.phonetic}</span>
                    ) : null}
                  </span>
                  <span className="word-side">
                    <ListMeaning word={word} />
                    <span className="freq">#{word.entryOrder ?? '—'}</span>
                  </span>
                </button>
              ))
            )}
          </main>
        </div>
      ) : null}

      {tab === 'mine' ? (
        <MinePage
          lexiconCount={words.length}
          words={words}
          onProgressSeeded={() => setProgressTick((n) => n + 1)}
          onLimitsChanged={() => setLimitsTick((n) => n + 1)}
        />
      ) : null}

      <nav className="tabbar" aria-label="主导航">
        <button
          type="button"
          className={tab === 'today' ? 'tab active' : 'tab'}
          onClick={() => switchTab('today')}
        >
          今日
        </button>
        <button
          type="button"
          className={tab === 'library' ? 'tab active' : 'tab'}
          onClick={() => switchTab('library')}
        >
          词库
        </button>
        <button
          type="button"
          className={tab === 'mine' ? 'tab active' : 'tab'}
          onClick={() => switchTab('mine')}
        >
          我的
        </button>
      </nav>

      {selected ? (
        <div className="sheet-backdrop" onClick={() => setSelected(null)}>
          <aside
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={selected.word}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="sheet-head">
              <div>
                <p className="brand mini">词条</p>
                <h2>{selected.word}</h2>
                {selected.phonetic ? (
                  <p className="phonetic">{selected.phonetic}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSelected(null)}
              >
                关闭
              </button>
            </div>
            <WordDetailView word={selected} variant="sheet" />
          </aside>
        </div>
      ) : null}
    </div>
  )
}

export default App
