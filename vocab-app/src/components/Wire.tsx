import type { ReactNode } from 'react'

/** 线框标注块：方便只看结构时识别区域 */
export function Wire({
  label,
  children,
  className = '',
}: {
  label: string
  children?: ReactNode
  className?: string
}) {
  return (
    <section className={`wire ${className}`.trim()}>
      <p className="wire-label">{label}</p>
      <div className="wire-body">{children}</div>
    </section>
  )
}
