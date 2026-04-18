# Module Progress — 2026-04-17

สรุปเปอร์เซ็นต์ความคืบหน้าเชิง “ความพร้อมใช้งานจริง” ของแต่ละโมดูลตามสถานะโค้ด/เอกสาร/การทดสอบปัจจุบัน

> เกณฑ์คิดโดยรวม: ฟีเจอร์หลัก + UX/a11y + ความสม่ำเสมอข้อความ + เสถียรภาพ CI

**เส้นทางปฏิบัติการแบบต้นจนจบ (checklist):** [`OPERATIONAL_RUNBOOK.md`](./OPERATIONAL_RUNBOOK.md)

## Progress by Module

- หน้า Login / ผูกบัญชี (`/auth/link`): **91%**
  - จุดแข็ง: flow LINE UID + verify/register + ข้อความไทย + error handling + aria-busy/live status สำหรับช่วง verify/register, สถานะการเชื่อมสมาชิก/กู้เซสชันและสถานะ backend ประกาศผลแบบ atomic, ทางลัดหน้าแรกใช้ list semantics ชัดเจนขึ้น, โหมดกรอก LINE UID เองรองรับ pressed/expanded + controls semantics, ปุ่มตรวจสอบผูกบัญชีเชื่อม describedby กับสรุปสถานะคำร้องล่าสุดเพื่อช่วย screen reader และข้อความผลลัพธ์หลักแยก status/alert ได้ชัดขึ้น
  - ค้างหลัก: ทดสอบข้ามอุปกรณ์ครบทุก scenario production
- งานทะเบียนสมาชิก (`/member/*` + update-self): **99%**
  - จุดแข็ง: dashboard/profile/card/statistics + ถ้อยคำ/โฟกัส/aria + member portal มี roving focus สำหรับแท็บและคีย์บอร์ดนำทางครบขึ้น พร้อม setsize/posinset + keyboard help semantics (aria-describedby/keyshortcuts) สำหรับแท็บ, role switch ของพอร์ทัลสมาชิกรองรับ status + describedby ประกาศบทบาท/จำนวนเมนูที่เข้าถึงได้, เมนูพอร์ทัล/ลิงก์ที่เกี่ยวข้อง/รายละเอียด profile/meeting มี list semantics ชัดเจนขึ้น, กลุ่มปุ่มบริจาค/ประวัติบริจาคและเครื่องมือใช้ข้อมูลจากคำร้องล่าสุดมี group semantics ชัดขึ้น และข้อความผลลัพธ์การอัปเดตโปรไฟล์/การเปิด Push รองรับ status/alert แบบ atomic
  - ค้างหลัก: การทดสอบข้อมูลจริงและ edge cases หลังหมุนคีย์/deploy รอบถัดไป
- งานคณะกรรมการ (`/committee/*`): **98%**
  - จุดแข็ง: dashboard/meetings/attendance/voting พร้อมข้อความมาตรฐาน + table/list/aria-busy ครอบคลุมต่อถึง role strip/tooling, empty/search state หลักประกาศผลแบบ live status (atomic), กลุ่มลิงก์ทางลัดแต่ละหน้าแยกเป็น group semantics ชัดขึ้น และเมนูพอร์ทัลอ่านเป็นรายการได้ครบขึ้น รวมถึง empty state การลงมติประกาศผลแบบ atomic สม่ำเสมอ, บล็อกสรุป snapshot/dashboard และสถานะคำขอจ่ายรอดำเนินการประกาศผลแบบ live/atomic ชัดขึ้น, role switch มี status + describedby ประกาศบทบาท/จำนวนเมนูที่เข้าถึงได้ชัดขึ้น
  - ค้างหลัก: เก็บผลทดสอบเชิงบทบาทจริง (chair/member) เพิ่มเติม
