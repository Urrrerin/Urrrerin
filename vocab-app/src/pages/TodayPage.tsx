import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { WordEntry } from '../types'
import { loadDailyLimits, type DailyLimits } from '../lib/dailyLimits'
import {
  applyMastered,
  applyNewLearn,
  applyReviewGrade,
  ensureDemoReviewProgress,
  loadProgress,
  pickNewWords,
  pickReviewWords,
  saveProgress,
  type LearningState,
  type ReviewGrade,
} from '../lib/progress'
import { playSfx } from '../lib/sfx'
import { WordDetailView } from '../components/WordDetailView'

type TodayMode = 'home' | 'review' | 'learn'
type Step = 'prompt' | 'detail'

type Props = {
  words: WordEntry[]
  mode: TodayMode
  onMode: (mode: TodayMode) => void
  progressTick?: number
  limitsTick?: number
}

export function TodayPage({
  words,
  mode,
  onMode,
  progressTick = 0,
  limitsTick = 0,
}: Props) {
  const [progress, setProgress] = useState<Record<string, LearningState>>({})
  const [limits, setLimits] = useState<DailyLimits>(() => loadDailyLimits())
  const [queue, setQueue] = useState<WordEntry[]>([])
  const [index, setIndex] = useState(0)
  const [step, setStep] = useState<Step>('prompt')
  const [pendingGrade, setPendingGrade] = useState<ReviewGrade | null>(null)

  useEffect(() => {
    const loaded = loadProgress()
    setProgress(ensureDemoReviewProgress(words, loaded))
  }, [words, progressTick])

  // 上限变更当天立即生效：刷新首页计数，若仍在会话中则按新上限重切队列
  useEffect(() => {
    const nextLimits = loadDailyLimits()
    setLimits(nextLimits)
    if (limitsTick === 0) return
    const latest = loadProgress()
    if (mode === 'review') {
      setQueue(pickReviewWords(words, latest, nextLimits.reviewLimit))
      setIndex(0)
      setStep('prompt')
      setPendingGrade(null)
    } else if (mode === 'learn') {
      setQueue(pickNewWords(words, latest, nextLimits.newLimit))
      setIndex(0)
      setStep('prompt')
      setPendingGrade(null)
    }
    // 仅在 limitsTick 变化时重切；mode/words 取当时快照
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limitsTick])

  const reviewQueue = useMemo(
    () => pickReviewWords(words, progress, limits.reviewLimit),
    [words, progress, limits.reviewLimit],
  )
  const learnQueue = useMemo(
    () => pickNewWords(words, progress, limits.newLimit),
    [words, progress, limits.newLimit],
  )

  const current = queue[index] ?? null

  function persist(next: Record<string, LearningState>) {
    setProgress(next)
    saveProgress(next)
  }

  function resetCard() {
    setStep('prompt')
    setPendingGrade(null)
  }

  function startReview() {
    playSfx('tap')
    const active = loadDailyLimits()
    setLimits(active)
    const list = pickReviewWords(words, progress, active.reviewLimit)
    setQueue(list)
    setIndex(0)
    resetCard()
    onMode('review')
  }

  function startLearn() {
    playSfx('tap')
    const active = loadDailyLimits()
    setLimits(active)
    const list = pickNewWords(words, progress, active.newLimit)
    setQueue(list)
    setIndex(0)
    resetCard()
    onMode('learn')
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
    // 下一词：沿用上一屏自评（记得/模糊/忘了）；模糊得以保留
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
    persist(applyNewLearn(progress, current.id))
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

  if (mode === 'review') {
    if (!current) {
      return (
        <div className="page today-page">
          <header className="page-head">
            <p className="brand">Lumos</p>
            <h1>复习完成</h1>
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
          title="复习"
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
        title="复习"
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
            <button
              type="button"
              className="footer-reveal"
              onClick={onLearnOpenDetail}
            >
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

  return (
    <div className="page today-page">
      <header className="page-head">
        <p className="brand">Lumos</p>
        <h1>今日</h1>
      </header>

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
    </div>
  )
}
