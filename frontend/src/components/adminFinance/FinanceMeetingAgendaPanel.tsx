import type { Dispatch, SetStateAction } from 'react'
import type { MeetingAgendaItem } from '../../lib/adminFinanceTypes'
import { portalFocusRing } from '../../portal/portalLabels'

export type FinanceMeetingAgendaPanelProps = {
  loading: boolean
  agendas: MeetingAgendaItem[]
  agendaTitle: string
  setAgendaTitle: Dispatch<SetStateAction<string>>
  agendaDetails: string
  setAgendaDetails: Dispatch<SetStateAction<string>>
  onCreateMeetingAgenda: () => void
  agendaStatusFilter: 'all' | 'open' | 'closed'
  setAgendaStatusFilter: Dispatch<SetStateAction<'all' | 'open' | 'closed'>>
  onLoadMeetingAgendas: () => void
  onSelectAgendaForSummary: (agenda: MeetingAgendaItem) => void
  onCloseMeetingAgenda: (agendaId: string) => void
  onBeginPatchMeetingAgenda: (agenda: MeetingAgendaItem) => void
  agendaPatchId: string
  agendaPatchTitle: string
  setAgendaPatchTitle: Dispatch<SetStateAction<string>>
  agendaPatchDetails: string
  setAgendaPatchDetails: Dispatch<SetStateAction<string>>
  agendaPatchStatus: 'open' | 'closed'
  setAgendaPatchStatus: Dispatch<SetStateAction<'open' | 'closed'>>
  onSavePatchMeetingAgenda: () => void
  onCancelPatchMeetingAgenda: () => void
  voteAgendaId: string
  setVoteAgendaId: Dispatch<SetStateAction<string>>
  agendaVoterName: string
  setAgendaVoterName: Dispatch<SetStateAction<string>>
  agendaVote: 'approve' | 'reject' | 'abstain'
  setAgendaVote: Dispatch<SetStateAction<'approve' | 'reject' | 'abstain'>>
  onCastAgendaVote: () => void
  agendaVoteSummary: string
}