- งานโรงเรียนกวดวิชา (`/academy/*`): **98%**
  - จุดแข็ง: หลายหน้าใช้งานได้ + ข้อความ/โฟกัสคีย์บอร์ด + aria roster/progress/section state + core portal semantics ใช้ร่วมกันดีขึ้น, กลุ่มลิงก์ทางลัดในหน้ารายงาน/ฟันเนล/มุมมองบทบาท/สรุปผลการเรียนมี group semantics ชัดขึ้น, บล็อกสรุปตัวเลขสำคัญและ role summary รองรับ live/atomic announcement ชัดขึ้น, role switch มี status + describedby ประกาศบทบาท/จำนวนเมนูที่เข้าถึงได้ชัดขึ้น และรายชื่อ/bullet/empty state + เมนูพอร์ทัลมี semantics ครบขึ้น พร้อม live status แบบ atomic ในจุดสำคัญ
  - ค้างหลัก: ตรวจความลื่นไหลบนจอเล็กและข้อมูลจริงมากขึ้น
- งานคำร้อง (`/requests`): **99%**
  - จุดแข็ง: workflow ชัด, filter/search/activity log, aria-label + live region + loading/list semantics ครอบคลุมขึ้น, ปุ่มโหมด/ตัวกรองหลักรองรับ aria-pressed, summary cards และ activity summary ปรับเป็น status + live/atomic announcement สม่ำเสมอขึ้น, ตัวเลขสำคัญในแผงคำร้องหลัก/summary cards รวมถึง activity severity badges ใช้รูปแบบ `th-TH` สม่ำเสมอขึ้น, บล็อกเทมเพลตเหตุผลและคำสั่งอนุมัติ/ปฏิเสธในแผงรายละเอียดมี group semantics ชัดขึ้น, เครื่องมือส่งออก/คัดลอกและคำสั่งด่วนจาก activity cards แยก group semantics ชัดขึ้น, ปุ่มเปิดรายละเอียดรวมถึงการ์ดกิจกรรมรองรับ expanded/controls + key shortcuts เชื่อมกับ detail panel, รายการที่เลือกปัจจุบันมี current semantics ชัดขึ้น, แผงรายละเอียดเป็น region พร้อม label และ empty/loading/action-history status ใช้ atomic live announcement สม่ำเสมอขึ้น
  - ค้างหลัก: smoke test manual cross-device เพิ่มหลักฐานรอบปิด
- งาน Admin (import/cram/school activities): **98%**
  - จุดแข็ง: API flow ครบ, key messaging มาตรฐาน, controls + table/list/loading semantics + empty state/live status ครอบคลุมขึ้น, ฟอร์มแก้ไขกิจกรรมรองรับ expanded/controls + region semantics พร้อม group semantics ในชุดคำสั่งบันทึก/ยกเลิกและแก้ไข/ลบ, สถานะไฟล์นำเข้า/ข้อความผลลัพธ์แยก status/alert ได้ชัดขึ้น, ลิงก์ดาวน์โหลดเทมเพลตนำเข้าและคำสั่งจัดการนักเรียนแยกเป็น group semantics ชัดขึ้น และส่วนห้องเรียน/นักเรียนรองรับ atomic live status สม่ำเสมอขึ้น พร้อมประกาศสรุปจำนวนห้อง/นักเรียนของห้องที่เลือกแบบ live
  - ค้างหลัก: field-level QA บาง placeholder และข้อมูลจริง production-like
- งานบัญชี (`/admin` finance): **99%**
  - จุดแข็ง: reports/exports/payment approvals/meeting sessions พร้อมและข้อความสอดคล้องขึ้น + live region แยกเฉพาะสถานะสำคัญและ semantics ครอบคลุมเพิ่ม รวมถึง empty state ของ activity/report lists, filter/preset/overview มี group-status semantics, สรุปตัวกรองกิจกรรมประกาศผลแบบ live/atomic ชัดขึ้น พร้อมแยกกลุ่มพรีเซ็ต/ระดับตัวกรองให้ screen reader นำทางง่ายขึ้น, ปุ่มตัวกรองกิจกรรมมี aria-pressed, ปุ่มเรียงลำดับรายงานบอกสถานะ active ชัดขึ้น, ตัวแบ่งหน้ารายงานประกาศหน้าปัจจุบันแบบ live/atomic, เครื่องมือคำสั่งลงชื่อ/สรุปประชุมแยกเป็น group semantics ชัดขึ้น, ตัวเลขสรุปเงินบริจาคและเวลารีเฟรชในแถบรีเฟรชใช้ live+locale `th-TH` สม่ำเสมอ และข้อความผลลัพธ์หลักรองรับ alert/atomic ครบขึ้น
  - ค้างหลัก: QA scenario การเงินเชิงธุรกิจจริง (policy edge cases, long-run ops)

