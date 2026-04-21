import { useCallback, useEffect, useMemo, useState } from 'react'
import { safeHttpImageUrl } from '../lib/safeHttpUrl'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { MemberProfileSection } from '../components/MemberProfileSection'
import { themeAccent, themeTapTarget } from '../lib/themeTokens'
import { portalFocusRing, portalNotFoundScopeLabel } from './portalLabels'
import {
  DonationCampaignCard,
  PortalContentLoading,
  PortalNotFound,
  PortalSectionHeader,
  PortalShell,
  PortalSnapshotToolbar,
} from './ui'
import {
  type MemberPortalData,
  type MemberRoleView,
  type PortalDataState,
  useMemberPortalData,
} from './dataAdapter'
import { memberDonationHistoryMock } from './mockData'
import { MemberYupparajPublicStats } from './memberDonationStats'
import { MemberDashboardPage } from './memberDashboard'
import {
  MemberAssociationLayout,
  MemberCramSchoolLayout,
  MemberPortalPlaceholderPage,
} from './memberGroupLayouts'
import { HEADER_TO_MEMBER_KEY, MEMBER_SELF_EDIT_HEADERS } from '../memberImportMap'

export function MemberArea(props: {
  apiBase: string
  lineUid: string
  member: Record<string, unknown>
  lineDisplayName: string
  onMemberUpdated: (member: Record<string, unknown>) => void
}) {
  const { onMemberUpdated: parentOnMemberUpdated } = props
  const [roleView, setRoleView] = useState<MemberRoleView>('member')
  /** เพิ่มทุกครั้งที่บันทึกโปรไฟล์สำเร็จ — ให้หน้าประวัติ refetch แม้ไม่ได้ใช้ data router (`useRevalidator` ใช้ได้กับ loader เท่านั้น) */
  const [profileVersionsRefresh, setProfileVersionsRefresh] = useState(0)
  const portalData = useMemberPortalData(props.apiBase)
  const roleViewSummaryId = 'member-role-view-summary'
  const onMemberUpdated = useCallback(
    (member: Record<string, unknown>) => {
      parentOnMemberUpdated(member)
      setProfileVersionsRefresh((n) => n + 1)
    },
    [parentOnMemberUpdated],
  )
  const memberNav = [
    { to: '/member/dashboard', label: 'แดชบอร์ด', roles: ['member', 'staff'] as MemberRoleView[] },
    { to: '/member/card', label: 'บัตรสมาชิก', roles: ['member', 'staff'] as MemberRoleView[] },
    { to: '/member/profile-edit', label: 'เปลี่ยนแปลงข้อมูลสมาชิก', roles: ['member', 'staff'] as MemberRoleView[] },
    { to: '/member/last-update', label: 'ข้อมูลอัปเดตล่าสุด', roles: ['member', 'staff'] as MemberRoleView[] },
    {
      to: '/member/donations',
      label: 'สนับสนุนกิจกรรมยุพราช',
      roles: ['member', 'staff'] as MemberRoleView[],
    },
    { to: '/member/association', label: 'สมาคมศิษย์เก่า', roles: ['member', 'staff'] as MemberRoleView[] },
    { to: '/member/cram-school', label: 'โรงเรียนกวดวิชา', roles: ['member', 'staff'] as MemberRoleView[] },
    { to: '/member/documents', label: 'ข้อมูลเชิงกำกับดูแล', roles: ['staff'] as MemberRoleView[] },
  ]
  const visibleNavItems = memberNav.filter((item) => item.roles.includes(roleView)).map((item) => ({ to: item.to, label: item.label }))
  const roleViewLabel = roleView === 'member' ? 'สมาชิกทั่วไป' : 'เจ้าหน้าที่สมาคม'

  return (
    <PortalShell
      title="พอร์ทัลสมาชิก"
      subtitle="แดชบอร์ด · บัตร · แก้ไขข้อมูล · สนับสนุนยุพราช · สมาคม · กวดวิชา"
      navItems={visibleNavItems}
    >
      <section className="mb-4 min-w-0 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm" aria-busy={portalData.loading}>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="shrink-0 text-xs uppercase tracking-wide text-slate-400">มุมมองบทบาท</span>
          <select
            value={roleView}
            onChange={(e) => setRoleView(e.target.value as MemberRoleView)}
            aria-label="เลือกมุมมองบทบาทในพอร์ทัลสมาชิก"
            aria-describedby={roleViewSummaryId}
            className={`min-w-0 max-w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 ${portalFocusRing}`}
          >
            <option value="member">สมาชิกทั่วไป</option>
            <option value="staff">เจ้าหน้าที่สมาคม</option>
          </select>
          <span className="text-xs text-slate-400 sm:shrink-0">จำลองสิทธิ์เมนูภายในพอร์ทัลสมาชิก</span>
          <span id={roleViewSummaryId} className="min-w-0 text-xs text-slate-400" role="status" aria-live="polite" aria-atomic="true">
            บทบาทปัจจุบัน: {roleViewLabel} · เมนูที่เข้าถึงได้ {visibleNavItems.length.toLocaleString('th-TH')} รายการ
          </span>
          <div className="shrink-0">
            <PortalSnapshotToolbar loading={portalData.loading} source={portalData.source} onRefresh={portalData.refetch} />
          </div>
        </div>
      </section>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <MemberDashboardPage portalState={portalData} roleView={roleView} apiBase={props.apiBase} />
          }
        />
        <Route path="card" element={<MemberCardPage member={props.member} />} />
        <Route
          path="profile-edit"
          element={
            <MemberProfileEditPage
              apiBase={props.apiBase}
              lineUid={props.lineUid}
              member={props.member}
              onMemberUpdated={onMemberUpdated}
            />
          }
        />
        <Route
          path="last-update"
          element={
            <MemberLastUpdatePage
              apiBase={props.apiBase}
              lineUid={props.lineUid}
              member={props.member}
              profileVersionsRefresh={profileVersionsRefresh}
            />
          }
        />
        <Route path="profile" element={<Navigate to="/member/profile-edit" replace />} />
        <Route path="statistics" element={<Navigate to="/member/dashboard" replace />} />
        <Route path="meetings" element={<Navigate to="/member/association/meeting-reports" replace />} />
        <Route
          path="donations"
          element={
            <MemberDonationsPage
              apiBase={props.apiBase}
              lineUid={props.lineUid}
              member={props.member}
              portalState={portalData}
            />
          }
        />
        <Route path="association" element={<MemberAssociationLayout />}>
          <Route index element={<Navigate to="agendas" replace />} />
          <Route
            path="agendas"
            element={
              <MemberPortalPlaceholderPage
                title="วาระการประชุมทั้งหมด"
                description="รวมวาระการประชุมที่ผู้ดูแลบันทึกไว้ — สอดคล้องกับบันทึกการประชุมคณะกรรมการ/ที่ประชุมใหญ่"
                committeeLink="/committee/meetings"
              />
            }
          />
          <Route
            path="meeting-reports"
            element={
              <MemberPortalPlaceholderPage
                title="รายงานการประชุมทั้งหมด"
                description="รายงานการประชุมฉบับสรุปที่เผยแพร่ให้สมาชิก — เอกสารต้นฉบับจัดเก็บโดยผู้ดูแล"
                committeeLink="/committee/meetings"
              />
            }
          />
          <Route
            path="finance-by-month"
            element={
              <MemberPortalPlaceholderPage
                title="รายงานรายรับ-รายจ่ายทั้งหมด (แยกเดือน)"
                description="งบรายรับรายจ่ายสะสมของสมาคมฯ แยกตามเดือน — สอดคล้องบัญชีแยกประเภทในระบบหลังบ้าน"
                committeeLink="/committee/dashboard"
              />
            }
          />
          <Route
            path="finance-current"
            element={
              <MemberPortalPlaceholderPage
                title="รายงานรายรับ-รายจ่ายปัจจุบัน"
                description="งวดบัญชีปัจจุบันที่ปิดหรือกำลังดำเนินการ — ดูรายละเอียดเชิงลึกที่พอร์ทัลคณะกรรมการ"
                committeeLink="/committee/dashboard"
              />
            }
          />
          <Route
            path="statements"
            element={
              <MemberPortalPlaceholderPage
                title="Statement ทั้งหมด (แยกเดือน)"
                description="รายงานทางการเงินแบบ Statement ตามเดือน — จัดทำและเผยแพร่โดยผู้ดูแล"
                committeeLink="/committee/dashboard"
              />
            }
          />
        </Route>
        <Route path="cram-school" element={<MemberCramSchoolLayout />}>
          <Route index element={<Navigate to="student-stats" replace />} />
          <Route
            path="student-stats"
            element={
              <MemberPortalPlaceholderPage
                title="สถิตินักเรียน · วิชาที่เปิดสอน · จำนวนต่อห้อง"
                description="สรุปจำนวนนักเรียน คอร์สที่เปิด และห้องเรียน — ดึงจากโมดูลโรงเรียนกวดวิชาเมื่อผู้ดูแลบันทึกข้อมูล"
                academyLink="/academy/dashboard"
              />
            }
          />
          <Route
            path="agendas"
            element={
              <MemberPortalPlaceholderPage
                title="วาระการประชุมทั้งหมด (กวดวิชา)"
                description="วาระการประชุมของโรงเรียนกวดวิชา — แยกจากสมาคมศิษย์เก่า"
                academyLink="/academy/dashboard"
              />
            }
          />
          <Route
            path="meeting-reports"
            element={
              <MemberPortalPlaceholderPage
                title="รายงานการประชุมทั้งหมด (กวดวิชา)"
                description="รายงานการประชุมฉบับสรุปของโรงเรียนกวดวิชา"
                academyLink="/academy/dashboard"
              />
            }
          />
          <Route
            path="finance-by-month"
            element={
              <MemberPortalPlaceholderPage
                title="รายรับ-รายจ่ายทั้งหมด (แยกเดือน) — กวดวิชา"
                description="งบกวดวิชาแยกตามเดือน — บัญชีไม่ปนกับสมาคมศิษย์เก่า"
                academyLink="/academy/dashboard"
              />
            }
          />
          <Route
            path="finance-current"
            element={
              <MemberPortalPlaceholderPage
                title="รายรับ-รายจ่ายปัจจุบัน — กวดวิชา"
                description="งวดบัญชีปัจจุบันของโรงเรียนกวดวิชา"
                academyLink="/academy/dashboard"
              />
            }
          />
          <Route
            path="statements"
            element={
              <MemberPortalPlaceholderPage
                title="Statement ทั้งหมด (แยกเดือน) — กวดวิชา"
                description="รายงาน Statement รายเดือนของโรงเรียนกวดวิชา"
                academyLink="/academy/dashboard"
              />
            }
          />
        </Route>
        <Route
          path="documents"
          element={
            roleView === 'staff' ? <MemberStaffDocumentsPage /> : <PortalNotFound scopeLabel={portalNotFoundScopeLabel.member} />
          }
        />
        <Route path="*" element={<PortalNotFound scopeLabel={portalNotFoundScopeLabel.member} />} />
      </Routes>
    </PortalShell>
  )
}

