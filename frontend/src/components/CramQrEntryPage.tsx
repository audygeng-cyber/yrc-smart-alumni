import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LINE_ENTRY_SOURCES, lineEntrySourceDescription, setLineEntrySource } from '../lib/lineEntrySource'
import { portalFocusRing } from '../portal/portalLabels'

const focus = `tap-target rounded-lg px-4 py-2 text-sm font-medium ${portalFocusRing}`

/**
 * หน้าปลายทางของ QR — วาง URL นี้ใน QR ให้ผู้ที่ไม่ใช่ศิษย์เก่า (ครู ผู้ปกครอง นักเรียน ฯลฯ) สแกนแล้วเข้าสู่ระบบด้วย LINE
 */
export function CramQrEntryPage() {
  useEffect(() => {
    setLineEntrySource(LINE_ENTRY_SOURCES.CRAM_QR)
  }, [])

  return (
    <section className="rounded-xl border border-violet-900/40 bg-violet-950/20 p-6 text-sm text-slate-200">
      <p className="text-xs font-medium uppercase tracking-wide text-violet-200/90">โรงเรียนกวดวิชา · สแกน QR</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-100">เข้าระบบด้วย LINE</h2>
      <p className="mt-3 text-slate-400">
        ช่องทางนี้ใช้สำหรับผู้บริหาร ครู ผู้ปกครอง หรือนักเรียนที่ยังไม่ได้เป็นศิษย์เก่าในทะเบียน — ระบบจะบันทึกช่องทางเข้าเป็น
        <span className="text-violet-200/90"> {lineEntrySourceDescription(LINE_ENTRY_SOURCES.CRAM_QR)}</span>
      </p>
      <p className="mt-3 text-xs text-slate-400">
        ศิษย์เก่า (สมาชิก / คณะกรรมการ) หรือผู้บริหารกวดวิชาที่เป็นศิษย์เก่า แนะนำให้เข้าทาง URL หลักของสมาคม
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/auth/link"
          className={`bg-fuchsia-700 text-white hover:bg-fuchsia-600 ${focus}`}
          aria-label="ไปหน้าล็อกอิน LINE"
        >
          ดำเนินการต่อ — ผูกบัญชี LINE
        </Link>
        <Link to="/" className={`border border-slate-600 bg-slate-900/60 text-slate-200 hover:bg-slate-800 ${focus}`}>
          กลับหน้าหลัก
        </Link>
      </div>
    </section>
  )
}