## งานถัดไป (แนะนำ)

1. **ปฏิบัติตาม** [`OPERATIONAL_RUNBOOK.md`](./OPERATIONAL_RUNBOOK.md) (เส้นทางองค์กรต้นจนจบ) และปิด checklist ใน [`SMOKE_TEST_EXECUTION_2026-04-17.md`](./SMOKE_TEST_EXECUTION_2026-04-17.md) บนอุปกรณ์จริง
2. **งานบัญชี/การเงิน:** เก็บ QA เชิงธุรกิจ (policy edge cases, ปิดงวดระยะยาว); ถ้าแก้แผงการเงินบ่อย พิจารณาแยก `AdminFinancePanel` เป็น subcomponents ทีหลัง
3. รายละเอียดฟีเจอร์ที่ merge แล้ว (ประชุม, minutes, เอกสาร, journals, ฯลฯ) อยู่ใน **Core Work Update** ด้านล่าง

## Core Work Update (เริ่มเฟสงานหลัก)

- เพิ่ม API งานหลักวาระประชุมและโหวตใน `backend/src/routes/financeAdmin.ts`
  - `GET /api/admin/finance/meeting-agendas` (filter ตาม `scope/status/meeting_session_id`)
  - `POST /api/admin/finance/meeting-agendas` (สร้างหัวข้อประชุม)
  - `PATCH /api/admin/finance/meeting-agendas/:id` (แก้หัวข้อ/รายละเอียด/สถานะ)
  - `POST /api/admin/finance/meeting-agendas/:id/votes` (ลงมติแบบระบุชื่อผู้โหวตหรือ app user)
  - `GET /api/admin/finance/meeting-agendas/:id/vote-summary` (สรุปผลโหวต + quorum/majority)
  - `POST /api/admin/finance/meeting-agendas/:id/close` (ปิดวาระและสรุปมติ)
- เพิ่ม API งานหลักบันทึกรายงานการประชุม (minutes)
  - `GET /api/admin/finance/meeting-sessions/:id/minutes`
  - `POST /api/admin/finance/meeting-sessions/:id/minutes`
  - `GET /api/admin/finance/meeting-sessions/:id/minutes.txt` (ดาวน์โหลดรายงานประชุม)
- เพิ่มเครื่องมือใน `frontend/src/components/AdminFinancePanel.tsx` ให้ใช้งานงานหลักได้ทันที:
  - สร้างวาระ
  - โหลด/กรองรายการวาระ
  - เลือกวาระเพื่อดูสรุปผลโหวต
  - ลงมติและปิดโหวต
  - บันทึก/โหลด/ดาวน์โหลดรายงานการประชุม
- เพิ่ม migration `supabase/migrations/20260417153000_meeting_agenda_vote_workflow.sql` เพื่อรองรับ workflow นี้:
  - ผูกวาระกับ `meeting_sessions`
  - รองรับผู้โหวตแบบระบุชื่อ (`voter_name`, `voter_role_code`) เมื่อไม่มี `app_user_id`
  - เพิ่มคอลัมน์เก็บ minutes ใน `meeting_sessions`
- เพิ่มระบบเอกสารประชุม (documents) ระดับงานหลัก
  - Migration ใหม่ `supabase/migrations/20260417164000_meeting_documents.sql` เพิ่มตาราง `meeting_documents`
  - API ใหม่ใน `backend/src/routes/financeAdmin.ts`
    - `GET /api/admin/finance/meeting-documents`
    - `POST /api/admin/finance/meeting-documents`
    - `PATCH /api/admin/finance/meeting-documents/:id`
    - `DELETE /api/admin/finance/meeting-documents/:id`
    - `GET /api/admin/finance/meeting-documents/:id/download.txt`
  - หน้า `frontend/src/components/AdminFinancePanel.tsx` เพิ่มเครื่องมือเพิ่ม/โหลด/เปิดลิงก์/ดาวน์โหลด/ลบเอกสาร และผูกเอกสารกับ `meeting_session_id`/`agenda_id`
