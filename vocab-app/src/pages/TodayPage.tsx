import { useEffect, useMemo, useState } from 'react'
import type { WordEntry } from '../types'
import {
  applyNewLearn,
  applyReviewGrade,
  loadProgress,
  pickNewWords,
  pickReviewWords,
  saveProgress,
  type LearningState,
  type ReviewGrade,
} from '../lib/progress'
import { tagLabels } from '../lib/query'

type TodayMode = 'home' | 'review' | 'learn'

type Props = {
  words: WordEntry[]
  mode: TodayMode
  onMode: (mode: TodayMode) => void
}

const NEW_LIMIT = 30
const REVIEW_LIMIT = 75

export function TodayPage({ words, mode, onMode }: Props) {
  const [progress, setProgress] = useState<Record<string, LearningState>>({})
  const [queue, setQueue] = useState<WordEntry[]>([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setProgress(loadProgress())
  }, [])

  const reviewQueue = useMemo(
    () => pickReviewWords(words, progress, REVIEW_LIMIT),
    [words, progress],
  )
  const learnQueue = useMemo(
    () => pickNewWords(words, progress, NEW_LIMIT),
    [words, progress],
  )

  const current = queue[index] ?? null
  const remaining = Math.max(queue.length - index, 0)

  function persist(next: Record<string, LearningState>) {
    setProgress(next)
    saveProgress(next)
  }

  function startReview() {
    const list = pickReviewWords(words, progress, REVIEW_LIMIT)
    setQueue(list)
    setIndex(0)
    setRevealed(false)
    onMode('review')
  }

  function startLearn() {
    const list = pickNewWords(words, progress, NEW_LIMIT)
    setQueue(list)
    setIndex(0)
    setRevealed(false)
    onMode('learn')
  }

  function finishSession() {
    setQueue([])
    setIndex(0)
    setRevealed(false)
    onMode('home')
  }

  function goNext() {
    if (index + 1 >= queue.length) {
      finishSession()
      return
    }
    setIndex((i) => i + 1)
    setRevealed(false)
  }

  function onReviewGrade(grade: ReviewGrade) {
    if (!current) return
    persist(applyReviewGrade(progress, current.id, grade))
    goNext()
  }

  function onLearnNext() {
    if (!current) return
    persist(applyNewLearn(progress, current.id))
    goNext()
  }

  if (mode === 'review') {
    if (!current) {
      return (
        <div className="page today-page">
          <header className="page-head">
            <p className="brand">Lumos</p>
            <h1>复习完成</h1>
            <p className="subtitle">今天没有更多待复习的词了</p>
          </header>
          <button type="button" className="primary-btn" onClick={finishSession}>
            返回今日
          </button>
          {learnQueue.length > 0 ? (
            <button type="button" className="secondary-btn" onClick={startLearn}>
              去新学
            </button>
          ) : null}
        </div>
      )
    }

    return (
      <div className="page today-page session-page">
        <div className="session-top">
          <button type="button" className="text-btn" onClick={finishSession}>
            结束
          </button>
          <p className="session-progress">
            复习 {index + 1} / {queue.length}
          </p>
        </div>

        <div className="study-card">
          <p className="study-word">{current.word}</p>
          {current.phonetic ? <p className="study-phonetic">{current.phonetic}</p> : null}

          {revealed ? (
            <div className="study-reveal">
              <p className="study-meaning">{current.meaning}</p>
              {current.note ? <p className="study-note">{current.note}</p> : null}
              <div className="tag-row">
                {current.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tagLabels[tag] || tag}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <button type="button" className="secondary-btn" onClick={() => setRevealed(true)}>
              显示释义
            </button>
          )}
        </div>

        <div className="grade-row">
          <button type="button" className="grade-btn forgot" onClick={() => onReviewGrade('forgot')}>
            忘了
          </button>
          <button type="button" className="grade-btn fuzzy" onClick={() => onReviewGrade('fuzzy')}>
            模糊
          </button>
          <button
            type="button"
            className="grade-btn remember"
            onClick={() => onReviewGrade('remember')}
          >
            记得
          </button>
        </div>
        <p className="session-remain">剩余 {remaining - 1} 词</p>
      </div>
    )
  }

  if (mode === 'learn') {
    if (!current) {
      return (
        <div className="page today-page">
          <header className="page-head">
            <p className="brand">Lumos</p>
            <h1>新学完成</h1>
            <p className="subtitle">今天的新词已经学完了</p>
          </header>
          <button type="button" className="primary-btn" onClick={finishSession}>
            返回今日
          </button>
        </div>
      )
    }

    return (
      <div className="page today-page session-page">
        <div className="session-top">
          <button type="button" className="text-btn" onClick={finishSession}>
            结束
          </button>
          <p className="session-progress">
            新学 {index + 1} / {queue.length}
          </p>
        </div>

        <div className="study-card">
          <p className="study-word">{current.word}</p>
          {current.phonetic ? <p className="study-phonetic">{current.phonetic}</p> : null}

          {revealed ? (
            <div className="study-reveal">
              <p className="study-meaning">{current.meaning}</p>
              {current.note ? <p className="study-note">{current.note}</p> : null}
              <div className="tag-row">
                {current.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tagLabels[tag] || tag}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <button type="button" className="secondary-btn" onClick={() => setRevealed(true)}>
              显示释义
            </button>
          )}
        </div>

        <button
          type="button"
          className="primary-btn"
          disabled={!revealed}
          onClick={onLearnNext}
        >
          学会了，下一词
        </button>
        <p className="session-remain">剩余 {remaining - 1} 词</p>
      </div>
    )
  }

  const reviewCount = reviewQueue.length
  const learnCount = learnQueue.length

  return (
    <div className="page today-page">
      <header className="page-head">
        <p className="brand">Lumos</p>
        <h1>今日</h1>
        <p className="subtitle">先复习，再新学</p>
      </header>

      <div className="stat-grid">
        <div className="stat-box">
          <span className="stat-num">{reviewCount}</span>
          <span className="stat-label">待复习</span>
        </div>
        <div className="stat-box">
          <span className="stat-num">{learnCount}</span>
          <span className="stat-label">待新学</span>
        </div>
      </div>

      <div className="today-actions">
        <button
          type="button"
          className="primary-btn"
          disabled={reviewCount === 0}
          onClick={startReview}
        >
          {reviewCount > 0 ? '开始复习' : '暂无待复习'}
        </button>
        <button
          type="button"
          className="secondary-btn"
          disabled={learnCount === 0}
          onClick={startLearn}
        >
          {learnCount > 0 ? '开始新学' : '今日新学已完成'}
        </button>
      </div>
    </div>
  )
}
