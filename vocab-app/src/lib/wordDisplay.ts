import type { ExamTag, WordEntry } from '../types'
import { tagLabels } from './query'

const EXAM_TAGS: ExamTag[] = ['cet4', 'cet6', 'gaokao', 'tem4', 'tem8', 'ielts']

/** 词性标记：vt./vi./adj. 等（长的优先） */
const POS_TOKEN =
  '(?:vt|vi|adj|adv|prep|conj|pron|phr|aux|int|num|art|n|v|a)\\.'

export type MeaningLine = {
  pos?: string
  text: string
}

export type WordMeta = {
  chapter?: string
  forms?: string
}

/** 按词性拆成多行；同行内多个义项保持用；分隔 */
export function splitMeaningLines(meaning: string): MeaningLine[] {
  const raw = meaning.replace(/\s+/g, ' ').trim()
  if (!raw) return []

  const re = new RegExp(`(^|[；;\\s])(${POS_TOKEN})\\s*`, 'gi')
  const hits: { index: number; pos: string; end: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    const prefix = m[1]
    const token = m[2]
    const tokenStart = m.index + prefix.length
    hits.push({
      index: tokenStart,
      pos: token.toLowerCase(),
      end: m.index + m[0].length,
    })
  }

  if (hits.length === 0) {
    return [{ text: raw }]
  }

  const lines: MeaningLine[] = []
  const first = hits[0]
  if (first.index > 0) {
    const lead = raw.slice(0, first.index).replace(/^[；;\s]+|[；;\s]+$/g, '')
    if (lead) lines.push({ text: lead })
  }

  for (let i = 0; i < hits.length; i++) {
    const cur = hits[i]
    const nextStart = i + 1 < hits.length ? hits[i + 1].index : raw.length
    const body = raw.slice(cur.end, nextStart).replace(/^[；;\s]+|[；;\s]+$/g, '')
    lines.push({ pos: cur.pos, text: body || '—' })
  }

  return lines
}

export function parseWordMeta(note?: string): WordMeta {
  if (!note) return {}
  const parts = note.split(' · ').map((p) => p.trim()).filter(Boolean)
  const chapterParts: string[] = []
  let forms: string | undefined

  for (const part of parts) {
    if (part.startsWith('变形 ')) {
      forms = part.slice(3).trim()
      continue
    }
    if (part.startsWith('词库 ') || part.startsWith('标注 ')) continue
    chapterParts.push(part)
  }

  return {
    chapter: chapterParts.length > 0 ? chapterParts.join(' · ') : undefined,
    forms,
  }
}

export function displayTags(word: WordEntry): { key: string; label: string }[] {
  return word.tags
    .filter((tag): tag is ExamTag => EXAM_TAGS.includes(tag as ExamTag))
    .map((tag) => ({ key: tag, label: tagLabels[tag] || tag }))
}