- เชื่อมงานหลักเอกสารเข้าพอร์ทัลคณะกรรมการ (ฝั่งใช้งานจริง)
  - `backend/src/lib/portalFromDb.ts` เติมข้อมูล `meetingDocuments` ใน snapshot `/api/portal/committee`
  - `backend/src/routes/portal.ts` เพิ่ม `GET /api/portal/committee/documents/:id/download.txt`
  - `frontend/src/portal/committeePages.tsx` แสดงรายการเอกสารประชุมล่าสุด พร้อมปุ่มดาวน์โหลด `.txt` และเปิดลิงก์เอกสาร
- เชื่อมงานหลัก “ลงมติจริง” เข้าพอร์ทัลคณะกรรมการ
  - `backend/src/routes/portal.ts` เพิ่ม
    - `POST /api/portal/committee/agendas/:id/vote`
    - `GET /api/portal/committee/agendas/:id/vote-summary`
  - `frontend/src/portal/committeePages.tsx` หน้า `committee/voting` รองรับกรอกชื่อผู้ลงมติ เลือกผลโหวต บันทึกผลจริง และดูสรุปคะแนนรายวาระ
- เพิ่มการสะท้อนสถานะปิดประชุมและรายงานประชุมในพอร์ทัลคณะกรรมการ
  - `backend/src/lib/portalFromDb.ts` เติม `recentMinutes` และ `meetingOverview` (open/closed agendas, document/minutes counts)
  - `backend/src/routes/portal.ts` เพิ่ม `GET /api/portal/committee/meetings/:id/minutes.txt`
  - `frontend/src/portal/committeePages.tsx`
    - หน้า `committee/meetings` แสดงรายงานประชุมล่าสุดพร้อมปุ่มดาวน์โหลด minutes
    - หน้า `committee/dashboard` แสดงสรุปวาระปิดแล้ว + จำนวนเอกสาร/รายงานที่เผยแพร่
- เพิ่ม snapshot contract งานประชุมให้ครบขึ้น
  - `CommitteePortalData` มี `recentMinutes` และ `meetingOverview`
  - `backend/src/app.test.ts` เพิ่ม assertion ฟิลด์ใหม่เพื่อกัน regression
- เพิ่ม workflow เผยแพร่สู่พอร์ทัล (publish/unpublish)
  - migration `supabase/migrations/20260417173000_meeting_publish_flags.sql` เพิ่ม
    - `meeting_documents.published_to_portal`
    - `meeting_sessions.minutes_published`
  - `frontend/src/components/AdminFinancePanel.tsx` รองรับปุ่มเผยแพร่/ซ่อนสำหรับเอกสารและรายงานการประชุม
  - `backend/src/routes/portal.ts` เปิดให้ดาวน์โหลดเฉพาะข้อมูลที่เผยแพร่แล้ว
- ปิด flow หลังปิดวาระให้เห็นผลมติครบในพอร์ทัลคณะกรรมการ
  - `backend/src/lib/portalFromDb.ts` เพิ่ม `closedAgendaResults` (นับ approve/reject/abstain + ตรวจ majority/quorum + ระบุผลผ่าน/ไม่ผ่าน)
  - `backend/src/data/portalSnapshot.ts` และ `frontend/src/portal/dataAdapter.ts` เพิ่ม contract ใหม่สำหรับ `closedAgendaResults`
  - `frontend/src/portal/committeePages.tsx`
    - หน้า `committee/meetings` แสดงรายการผลมติวาระที่ปิดแล้วล่าสุด พร้อมคะแนนและสถานะองค์ประชุม
    - หน้า `committee/dashboard` แสดง “มติล่าสุด” ในงานด่วนวันนี้
