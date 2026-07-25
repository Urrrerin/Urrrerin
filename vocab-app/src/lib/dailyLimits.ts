const STORAGE_KEY = 'lumos-daily-limits-v1'

export type DailyLimits = {
  newLimit: number
  reviewLimit: number
}

export const DEFAULT_DAILY_LIMITS: DailyLimits = {
  newLimit: 30,
  reviewLimit: 75,
}

export const NEW_LIMIT_RANGE = { min: 1, max: 100 } as const
export const REVIEW_LIMIT_RANGE = { min: 1, max: 300 } as const

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function clampDailyLimits(input: Partial<DailyLimits>): DailyLimits {
  return {
    newLimit: clamp(
      input.newLimit ?? DEFAULT_DAILY_LIMITS.newLimit,
      NEW_LIMIT_RANGE.min,
      NEW_LIMIT_RANGE.max,
    ),
    reviewLimit: clamp(
      input.reviewLimit ?? DEFAULT_DAILY_LIMITS.reviewLimit,
      REVIEW_LIMIT_RANGE.min,
      REVIEW_LIMIT_RANGE.max,
    ),
  }
}

export function loadDailyLimits(): DailyLimits {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_DAILY_LIMITS }
    const parsed = JSON.parse(raw) as Partial<DailyLimits>
    return clampDailyLimits(parsed)
  } catch {
    return { ...DEFAULT_DAILY_LIMITS }
  }
}

export function saveDailyLimits(input: Partial<DailyLimits>): DailyLimits {
  const next = clampDailyLimits(input)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}
