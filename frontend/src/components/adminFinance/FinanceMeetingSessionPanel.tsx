import type { Dispatch, SetStateAction } from 'react'
import { portalFocusRing } from '../../portal/portalLabels'

export type FinanceMeetingSessionPanelProps = {
  loading: boolean
  meetingEntity: 'association' | 'cram_school'
  setMeetingEntity: Dispatch<SetStateAction<'association' | 'cram_school'>>
  meetingTitle: string
  setMeetingTitle: Dispatch<SetStateAction<string>>
  meetingExpected: string
  setMeetingExpected: Dispatch<SetStateAction<string>>
  onCreateMeeting: () => void
  meetingId: string
  setMeetingId: Dispatch<SetStateAction<string>>
  attendanceName: string
  setAttendanceName: Dispatch<SetStateAction<string>>
  attendanceRole: 'committee' | 'cram_executive'
  setAttendanceRole: Dispatch<SetStateAction<'committee' | 'cram_executive'>>
  attendanceLineUid: string
  setAttendanceLineUid: Dispatch<SetStateAction<string>>
  onSignAttendance: () => void
  onLoadMeetingSummary: () => void
  onLoadMeetingMinutes: () => void
  meetingSummary: string
  meetingMinutesMeta: string
  meetingMinutes: string
  setMeetingMinutes: Dispatch<SetStateAction<string>>
  onSaveMeetingMinutes: () => void
  onDownloadMeetingMinutesTxt: () => void
  onPublishMinutes: () => void
  onUnpublishMinutes: () => void
  meetingMinutesPublished: boolean
}