- เพิ่ม flow “ปิดงวดบัญชี + ส่งผู้ตรวจสอบบัญชี”
  - migration `supabase/migrations/20260417190000_finance_period_closings.sql` เพิ่มตาราง `finance_period_closings` เพื่อเก็บประวัติปิดงวดพร้อม snapshot งบทดลอง
  - `backend/src/routes/financeAdmin.ts` เพิ่ม
    - `GET /api/admin/finance/reports/trial-balance`
    - `GET /api/admin/finance/exports/auditor-package.csv`
    - `GET /api/admin/finance/period-closing`
    - `POST /api/admin/finance/period-closing`
  - `frontend/src/components/AdminFinancePanel.tsx` เพิ่ม
    - โหลดและแสดง Trial Balance
    - ฟอร์มปิดงวดบัญชี (เลือกหน่วยงาน + ช่วงวัน + ผู้ปิดงวด + หมายเหตุ)
    - ตารางประวัติปิดงวด และปุ่มส่งออก Auditor Package CSV
- เพิ่ม export รายงวดจาก snapshot ปิดงวด (immutable handoff)
  - `backend/src/routes/financeAdmin.ts` เพิ่ม `GET /api/admin/finance/period-closing/:id/auditor-package.csv`
  - `frontend/src/components/AdminFinancePanel.tsx` เพิ่มปุ่ม Export ต่อแถวในตารางประวัติปิดงวด เพื่อส่งไฟล์ผู้ตรวจสอบของงวดนั้นโดยตรง
- เพิ่ม API/หน้าตรวจสอบรายละเอียดงวดปิดบัญชี
  - `backend/src/routes/financeAdmin.ts` เพิ่ม `GET /api/admin/finance/period-closing/:id` (ดึง snapshot trial balance + สถานะสมดุลเดบิต/เครดิต)
  - `frontend/src/components/AdminFinancePanel.tsx` เพิ่มปุ่ม `Detail` ต่อแถวและ panel แสดงรายการบัญชี snapshot ของงวดที่เลือกก่อนส่งผู้ตรวจสอบ
- เพิ่มสถานะ handoff ผู้ตรวจสอบในระดับงวด
  - migration `supabase/migrations/20260417200000_finance_period_auditor_handoff.sql` เพิ่มฟิลด์สถานะส่งผู้ตรวจสอบ (`pending/sent`) และข้อมูลผู้ส่ง/เวลา/หมายเหตุ
  - `backend/src/routes/financeAdmin.ts` เพิ่ม `POST /api/admin/finance/period-closing/:id/mark-auditor-sent`
  - `frontend/src/components/AdminFinancePanel.tsx` เพิ่มปุ่ม `Mark sent` และ badge สถานะต่อแถวงวด พร้อมแสดงในรายละเอียดงวด
- ปิดงาน workflow ผู้ตรวจสอบครบวงจร (ส่งแล้ว -> ปิดงาน)
  - migration `supabase/migrations/20260417210000_finance_period_auditor_completed.sql` เพิ่มฟิลด์ `auditor_completed_at/by/note` และขยายสถานะเป็น `pending/sent/completed`
  - `backend/src/routes/financeAdmin.ts` เพิ่ม `POST /api/admin/finance/period-closing/:id/mark-auditor-completed` และรองรับ query `auditor_handoff_status` ใน `GET /period-closing`
  - `frontend/src/components/AdminFinancePanel.tsx` เพิ่มฟิลเตอร์สถานะงวด, ปุ่ม `Mark completed`, และสรุปจำนวนงวดที่ปิดงานแล้ว
- เพิ่มแกนระบบสมุดรายวันมาตรฐาน (Double-Entry + Audit Trail + Reversing Entry)
  - migration `supabase/migrations/20260417213000_accounting_journal_controls.sql` เพิ่ม
    - สถานะเอกสาร `journal_entries.status` (`draft/posted/voided`) พร้อมข้อมูล `posted_*`, `voided_*`, `reversed_from_journal_id`
    - ตาราง `audit_logs` สำหรับเก็บผู้กระทำ/เหตุการณ์/เป้าหมาย/timestamp
    - trigger บังคับแก้ `journal_lines` ได้เฉพาะเอกสาร `draft` (immutable หลังโพสต์)
    - trigger บังคับก่อน `post`: ต้องมีรายการและ `sum(debit)=sum(credit)` เท่านั้น
    - trigger กันการแก้ไข/ลบเอกสารหลังโพสต์ ยกเว้นเปลี่ยนสถานะเป็น `voided` พร้อมเงื่อนไข
  - `backend/src/routes/financeAdmin.ts` เพิ่ม API งานหลักสมุดรายวัน
    - `GET /api/admin/finance/journals`
    - `GET /api/admin/finance/journals/:id`
    - `POST /api/admin/finance/journals` (สร้าง draft)
    - `POST /api/admin/finance/journals/:id/lines` (เพิ่มเดบิต/เครดิต)
    - `POST /api/admin/finance/journals/:id/post` (โพสต์เอกสาร)
    - `POST /api/admin/finance/journals/:id/void` (ยกเลิกด้วย reversing entry อัตโนมัติ)
