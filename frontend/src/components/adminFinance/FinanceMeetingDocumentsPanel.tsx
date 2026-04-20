import type { Dispatch, SetStateAction } from 'react'
import type { MeetingDocumentItem } from '../../lib/adminFinanceTypes'
import { portalFocusRing } from '../../portal/portalLabels'

export type FinanceMeetingDocumentsPanelProps = {
  loading: boolean
  documents: MeetingDocumentItem[]
  documentTitle: string
  setDocumentTitle: Dispatch<SetStateAction<string>>
  documentMeetingId: string
  setDocumentMeetingId: Dispatch<SetStateAction<string>>
  documentAgendaId: string
  setDocumentAgendaId: Dispatch<SetStateAction<string>>
  documentUrl: string
  setDocumentUrl: Dispatch<SetStateAction<string>>
  documentText: string
  setDocumentText: Dispatch<SetStateAction<string>>
  onCreateMeetingDocument: () => void
  onLoadMeetingDocuments: () => void
  onDownloadMeetingDocumentTxt: (docId: string) => void
  onToggleMeetingDocumentPublished: (docId: string, published: boolean) => void
  onBeginPatchMeetingDocument: (doc: MeetingDocumentItem) => void
  onDeleteMeetingDocument: (docId: string) => void
  documentPatchId: string
  documentPatchTitle: string
  setDocumentPatchTitle: Dispatch<SetStateAction<string>>
  documentPatchMeetingId: string
  setDocumentPatchMeetingId: Dispatch<SetStateAction<string>>
  documentPatchAgendaId: string
  setDocumentPatchAgendaId: Dispatch<SetStateAction<string>>
  documentPatchUrl: string
  setDocumentPatchUrl: Dispatch<SetStateAction<string>>
  documentPatchText: string
  setDocumentPatchText: Dispatch<SetStateAction<string>>
  onSavePatchMeetingDocument: () => void
  onCancelPatchMeetingDocument: () => void
}

