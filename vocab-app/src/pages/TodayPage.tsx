import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { FilterKey, WordEntry } from '../types'
import { loadDailyLimits, type DailyLimits } from '../lib/dailyLimits'
import {
  applyMastered,
  applyNewLearn,
  applyReviewGrade,
  ensureDemoReviewProgress,
  loadProgress,
  saveProgress,
  type LearningState,
  type ReviewGrade,
} from '../lib/progress'
import { listBooks, listChapters } from '../lib/query'
import {
  DEFAULT_LEARN_PREFS,
  TAG_SCOPE_OPTIONS,
  describeOrder,
  describeScope,
  ensureDrillChapter,
  filterLearnPool,
  loadLearnPrefs,
  pickChapterDrillWords,
  pickScopedNewWords,
  pickScopedReviewWords,
  saveLearnPrefs,
  type LearnPrefs,
  type OrderMode,
  type ScopeKind,
} from '../lib/learnScope'
import { isSupabaseConfigured } from '../lib/supabase'
import { queueProgressSync } from '../lib/sync'
import { playSfx } from '../lib/sfx'
import { WordDetailView } from '../components/WordDetailView'

type TodayMode = 'home' | 'review' | 'learn' | 'drill'
type Step = 'prompt' | 'detail'

type Props = {
  words: WordEntry[]
  mode: TodayMode
  onMode: (mode: TodayMode) => void
  progressTick?: number
  limitsTick?: number
  /** 云同步启动完成前先不种测试数据，避免盖住云端进度 */
  syncReady?: boolean
}