export function FinanceMeetingAgendaPanel({
  loading,
  agendas,
  agendaTitle,
  setAgendaTitle,
  agendaDetails,
  setAgendaDetails,
  onCreateMeetingAgenda,
  agendaStatusFilter,
  setAgendaStatusFilter,
  onLoadMeetingAgendas,
  onSelectAgendaForSummary,
  onCloseMeetingAgenda,
  onBeginPatchMeetingAgenda,
  agendaPatchId,
  agendaPatchTitle,
  setAgendaPatchTitle,
  agendaPatchDetails,
  setAgendaPatchDetails,
  agendaPatchStatus,
  setAgendaPatchStatus,
  onSavePatchMeetingAgenda,
  onCancelPatchMeetingAgenda,
  voteAgendaId,
  setVoteAgendaId,
  agendaVoterName,
  setAgendaVoterName,
  agendaVote,
  setAgendaVote,
  onCastAgendaVote,
  agendaVoteSummary,
}: FinanceMeetingAgendaPanelProps) {
  return (
    <div className="mt-4 rounded border border-slate-800 bg-slate-950/50 p-3" role="group" aria-label="เครื่องมือวาระประชุมและการลงมติ">
      <h4 className="text-xs font-medium uppercase tracking-wide text-slate-300">1.1) วาระประชุมและลงมติ</h4>
      <p className="mt-1 text-[11px] text-slate-500" role="status" aria-live="polite" aria-atomic="true">
        รายการวาระที่โหลดแล้ว {agendas.length.toLocaleString('th-TH')} วาระ
      </p>

      <input
        value={agendaTitle}
        onChange={(e) => setAgendaTitle(e.target.value)}
        aria-label="หัวข้อวาระประชุมใหม่"
        className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        placeholder="หัวข้อวาระใหม่"
      />
      <textarea
        value={agendaDetails}
        onChange={(e) => setAgendaDetails(e.target.value)}
        aria-label="รายละเอียดวาระประชุมใหม่"
        className={`mt-2 h-20 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        placeholder="รายละเอียดวาระ (ถ้ามี)"
      />
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="คำสั่งสร้างและโหลดวาระประชุม">
        <button
          type="button"
          disabled={loading}
          onClick={onCreateMeetingAgenda}
          aria-label="สร้างวาระประชุมใหม่"
          className={`rounded bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50 ${portalFocusRing}`}
        >
          สร้างวาระ
        </button>
        <select
          value={agendaStatusFilter}
          onChange={(e) => setAgendaStatusFilter(e.target.value as 'all' | 'open' | 'closed')}
          aria-label="ตัวกรองสถานะวาระประชุม"
          className={`rounded border border-slate-700 bg-slate-900 px-2 py-2 text-xs ${portalFocusRing}`}
        >
          <option value="open">เฉพาะเปิดโหวต</option>
          <option value="closed">เฉพาะปิดแล้ว</option>
          <option value="all">ทุกสถานะ</option>
        </select>
        <button
          type="button"
          disabled={loading}
          onClick={onLoadMeetingAgendas}
          aria-label="โหลดรายการวาระประชุมตามตัวกรอง"
          className={`rounded bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-50 ${portalFocusRing}`}
        >
          โหลดวาระ
        </button>
      </div>

      <div className="mt-3 max-h-36 overflow-auto rounded border border-slate-800 p-2 text-xs" role="list" aria-label="รายการวาระประชุม">
        {agendas.length === 0 ? (
          <p className="text-slate-500" role="status" aria-live="polite" aria-atomic="true">
            ยังไม่มีรายการวาระในตัวกรองนี้
          </p>
        ) : (
          agendas.map((agenda) => (
            <div key={agenda.id} className="mb-2 rounded border border-slate-800 p-2" role="listitem">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-200">{agenda.title}</span>
                <span className="text-[11px] text-slate-500">
                  {agenda.status === 'open' ? 'เปิดโหวต' : 'ปิดแล้ว'} · {agenda.scope}
                </span>
              </div>
              <p className="mt-1 break-all text-[11px] text-slate-500">{agenda.id}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onSelectAgendaForSummary(agenda)}
                  aria-label={`เลือกวาระ ${agenda.title} เพื่อดูสรุปโหวต`}
                  className={`rounded bg-slate-700 px-2 py-1 text-[11px] text-white disabled:opacity-50 ${portalFocusRing}`}
                >
                  เลือก/ดูสรุป
                </button>
                {agenda.status === 'open' ? (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void onCloseMeetingAgenda(agenda.id)}
                    aria-label={`ปิดโหวตวาระ ${agenda.title}`}
                    className={`rounded bg-amber-700 px-2 py-1 text-[11px] text-white disabled:opacity-50 ${portalFocusRing}`}
                  >
                    ปิดโหวต
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onBeginPatchMeetingAgenda(agenda)}
                  aria-label={`แก้ไขหัวข้อหรือสถานะวาระ ${agenda.title}`}
                  className={`rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200 disabled:opacity-50 ${portalFocusRing}`}
                >
                  แก้ไข
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {agendaPatchId ? (
        <div className="mt-3 rounded border border-amber-900/60 bg-slate-950/80 p-3" role="group" aria-label="แก้ไขวาระประชุมที่เลือก">
          <p className="text-[11px] text-amber-200/90">แก้ไขวาระ: {agendaPatchId}</p>
          <input
            value={agendaPatchTitle}
            onChange={(e) => setAgendaPatchTitle(e.target.value)}
            aria-label="หัวข้อวาระ (แก้ไข)"
            className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
          />
          <textarea
            value={agendaPatchDetails}
            onChange={(e) => setAgendaPatchDetails(e.target.value)}
            aria-label="รายละเอียดวาระ (แก้ไข)"
            className={`mt-2 h-20 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
            placeholder="รายละเอียด (ว่างได้)"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>สถานะ</span>
              <select
                value={agendaPatchStatus}
                onChange={(e) => setAgendaPatchStatus(e.target.value as 'open' | 'closed')}
                aria-label="สถานะวาระหลังแก้ไข"
                className={`rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs ${portalFocusRing}`}
              >
                <option value="open">เปิดโหวต</option>
                <option value="closed">ปิดแล้ว</option>
              </select>
            </label>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void onSavePatchMeetingAgenda()}
              aria-label="บันทึกการแก้ไขวาระประชุม"
              className={`rounded bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50 ${portalFocusRing}`}
            >
              บันทึกการแก้ไข
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onCancelPatchMeetingAgenda}
              aria-label="ยกเลิกการแก้ไขวาระประชุม"
              className={`rounded border border-slate-600 px-3 py-2 text-sm text-slate-200 disabled:opacity-50 ${portalFocusRing}`}
            >
              ยกเลิก
            </button>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">
            เปลี่ยนเป็น &quot;เปิดโหวต&quot; ใช้เมื่อแก้ข้อความหลังปิดผิดพลาด — ระวังซ้ำกับ flow ปิดมติทางการ
          </p>
        </div>
      ) : null}

      <input
        value={voteAgendaId}
        onChange={(e) => setVoteAgendaId(e.target.value)}
        aria-label="รหัสวาระที่ต้องการลงมติ"
        className={`mt-3 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        placeholder="รหัสวาระสำหรับลงมติ"
      />
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          value={agendaVoterName}
          onChange={(e) => setAgendaVoterName(e.target.value)}
          aria-label="ชื่อผู้ลงมติ"
          className={`rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
          placeholder="ชื่อผู้ลงมติ"
        />
        <select
          value={agendaVote}
          onChange={(e) => setAgendaVote(e.target.value as 'approve' | 'reject' | 'abstain')}
          aria-label="ผลการลงมติ"
          className={`rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        >
          <option value="approve">เห็นชอบ (approve)</option>
          <option value="reject">ไม่เห็นชอบ (reject)</option>
          <option value="abstain">งดออกเสียง (abstain)</option>
        </select>
        <button
          type="button"
          disabled={loading}
          onClick={onCastAgendaVote}
          aria-label="บันทึกผลลงมติวาระ"
          className={`rounded bg-violet-700 px-3 py-2 text-sm text-white disabled:opacity-50 ${portalFocusRing}`}
        >
          บันทึกโหวต
        </button>
      </div>
      {agendaVoteSummary ? (
        <pre className="mt-2 max-h-40 overflow-auto rounded bg-slate-950 p-2 text-[11px] text-slate-300" role="status" aria-live="polite" aria-atomic="true">
          {agendaVoteSummary}
        </pre>
      ) : null}
    </div>
  )
}
