import type { ExamTag, WordEntry } from '../types'

const CET4_HINT = /四级|cet-?4|cet4|大学英语四级/i
const CET6_HINT = /六级|cet-?6|cet6|大学英语六级/i
const GAOKAO_HINT = /高考|gaokao|高中/i
const TEM4_HINT = /专四|tem-?4|tem4/i
const TEM8_HINT = /专八|tem-?8|tem8/i
const IELTS_HINT = /雅思|ielts/i

function uid(word: string, index: number): string {
  return `${word.toLowerCase().replace(/\s+/g, '-')}-${index}`
}

function parseTags(text: string): ExamTag[] {
  const tags: ExamTag[] = []
  if (CET4_HINT.test(text)) tags.push('cet4')
  if (CET6_HINT.test(text)) tags.push('cet6')
  if (GAOKAO_HINT.test(text)) tags.push('gaokao')
  if (TEM4_HINT.test(text)) tags.push('tem4')
  if (TEM8_HINT.test(text)) tags.push('tem8')
  if (IELTS_HINT.test(text)) tags.push('ielts')
  if (tags.length === 0) tags.push('other')
  return tags
}

function parseFrequency(text: string): number {
  const times = text.match(/×\s*(\d+)/)
  if (times) return Number(times[1])

  const matched =
    text.match(/(?:频次|频率|出现|次数|freq(?:uency)?)\s*[:：]?\s*(\d+)/i) ||
    text.match(/\b(\d+)\s*次/) ||
    text.match(/\bx\s*(\d+)\b/i)
  return matched ? Number(matched[1]) : 1
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function emptyish(value: string | undefined): boolean {
  if (!value) return true
  return ['', '/', '—', '-', '–'].includes(value.trim())
}

function cellTexts(row: Element): string[] {
  return Array.from(row.querySelectorAll('td, th')).map((cell) =>
    cleanText(cell.textContent || ''),
  )
}

function looksLikeWord(text: string): boolean {
  return /^[A-Za-z][A-Za-z\s'\-.]*$/.test(text) || text.startsWith("'")
}

/**
 * 尽量兼容常见个人词表 HTML：
 * 1) 阿兹卡班格式：ID | 英文 | 音标 | 变形 | 出现 | 词库 | 中文
 * 2) table 行：单词 | 音标 | 释义 | 频次 | 标签
 * 3) 带 data-word 的节点
 * 4) li / p 行内：word — meaning
 */
export function parseWordsFromHtml(html: string): WordEntry[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const fromAzkaban = parseAzkabanTable(doc)
  if (fromAzkaban.length > 0) return fromAzkaban

  const fromTable = parseTable(doc)
  if (fromTable.length > 0) return dedupe(fromTable)

  const fromDataAttrs = parseDataAttributes(doc)
  if (fromDataAttrs.length > 0) return dedupe(fromDataAttrs)

  const fromLines = parseLooseLines(doc)
  return dedupe(fromLines)
}

/** 《阿兹卡班》生词表：按章节保留全部行，不去重 */
function parseAzkabanTable(doc: Document): WordEntry[] {
  const tables = Array.from(doc.querySelectorAll('table'))
  const words: WordEntry[] = []
  let index = 0

  for (const table of tables) {
    const headerCells = cellTexts(table.querySelector('thead tr') || table.querySelector('tr') || table)
    const joinedHeader = headerCells.join(' ')
    const isAzkaban =
      headerCells.includes('英文') &&
      (headerCells.includes('词库') || headerCells.includes('中文') || /音标/.test(joinedHeader))
    if (!isAzkaban) continue

    const chapter = findChapterLabel(table)
    const rows = Array.from(table.querySelectorAll('tbody tr, tr')).slice(
      table.querySelector('thead') ? 0 : 1,
    )

    for (const row of rows) {
      const cells = cellTexts(row)
      if (cells.length < 6) continue
      if (cells[0] === 'ID' || cells[1] === '英文') continue

      const idCell = cells[0]
      const word = cells[1]
      if (!/^\d+$/.test(idCell) || !looksLikeWord(word)) continue

      const phonetic = emptyish(cells[2]) ? undefined : cells[2]
      const inflection = emptyish(cells[3]) ? undefined : cells[3]
      const occur = cells[4] || ''
      const lexicon = cells[5] || ''
      const meaning = cells[6] || cells.find((c, i) => i > 1 && /[\u4e00-\u9fff]/.test(c)) || ''
      if (!meaning) continue

      index += 1
      const noteParts: string[] = []
      if (chapter) noteParts.push(chapter)
      if (inflection) noteParts.push(`变形 ${inflection}`)
      if (!emptyish(lexicon)) noteParts.push(`词库 ${lexicon}`)
      if (!emptyish(occur) && occur !== '/') noteParts.push(`标注 ${occur}`)

      words.push({
        id: uid(`${chapter || 'azkaban'}-${word}`, index),
        word,
        phonetic,
        meaning,
        frequency: parseFrequency(occur),
        tags: parseTags(lexicon),
        note: noteParts.length > 0 ? noteParts.join(' · ') : undefined,
      })
    }
  }

  return words
}

function findChapterLabel(table: Element): string | undefined {
  const chapter = table.closest('.chapter')
  const header = chapter?.querySelector('.chapter-header')
  if (!header) return undefined
  let text = cleanText(header.textContent || '')
  text = text.replace(/\s*·\s*\d+\s*条\s*$/, '')
  text = text.replace(/(Chapter\s+\d+)([A-Za-z])/i, '$1 $2')
  return text || undefined
}

function parseTable(doc: Document): WordEntry[] {
  const rows = Array.from(doc.querySelectorAll('tr'))
  const words: WordEntry[] = []

  for (const [index, row] of rows.entries()) {
    const cells = cellTexts(row)
    if (cells.length < 2) continue

    const joined = cells.join(' ')
    if (/^(单词|word|vocabulary|vocab|ID|英文)/i.test(cells[0]) && /释义|meaning|定义|中文/i.test(joined)) {
      continue
    }

    // Skip numeric ID-leading rows that belong to Azkaban format (handled above)
    if (/^\d+$/.test(cells[0]) && cells.length >= 6) continue

    const word = cells[0]
    if (!looksLikeWord(word)) continue

    const phonetic = cells.find((c) => /^(\/|\[).+(\/|\])$/.test(c))
    const meaning =
      cells.find(
        (c, i) =>
          i > 0 &&
          /[\u4e00-\u9fff]/.test(c) &&
          c !== phonetic,
      ) || cells[1]

    const freqCell = cells.find((c) => /^\d+$/.test(c) && Number(c) !== Number(word))
    const frequency = freqCell ? Number(freqCell) : parseFrequency(joined)

    words.push({
      id: uid(word, index),
      word,
      phonetic,
      meaning,
      frequency,
      tags: parseTags(joined),
      example: cells.find((c) => /[.!?]$/.test(c) && /[A-Za-z]/.test(c) && c !== word),
      note: cells.length > 4 ? cells.slice(4).join(' · ') : undefined,
    })
  }

  return words
}

function parseDataAttributes(doc: Document): WordEntry[] {
  const nodes = Array.from(doc.querySelectorAll('[data-word]'))
  return nodes.map((node, index) => {
    const word = cleanText(node.getAttribute('data-word') || '')
    const meaning = cleanText(
      node.getAttribute('data-meaning') || node.textContent || '',
    )
    const frequency = Number(node.getAttribute('data-frequency') || '1')
    const tagRaw = node.getAttribute('data-tags') || ''
    return {
      id: uid(word, index),
      word,
      phonetic: node.getAttribute('data-phonetic') || undefined,
      meaning,
      frequency: Number.isFinite(frequency) ? frequency : 1,
      tags: parseTags(tagRaw || meaning),
      example: node.getAttribute('data-example') || undefined,
    }
  }).filter((w) => w.word && w.meaning)
}

function parseLooseLines(doc: Document): WordEntry[] {
  const candidates = Array.from(doc.querySelectorAll('li, p, div, span'))
  const words: WordEntry[] = []

  for (const [index, node] of candidates.entries()) {
    const text = cleanText(node.textContent || '')
    if (text.length < 3 || text.length > 240) continue

    const matched =
      text.match(/^([A-Za-z][A-Za-z'-]+)\s*[/／].+?[/／]\s*(.+)$/) ||
      text.match(/^([A-Za-z][A-Za-z'-]+)\s*[:：–—-]\s*(.+)$/) ||
      text.match(/^([A-Za-z][A-Za-z'-]+)\s{2,}(.+)$/)

    if (!matched) continue
    const word = matched[1]
    const rest = matched[2]
    if (!/[\u4e00-\u9fffA-Za-z]/.test(rest)) continue

    words.push({
      id: uid(word, index),
      word,
      meaning: rest,
      frequency: parseFrequency(text),
      tags: parseTags(text),
    })
  }

  return words
}

function dedupe(words: WordEntry[]): WordEntry[] {
  const map = new Map<string, WordEntry>()
  for (const word of words) {
    const key = word.word.toLowerCase()
    const existing = map.get(key)
    if (!existing || word.frequency > existing.frequency) {
      map.set(key, word)
    }
  }
  return Array.from(map.values())
}
