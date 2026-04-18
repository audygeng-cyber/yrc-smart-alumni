# Accounting Flow (เบื้องต้น)

## บทบาทของระบบเทียบโปรแกรมบัญชีสำเร็จรูป (บันทึกในระบบ 2026-04-18)

โมดูลบัญชีใน **YRC Smart Alumni** ออกแบบให้เป็นการ **บันทึกรายรับ–รายจ่าย** ของ **สมาคมศิษย์เก่ายุพราชวิทยาลัย** และ **โรงเรียนกวดวิชา** โดย **แยกบัญชีกัน** ตามหน่วยงาน (`legal_entities` / `association` vs `cram_school`) ผู้ดูแล (Admin) ใช้งานในลักษณะเดียวกับโปรแกรมบัญชีสำเร็จรูปมาตรฐานทั่วไป (เช่น FlowAccount, Peak ฯลฯ): มีโครงสร้างมาตรฐานที่ซอฟต์แวร์บัญชีสำเร็จรูปมักมี — สมุดรายวัน, ผังบัญชี, คำขอจ่าย, รายงาน, ส่งออก

**ขอบเขตผลิตภัณฑ์:** ระบบนี้เน้นระดับ **ผู้ใช้บันทึกและส่งออกข้อมูล** รายละเอียดที่บันทึกได้ควร **ส่งออกเป็น Excel/CSV** (รวมชุดส่งผู้ตรวจ) เพื่อให้ **ผู้ตรวจสอบบัญชีภายนอก** นำไป **ปิดงบการเงินตามกฎหมาย/มาตรฐานวิชาชีพ** ในเครื่องมือของผู้ตรวจเอง — **ไม่ได้ออกแบบให้ระบบนี้แทนขั้นตอนปิดงบฯ ครบวงจรในระดับผู้สอบบัญชี** โดยตรง

**หน้า Admin:** อาจพัฒนา **โครงสร้างและ workflow ก่อน** แล้วค่อยปรับ **หน้าการใช้งาน/UX** ให้ละเอียดภายหลังเมื่อโครงการทำงานหลักนิ่ง

เกณฑ์เทคนิค (double-entry, audit trail, ฯลฯ) ยังคงตาม [`.cursorrules`](../.cursorrules)

---

## หลักการที่กำหนด

- แยกหน่วยงานบัญชีเป็น 2 ส่วน:
  - `association` (สมาคมศิษย์เก่า)
  - `cram_school` (โรงเรียนกวดวิชา)
- กติกาอนุมัติจ่ายเงิน:
  - ยอด **ไม่เกิน 20,000 บาท**: อนุมัติโดยกรรมการ **3 ใน 5** และใช้ได้เฉพาะค่าใช้จ่ายปกติธุระ เช่น ค่าไฟฟ้า ค่าประปา ค่าอินเทอร์เนต ค่าจ้างเจ้าหน้าที่ ค่าแม่บ้านทำความสะอาด ค่าเครื่องใช้ประจำสำนักงาน และค่ารับรอง
  - ยอด **เกิน 20,000 บาท**: อนุมัติโดยคณะกรรมการ **35 คน**
- ผู้มีอำนาจสั่งจ่ายเงิน: กรรมการ **3 ใน 5 คน** จากคณะกรรมการ 35 คน
- ผู้มีอำนาจสั่งจ่ายเงิน 3 ใน 5:
  - ต้องเป็นผู้มีชื่อหลังสมุดเงินฝากธนาคาร
  - ต้องเป็นผู้ทำธุรกรรม KBiz
- บัญชีธนาคารของทั้งสองหน่วยงานรองรับผู้ลงนาม 5 คน ใช้ 3 ใน 5 และรองรับการโอนผ่าน K PLUS Biz (`kbiz_enabled`, `bank_account_signers`)
- องค์ประชุมทั้งสองหน่วยงานใช้เกณฑ์ **2 ใน 3 ของผู้มีสิทธิ์เข้าร่วมประชุม**

