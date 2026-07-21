import { useEffect, useMemo, useRef, useState } from 'react'
import type { FilterKey, SortKey, WordEntry } from './types'
import { parseWordsFromHtml } from './lib/parseHtml'
import { loadWords, resetToSample, saveWords } from './lib/storage'
import {
  filterAndSortWords,
  filterLabels,
  sortLabels,
  tagLabels,
} from './lib/query'
import './App.css'

const FILTERS: FilterKey[] = [
  'all',
  'high-freq',
  'cet4',
  'cet6',
  'tem4',
  'tem8',
  'ielts',
  'gaokao',
  'other',
]
const SORTS: SortKey[] = [
  'frequency-desc',
  'frequency-asc',
  'alpha',
  'alpha-desc',
]

function App() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [words, setWords] = useState<WordEntry[]>([])
  const [source, setSource] = useState<'sample' | 'import'>('sample')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [sort, setSort] = useState<SortKey>('frequency-desc')
  const [selected, setSelected] = useState<WordEntry | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    const loaded = loadWords()
    setWords(loaded.words)
    setSource(loaded.source)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const visible = useMemo(
    () => filterAndSortWords(words, query, filter, sort),
    [words, query, filter, sort],
  )

  function showToast(message: string) {
    setToast(message)
  }

  async function handleFile(file: File) {
    const text = await file.text()
    const parsed = parseWordsFromHtml(text)
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
    const sample = resetToSample()
    setWords(sample)
    setSource('sample')
    setSelected(null)
    showToast('已恢复阿兹卡班词表')
  }

  return (
    <div className="app">
      <div className="atmosphere" aria-hidden="true" />

      <header className="top">
        <div className="brand-block">
          <p className="brand">魔法词本</p>
          <h1>阿兹卡班词单</h1>
          <p className="subtitle">
            《哈利·波特与阿兹卡班的囚徒》前 5 章生词，通勤可查、可筛、可搜。
          </p>
        </div>

        <div className="meta-row">
          <span className="pill">
            {source === 'sample' ? '阿兹卡班词表' : '已导入词表'} · {words.length} 词
          </span>
          <button type="button" className="text-btn" onClick={() => setImportOpen(true)}>
            导入 HTML
          </button>
        </div>
      </header>

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
                <span className="freq">×{word.frequency}</span>
              </span>
            </button>
          ))
        )}
      </main>

      <footer className="foot">
        <p>iPhone：Safari 打开后，点分享 →「添加到主屏幕」，就能像 App 一样用。</p>
      </footer>

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
            <p className="sheet-meaning">{selected.meaning}</p>
            <div className="tag-row">
              {selected.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tagLabels[tag] || tag}
                </span>
              ))}
              <span className="tag quiet">出现 {selected.frequency} 次</span>
            </div>
            {selected.example ? (
              <blockquote className="example">“{selected.example}”</blockquote>
            ) : null}
            {selected.note ? <p className="note">{selected.note}</p> : null}
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
              选择你日常记录的词汇 HTML。识别成功后会保存在本机，通勤打开也能看。
            </p>
            <ol className="import-steps">
              <li>已支持阿兹卡班格式：ID / 英文 / 音标 / 变形 / 出现 / 词库 / 中文</li>
              <li>也支持通用表格：单词 / 音标 / 释义 / 频次 / 标签</li>
              <li>词库写「四级 / 六级 / 专四 / 专八 / 雅思」会被自动识别</li>
            </ol>
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
