import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { portalFocusRing } from '../portal/portalLabels'
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
  const tabRefs = useRef<Record<PortalSectionId, HTMLButtonElement | null>>({
    profile: null,
    school: null,
    alumni: null,
    association: null,
    cram: null,
  })
  const activeIndex = Math.max(
    0,
    SECTIONS.findIndex((item) => item.id === section),
  )

  function focusTabByIndex(nextIndex: number) {
    const nextSection = SECTIONS[nextIndex]
    if (!nextSection) return
    setSection(nextSection.id)
    // Keep focus synchronized with roving tabindex for keyboard users.
    requestAnimationFrame(() => {
      tabRefs.current[nextSection.id]?.focus()
    })
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const lastIndex = SECTIONS.length - 1
    if (event.key === 'ArrowRight') {
      focusTabByIndex(currentIndex === lastIndex ? 0 : currentIndex + 1)
      return
    }
    if (event.key === 'ArrowLeft') {
      focusTabByIndex(currentIndex === 0 ? lastIndex : currentIndex - 1)
      return
    }
    if (event.key === 'Home') {
      focusTabByIndex(0)
      return
    }
    focusTabByIndex(lastIndex)
  }

  const batch = member.batch != null ? String(member.batch) : '—'
  const first = member.first_name != null ? String(member.first_name) : ''
  const last = member.last_name != null ? String(member.last_name) : ''

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-fuchsia-900/40 bg-fuchsia-950/20 p-5" aria-label="ข้อมูลสมาชิกปัจจุบัน">
        <p className="text-xs font-medium uppercase tracking-wide text-fuchsia-200/80">หน้าสมาชิก</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-100">
          {first} {last}
          <span className="ml-2 text-sm font-normal text-slate-400">รุ่น {batch}</span>
        </h2>
        {lineDisplayName ? (
          <p className="mt-1 text-xs text-slate-500">ชื่อ LINE: {lineDisplayName}</p>
        ) : null}
        <p className="mt-2 break-all font-mono text-xs text-slate-500">LINE UID: {lineUid}</p>
      </header>

      <p id="member-portal-tab-help" className="sr-only">
        ใช้ปุ่มลูกศรซ้าย-ขวา หรือปุ่ม Home และ End เพื่อย้ายโฟกัสระหว่างแท็บพอร์ทัลสมาชิก
      </p>
      <nav
        className="flex flex-wrap gap-2 border-b border-slate-800 pb-3"
        aria-label="เมนูส่วนต่าง ๆ ในพอร์ทัลสมาชิก"
        aria-describedby="member-portal-tab-help"
        role="tablist"
        aria-orientation="horizontal"
      >
        {SECTIONS.map(({ id, label }, index) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            aria-label={`เปิดเมนู ${label}`}
            role="tab"
            id={`member-tab-${id}`}
            aria-selected={section === id}
            aria-controls={`member-panel-${id}`}
            aria-keyshortcuts="ArrowLeft ArrowRight Home End"
            aria-posinset={index + 1}
            aria-setsize={SECTIONS.length}
            tabIndex={index === activeIndex ? 0 : -1}
            ref={(node) => {
              tabRefs.current[id] = node
            }}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${portalFocusRing} ${
              section === id
                ? 'bg-fuchsia-800 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {section === 'profile' && (
        <section
          id="member-panel-profile"
          role="tabpanel"
          aria-labelledby="member-tab-profile"
          className="rounded-xl border border-slate-800 bg-slate-900/50 p-6"
          aria-label="ฟอร์มเปลี่ยนแปลงข้อมูลสมาชิก"
        >
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
        <PlaceholderBlock title="กิจกรรมโรงเรียน" panelId="member-panel-school" tabId="member-tab-school">
          <ul className="list-inside list-disc space-y-2">
            <li>รองรับหลายกิจกรรม — เพิ่มและลบรายการได้ (ออกแบบฐานข้อมูลและสิทธิ์ต่อไป)</li>
            <li>
              ตัวอย่าง: กิจกรรมทุนอาหารกลางวัน — สมาชิกบริจาคเงินและแนบสลิปโอนเงิน
            </li>
            <li>สรุปยอดบริจาคแยกตามรุ่น และแดชบอร์ดภาพรวมเงินบริจาค</li>
          </ul>
          <PortalRelatedLinks
            links={[
              { to: '/member/donations', label: 'สนับสนุนกิจกรรม' },
              { to: '/member/statistics', label: 'สถิติสมาชิก' },
            ]}
          />
        </PlaceholderBlock>
      )}

      {section === 'alumni' && (
        <PlaceholderBlock title="สมาชิกศิษย์เก่า" panelId="member-panel-alumni" tabId="member-tab-alumni">
          <ul className="list-inside list-disc space-y-2">
            <li>แดชบอร์ดสถิติแยกตามรุ่น และภาพรวมทั้งหมด</li>
            <li>เชื่อมกับข้อมูลสมาชิกในทะเบียนหลังมีการนำเข้าและอัปเดต</li>
          </ul>
          <PortalRelatedLinks links={[{ to: '/member/statistics', label: 'สถิติสมาชิก' }]} />
        </PlaceholderBlock>
      )}

      {section === 'association' && (
        <PlaceholderBlock title="กิจกรรมสมาคมศิษย์เก่า" panelId="member-panel-association" tabId="member-tab-association">
          <p>รายละเอียดกิจกรรมแต่ละประเภท — เพิ่มเนื้อหา/แกลเลอรี/ลงทะเบียนเข้าร่วม (ระบุรายละเอียดในรอบถัดไป)</p>
          <PortalRelatedLinks
            links={[
              { to: '/member/donations', label: 'สนับสนุนกิจกรรม' },
              { to: '/member/meetings', label: 'ประชุมและการเงิน' },
            ]}
          />
        </PlaceholderBlock>
      )}

      {section === 'cram' && (
        <PlaceholderBlock title="โรงเรียนกวดวิชา" panelId="member-panel-cram" tabId="member-tab-cram">
          <p>หัวข้อและรายละเอียดย่อยตามที่องค์กรกำหนด — แยกจากสมาคมศิษย์เก่าได้ตามโครงสร้างที่จะกำหนดต่อ</p>
          <PortalRelatedLinks
            links={[
              { to: '/academy/dashboard', label: 'แดชบอร์ดโรงเรียนกวดวิชา (Academy)' },
              { to: '/academy/courses', label: 'คอร์สเรียน' },
            ]}
          />
        </PlaceholderBlock>
      )}
    </div>
  )
}