### บัญชีกับการอนุมัติจ่าย (สายงานเดียว)

**ข้อความอ้างอิงสำหรับทีม:** บัญชี = ความถูกต้องและหลักฐาน; การอนุมัติ = อำนาจจ่าย — ควรผูกเป็นสายเดียว โดยให้ระบบบัญชีเป็นต้นทางของคำขอจ่าย ไม่ใช่สองระบบคีย์แยกกัน

- **ชั้นบัญชี** รับผิดชอบความถูกต้องของยอด การจัดหมวด และหลักฐานที่สอดคล้องกับรายการ (double-entry, audit trail)
- **ชั้นอนุมัติ** รับผิดชอบอำนาจจ่ายตามนโยบาย (3 ใน 5 / คณะ 35 / องค์ประชุม ฯลฯ) โดยไม่ควรแทนที่การบันทึกบัญชี
- **ทิศทางผลิตภัณฑ์:** คำขอจ่ายควร **ออกจากหรือสัมพันธ์กับ** งานบัญชี (เช่น ร่างรายการสมุดรายวัน / รายการรอจ่าย) เพื่อลดการกรอกซ้ำและลดความคลาดเคลื่อนระหว่าง “ตัวเลขในบัญชี” กับ “ตัวเลขที่ขออนุมัติ” — การมีทั้งโมดูลบัญชีและโมดูลอนุมัติในระบบเดียวกันไม่ใช่ปัญหา ปัญหาคือ **ข้อมูลสองชุดที่ไม่ได้ผูกกัน**

## โครงข้อมูลที่เพิ่ม

- `legal_entities` หน่วยงานบัญชี
- `bank_accounts` บัญชีธนาคาร + กติกาผู้ลงนาม
- `payment_requests` คำขอจ่ายเงิน + policy ที่ผูกกับ threshold
- `payment_request_approvals` รายการอนุมัติ/ปฏิเสธรายคน
- `meeting_sessions`, `meeting_attendance` ลงชื่อเข้าประชุมทาง LINE / manual
- `account_chart`, `journal_entries`, `journal_lines` โครงบัญชีแบบ double-entry
- `school_activities.fund_scope` + `target_amount` — แยก **กองโรงเรียนยุพราชวิทยาลัย** (`yupparaj_school`) ออกจากนิติบุคคลสมาคม/กวดวิชา; บริจาคกองยุพราชบันทึกใน `donations` พร้อม `fund_scope` และ snapshot ชื่อ–รุ่น (`donor_*`) สำหรับรายงาน

## API เบื้องต้น (Admin)

> ตอนนี้ endpoint กลุ่มนี้อยู่ใต้ `Admin key (x-admin-key)` เพื่อทดสอบ flow ก่อนระบบ token/role สมบูรณ์

- `GET /api/admin/finance/overview`
  - ดูภาพรวมคำขอจ่ายเงินค้าง + สรุปยอดบริจาครายรุ่น
- `POST /api/admin/finance/payment-requests`
  - สร้างคำขอจ่ายเงิน (ระบบเลือก rule ให้อัตโนมัติตามยอด)
  - body ตัวอย่าง:
    - `legal_entity_code`: `association` หรือ `cram_school`
    - `purpose`
    - `purpose_category`: `electricity|water|internet|staff_wage|cleaning|office_supply|hospitality|other`
    - `amount`
    - `requested_by`
    - `bank_account_id` (จำเป็นเมื่อยอด <= 20,000)
    - `meeting_session_id` (จำเป็นเมื่อยอด > 20,000)
    - `journal_entry_id` (ไม่บังคับ — ผูกกับสมุดรายวันต้นทาง ต้องเป็นหน่วยงานเดียวกัน และเอกสาร journal ต้องไม่ถูก void)
  - กฎบังคับ:
    - ยอด <= 20,000 ต้องเป็น `purpose_category` กลุ่มปกติธุระเท่านั้น (`electricity|water|internet|staff_wage|cleaning|office_supply|hospitality`)
    - ถ้าไม่ส่ง `purpose_category` ระบบจะพยายาม infer จากข้อความ `purpose` และจะ reject หากได้ค่า `other`