export function FinanceMeetingDocumentsPanel({
  loading,
  documents,
  documentTitle,
  setDocumentTitle,
  documentMeetingId,
  setDocumentMeetingId,
  documentAgendaId,
  setDocumentAgendaId,
  documentUrl,
  setDocumentUrl,
  documentText,
  setDocumentText,
  onCreateMeetingDocument,
  onLoadMeetingDocuments,
  onDownloadMeetingDocumentTxt,
  onToggleMeetingDocumentPublished,
  onBeginPatchMeetingDocument,
  onDeleteMeetingDocument,
  documentPatchId,
  documentPatchTitle,
  setDocumentPatchTitle,
  documentPatchMeetingId,
  setDocumentPatchMeetingId,
  documentPatchAgendaId,
  setDocumentPatchAgendaId,
  documentPatchUrl,
  setDocumentPatchUrl,
  documentPatchText,
  setDocumentPatchText,
  onSavePatchMeetingDocument,
  onCancelPatchMeetingDocument,
}: FinanceMeetingDocumentsPanelProps) {
  return (
    <div className="mt-4 rounded border border-slate-800 bg-slate-950/50 p-3" role="group" aria-label="เครื่องมือจัดการเอกสารประชุม">
      <h4 className="text-xs font-medium uppercase tracking-wide text-slate-300">1.2) เอกสารประชุม</h4>
      <p className="mt-1 text-[11px] text-slate-500" role="status" aria-live="polite" aria-atomic="true">
        เอกสารที่โหลดแล้ว {documents.length.toLocaleString('th-TH')} รายการ
      </p>
      <input
        value={documentTitle}
        onChange={(e) => setDocumentTitle(e.target.value)}
        aria-label="ชื่อเอกสารประชุม"
        className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        placeholder="ชื่อเอกสาร"
      />
      <input
        value={documentMeetingId}
        onChange={(e) => setDocumentMeetingId(e.target.value)}
        aria-label="รหัสรอบประชุมสำหรับเอกสาร"
        className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        placeholder="meeting_session_id (ถ้ามี)"
      />
      <input
        value={documentAgendaId}
        onChange={(e) => setDocumentAgendaId(e.target.value)}
        aria-label="รหัสวาระสำหรับเอกสาร"
        className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        placeholder="agenda_id (ถ้ามี)"
      />
      <input
        value={documentUrl}
        onChange={(e) => setDocumentUrl(e.target.value)}
        aria-label="ลิงก์เอกสารประชุม"
        className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        placeholder="ลิงก์เอกสาร (https://...)"
      />
      <textarea
        value={documentText}
        onChange={(e) => setDocumentText(e.target.value)}
        aria-label="เนื้อหาเอกสารประชุมแบบข้อความ"
        className={`mt-2 h-24 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        placeholder="เนื้อหาเอกสารแบบข้อความ (ใช้แทนไฟล์ได้)"
      />
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="คำสั่งเพิ่มและโหลดเอกสารประชุม">
        <button
          type="button"
          disabled={loading}
          onClick={onCreateMeetingDocument}
          aria-label="เพิ่มเอกสารประชุมใหม่"
          className={`rounded bg-fuchsia-700 px-3 py-2 text-sm text-white disabled:opacity-50 ${portalFocusRing}`}
        >
          เพิ่มเอกสาร
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onLoadMeetingDocuments}
          aria-label="โหลดรายการเอกสารประชุม"
          className={`rounded bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-50 ${portalFocusRing}`}
        >
          โหลดเอกสาร
        </button>
      </div>

      <div className="mt-3 max-h-40 overflow-auto rounded border border-slate-800 p-2 text-xs" role="list" aria-label="รายการเอกสารประชุม">
        {documents.length === 0 ? (
          <p className="text-slate-500" role="status" aria-live="polite" aria-atomic="true">
            ยังไม่มีเอกสารในตัวกรองนี้
          </p>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="mb-2 rounded border border-slate-800 p-2" role="listitem">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-200">{doc.title}</span>
                <span className="text-[11px] text-slate-500">
                  {doc.scope} · {doc.published_to_portal ? 'เผยแพร่แล้ว' : 'ยังไม่เผยแพร่'}
                </span>
              </div>
              <p className="mt-1 break-all text-[11px] text-slate-500">{doc.id}</p>
              {doc.document_url ? (
                <a
                  href={doc.document_url}
                  target="_blank"
                  rel="noreferrer"
                  className={`mt-1 inline-flex text-[11px] text-fuchsia-300 underline ${portalFocusRing}`}
                  aria-label={`เปิดลิงก์เอกสาร ${doc.title}`}
                >
                  เปิดลิงก์เอกสาร
                </a>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void onDownloadMeetingDocumentTxt(doc.id)}
                  aria-label={`ดาวน์โหลดเอกสาร ${doc.title} เป็นไฟล์ข้อความ`}
                  className={`rounded bg-slate-700 px-2 py-1 text-[11px] text-white disabled:opacity-50 ${portalFocusRing}`}
                >
                  ดาวน์โหลด .txt
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void onToggleMeetingDocumentPublished(doc.id, !doc.published_to_portal)}
                  aria-label={`${doc.published_to_portal ? 'ซ่อน' : 'เผยแพร่'}เอกสาร ${doc.title}`}
                  className={`rounded bg-violet-700 px-2 py-1 text-[11px] text-white disabled:opacity-50 ${portalFocusRing}`}
                >
                  {doc.published_to_portal ? 'ซ่อนจากพอร์ทัล' : 'เผยแพร่สู่พอร์ทัล'}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onBeginPatchMeetingDocument(doc)}
                  aria-label={`แก้ไขเอกสาร ${doc.title}`}
                  className={`rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200 disabled:opacity-50 ${portalFocusRing}`}
                >
                  แก้ไข
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void onDeleteMeetingDocument(doc.id)}
                  aria-label={`ลบเอกสาร ${doc.title}`}
                  className={`rounded bg-rose-700 px-2 py-1 text-[11px] text-white disabled:opacity-50 ${portalFocusRing}`}
                >
                  ลบ
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {documentPatchId ? (
        <div className="mt-3 rounded border border-cyan-900/50 bg-slate-950/80 p-3" role="group" aria-label="แก้ไขเอกสารประชุมที่เลือก">
          <p className="text-[11px] text-cyan-200/90">แก้ไขเอกสาร: {documentPatchId}</p>
          <input
            value={documentPatchTitle}
            onChange={(e) => setDocumentPatchTitle(e.target.value)}
            aria-label="ชื่อเอกสาร (แก้ไข)"
            className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
          />
          <input
            value={documentPatchMeetingId}
            onChange={(e) => setDocumentPatchMeetingId(e.target.value)}
            aria-label="รหัสรอบประชุม (แก้ไข)"
            className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
            placeholder="meeting_session_id (ว่างได้)"
          />
          <input
            value={documentPatchAgendaId}
            onChange={(e) => setDocumentPatchAgendaId(e.target.value)}
            aria-label="รหัสวาระ (แก้ไข)"
            className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
            placeholder="agenda_id (ว่างได้)"
          />
          <input
            value={documentPatchUrl}
            onChange={(e) => setDocumentPatchUrl(e.target.value)}
            aria-label="ลิงก์เอกสาร (แก้ไข)"
            className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
            placeholder="ลิงก์เอกสาร (https://...)"
          />
          <textarea
            value={documentPatchText}
            onChange={(e) => setDocumentPatchText(e.target.value)}
            aria-label="เนื้อหาเอกสาร (แก้ไข)"
            className={`mt-2 h-24 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
            placeholder="เนื้อหาแบบข้อความ"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void onSavePatchMeetingDocument()}
              aria-label="บันทึกการแก้ไขเอกสารประชุม"
              className={`rounded bg-fuchsia-700 px-3 py-2 text-sm text-white disabled:opacity-50 ${portalFocusRing}`}
            >
              บันทึกการแก้ไข
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onCancelPatchMeetingDocument}
              aria-label="ยกเลิกการแก้ไขเอกสาร"
              className={`rounded border border-slate-600 px-3 py-2 text-sm text-slate-200 disabled:opacity-50 ${portalFocusRing}`}
            >
              ยกเลิก
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