function PortalRelatedLinks(props: { links: Array<{ to: string; label: string }> }) {
  return (
    <div className="mt-4">
      <p className="text-xs text-slate-500">ลิงก์ที่เกี่ยวข้อง:</p>
      <ul className="mt-2 flex flex-wrap gap-2" role="list" aria-label="ลิงก์ที่เกี่ยวข้องในพอร์ทัลสมาชิก">
        {props.links.map((l) => (
          <li key={l.to} role="listitem">
            <Link
              to={l.to}
              aria-label={`ไปยัง ${l.label}`}
              className={`rounded border border-fuchsia-900/45 bg-fuchsia-950/25 px-2.5 py-1 text-xs text-fuchsia-200 hover:bg-fuchsia-900/35 ${portalFocusRing}`}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PlaceholderBlock(props: { title: string; children: ReactNode; panelId: string; tabId: string }) {
  return (
    <section
      id={props.panelId}
      role="tabpanel"
      aria-labelledby={props.tabId}
      className="rounded-xl border border-slate-800 bg-slate-900/50 p-6"
      aria-label={props.title}
    >
      <h3 className="text-base font-medium text-slate-200">{props.title}</h3>
      <div className="mt-3 text-sm text-slate-400">{props.children}</div>
      <div className="mt-6 rounded-lg border border-dashed border-slate-600 bg-slate-950/50 px-4 py-10 text-center text-sm text-slate-500">
        พื้นที่สำหรับพัฒนาต่อ — สรุปความต้องการเพิ่มเติมแล้วค่อยเชื่อม API / ฐานข้อมูล
      </div>
    </section>
  )
}