- เพิ่มรายงานงบการเงินหลักครบชุดจากสมุดรายวัน
  - `backend/src/routes/financeAdmin.ts` เพิ่ม
    - `GET /api/admin/finance/reports/general-ledger` (ต้องระบุ `account_code`, รองรับช่วงวันที่)
    - `GET /api/admin/finance/reports/income-statement` (สรุปรายได้/ค่าใช้จ่าย/กำไรสุทธิ)
    - `GET /api/admin/finance/reports/balance-sheet` (สินทรัพย์/หนี้สิน/ทุน ณ วัน `as_of`)
  - `backend/src/app.ts` อัปเดต service index ให้ประกาศ endpoint รายงานใหม่ครบ
- บังคับหมวดวัตถุประสงค์คำขอจ่ายเงินเพื่อรองรับ audit policy
  - migration `supabase/migrations/20260418000000_payment_request_purpose_category.sql` เพิ่มคอลัมน์ `payment_requests.purpose_category` พร้อม check constraint
  - `backend/src/util/financePolicy.ts` เพิ่ม helper ระบุ/อนุมาน `purpose_category` และชุดหมวดที่ถือเป็นค่าใช้จ่ายปกติธุระ
  - `backend/src/routes/financeAdmin.ts` บังคับว่า `<= 20,000` ต้องเป็นหมวดปกติธุระเท่านั้น (reject เมื่อเป็น `other`)
- เพิ่ม workflow รอบปีบัญชีและปิดปี (Year-end Closing)
  - migration `supabase/migrations/20260418003000_fiscal_years.sql` เพิ่มตาราง `fiscal_years` เพื่อเก็บรอบปีบัญชีและสถานะการปิดงวดปลายปี
  - `backend/src/routes/financeAdmin.ts` เพิ่ม
    - `GET /api/admin/finance/fiscal-years`
    - `POST /api/admin/finance/fiscal-years`
    - `POST /api/admin/finance/fiscal-years/:id/close` (สร้าง closing journal อัตโนมัติและโอนเข้าบัญชีกองทุนสะสม)
  - `backend/src/app.ts` อัปเดต service index ให้ประกาศ endpoint fiscal year ใหม่
- เพิ่มโมดูลสินทรัพย์ถาวรและค่าเสื่อมรายเดือน
  - migration `supabase/migrations/20260418011000_fixed_assets.sql` เพิ่มตาราง `fixed_assets` และ `fixed_asset_depreciations`
  - `backend/src/routes/financeAdmin.ts` เพิ่ม
    - `GET /api/admin/finance/fixed-assets`
    - `POST /api/admin/finance/fixed-assets`
    - `POST /api/admin/finance/fixed-assets/run-depreciation` (สร้าง/โพสต์ journal ค่าเสื่อม + บันทึกประวัติ)
  - เพิ่ม util และ unit tests:
    - `backend/src/util/fixedAsset.ts`
    - `backend/src/util/fixedAsset.test.ts`
- เพิ่ม Thai Tax layer (VAT/WHT) ในคำขอจ่ายเงิน
  - migration `supabase/migrations/20260418010000_payment_request_tax_fields.sql` เพิ่มฟิลด์ `vat_rate/wht_rate/vat_amount/wht_amount/taxpayer_id`
  - `backend/src/routes/financeAdmin.ts`
    - คำนวณภาษีตอนสร้าง `payment_requests`
    - `POST /api/admin/finance/tax/calculate`
    - `GET /api/admin/finance/reports/tax-monthly`
    - export `payment-requests.csv` รวมคอลัมน์ภาษี
  - เพิ่ม util และ unit tests:
    - `backend/src/util/tax.ts`
    - `backend/src/util/tax.test.ts`