export function FinanceMeetingSessionPanel({
  loading,
  meetingEntity,
  setMeetingEntity,
  meetingTitle,
  setMeetingTitle,
  meetingExpected,
  setMeetingExpected,
  onCreateMeeting,
  meetingId,
  setMeetingId,
  attendanceName,
  setAttendanceName,
  attendanceRole,
  setAttendanceRole,
  attendanceLineUid,
  setAttendanceLineUid,
  onSignAttendance,
  onLoadMeetingSummary,
  onLoadMeetingMinutes,
  meetingSummary,
  meetingMinutesMeta,
  meetingMinutes,
  setMeetingMinutes,
  onSaveMeetingMinutes,
  onDownloadMeetingMinutesTxt,
  onPublishMinutes,
  onUnpublishMinutes,
  meetingMinutesPublished,
}: FinanceMeetingSessionPanelProps) {
  return (
    <>
      <h3 className="text-sm font-medium text-slate-200">สร้างประชุม</h3>
      <select
        value={meetingEntity}
        onChange={(e) => setMeetingEntity(e.target.value as 'association' | 'cram_school')}
        aria-label="เลือกหน่วยงานสำหรับสร้างประชุม"
        className={`mt-3 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
      >
        <option value="association">สมาคมศิษย์เก่า (association)</option>
        <option value="cram_school">โรงเรียนกวดวิชา (cram_school)</option>
      </select>
      <input
        value={meetingTitle}
        onChange={(e) => setMeetingTitle(e.target.value)}
        aria-label="หัวข้อการประชุม"
        className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        placeholder="หัวข้อการประชุม"
      />
      <input
        value={meetingExpected}
        onChange={(e) => setMeetingExpected(e.target.value)}
        aria-label="จำนวนผู้เข้าร่วมที่คาดไว้"
        className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        placeholder="จำนวนผู้เข้าร่วมที่คาดไว้"
      />
      <button
        type="button"
        disabled={loading}
        onClick={onCreateMeeting}
        aria-label="สร้างรอบประชุมใหม่"
        className={`mt-3 rounded bg-fuchsia-700 px-3 py-2 text-sm text-white disabled:opacity-50 ${portalFocusRing}`}
      >
        สร้างประชุม
      </button>

      <input
        value={meetingId}
        onChange={(e) => setMeetingId(e.target.value)}
        aria-label="รหัสการประชุม"
        className={`mt-3 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        placeholder="รหัสการประชุม"
      />
      <div className="mt-2 grid grid-cols-1 gap-2">
        <input
          value={attendanceName}
          onChange={(e) => setAttendanceName(e.target.value)}
          aria-label="ชื่อผู้เข้าประชุม"
          className={`w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
          placeholder="ชื่อผู้เข้าประชุม"
        />
        <select
          value={attendanceRole}
          onChange={(e) => setAttendanceRole(e.target.value as 'committee' | 'cram_executive')}
          aria-label="บทบาทผู้เข้าประชุม"
          className={`w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        >
          <option value="committee">คณะกรรมการ (committee)</option>
          <option value="cram_executive">ผู้บริหารกวดวิชา (cram_executive)</option>
        </select>
        <input
          value={attendanceLineUid}
          onChange={(e) => setAttendanceLineUid(e.target.value)}
          aria-label="LINE UID ของผู้เข้าประชุม (ไม่บังคับ)"
          className={`w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
          placeholder="LINE UID (ไม่บังคับ)"
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="คำสั่งลงชื่อและสรุปรายงานประชุม">
        <button
          type="button"
          disabled={loading}
          onClick={onSignAttendance}
          aria-label="บันทึกการลงชื่อเข้าประชุม"
          className={`rounded bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-50 ${portalFocusRing}`}
        >
          ลงชื่อเข้าประชุม
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onLoadMeetingSummary}
          aria-label="โหลดสรุปรายงานการประชุม"
          className={`rounded bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-50 ${portalFocusRing}`}
        >
          สรุปประชุม
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onLoadMeetingMinutes}
          aria-label="โหลดบันทึกรายงานการประชุม"
          className={`rounded bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-50 ${portalFocusRing}`}
        >
          โหลด minutes
        </button>
      </div>
      {meetingSummary ? (
        <pre className="mt-3 max-h-40 overflow-auto rounded bg-slate-950 p-2 text-[11px] text-slate-300" role="status" aria-live="polite" aria-atomic="true">
          {meetingSummary}
        </pre>
      ) : null}
      <div className="mt-3 rounded border border-slate-800 bg-slate-950/50 p-3" role="group" aria-label="ส่วนบันทึกรายงานการประชุม">
        <h4 className="text-xs font-medium uppercase tracking-wide text-slate-300">บันทึกรายงานการประชุม (Minutes)</h4>
        {meetingMinutesMeta ? (
          <p className="mt-1 text-[11px] text-slate-500" role="status" aria-live="polite" aria-atomic="true">
            {meetingMinutesMeta}
          </p>
        ) : null}
        <textarea
          value={meetingMinutes}
          onChange={(e) => setMeetingMinutes(e.target.value)}
          aria-label="เนื้อหารายงานการประชุม"
          className={`mt-2 h-28 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
          placeholder="บันทึกรายงานการประชุม (รองรับ markdown)"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onSaveMeetingMinutes}
            aria-label="บันทึกรายงานการประชุม"
            className={`rounded bg-fuchsia-700 px-3 py-2 text-sm text-white disabled:opacity-50 ${portalFocusRing}`}
          >
            บันทึก minutes
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onDownloadMeetingMinutesTxt}
            aria-label="ดาวน์โหลดรายงานการประชุมเป็นไฟล์ข้อความ"
            className={`rounded bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-50 ${portalFocusRing}`}
          >
            ดาวน์โหลด minutes.txt
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onPublishMinutes}
            aria-label="เผยแพร่รายงานการประชุมสู่พอร์ทัล"
            className={`rounded bg-violet-700 px-3 py-2 text-sm text-white disabled:opacity-50 ${portalFocusRing}`}
          >
            เผยแพร่ minutes
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onUnpublishMinutes}
            aria-label="ซ่อนรายงานการประชุมจากพอร์ทัล"
            className={`rounded border border-slate-700 px-3 py-2 text-sm text-slate-200 disabled:opacity-50 ${portalFocusRing}`}
          >
            ซ่อน minutes
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500" role="status" aria-live="polite" aria-atomic="true">
          สถานะพอร์ทัล: {meetingMinutesPublished ? 'เผยแพร่แล้ว' : 'ยังไม่เผยแพร่'}
        </p>
      </div>
    </>
  )
}