- `POST /api/admin/finance/payment-requests/:id/approve`
  - บันทึกการอนุมัติ/ปฏิเสธ
  - body ตัวอย่าง:
    - `approver_name`
    - `approver_signer_id` (แนะนำสำหรับกติกา 3 ใน 5 เพื่อกันปัญหาชื่อซ้ำ/encoding)
    - `approver_role_code`: `bank_signer_3of5` หรือ `committee`
    - `decision`: `approve` / `reject`
- `POST /api/admin/finance/meeting-sessions`
  - สร้างการประชุม (กำหนด expected participants เพื่อคำนวณ quorum 2/3)
- `POST /api/admin/finance/meeting-sessions/:id/sign-attendance`
  - ลงชื่อเข้าประชุม (รองรับ `line_uid`)
- `GET /api/admin/finance/meeting-sessions/:id/summary`
  - ดู attendees, quorum required, majority required
- `GET /api/admin/finance/fiscal-years`
  - ดูรอบปีบัญชีทั้งหมด (กรอง `legal_entity_code` ได้)
- `POST /api/admin/finance/fiscal-years`
  - สร้างรอบปีบัญชีใหม่ (`fiscal_label`, `period_from`, `period_to`)
- `POST /api/admin/finance/fiscal-years/:id/close`
  - ปิดรอบปีบัญชี: สร้าง/โพสต์ closing journal อัตโนมัติ และโอนผลต่างเข้ากองทุนสะสม
- `GET /api/admin/finance/fixed-assets`
  - ดูทะเบียนสินทรัพย์ถาวร
- `POST /api/admin/finance/fixed-assets`
  - เพิ่มสินทรัพย์ถาวร พร้อมผูกบัญชีค่าเสื่อมและค่าเสื่อมสะสม
- `POST /api/admin/finance/fixed-assets/run-depreciation`
  - รันบันทึกค่าเสื่อมรายเดือนแบบอัตโนมัติ (Straight-line)
- `POST /api/admin/finance/tax/calculate`
  - คำนวณ VAT/WHT ต่อรายการ
- `GET /api/admin/finance/reports/tax-monthly`
  - รายงานภาษีรายเดือนจากคำขอจ่ายเงิน

## หมายเหตุ migration เดิมที่เคยมีข้อมูลบริจาค

ถ้าเคยมีตาราง `donations` มาก่อน migration accounting และเจอ error ว่า `column donations.legal_entity_id does not exist`  
ให้รัน migration hotfix เพิ่ม:

- `20260416180000_donations_legal_entity_hotfix.sql`

## ข้อมูล seed บัญชีธนาคารและผู้ลงนาม

สำหรับระบบทดสอบรอบนี้มี migration seed:

- `20260416190000_seed_bank_accounts_and_signers.sql`

จะเติม:

- บัญชีสมาคม: `205-2-76989-5`
- บัญชีกวดวิชา: `205-2-77071-0`
- บัญชีสมาชิก: `205-2-77086-9`
- ผู้ลงนาม 5 คน (active + in_kbiz) ลงในทุกบัญชี

## แผนต่อยอด

1. ผูก approval กับเซสชันผู้ใช้จริง (`app_users` + `app_user_roles`) แทนรับ role จาก body
2. รองรับไฟล์สลิปจริงผ่าน object storage + signed URL
3. เพิ่มรายงานบัญชีมาตรฐาน:
   - งบทดลอง
   - งบกำไรขาดทุน
   - งบดุล
   - รายงานภาษีรายเดือน (VAT/WHT)
   - Cash flow
4. เชื่อม meeting/vote กับวาระจ่ายเงินจริง (approval gate ก่อน execute)
