import type { ReactNode } from 'react'
import { themeAccent } from '../../lib/themeTokens'

export function FinanceAdminPanelSection({
  loading,
  children,
}: {
  loading: boolean
  children: ReactNode
}) {
  return (
    <section className={`mt-6 rounded-xl border p-6 ${themeAccent.panel}`} aria-busy={loading}>
      {children}
    </section>
  )
}
