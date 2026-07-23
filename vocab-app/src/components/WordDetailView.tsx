import type { WordEntry } from '../types'
import {
  displayTags,
  parseWordMeta,
  splitExampleHighlight,
  splitMeaningLines,
} from '../lib/wordDisplay'

type Props = {
  word: WordEntry
  /** study = 学习页大字；sheet = 词库底部抽屉 */
  variant?: 'study' | 'sheet'
}

export function WordDetailView({ word, variant = 'study' }: Props) {
  const tags = displayTags(word)
  const meaningLines = splitMeaningLines(word.word, word.meaning)
  const meta = parseWordMeta(word.note)
  const exampleParts = word.example
    ? splitExampleHighlight(word.example, word.word)
    : []
  const root = variant === 'sheet' ? 'sheet-detail' : 'word-detail'

  return (
    <div className={root}>
      {variant === 'study' ? (
        <>
          <p className="study-word">{word.word}</p>
          {word.phonetic ? (
            <p className="phonetic-pill">
              <span className="phonetic-mark">音</span>
              {word.phonetic}
            </p>
          ) : null}
        </>
      ) : null}

      {tags.length > 0 ? (
        <div className="detail-tags" aria-label="词库标签">
          {tags.map((tag) => (
            <span key={tag.key} className="tag">
              {tag.label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="detail-meanings" aria-label="中文释义">
        {meaningLines.map((line, i) => (
          <p key={`${line.pos ?? 'm'}-${i}`} className="detail-meaning-line">
            <span className="detail-pos">{line.pos || ''}</span>
            <span className="detail-meaning-body">
              {line.senses.map((sense, j) => (
                <span key={`${i}-${j}`}>
                  {j > 0 ? <span className="detail-sense-sep">；</span> : null}
                  <span className="detail-sense">{sense}</span>
                </span>
              ))}
            </span>
          </p>
        ))}
      </div>

      {word.example ? (
        <p className="detail-example-line">
          <span className="detail-example-mark">【例句】</span>
          <span className="detail-example-text">
            {exampleParts.map((part, i) =>
              part.hit ? (
                <mark key={i} className="detail-example-hit">
                  {part.text}
                </mark>
              ) : (
                <span key={i}>{part.text}</span>
              ),
            )}
          </span>
        </p>
      ) : null}

      <p className="detail-freq">
        共出现 <span className="detail-freq-num">{word.frequency}</span> 次
      </p>

      {meta.chapter ? (
        <p className="detail-chapter">
          <span className="detail-label inline">章节</span>
          {meta.chapter}
        </p>
      ) : null}

      {meta.forms ? (
        <p className="detail-forms">
          <span className="detail-label inline">变形</span>
          {meta.forms}
        </p>
      ) : null}
    </div>
  )
}
