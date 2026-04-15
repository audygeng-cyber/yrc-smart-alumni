import { useEffect, useState } from 'react'
import { AdminImportPanel } from './components/AdminImportPanel'
import { MemberLinkPanel } from './components/MemberLinkPanel'

const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

type Tab = 'home' | 'link' | 'admin'

export default function App() {
  const [health, setHealth] = useState<string>('…')
  const [tab, setTab] = useState<Tab>('home')

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
        <p className="mt-1 text-sm text-slate-400">สมาชิก · นำเข้า · ผูก Line UID (ทดสอบ)</p>
        <nav className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ['home', 'หน้าหลัก'],
              ['link', 'ผูกบัญชี'],
              ['admin', 'Admin'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === id
                  ? 'bg-emerald-800 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        {tab === 'home' && (
          <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">Backend /health</h2>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-left text-sm text-emerald-300">
              {health}
            </pre>
            <p className="mt-4 text-sm text-slate-500">
              ตั้งค่า <code className="text-slate-300">VITE_API_URL</code> ใน{' '}
              <code className="text-slate-300">frontend/.env</code> หาก API ไม่ได้รันที่พอร์ต 4000
            </p>
          </section>
        )}

        {tab === 'link' && <MemberLinkPanel apiBase={apiBase} />}
        {tab === 'admin' && <AdminImportPanel apiBase={apiBase} />}
      </main>
    </div>
  )
}
