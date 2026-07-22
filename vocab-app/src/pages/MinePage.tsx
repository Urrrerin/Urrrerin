type Props = {
  lexiconCount: number
  lexiconVersion?: string
}

export function MinePage({ lexiconCount, lexiconVersion = 'Azkaban Ch.1–5' }: Props) {
  return (
    <div className="page mine-page">
      <header className="page-head">
        <p className="brand">Lumos</p>
        <h1>我的</h1>
      </header>

      <section className="mine-block">
        <h2 className="mine-title">词库</h2>
        <p className="mine-line">{lexiconVersion}</p>
        <p className="mine-line muted">{lexiconCount} 词</p>
      </section>

      <section className="mine-block">
        <h2 className="mine-title">学习</h2>
        <p className="mine-line">每日新词 30</p>
        <p className="mine-line muted">每日复习上限 75</p>
      </section>
    </div>
  )
}
