import { useEffect, useMemo, useRef, useState } from 'react'
import type { FilterKey, SortKey, TabKey, WordEntry } from './types'
import { parseWordsFromHtml } from './lib/parseHtml'
import { loadWords, resetToSample, saveWords } from './lib/storage'
import { loadProgress, type LearningState } from './lib/progress'
import {
  filterAndSortWords,
  filterLabels,
  sortLabels,
} from './lib/query'
import { TodayPage } from './pages/TodayPage'
import { MinePage } from './pages/MinePage'
import { WordDetailView } from './components/WordDetailView'
import './App.css'

const FILTERS: FilterKey[] = [
  'all',
  'high-freq',
  'mastered',
  'unmastered',
  'cet4',
  'cet6',
  'tem4',
  'tem8',
  'ielts',
  'gaokao',
  'kaoyan',
  'other',
]
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

function App() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<TabKey>('today')
  const [todayMode, setTodayMode] = useState<TodayMode>('home')
  const [words, setWords] = useState<WordEntry[]>([])
  const [source, setSource] = useState<'sample' | 'import'>('sample')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [sort, setSort] = useState<SortKey>('entry-order')
  const [selected, setSelected] = useState<WordEntry | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [progressTick, setProgressTick] = useState(0)
  const [progress, setProgress] = useState<Record<string, LearningState>>({})

  useEffect(() => {
    const loaded = loadWords()
    setWords(withEntryOrder(loaded.words))
    setSource(loaded.source)
  }, [])

  useEffect(() => {
    setProgress(loadProgress())
  }, [progressTick, tab])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const visible = useMemo(
    () => filterAndSortWords(words, query, filter, sort, progress),
    [words, query, filter, sort, progress],
  )

  function showToast(message: string) {
    setToast(message)
  }

  function switchTab(next: TabKey) {
    setTab(next)
    if (next !== 'today') setTodayMode('home')
  }

  async function handleFile(file: File) {
    const text = await file.text()
    const parsed = withEntryOrder(parseWordsFromHtml(text))
    if (parsed.length === 0) {
      showToast('没识别到单词，请检查 HTML 格式或发我一份样例')
      return
    }
    saveWords(parsed, 'import')
    setWords(parsed)
    setSource('import')
    setImportOpen(false)
    setSelected(null)
    showToast(`已导入 ${parsed.length} 个单词`)
  }

  function handleReset() {
    const sample = withEntryOrder(resetToSample())
    setWords(sample)
    setSource('sample')
    setSelected(null)
    showToast('已恢复阿兹卡班词表')
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
        />
      ) : null}

      {tab === 'library' ? (
        <div className="page library-page">
          <header className="page-head">
            <p className="brand">Lumos</p>
            <h1>词库</h1>
          </header>

          <div className="meta-row">
            <span className="pill">
              {source === 'sample' ? '阿兹卡班词表' : '已导入词表'} · {words.length} 词
            </span>
            <button type="button" className="text-btn" onClick={() => setImportOpen(true)}>
              导入 HTML
            </button>
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

            <div className="filters" role="tablist" aria-label="筛选">
              {FILTERS.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filter === key}
                  className={filter === key ? 'chip active' : 'chip'}
                  onClick={() => setFilter(key)}
                >
                  {filterLabels[key]}
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

          <p className="result-count">显示 {visible.length} / {words.length}</p>

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
                    {word.phonetic ? <span className="phonetic">{word.phonetic}</span> : null}
                  </span>
                  <span className="word-side">
                    <span className="meaning">{word.meaning}</span>
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
                {selected.phonetic ? <p className="phonetic">{selected.phonetic}</p> : null}
              </div>
              <button type="button" className="icon-btn" onClick={() => setSelected(null)}>
                关闭
              </button>
            </div>
            <WordDetailView word={selected} variant="sheet" />
          </aside>
        </div>
      ) : null}

      {importOpen ? (
        <div className="sheet-backdrop" onClick={() => setImportOpen(false)}>
          <aside
            className="sheet import-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="导入词表"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-handle" />
            <h2>导入你的 HTML 词表</h2>
            <p className="import-copy">
              选择你日常记录的词汇 HTML。识别成功后会保存在本机。
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".html,.htm,text/html"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleFile(file)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              className="primary-btn"
              onClick={() => fileRef.current?.click()}
            >
              选择 HTML 文件
            </button>
            {source === 'import' ? (
              <button type="button" className="text-btn reset" onClick={handleReset}>
                恢复阿兹卡班词表
              </button>
            ) : null}
          </aside>
        </div>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}

export default App
