import { Wire } from '../components/Wire'

type TodayMode = 'home' | 'review' | 'learn'

type Props = {
  mode: TodayMode
  onMode: (mode: TodayMode) => void
  reviewCount?: number
  learnCount?: number
}

/** V1.0「今日」结构稿：先只有区块与流程，逻辑稍后接 */
export function TodayPage({
  mode,
  onMode,
  reviewCount = 60,
  learnCount = 30,
}: Props) {
  if (mode === 'review') {
    return (
      <div className="page today-page">
        <Wire label="区域：复习卡片（一次一词）">
          <p className="wire-kicker">结构示意 · 复习</p>
          <p className="wire-hero-word">example</p>
          <p className="wire-muted">这里之后显示英文词 / 可揭开释义</p>
          <div className="wire-actions three">
            <button type="button" className="wire-btn">记得</button>
            <button type="button" className="wire-btn">模糊</button>
            <button type="button" className="wire-btn">忘了</button>
          </div>
          <p className="wire-hint">点反馈后进入下一词（尚未接真实队列）</p>
          <button type="button" className="text-btn" onClick={() => onMode('home')}>
            ← 返回今日概览
          </button>
        </Wire>
      </div>
    )
  }

  if (mode === 'learn') {
    return (
      <div className="page today-page">
        <Wire label="区域：新学卡片（一次一词）">
          <p className="wire-kicker">结构示意 · 新学</p>
          <p className="wire-hero-word">torch</p>
          <p className="wire-muted">揭开后显示释义 / 音标 / 备注</p>
          <div className="wire-actions">
            <button type="button" className="wire-btn primary">显示释义</button>
            <button type="button" className="wire-btn">下一词</button>
          </div>
          <p className="wire-hint">新学在复习告一段落后进入（尚未接抽词算法）</p>
          <button type="button" className="text-btn" onClick={() => onMode('home')}>
            ← 返回今日概览
          </button>
        </Wire>
      </div>
    )
  }

  return (
    <div className="page today-page">
      <header className="page-head">
        <p className="brand">Lumos</p>
        <h1>今日</h1>
        <p className="subtitle">首页主入口 · 先复习，再新学</p>
      </header>

      <Wire label="区域：今日概览">
        <div className="stat-grid">
          <div className="stat-box">
            <span className="stat-num">{reviewCount}</span>
            <span className="stat-label">待复习（示意）</span>
          </div>
          <div className="stat-box">
            <span className="stat-num">{learnCount}</span>
            <span className="stat-label">待新学（示意）</span>
          </div>
        </div>
        <p className="wire-hint">数字接队列后会变成真实到期数 / 今日新学额度</p>
      </Wire>

      <Wire label="区域：主操作">
        <button type="button" className="primary-btn" onClick={() => onMode('review')}>
          开始复习
        </button>
        <button type="button" className="wire-btn block" onClick={() => onMode('learn')}>
          开始新学（示意入口）
        </button>
        <p className="wire-hint">
          正式逻辑：有复习时优先进入复习；新学在复习完成或为空后突出
        </p>
      </Wire>

      <Wire label="区域：流程说明（可上线前去掉）">
        <ol className="wire-steps">
          <li>打开 App → 默认停在「今日」</li>
          <li>先刷到期复习（目标约 50～75）</li>
          <li>再学新词（默认 30）</li>
        </ol>
      </Wire>
    </div>
  )
}