export function TodayPage({
  words,
  mode,
  onMode,
  progressTick = 0,
  limitsTick = 0,
  syncReady = true,
}: Props) {
  const [progress, setProgress] = useState<Record<string, LearningState>>({})
  const [limits, setLimits] = useState<DailyLimits>(() => loadDailyLimits())
  const [prefs, setPrefs] = useState<LearnPrefs>(() => loadLearnPrefs())
  const [queue, setQueue] = useState<WordEntry[]>([])
  const [index, setIndex] = useState(0)
  const [step, setStep] = useState<Step>('prompt')
  const [pendingGrade, setPendingGrade] = useState<ReviewGrade | null>(null)

  const books = useMemo(() => listBooks(words), [words])
  const chapters = useMemo(
    () => listChapters(words, prefs.book),
    [words, prefs.book],
  )
  const allChapters = useMemo(() => listChapters(words, 'all'), [words])

  useEffect(() => {
    if (!syncReady) return
    const loaded = loadProgress()
    if (isSupabaseConfigured()) {
      setProgress(loaded)
      return
    }
    setProgress(ensureDemoReviewProgress(words, loaded))
  }, [words, progressTick, syncReady])

  useEffect(() => {
    if (prefs.scopeKind !== 'chapter') return
    if (prefs.chapter !== 'all' && chapters.some((c) => c.key === prefs.chapter)) {
      return
    }
    const nextChapter = chapters[0]?.key || 'all'
    if (nextChapter !== prefs.chapter) {
      updatePrefs({ chapter: nextChapter })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters, prefs.scopeKind])

  useEffect(() => {
    const drill = ensureDrillChapter(words, prefs)
    if (drill && drill !== prefs.drillChapter) {
      updatePrefs({ drillChapter: drill })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words])

  useEffect(() => {
    const nextLimits = loadDailyLimits()
    setLimits(nextLimits)
    if (limitsTick === 0) return
    const latest = loadProgress()
    if (mode === 'review') {
      setQueue(
        pickScopedReviewWords(words, latest, prefs, nextLimits.reviewLimit),
      )
      setIndex(0)
      setStep('prompt')
      setPendingGrade(null)
    } else if (mode === 'learn') {
      setQueue(pickScopedNewWords(words, latest, prefs, nextLimits.newLimit))
      setIndex(0)
      setStep('prompt')
      setPendingGrade(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limitsTick])

  const reviewQueue = useMemo(
    () => pickScopedReviewWords(words, progress, prefs, limits.reviewLimit),
    [words, progress, prefs, limits.reviewLimit],
  )
  const learnQueue = useMemo(
    () => pickScopedNewWords(words, progress, prefs, limits.newLimit),
    [words, progress, prefs, limits.newLimit],
  )
  const poolCount = useMemo(
    () => filterLearnPool(words, prefs).length,
    [words, prefs],
  )
  const drillQueuePreview = useMemo(
    () => pickChapterDrillWords(words, progress, prefs.drillChapter),
    [words, progress, prefs.drillChapter],
  )

  const selectedChapterLabel =
    chapters.find((c) => c.key === prefs.chapter)?.label ||
    allChapters.find((c) => c.key === prefs.chapter)?.label

  const current = queue[index] ?? null

  function updatePrefs(patch: Partial<LearnPrefs>) {
    setPrefs((prev) => saveLearnPrefs({ ...prev, ...patch }))
  }

  function persist(next: Record<string, LearningState>) {
    setProgress(next)
    saveProgress(next)
    queueProgressSync(next, loadDailyLimits())
  }

  function resetCard() {
    setStep('prompt')
    setPendingGrade(null)
  }

  function startReview() {
    playSfx('tap')
    const active = loadDailyLimits()
    setLimits(active)
    const list = pickScopedReviewWords(words, progress, prefs, active.reviewLimit)
    setQueue(list)
    setIndex(0)
    resetCard()
    onMode('review')
  }

  function startLearn() {
    playSfx('tap')
    const active = loadDailyLimits()
    setLimits(active)
    const list = pickScopedNewWords(words, progress, prefs, active.newLimit)
    setQueue(list)
    setIndex(0)
    resetCard()
    onMode('learn')
  }

  function startDrill() {
    playSfx('tap')
    const chapter = prefs.drillChapter || ensureDrillChapter(words, prefs)
    if (!chapter) return
    const list = pickChapterDrillWords(words, progress, chapter)
    if (list.length === 0) return
    updatePrefs({ drillChapter: chapter })
    setQueue(list)
    setIndex(0)
    resetCard()
    onMode('drill')
  }

  function finishSession() {
    setQueue([])
    setIndex(0)
    resetCard()
    onMode('home')
  }

  function goNextWord() {
    if (index + 1 >= queue.length) {
      finishSession()
      return
    }
    setIndex((i) => i + 1)
    resetCard()
  }

  function onReviewPromptGrade(grade: ReviewGrade) {
    playSfx(grade)
    setPendingGrade(grade)
    setStep('detail')
  }

  function onReviewConfirmNext() {
    if (!current) return
    playSfx('next')
    const grade = pendingGrade ?? 'remember'
    persist(applyReviewGrade(progress, current.id, grade))
    goNextWord()
  }

  function onReviewConfirmWrong() {
    if (!current) return
    playSfx('forgot')
    persist(applyReviewGrade(progress, current.id, 'forgot'))
    goNextWord()
  }

  function onLearnOpenDetail() {
    playSfx('reveal')
    setStep('detail')
  }

  function onLearnNext() {
    if (!current) return
    playSfx('next')
    if (progress[current.id]) {
      persist(applyReviewGrade(progress, current.id, 'remember'))
    } else {
      persist(applyNewLearn(progress, current.id))
    }
    goNextWord()
  }

  function onMastered() {
    if (!current) return
    playSfx('mastered')
    persist(applyMastered(progress, current.id))
    goNextWord()
  }

  function SessionChrome({
    title,
    children,
    footer,
  }: {
    title: string
    children: ReactNode
    footer: ReactNode
  }) {
    return (
      <div className="page today-page session-page">
        <header className="session-nav">
          <button type="button" className="session-back" onClick={finishSession} aria-label="返回">
            ‹
          </button>
          <p className="session-progress">
            {index + 1}/{queue.length}
          </p>
          <button type="button" className="session-mastered" onClick={onMastered}>
            熟
          </button>
        </header>
        <p className="session-mode-label">{title}</p>
        <div className="session-body">{children}</div>
        <div className="session-footer">{footer}</div>
      </div>
    )
  }

  function renderGradeSession(title: string) {
    if (!current) {
      return (
        <div className="page today-page">
          <header className="page-head">
            <p className="brand">Lumos</p>
            <h1>{title}完成</h1>
          </header>
          <button type="button" className="primary-btn" onClick={finishSession}>
            返回今日
          </button>
        </div>
      )
    }

    if (step === 'prompt') {
      return (
        <SessionChrome
          title={title}
          footer={
            <div className="footer-grades">
              <button
                type="button"
                className="footer-grade remember"
                onClick={() => onReviewPromptGrade('remember')}
              >
                记得
              </button>
              <button
                type="button"
                className="footer-grade fuzzy"
                onClick={() => onReviewPromptGrade('fuzzy')}
              >
                模糊
              </button>
              <button
                type="button"
                className="footer-grade forgot"
                onClick={() => onReviewPromptGrade('forgot')}
              >
                忘了
              </button>
            </div>
          }
        >
          <p className="study-word">{current.word}</p>
          {current.phonetic ? (
            <p className="phonetic-pill">
              <span className="phonetic-mark">音</span>
              {current.phonetic}
            </p>
          ) : null}
          <p className="recall-hint">先回想词义再选择</p>
        </SessionChrome>
      )
    }

    return (
      <SessionChrome
        title={title}
        footer={
          <div className="footer-pair">
            <button type="button" className="footer-link next" onClick={onReviewConfirmNext}>
              下一词
            </button>
            <button type="button" className="footer-link wrong" onClick={onReviewConfirmWrong}>
              记错了
            </button>
          </div>
        }
      >
        <WordDetailView word={current} />
      </SessionChrome>
    )
  }

  if (mode === 'review') return renderGradeSession('复习')
  if (mode === 'drill') return renderGradeSession('章节速刷')

  if (mode === 'learn') {
    if (!current) {
      return (
        <div className="page today-page">
          <header className="page-head">
            <p className="brand">Lumos</p>
            <h1>新学完成</h1>
          </header>
          <button type="button" className="primary-btn" onClick={finishSession}>
            返回今日
          </button>
        </div>
      )
    }

    if (step === 'prompt') {
      return (
        <SessionChrome
          title="新学"
          footer={
            <button type="button" className="footer-reveal" onClick={onLearnOpenDetail}>
              查看释义
            </button>
          }
        >
          <p className="study-word">{current.word}</p>
          {current.phonetic ? (
            <p className="phonetic-pill">
              <span className="phonetic-mark">音</span>
              {current.phonetic}
            </p>
          ) : null}
        </SessionChrome>
      )
    }

    return (
      <SessionChrome
        title="新学"
        footer={
          <div className="footer-pair">
            <button type="button" className="footer-link mastered" onClick={onMastered}>
              已掌握
            </button>
            <button type="button" className="footer-link next" onClick={onLearnNext}>
              下一词
            </button>
          </div>
        }
      >
        <WordDetailView word={current} />
      </SessionChrome>
    )
  }

  const reviewCount = reviewQueue.length
  const learnCount = learnQueue.length
  const drillCount = drillQueuePreview.length

  return (
    <div className="page today-page">
      <header className="page-head">
        <p className="brand">Lumos</p>
        <h1>今日</h1>
        <p className="subtitle">
          {describeScope(prefs, selectedChapterLabel)} · {describeOrder(prefs.order)}
        </p>
      </header>

      <section className="learn-panel" aria-label="学习范围">
        <h2 className="learn-panel-title">学习范围</h2>
        <div className="learn-seg" role="tablist" aria-label="范围类型">
          {(
            [
              ['all', '全部'],
              ['chapter', '按章节'],
              ['tag', '按标签'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={prefs.scopeKind === key}
              className={prefs.scopeKind === key ? 'learn-seg-btn active' : 'learn-seg-btn'}
              onClick={() => {
                const patch: Partial<LearnPrefs> = { scopeKind: key as ScopeKind }
                if (key === 'chapter' && (!prefs.chapter || prefs.chapter === 'all')) {
                  patch.chapter = chapters[0]?.key || 'all'
                }
                updatePrefs(patch)
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {prefs.scopeKind === 'chapter' ? (
          <div className="learn-fields">
            {books.length > 1 ? (
              <label className="learn-field">
                <span>书目</span>
                <select
                  value={prefs.book}
                  onChange={(e) =>
                    updatePrefs({
                      book: e.target.value,
                      chapter: 'all',
                    })
                  }
                >
                  <option value="all">全部书目</option>
                  {books.map((book) => (
                    <option key={book} value={book}>
                      {book}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="learn-field">
              <span>章节</span>
              <select
                value={prefs.chapter}
                onChange={(e) => updatePrefs({ chapter: e.target.value })}
              >
                {chapters.length === 0 ? <option value="all">暂无章节</option> : null}
                {chapters.map((chapter) => (
                  <option key={chapter.key} value={chapter.key}>
                    {chapter.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {prefs.scopeKind === 'tag' ? (
          <div className="learn-seg wrap" role="tablist" aria-label="考试标签">
            {TAG_SCOPE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                role="tab"
                aria-selected={prefs.tag === opt.key}
                className={prefs.tag === opt.key ? 'learn-seg-btn active' : 'learn-seg-btn'}
                onClick={() => updatePrefs({ tag: opt.key as FilterKey })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : null}

        <p className="learn-hint">当前范围内约 {poolCount} 词</p>
      </section>

      <section className="learn-panel" aria-label="排列方式">
        <h2 className="learn-panel-title">排列方式</h2>
        <div className="learn-seg" role="tablist" aria-label="排序">
          {(
            [
              ['smart', '智能推荐'],
              ['sequential', '章节顺序'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={prefs.order === key}
              className={prefs.order === key ? 'learn-seg-btn active' : 'learn-seg-btn'}
              onClick={() => updatePrefs({ order: key as OrderMode })}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="learn-hint">
          {prefs.order === 'smart'
            ? '按高频与考试标签加权抽词（现有逻辑）'
            : '按词库录入顺序依次新学'}
        </p>
      </section>

      <div className="home-entries">
        <button
          type="button"
          className="home-entry"
          disabled={learnCount === 0}
          onClick={startLearn}
        >
          <span className="home-entry-label">新学</span>
          <span className="home-entry-num">{learnCount}</span>
        </button>
        <button
          type="button"
          className="home-entry"
          disabled={reviewCount === 0}
          onClick={startReview}
        >
          <span className="home-entry-label">复习</span>
          <span className="home-entry-num">{reviewCount}</span>
        </button>
      </div>
      <p className="learn-hint home-entry-note">
        新学 / 复习都使用上面的范围与排列；复习只取今日到期词。
      </p>

      <section className="learn-panel drill-panel" aria-label="章节速刷">
        <h2 className="learn-panel-title">章节速刷</h2>
        <p className="learn-hint">刚读完一章时用：按顺序过本章单词，不占用「今日新学」名额逻辑以外的智能抽词。</p>
        <label className="learn-field">
          <span>章节</span>
          <select
            value={prefs.drillChapter}
            onChange={(e) => updatePrefs({ drillChapter: e.target.value })}
          >
            {allChapters.map((chapter) => (
              <option key={chapter.key} value={chapter.key}>
                {chapter.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="secondary-btn drill-btn"
          disabled={drillCount === 0}
          onClick={startDrill}
        >
          开始速刷 · {drillCount} 词
        </button>
      </section>

      <button
        type="button"
        className="ghost-btn reset-prefs"
        onClick={() => setPrefs(saveLearnPrefs({ ...DEFAULT_LEARN_PREFS }))}
      >
        恢复默认：全部 + 智能推荐
      </button>
    </div>
  )
}
