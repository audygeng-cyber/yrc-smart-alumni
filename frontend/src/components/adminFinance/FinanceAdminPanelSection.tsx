import type { ReactNode } from 'react'

export function FinanceAdminPanelSection({
  loading,
  children,
}: {
  loading: boolean
  children: ReactNode
}) {
  return (
    <section className="mt-6 rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-6" aria-busy={loading}>
      {children}
    </section>
  )
}
