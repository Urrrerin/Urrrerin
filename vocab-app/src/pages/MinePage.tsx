import { Wire } from '../components/Wire'

type Props = {
  lexiconCount: number
  lexiconVersion?: string
}

/** 「我的」极简结构稿：不做进度看板 */
export function MinePage({ lexiconCount, lexiconVersion = 'azkaban-ch1-5' }: Props) {
  return (
    <div className="page mine-page">
      <header className="page-head">
        <p className="brand">Lumos</p>
        <h1>我的</h1>
        <p className="subtitle">极简设置 · 不做学习进度展示</p>
      </header>

      <Wire label="区域：词库信息">
        <p>当前词库：{lexiconVersion}</p>
        <p>词条数：{lexiconCount}</p>
        <p className="wire-hint">词库随 HTML 扩容发版后在此提示更新</p>
      </Wire>

      <Wire label="区域：设置（占位）">
        <p>每日新词额度：30（自定义 → 后续迭代）</p>
        <p>每日复习上限：75（示意）</p>
      </Wire>

      <Wire label="区域：说明">
        <p className="wire-hint">
          学习进度将存数据库（接入另议）；本页不展示进度统计。
        </p>
      </Wire>
    </div>
  )
}