function MemberStaffDocumentsPage() {
  const links = [
    {
      to: '/admin',
      title: 'แผงผู้ดูแล (Admin)',
      description: 'นำเข้าสมาชิก การเงิน กิจกรรมโรงเรียน — จุดทำงานหลักของเจ้าหน้าที่',
    },
    {
      to: '/requests',
      title: 'คำร้องสมาชิก',
      description: 'อนุมัติและติดตามคำร้องลงทะเบียน/แก้ไขข้อมูล',
    },
    {
      to: '/committee/dashboard',
      title: 'พอร์ทัลคณะกรรมการ',
      description: 'สรุปการประชุม การเงิน ทะเบียน และวาระลงมติ',
    },
    {
      to: '/academy/dashboard',
      title: 'พอร์ทัลโรงเรียนกวดวิชา (Academy)',
      description: 'โรงเรียนกวดวิชา — ห้องเรียน คอร์ส และขั้นตอนสมัคร (Funnel)',
    },
  ]

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-label="ลิงก์สำหรับงานเชิงกำกับดูแล">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ข้อมูลเชิงกำกับดูแล</h3>
        <p className="mt-2 text-sm text-slate-400">
          ศูนย์ลิงก์สำหรับเจ้าหน้าที่สมาคม — รายงานปิดงบ หลักฐานการเงิน และบันทึกร่องรอย (audit trail) อยู่ในขั้นตอนงานการเงิน (workflow)
          ของผู้ดูแล (Admin) และบัญชีแยกประเภท
          ในระบบหลังบ้าน
        </p>
        <ul className="mt-5 space-y-3" role="list" aria-label="ลิงก์ทางลัดสำหรับเจ้าหน้าที่สมาคม">
          {links.map((item) => (
            <li key={item.to} role="listitem">
              <Link
                to={item.to}
                aria-label={`ไปหน้า ${item.title}`}
                className={`block rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 transition hover:border-fuchsia-800/60 hover:bg-slate-900/70 ${portalFocusRing}`}
              >
                <p className="font-medium text-fuchsia-200">{item.title}</p>
                <p className="mt-1 text-sm text-slate-400">{item.description}</p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-slate-600">
          หมายเหตุ: การเข้าถึงข้อมูลส่วนบัญชีอาจต้องใช้คีย์หรือสิทธิ์ตามที่กำหนดในแผงผู้ดูแล (Admin)
        </p>
      </section>
    </div>
  )
}

function memberStr(m: Record<string, unknown>, key: string): string {
  const v = m[key]
  if (v == null || v === '') return ''
  return String(v).trim()
}

/** รูปบัตร — key จาก URL ด้านนอกเพื่อรีเซ็ตสถานะเมื่อ URL เปลี่ยน */
function MemberCardPhoto(props: { imageUrl: string }) {
  const [broken, setBroken] = useState(false)
  if (!props.imageUrl || broken) {
    return (
      <div className="flex h-28 w-28 items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900/80 text-[10px] text-slate-400">
        ยังไม่มีรูป
      </div>
    )
  }
  return (
    <img
      src={props.imageUrl}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className="h-28 w-28 rounded-xl border border-slate-600 object-cover"
    />
  )
}

function MemberCardPage(props: { member: Record<string, unknown> }) {
  const fullName = [props.member.first_name, props.member.last_name].filter(Boolean).join(' ').trim() || 'สมาชิก'
  const batch = memberStr(props.member, 'batch') || '—'
  const batchName = memberStr(props.member, 'batch_name') || '—'
  const batchYear = memberStr(props.member, 'batch_year') || '—'
  const code = memberStr(props.member, 'member_code')
  const status = memberStr(props.member, 'membership_status') || '—'
  const photoUrl =
    safeHttpImageUrl(props.member.photo_url) ??
    safeHttpImageUrl(props.member.profile_photo_url) ??
    ''
  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-md">
        <div className="overflow-hidden rounded-2xl border border-fuchsia-800/50 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 shadow-xl ring-1 ring-fuchsia-500/20">
          <div className="bg-fuchsia-950/50 px-6 py-4 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-fuchsia-400">YRC Smart Alumni</p>
            <p className="mt-1 text-xs text-slate-400">บัตรสมาชิกดิจิทัล</p>
          </div>
          <div className="px-6 py-8 text-center">
            <div className="mt-2 flex justify-center">
              <MemberCardPhoto key={photoUrl || 'none'} imageUrl={photoUrl} />
            </div>
            <p className="mt-4 text-xl font-semibold text-white">{fullName}</p>
            <p className="mt-2 text-sm text-slate-400">
              รุ่น {batch}
              {batchName !== '—' ? <span className="text-slate-300"> · {batchName}</span> : null}
            </p>
            {batchYear !== '—' ? <p className="mt-1 text-xs text-slate-500">ปีรุ่น {batchYear}</p> : null}
            <div className="mt-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-slate-600 bg-slate-900/80 text-[10px] text-slate-500">
                QR
              </div>
            </div>
            <dl className="mt-6 space-y-2 text-left text-sm">
              <div className="flex justify-between gap-4 border-t border-slate-800 pt-3">
                <dt className="text-slate-400">รหัสสมาชิก</dt>
                <dd className="font-mono text-xs text-slate-300">{code || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">สถานะ</dt>
                <dd className="text-slate-200">{status}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      <p className="mx-auto max-w-md text-center text-xs text-slate-500">
        ตั้งค่ารูปบัตรได้ที่ «เปลี่ยนแปลงข้อมูลสมาชิก» — ใส่ลิงก์ URL รูป (https) ในช่องรูปโปรไฟล์ หรือให้ผู้ดูแลอัปเดตจากไฟล์นำเข้า
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link
          to="/member/profile-edit"
          aria-label="ไปหน้า เปลี่ยนแปลงข้อมูลสมาชิก"
          className={`${themeTapTarget} inline-flex items-center rounded-lg px-4 py-2 text-sm text-white ${themeAccent.buttonPrimary} ${portalFocusRing}`}
        >
          เปลี่ยนแปลงข้อมูลสมาชิก
        </Link>
        <Link
          to="/member/last-update"
          aria-label="ไปหน้า ข้อมูลอัปเดตล่าสุดและประวัติการบันทึก"
          className={`${themeTapTarget} inline-flex items-center rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}
        >
          ประวัติการแก้ไข
        </Link>
        <Link
          to="/member/dashboard"
          aria-label="กลับไปหน้า แดชบอร์ดสมาชิก"
          className={`${themeTapTarget} inline-flex items-center rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}
        >
          แดชบอร์ด
        </Link>
      </div>
    </div>
  )
}

function MemberProfileEditPage(props: {
  apiBase: string
  lineUid: string
  member: Record<string, unknown>
  onMemberUpdated: (member: Record<string, unknown>) => void
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-label="เปลี่ยนแปลงข้อมูลสมาชิก">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">เปลี่ยนแปลงข้อมูลสมาชิก</h3>
          <Link
            to="/member/last-update"
            className={`${themeTapTarget} shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${themeAccent.buttonSoft} ${portalFocusRing}`}
          >
            ประวัติการบันทึกชุดข้อมูล
          </Link>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          ข้อมูลที่แสดงมาจากทะเบียนปัจจุบัน — บันทึกแล้วระบบจะอัปเดตเวลา <strong className="text-slate-300">ข้อมูลอัปเดตล่าสุด</strong> อัตโนมัติ
        </p>
        <div className="mt-3 rounded border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/90">
          ทุกครั้งที่บันทึก ระบบจะเก็บ snapshot ใน <code className="text-amber-200/90">member_profile_versions</code> (ชุดเก่าเป็น
          inactive ชุดล่าสุดเป็น active) — รูปโปรไฟล์อัปโหลดจากช่องด้านล่างได้โดยตรง (bucket{' '}
          <code className="text-amber-200/90">member-profile-photos</code>) หรือใส่ URL เอง / ให้ผู้ดูแลนำเข้า
        </div>
        <MemberProfileSection
          apiBase={props.apiBase}
          lineUid={props.lineUid}
          member={props.member}
          onMemberUpdated={props.onMemberUpdated}
        />
      </section>
    </div>
  )
}

function formatMemberTs(iso: unknown): string {
  if (iso == null || String(iso).trim() === '') return '—'
  const d = new Date(String(iso))
  return Number.isFinite(d.getTime())
    ? d.toLocaleString('th-TH', { dateStyle: 'full', timeStyle: 'short' })
    : '—'
}

/** รายการฟิลด์ในฟอร์มแก้ไข — ใช้แสดง snapshot เต็มใน `<details>` */
function MemberSnapshotFieldList({ snap }: { snap: Record<string, unknown> }) {
  return (
    <dl className="mt-2 space-y-2 border-t border-slate-800/60 pt-2 text-left">
      {MEMBER_SELF_EDIT_HEADERS.map((h) => {
        const k = HEADER_TO_MEMBER_KEY[h]
        if (!k) return null
        const raw = snap[k]
        const display = raw == null || String(raw).trim() === '' ? '—' : String(raw).trim()
        return (
          <div key={h} className="grid gap-1 sm:grid-cols-[minmax(8rem,1fr)_minmax(0,2fr)] sm:gap-3">
            <dt className="text-slate-500">{h}</dt>
            <dd className="min-w-0 break-words text-slate-200">{display}</dd>
          </div>
        )
      })}
    </dl>
  )
}

/** สรุป snapshot ประวัติ (ฟิลด์แก้ได้ตามลำดับในฟอร์ม — สูงสุด 4 ค่า) */
function summarizeMemberProfileSnapshot(snap: Record<string, unknown>): string {
  const parts: string[] = []
  for (const header of MEMBER_SELF_EDIT_HEADERS) {
    const k = HEADER_TO_MEMBER_KEY[header]
    if (!k) continue
    const raw = snap[k]
    if (raw == null || String(raw).trim() === '') continue
    let s = String(raw).trim()
    if (s.length > 40) s = `${s.slice(0, 37)}…`
    parts.push(`${header}: ${s}`)
    if (parts.length >= 4) break
  }
  return parts.length > 0 ? parts.join(' · ') : '—'
}

type ProfileVersionRow = {
  id: string
  created_at: string
  is_active: boolean
  snapshot: Record<string, unknown>
}

function MemberLastUpdatePage(props: {
  member: Record<string, unknown>
  apiBase: string
  lineUid: string
  /** นับขึ้นเมื่อบันทึกโปรไฟล์สำเร็จ (พอร์ทัล) — กระตุ้นโหลดตารางประวัติใหม่ */
  profileVersionsRefresh: number
}) {
  const location = useLocation()
  const updatedAt = formatMemberTs(props.member.updated_at)
  const createdAt = formatMemberTs(props.member.created_at)
  const [versions, setVersions] = useState<ProfileVersionRow[]>([])
  const [vLoading, setVLoading] = useState(false)
  const [vErr, setVErr] = useState<string | null>(null)

  const displayVersions = props.lineUid.trim() ? versions : []
  const memberUpdatedSignal = String(props.member.updated_at ?? '')

  useEffect(() => {
    if (!props.lineUid.trim()) {
      return
    }
    let cancelled = false
    void (async () => {
      setVLoading(true)
      setVErr(null)
      const u = new URL(`${props.apiBase.replace(/\/$/, '')}/api/members/profile-versions`)
      u.searchParams.set('line_uid', props.lineUid.trim())
      try {
        const r = await fetch(u.toString())
        const j = (await r.json().catch(() => ({}))) as {
          error?: string
          ok?: boolean
          versions?: ProfileVersionRow[]
        }
        if (cancelled) return
        if (!r.ok) {
          setVErr(j.error ?? `HTTP ${r.status}`)
          setVersions([])
          return
        }
        setVersions(Array.isArray(j.versions) ? j.versions : [])
      } catch {
        if (!cancelled) {
          setVErr('โหลดประวัติไม่สำเร็จ')
          setVersions([])
        }
      } finally {
        if (!cancelled) setVLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    props.apiBase,
    props.lineUid,
    props.profileVersionsRefresh,
    memberUpdatedSignal,
    location.key,
  ])

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-label="ข้อมูลสมาชิกที่อัปเดตล่าสุด">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ข้อมูลสมาชิกที่อัปเดตล่าสุด</h3>
        <p className="mt-2 text-sm text-slate-400">
          เวลาที่ทะเบียนสมาชิกถูกบันทึกล่าสุด (<code className="text-slate-500">updated_at</code>) และประวัติชุดข้อมูลจากการแก้ไขในพอร์ทัล
        </p>
        <dl className="mt-4 space-y-3 rounded-lg border border-slate-800/80 bg-slate-900/30 p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-slate-400">อัปเดตล่าสุด (ทะเบียน)</dt>
            <dd className="font-medium text-fuchsia-200">{updatedAt}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-t border-slate-800/60 pt-3">
            <dt className="text-slate-400">สร้างระเบียนเมื่อ</dt>
            <dd className="text-slate-200">{createdAt}</dd>
          </div>
        </dl>

        <div className="mt-6" aria-busy={vLoading}>
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">ประวัติการบันทึกชุดข้อมูล (พอร์ทัล)</h4>
          {vErr ? (
            <p className="mt-2 text-sm text-amber-300" role="status">
              {vErr} — ลองรีเฟรชหน้า หรือลองใหม่ภายหลัง ถ้ายังไม่หายให้ติดต่อผู้ดูแลระบบ
            </p>
          ) : null}
          {vLoading ? (
            <p className="mt-2 text-sm text-slate-500">กำลังโหลดประวัติ…</p>
          ) : displayVersions.length === 0 && !vErr ? (
            <p className="mt-2 text-sm text-slate-500">ยังไม่มีประวัติ — จะบันทึกหลังบันทึกการแก้ไขข้อมูลครั้งแรก</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[min(100%,42rem)] border-collapse text-left text-xs text-slate-200">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 pr-2 font-medium">บันทึกเมื่อ</th>
                    <th className="py-2 pr-2 font-medium">สถานะ</th>
                    <th className="py-2 pr-2 font-medium">สรุปชุดข้อมูล (ตัวอย่าง)</th>
                  </tr>
                </thead>
                <tbody>
                  {displayVersions.map((v) => (
                    <tr key={v.id} className="border-b border-slate-800/60">
                      <td className="py-2 pr-2 align-top text-slate-300 whitespace-nowrap">
                        {formatThDateTime(v.created_at)}
                      </td>
                      <td className="py-2 pr-2 align-top whitespace-nowrap">
                        {v.is_active ? (
                          <span className="rounded bg-emerald-950/50 px-2 py-0.5 text-emerald-200">ชุดปัจจุบัน</span>
                        ) : (
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-400">เก็บเป็นประวัติ</span>
                        )}
                      </td>
                      <td className="max-w-[min(100vw-2rem,28rem)] py-2 align-top break-words text-slate-400">
                        <p>
                          {summarizeMemberProfileSnapshot(
                            v.snapshot && typeof v.snapshot === 'object' && !Array.isArray(v.snapshot)
                              ? (v.snapshot as Record<string, unknown>)
                              : {},
                          )}
                        </p>
                        <details className="mt-2">
                          <summary
                            className={`cursor-pointer text-xs text-fuchsia-400/95 underline decoration-fuchsia-500/40 underline-offset-2 hover:text-fuchsia-300 ${portalFocusRing} rounded-sm`}
                          >
                            ดูทุกฟิลด์ที่บันทึก
                          </summary>
                          <MemberSnapshotFieldList
                            snap={
                              v.snapshot && typeof v.snapshot === 'object' && !Array.isArray(v.snapshot)
                                ? (v.snapshot as Record<string, unknown>)
                                : {}
                            }
                          />
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4">
          <Link
            to="/member/profile-edit"
            className={`${themeTapTarget} inline-flex rounded-lg px-3 py-2 text-sm ${themeAccent.buttonSoft} ${portalFocusRing}`}
          >
            ไปแก้ไขข้อมูล
          </Link>
        </div>
      </section>
    </div>
  )
}

type MemberDonationHistoryRow = {
  id: string
  amount: number
  createdAt: string | null
  /** เวลาโอนที่สมาชิกระบุ (ถ้ามี) — แยกจากเวลาที่ระบบบันทึก */
  transferAt?: string | null
  activityId: string | null
  activityTitle: string | null
  activityCategory: string | null
  fundScope: string | null
  slipFileUrl: string | null
  note: string | null
}

function formatThDateTime(iso: string | null | undefined): string {
  if (iso == null || !String(iso).trim()) return '—'
  const d = new Date(String(iso))
  return Number.isFinite(d.getTime()) ? d.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '—'
}

function fundScopeLabelTh(scope: string | null): string {
  if (scope === 'yupparaj_school') return 'กองโรงเรียนยุพราช'
  if (scope === 'association') return 'สมาคม'
  if (scope === 'cram_school') return 'กวดวิชา'
  return '—'
}

function MemberDonationsPage(props: {
  apiBase: string
  lineUid: string
  member: Record<string, unknown>
  portalState: PortalDataState<MemberPortalData>
}) {
  const { data, loading, source } = props.portalState
  const portalMockMode = !loading && source === 'mock'
  const [activityId, setActivityId] = useState('')
  const [amount, setAmount] = useState('')
  const [transferAt, setTransferAt] = useState('')
  const [slipUrl, setSlipUrl] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formMsg, setFormMsg] = useState<string | null>(null)
  const [history, setHistory] = useState<MemberDonationHistoryRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyErr, setHistoryErr] = useState<string | null>(null)
  const [yupparajStatsRefresh, setYupparajStatsRefresh] = useState(0)

  const selectedDonationActivity = useMemo(
    () => data.yupparajDonationActivities.find((a) => a.id === activityId.trim()) ?? null,
    [activityId, data.yupparajDonationActivities],
  )

  const donorName = [props.member.first_name, props.member.last_name].filter(Boolean).join(' ').trim() || '—'
  const donorBatch = props.member.batch != null ? String(props.member.batch) : '—'
  const donorBatchName = props.member.batch_name != null ? String(props.member.batch_name) : '—'

  const loadDonationHistory = useCallback(async () => {
    if (!props.lineUid.trim()) {
      setHistory([])
      return
    }
    if (!props.portalState.loading && props.portalState.source === 'mock') {
      setHistory(memberDonationHistoryMock.map((r) => ({ ...r })))
      setHistoryErr(null)
      setHistoryLoading(false)
      return
    }
    if (props.portalState.loading) return
    setHistoryLoading(true)
    setHistoryErr(null)
    try {
      const r = await fetch(`${props.apiBase.replace(/\/$/, '')}/api/members/donations/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_uid: props.lineUid.trim() }),
      })
      const j = (await r.json().catch(() => ({}))) as {
        error?: string
        ok?: boolean
        donations?: MemberDonationHistoryRow[]
      }
      if (!r.ok) {
        setHistoryErr(j.error ?? `ไม่สำเร็จ (HTTP ${r.status})`)
        setHistory([])
        return
      }
      setHistory(Array.isArray(j.donations) ? j.donations : [])
    } catch {
      setHistoryErr('เรียกเซิร์ฟเวอร์ไม่สำเร็จ')
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [props.apiBase, props.lineUid, props.portalState.loading, props.portalState.source])

  useEffect(() => {
    if (props.portalState.loading) return
    if (props.portalState.source === 'mock') {
      if (!props.lineUid.trim()) {
        setHistory([])
        return
      }
      setHistory(memberDonationHistoryMock.map((r) => ({ ...r })))
      setHistoryErr(null)
      setHistoryLoading(false)
      return
    }
    void loadDonationHistory()
  }, [loadDonationHistory, props.lineUid, props.portalState.loading, props.portalState.source])

  const submitDonation = useCallback(async () => {
    if (!props.lineUid.trim()) {
      setFormMsg('ต้องลงชื่อเข้าใช้ด้วย LINE และผูกสมาชิกก่อนบริจาค')
      return
    }
    if (!activityId.trim()) {
      setFormMsg('เลือกกิจกรรม/โครงการ')
      return
    }
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) {
      setFormMsg('กรอกจำนวนเงินที่มากกว่า 0')
      return
    }
    setSubmitting(true)
    setFormMsg(null)
    try {
      const body: Record<string, unknown> = {
        line_uid: props.lineUid.trim(),
        activity_id: activityId.trim(),
        amount: n,
      }
      if (transferAt.trim()) body.transfer_at = new Date(transferAt).toISOString()
      if (slipUrl.trim()) body.slip_file_url = slipUrl.trim()
      if (note.trim()) body.note = note.trim()
      const r = await fetch(`${props.apiBase.replace(/\/$/, '')}/api/members/donations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = (await r.json().catch(() => ({}))) as { error?: string; ok?: boolean }
      if (!r.ok) {
        setFormMsg(j.error ?? `ไม่สำเร็จ (HTTP ${r.status})`)
        return
      }
      setFormMsg('บันทึกการบริจาคแล้ว ขอบคุณที่สนับสนุน')
      setAmount('')
      setSlipUrl('')
      setNote('')
      setYupparajStatsRefresh((n) => n + 1)
      void props.portalState.refetch()
      void loadDonationHistory()
    } catch {
      setFormMsg('เรียกเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setSubmitting(false)
    }
  }, [activityId, amount, loadDonationHistory, note, props.apiBase, props.lineUid, props.portalState, slipUrl, transferAt])

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
        <PortalSectionHeader loading={loading} source={source}>
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สนับสนุนกิจกรรมโรงเรียนยุพราชวิทยาลัย</h3>
            <p className="mt-2 text-sm text-slate-400">
              เลือกโครงการ (เช่น ทุนอาหารกลางวัน ทุนการศึกษา) กรอกยอดโอน และแนบลิงก์สลิป — ยอดกองนี้แยกจากรายรับของสมาคมศิษย์เก่าและโรงเรียนกวดวิชา
            </p>
          </div>
        </PortalSectionHeader>
        {loading ? (
          <PortalContentLoading />
        ) : (
          <>
            <div
              className="mt-4 rounded border border-slate-800/80 bg-slate-900/30 p-3 text-sm text-slate-300"
              aria-label="ข้อมูลผู้บริจาคจากทะเบียนสมาชิก"
            >
              <p>
                <span className="text-slate-400">ผู้บริจาค:</span> {donorName}{' '}
                <span className="text-slate-400">· รุ่น</span> {donorBatch}{' '}
                <span className="text-slate-400">· ชื่อรุ่น</span> {donorBatchName}
              </p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2" role="list" aria-label="โครงการโรงเรียนยุพราช (กองแยกจากนิติบุคคลสมาคม/กวดวิชา)">
              {data.yupparajDonationActivities.length === 0 ? (
                <p className="text-sm text-amber-200/90 md:col-span-2">
                  ยังไม่มีรายการกิจกรรมประเภทโรงเรียนยุพราชในระบบ — ผู้ดูแลสามารถเพิ่มที่ Admin → คอร์ส/กิจกรรม และตั้งค่าเป็น &quot;กองโรงเรียนยุพราช&quot;
                </p>
              ) : (
                data.yupparajDonationActivities.map((a) => {
                  const pct =
                    a.targetAmount != null && a.targetAmount > 0
                      ? Math.min(100, Math.round((a.raisedAmount / a.targetAmount) * 100))
                      : 0
                  return (
                    <div key={a.id} role="listitem">
                      <DonationCampaignCard
                        title={`${a.title} (${a.category})`}
                        description={a.description}
                        progress={pct}
                        target={a.targetAmount != null ? Math.round(a.targetAmount).toLocaleString('th-TH') : '—'}
                        raised={Math.round(a.raisedAmount).toLocaleString('th-TH')}
                      />
                    </div>
                  )
                })
              )}
            </div>
            <div className="mt-8">
              <MemberYupparajPublicStats
                apiBase={props.apiBase}
                refreshTrigger={yupparajStatsRefresh}
                mockMode={portalMockMode}
              />
            </div>
            <div className="mt-6 space-y-3 rounded-lg border border-fuchsia-900/40 bg-fuchsia-950/15 p-4" aria-label="ฟอร์มบันทึกการบริจาค">
              <p className="text-xs font-medium uppercase tracking-wide text-fuchsia-200/90">บันทึกการโอน</p>
              <label className="block text-xs text-slate-400">
                เลือกโครงการ
                <select
                  value={activityId}
                  onChange={(e) => setActivityId(e.target.value)}
                  className={`mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${portalFocusRing}`}
                >
                  <option value="">— เลือก —</option>
                  {data.yupparajDonationActivities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.category})
                    </option>
                  ))}
                </select>
              </label>
              {selectedDonationActivity ? (
                <div
                  className="rounded border border-slate-700/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-300"
                  role="region"
                  aria-label="รายละเอียดโครงการที่เลือก"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">รายละเอียดโครงการ</p>
                  {selectedDonationActivity.description != null && String(selectedDonationActivity.description).trim() ? (
                    <p className="mt-1 whitespace-pre-wrap text-slate-300">{String(selectedDonationActivity.description).trim()}</p>
                  ) : (
                    <p className="mt-1 text-slate-500">ยังไม่มีคำอธิบายเพิ่มเติม — ผู้ดูแลสามารถกรอกที่ Admin → คอร์ส/กิจกรรม</p>
                  )}
                </div>
              ) : null}
              <label className="block text-xs text-slate-400">
                จำนวนเงิน (บาท)
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${portalFocusRing}`}
                  placeholder="เช่น 500"
                />
              </label>
              <label className="block text-xs text-slate-400">
                วันเวลาโอน (ถ้ามี)
                <input
                  type="datetime-local"
                  value={transferAt}
                  onChange={(e) => setTransferAt(e.target.value)}
                  className={`mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${portalFocusRing}`}
                />
              </label>
              <label className="block text-xs text-slate-400">
                ลิงก์แนบสลิป (URL รูปภาพหรือไฟล์ที่อัปโหลดแล้ว)
                <input
                  type="url"
                  value={slipUrl}
                  onChange={(e) => setSlipUrl(e.target.value)}
                  className={`mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${portalFocusRing}`}
                  placeholder="https://..."
                />
              </label>
              <p className="text-xs text-slate-500">
                แนะนำตั้งชื่อไฟล์สลิปเป็นรูปแบบ <span className="font-mono text-slate-400">ชื่อ-นามสกุล-รุ่น_ชื่อกิจกรรม</span>{' '}
                ก่อนอัปโหลดไปยังที่เก็บขององค์กร — โฟลเดอร์และการอัปโหลดตรงๆ จะเชื่อมจากแผงผู้ดูแลในรอบถัดไป
              </p>
              <label className="block text-xs text-slate-400">
                หมายเหตุ (ถ้ามี)
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={`mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${portalFocusRing}`}
                />
              </label>
              {formMsg ? (
                <p className={`text-sm ${formMsg.includes('แล้ว') ? 'text-fuchsia-300' : 'text-amber-300'}`} role="status">
                  {formMsg}
                </p>
              ) : null}
              <button
                type="button"
                disabled={submitting || data.yupparajDonationActivities.length === 0}
                onClick={() => void submitDonation()}
                aria-label="ส่งข้อมูลการบริจาค"
                className={`${themeTapTarget} rounded px-4 py-2 text-sm text-white disabled:opacity-50 ${themeAccent.buttonPrimary} ${portalFocusRing}`}
              >
                {submitting ? 'กำลังส่ง…' : 'ยืนยันการบริจาค'}
              </button>
            </div>
            <div
              className="mt-6 rounded-lg border border-slate-800/80 bg-slate-900/20 p-4"
              aria-busy={historyLoading}
              aria-label="ประวัติการบริจาคของคุณ"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">ประวัติการบริจาคล่าสุด</p>
                <button
                  type="button"
                  onClick={() => void loadDonationHistory()}
                  disabled={historyLoading || !props.lineUid.trim()}
                  className={`${themeTapTarget} rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50 ${portalFocusRing}`}
                >
                  {historyLoading ? 'กำลังโหลด…' : 'รีเฟรช'}
                </button>
              </div>
              {portalMockMode ? (
                <p className="mt-1 text-xs text-slate-400">ตัวอย่าง — พอร์ทัลโหลดจาก snapshot (ไม่มี API)</p>
              ) : null}
              {historyErr ? (
                <p className="mt-2 text-sm text-amber-300" role="status">
                  {historyErr}
                </p>
              ) : history.length === 0 && !historyLoading ? (
                <p className="mt-2 text-sm text-slate-400">ยังไม่มีรายการบริจาคที่บันทึกผ่านพอร์ทัล</p>
              ) : null}
              {history.length > 0 ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[36rem] border-collapse text-left text-sm text-slate-200">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                        <th className="py-2 pr-3 font-medium">บันทึก</th>
                        <th className="py-2 pr-3 font-medium">โอน</th>
                        <th className="py-2 pr-3 font-medium">โครงการ</th>
                        <th className="py-2 pr-3 font-medium">กอง</th>
                        <th className="py-2 pr-3 text-right font-medium">จำนวน</th>
                        <th className="py-2 font-medium">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => {
                        const title =
                          h.activityTitle != null && h.activityTitle !== '—'
                            ? h.activityCategory
                              ? `${h.activityTitle} (${h.activityCategory})`
                              : h.activityTitle
                            : '—'
                        return (
                          <tr key={h.id} className="border-b border-slate-800/60">
                            <td className="py-2 pr-3 align-top text-slate-400">{formatThDateTime(h.createdAt)}</td>
                            <td className="py-2 pr-3 align-top text-slate-400">{formatThDateTime(h.transferAt)}</td>
                            <td className="py-2 pr-3 align-top">{title}</td>
                            <td className="py-2 pr-3 align-top text-slate-400">{fundScopeLabelTh(h.fundScope)}</td>
                            <td className="py-2 pr-3 align-top text-right tabular-nums">
                              {Math.round(h.amount).toLocaleString('th-TH')} ฿
                            </td>
                            <td className="py-2 align-top text-slate-400">
                              {h.slipFileUrl ? (
                                <a
                                  href={h.slipFileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`${themeAccent.link} ${portalFocusRing}`}
                                >
                                  สลิป
                                </a>
                              ) : null}
                              {h.note ? (
                                <span className={h.slipFileUrl ? ' ml-2' : ''}>{h.note}</span>
                              ) : null}
                              {!h.slipFileUrl && !h.note ? '—' : null}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 opacity-90" role="list" aria-label="ภาพรวมเดโม (แคมเปญอื่น)">
              {data.donationCampaigns.map((campaign) => (
                <div key={campaign.title} role="listitem">
                  <DonationCampaignCard title={campaign.title} progress={campaign.progress} target={campaign.target} raised={campaign.raised} />
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

