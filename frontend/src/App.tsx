import { useEffect, useState } from 'react'

const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export default function App() {
  const [health, setHealth] = useState<string>('…')

  useEffect(() => {
    fetch(`${apiBase}/health`)
      .then((r) => r.json())
      .then((j) => setHealth(JSON.stringify(j)))
      .catch(() => setHealth('ไม่สามารถเชื่อม API (ตรวจว่า backend รันอยู่)'))
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur">
        <h1 className="text-xl font-semibold tracking-tight">YRC Smart Alumni</h1>
        <p className="mt-1 text-sm text-slate-400">โครงสร้างเริ่มต้น — Frontend + Backend + Supabase migration</p>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-10">
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
            Backend /health
          </h2>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-left text-sm text-emerald-300">
            {health}
          </pre>
          <p className="mt-4 text-sm text-slate-500">
            ตั้งค่า <code className="text-slate-300">VITE_API_URL</code> ใน{' '}
            <code className="text-slate-300">frontend/.env</code> หาก API ไม่ได้รันที่พอร์ต 4000
          </p>
        </section>
      </main>
    </div>
  )
}
