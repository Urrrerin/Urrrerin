import type { ExamTag, WordEntry } from '../types'
import { tagLabels } from './query'

const EXAM_TAGS: ExamTag[] = ['cet4', 'cet6', 'gaokao', 'kaoyan', 'tem4', 'tem8', 'ielts']

/** 词性标记：vt./vi./adj. 等（长的优先） */
const POS_TOKEN =
  '(?:vt|vi|adj|adv|prep|conj|pron|phr|aux|int|num|art|n|v|a)\\.'

export type MeaningLine = {
  pos?: string
  /** 义项簇；展示时用；连接，并各自加下划线 */
  senses: string[]
}

export type WordMeta = {
  chapter?: string
  forms?: string
}

function cleanSense(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function splitSenses(text: string): string[] {
  return text
    .split(/[；;]/)
    .map(cleanSense)
    .filter(Boolean)
}

/** 从释义文本猜词性（仅在原文未写词性时使用） */
export function inferPos(word: string, meaning: string): string | undefined {
  const senses = splitSenses(meaning).map((s) =>
    s.replace(/（.*?）|\(.*?\)/g, '').replace(/\s*—\s*.*$/, '').trim(),
  )
  if (senses.length === 0) return undefined

  if (/\s/.test(word.trim()) || /^(be |have |as |in the )/i.test(word)) {
    return 'phr.'
  }

  const adjHits = senses.filter((s) => /的$/.test(s) || /的[，,]/.test(s)).length
  if (adjHits >= Math.ceil(senses.length * 0.55)) return 'adj.'

  const advHits = senses.filter((s) => /地$/.test(s) || /地[，,]/.test(s)).length
  if (advHits >= Math.ceil(senses.length * 0.55)) return 'adv.'

  const verbHint =
    /[走跑跳飞叫吼推拉扔砸撞抓握塞拖拽拧拍扑扇晃荡悬垂凝视瞪眯眨咬啄吞咽喝抿咂笑哭喊嚷咕哝嘟囔颤抖发抖战栗蜷缩溜走逃离翱翔]|地[走跑看说笑]|着$|掉$|出$|入$|到$/
  const nounHint =
    /[笔纸声感帽柜门窗台柱箱喙墓库碟绳结脉石砾檐炬埚杖镜框章结脉碟砾槛条袖桶盘海沟道板柜箱门坟髅库桩柱]/

  const vHits = senses.filter((s) => verbHint.test(s)).length
  const nHits = senses.filter(
    (s) => nounHint.test(s) || (s.length <= 6 && !verbHint.test(s) && !/的$/.test(s)),
  ).length

  if (vHits > nHits) return 'v.'
  if (nHits > vHits) return 'n.'
  if (senses.every((s) => s.length <= 8) && vHits === 0) return 'n.'
  return 'v.'
}

/** 按词性拆成多行；无词性时尝试推断；同行义项按；拆开 */
export function splitMeaningLines(word: string, meaning: string): MeaningLine[] {
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
    return [
      {
        pos: inferPos(word, raw),
        senses: splitSenses(raw),
      },
    ]
  }

  const lines: MeaningLine[] = []
  const first = hits[0]
  if (first.index > 0) {
    const lead = raw.slice(0, first.index).replace(/^[；;\s]+|[；;\s]+$/g, '')
    if (lead) {
      lines.push({
        pos: inferPos(word, lead),
        senses: splitSenses(lead),
      })
    }
  }

  for (let i = 0; i < hits.length; i++) {
    const cur = hits[i]
    const nextStart = i + 1 < hits.length ? hits[i + 1].index : raw.length
    const body = raw.slice(cur.end, nextStart).replace(/^[；;\s]+|[；;\s]+$/g, '')
    lines.push({
      pos: cur.pos,
      senses: splitSenses(body).length > 0 ? splitSenses(body) : ['—'],
    })
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

/** 在例句中高亮当前单词（及简单变形） */
export function splitExampleHighlight(
  example: string,
  word: string,
): { text: string; hit: boolean }[] {
  const needle = word.trim()
  if (!needle || !example) return [{ text: example, hit: false }]

  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern =
    needle.includes(' ')
      ? escaped.replace(/\s+/g, '\\s+')
      : `${escaped}(?:s|ed|ing|er|est)?`
  const re = new RegExp(`(${pattern})`, 'ig')
  const parts = example.split(re).filter((p) => p.length > 0)
  const hitRe = new RegExp(`^(${pattern})$`, 'i')
  return parts.map((text) => ({ text, hit: hitRe.test(text) }))
}
