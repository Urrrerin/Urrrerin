/** 构建时注入：staging | production */
export type AppEnv = 'staging' | 'production'

export const APP_ENV: AppEnv =
  import.meta.env.VITE_APP_ENV === 'staging' ? 'staging' : 'production'

export const isStaging = APP_ENV === 'staging'

export const ENV_LABEL = isStaging ? '测试服' : '正式服'

/**
 * 正式服沿用旧 key，避免已有进度丢失。
 * 测试服加前缀，避免和正式服抢同一份 localStorage（同域名）。
 */
export function storageKey(base: string): string {
  return isStaging ? `lumos-staging:${base}` : base
}
