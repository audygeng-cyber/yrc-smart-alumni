type Props = {
  msg: string | null
  isErrorMsg: boolean
  loading: boolean
}

export function FinanceAdminFeedbackFooter({ msg, isErrorMsg, loading }: Props) {
  return (
    <>
      {msg ? (
        <pre
          className="mt-4 max-h-56 overflow-auto rounded-lg bg-slate-950 p-3 text-left text-xs text-slate-300"
          role={isErrorMsg ? 'alert' : 'status'}
          aria-live={isErrorMsg ? undefined : 'polite'}
          aria-atomic="true"
        >
          {msg}
        </pre>
      ) : null}
      {loading ? (
        <p className="mt-3 text-xs text-slate-400" role="status" aria-live="polite" aria-atomic="true">
          กำลังโหลดรายงานและประมวลผลข้อมูลการเงิน...
        </p>
      ) : null}
    </>
  )
}
