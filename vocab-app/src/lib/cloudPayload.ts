import type { DailyLimits } from './dailyLimits'
import type { LearningState } from './progress'

export type CloudPayload = {
  version: 2
  kind: 'lumos-learning'
  progress: Record<string, LearningState>
  dailyLimits: DailyLimits
  updatedAt: string
}

export function isCloudPayload(value: unknown): value is CloudPayload {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    v.version === 2 &&
    v.kind === 'lumos-learning' &&
    typeof v.progress === 'object' &&
    v.progress !== null &&
    typeof v.dailyLimits === 'object' &&
    v.dailyLimits !== null &&
    typeof v.updatedAt === 'string'
  )
}

export function makePayload(
  progress: Record<string, LearningState>,
  dailyLimits: DailyLimits,
  updatedAt = new Date().toISOString(),
): CloudPayload {
  return {
    version: 2,
    kind: 'lumos-learning',
    progress,
    dailyLimits,
    updatedAt,
  }
}
