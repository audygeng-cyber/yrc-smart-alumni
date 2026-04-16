import { useState, type ReactNode } from 'react'
import { MemberProfileSection } from './MemberProfileSection'

type MemberRow = Record<string, unknown>

export type PortalSectionId =
  | 'profile'
  | 'school'
  | 'alumni'
  | 'association'
  | 'cram'

const SECTIONS: { id: PortalSectionId; label: string }[] = [
  { id: 'profile', label: 'เปลี่ยนแปลงข้อมูลสมาชิก' },
  { id: 'school', label: 'กิจกรรมโรงเรียน' },
  { id: 'alumni', label: 'สมาชิกศิษย์เก่า' },
  { id: 'association', label: 'กิจกรรมสมาคมศิษย์เก่า' },
  { id: 'cram', label: 'โรงเรียนกวดวิชา' },
]

type Props = {
  apiBase: string
  lineUid: string
  member: MemberRow
  onMemberUpdated: (m: MemberRow) => void
  lineDisplayName?: string
}

export function MemberPortal({ apiBase, lineUid, member, onMemberUpdated, lineDisplayName }: Props) {
  const [section, setSection] = useState<PortalSectionId>('profile')

  const batch = member.batch != null ? String(member.batch) : '—'
  const first = member.first_name != null ? String(member.first_name) : ''
  const last = member.last_name != null ? String(member.last_name) : ''

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-200/80">หน้าสมาชิก</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-100">
          {first} {last}
          <span className="ml-2 text-sm font-normal text-slate-400">รุ่น {batch}</span>
        </h2>
        {lineDisplayName ? (
          <p className="mt-1 text-xs text-slate-500">LINE: {lineDisplayName}</p>
        ) : null}
        <p className="mt-2 break-all font-mono text-xs text-slate-500">UID: {lineUid}</p>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              section === id
                ? 'bg-emerald-800 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {section === 'profile' && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-base font-medium text-slate-200">เปลี่ยนแปลงข้อมูลสมาชิก</h3>
          <MemberProfileSection
            apiBase={apiBase}
            lineUid={lineUid}
            member={member}
            onMemberUpdated={onMemberUpdated}
          />
        </section>
      )}

      {section === 'school' && (
        <PlaceholderBlock title="กิจกรรมโรงเรียน">
          <ul className="list-inside list-disc space-y-2">
            <li>รองรับหลายกิจกรรม — เพิ่มและลบรายการได้ (ออกแบบฐานข้อมูลและสิทธิ์ต่อไป)</li>
            <li>
              ตัวอย่าง: กิจกรรมทุนอาหารกลางวัน — สมาชิกบริจาคเงินและแนบสลิปโอนเงิน
            </li>
            <li>สรุปยอดบริจาคแยกตามรุ่น และแดชบอร์ดภาพรวมเงินบริจาค</li>
          </ul>
        </PlaceholderBlock>
      )}

      {section === 'alumni' && (
        <PlaceholderBlock title="สมาชิกศิษย์เก่า">
          <ul className="list-inside list-disc space-y-2">
            <li>แดชบอร์ดสถิติแยกตามรุ่น และภาพรวมทั้งหมด</li>
            <li>เชื่อมกับข้อมูลสมาชิกในทะเบียนหลังมีการนำเข้าและอัปเดต</li>
          </ul>
        </PlaceholderBlock>
      )}

      {section === 'association' && (
        <PlaceholderBlock title="กิจกรรมสมาคมศิษย์เก่า">
          <p>รายละเอียดกิจกรรมแต่ละประเภท — เพิ่มเนื้อหา/แกลเลอรี/ลงทะเบียนเข้าร่วม (ระบุรายละเอียดในรอบถัดไป)</p>
        </PlaceholderBlock>
      )}

      {section === 'cram' && (
        <PlaceholderBlock title="โรงเรียนกวดวิชา">
          <p>หัวข้อและรายละเอียดย่อยตามที่องค์กรกำหนด — แยกจากสมาคมศิษย์เก่าได้ตามโครงสร้างที่จะกำหนดต่อ</p>
        </PlaceholderBlock>
      )}
    </div>
  )
}

function PlaceholderBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <h3 className="text-base font-medium text-slate-200">{title}</h3>
      <div className="mt-3 text-sm text-slate-400">{children}</div>
      <div className="mt-6 rounded-lg border border-dashed border-slate-600 bg-slate-950/50 px-4 py-10 text-center text-sm text-slate-500">
        พื้นที่สำหรับพัฒนาต่อ — สรุปความต้องการเพิ่มเติมแล้วค่อยเชื่อม API / ฐานข้อมูล
      </div>
    </section>
  )
}
