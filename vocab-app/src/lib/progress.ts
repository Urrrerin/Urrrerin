import type { WordEntry } from '../types'

export type ReviewGrade = 'remember' | 'fuzzy' | 'forgot'

export type LearningState = {
  wordId: string
  status: 'learning' | 'mastered'
  easiness: number
  intervalDays: number
  repetitions: number
  dueAt: string
  lastReviewedAt: string
  lastGrade?: ReviewGrade
}

const PROGRESS_KEY = 'lumos-learning-progress-v1'
const DEMO_SEED_KEY = 'lumos-demo-review-seeded-v2'

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function loadProgress(): Record<string, LearningState> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, LearningState>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveProgress(map: Record<string, LearningState>): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(map))
}

/**
 * 制作期测试数据：造一批「今天已到期」的复习词。
 * - 首次进入且尚无进度时自动填充
 * - 也可从「我的」手动再次填充
 */
export function seedDemoReviewProgress(
  words: WordEntry[],
  existing: Record<string, LearningState> = {},
  count = 40,
): Record<string, LearningState> {
  const today = todayIsoDate()
  const dueDay = addDays(today, -1)
  const next: Record<string, LearningState> = { ...existing }
  let added = 0

  for (const word of words) {
    if (added >= count) break
    if (next[word.id]?.status === 'mastered') continue
    next[word.id] = {
      wordId: word.id,
      status: 'learning',
      easiness: 2.5,
      intervalDays: 1,
      repetitions: 1,
      dueAt: dueDay,
      lastReviewedAt: dueDay,
      lastGrade: 'remember',
    }
    added += 1
  }

  saveProgress(next)
  localStorage.setItem(DEMO_SEED_KEY, '1')
  return next
}

/** 若从未种过测试复习数据且进度为空，则自动种一份 */
export function ensureDemoReviewProgress(
  words: WordEntry[],
  progress: Record<string, LearningState>,
): Record<string, LearningState> {
  if (words.length === 0) return progress
  if (Object.keys(progress).length > 0) return progress
  if (localStorage.getItem(DEMO_SEED_KEY) === '1') return progress
  return seedDemoReviewProgress(words, progress, 40)
}

export function isDue(state: LearningState, onDate = todayIsoDate()): boolean {
  return state.dueAt <= onDate
}

/** 高频 × 考试标签加权后随机抽新词 */
export function pickNewWords(
  words: WordEntry[],
  progress: Record<string, LearningState>,
  limit = 30,
): WordEntry[] {
  const pool = words.filter((w) => !progress[w.id])
  if (pool.length <= limit) return shuffle(pool)

  const weighted = pool.map((w) => ({
    word: w,
    weight: weightOf(w),
  }))
  const picked: WordEntry[] = []
  const bag = [...weighted]

  while (picked.length < limit && bag.length > 0) {
    const total = bag.reduce((sum, item) => sum + item.weight, 0)
    let r = Math.random() * total
    let index = 0
    for (; index < bag.length; index += 1) {
      r -= bag[index].weight
      if (r <= 0) break
    }
    const chosen = bag.splice(Math.min(index, bag.length - 1), 1)[0]
    picked.push(chosen.word)
  }
  return picked
}

function weightOf(word: WordEntry): number {
  let score = 1 + Math.min(word.frequency, 5)
  if (word.tags.includes('cet4')) score += 2
  if (word.tags.includes('cet6')) score += 2
  if (word.tags.includes('ielts')) score += 2
  return score
}

export function pickReviewWords(
  words: WordEntry[],
  progress: Record<string, LearningState>,
  limit = 75,
): WordEntry[] {
  const dueIds = new Set(
    Object.values(progress)
      .filter((s) => s.status !== 'mastered' && isDue(s))
      .map((s) => s.wordId),
  )
  const dueWords = words.filter((w) => dueIds.has(w.id))
  return shuffle(dueWords).slice(0, limit)
}

export function applyNewLearn(
  progress: Record<string, LearningState>,
  wordId: string,
): Record<string, LearningState> {
  const today = todayIsoDate()
  return {
    ...progress,
    [wordId]: {
      wordId,
      status: 'learning',
      easiness: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueAt: addDays(today, 1),
      lastReviewedAt: today,
    },
  }
}

/** 标记为已掌握：不再进入复习队列 */
export function applyMastered(
  progress: Record<string, LearningState>,
  wordId: string,
): Record<string, LearningState> {
  const today = todayIsoDate()
  const prev = progress[wordId]
  return {
    ...progress,
    [wordId]: {
      wordId,
      status: 'mastered',
      easiness: prev?.easiness ?? 2.5,
      intervalDays: prev?.intervalDays ?? 0,
      repetitions: prev?.repetitions ?? 0,
      // 远未来日期；真正拦截靠 status === 'mastered'
      dueAt: '9999-12-31',
      lastReviewedAt: today,
      lastGrade: prev?.lastGrade,
    },
  }
}

export function applyReviewGrade(
  progress: Record<string, LearningState>,
  wordId: string,
  grade: ReviewGrade,
): Record<string, LearningState> {
  const today = todayIsoDate()
  const prev = progress[wordId] ?? {
    wordId,
    status: 'learning' as const,
    easiness: 2.5,
    intervalDays: 1,
    repetitions: 0,
    dueAt: today,
    lastReviewedAt: today,
  }

  let { easiness, intervalDays, repetitions } = prev

  if (grade === 'forgot') {
    repetitions = 0
    intervalDays = 1
  } else if (grade === 'fuzzy') {
    repetitions += 1
    intervalDays = Math.max(1, Math.round(intervalDays * 1.2))
    easiness = Math.max(1.3, easiness - 0.15)
  } else {
    repetitions += 1
    easiness = Math.min(3.0, easiness + 0.1)
    intervalDays =
      repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.max(1, Math.round(intervalDays * easiness))
  }

  return {
    ...progress,
    [wordId]: {
      ...prev,
      easiness,
      intervalDays,
      repetitions,
      dueAt: addDays(today, intervalDays),
      lastReviewedAt: today,
      lastGrade: grade,
      status: 'learning',
    },
  }
}

function shuffle<T>(list: T[]): T[] {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
