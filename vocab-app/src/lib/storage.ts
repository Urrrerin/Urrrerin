import type { WordEntry } from '../types'
import { azkabanWords } from '../data/azkabanWords'

/** 词表真源为内置阿兹卡班词库；学习进度另存 */
export function loadWords(): WordEntry[] {
  return azkabanWords
}
