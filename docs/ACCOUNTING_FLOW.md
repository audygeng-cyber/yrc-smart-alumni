# Accounting Flow (เบื้องต้น)

## หลักการที่กำหนด

- แยกหน่วยงานบัญชีเป็น 2 ส่วน:
  - `association` (สมาคมศิษย์เก่า)
  - `cram_school` (โรงเรียนกวดวิชา)
- กติกาอนุมัติจ่ายเงิน:
  - ยอด **ไม่เกิน 20,000 บาท**: `committee_authorized_3of5` อนุมัติครบ 3
  - ยอด **เกิน 20,000 บาท**: `committee` (คณะกรรมการ 35 คน) อนุมัติครบ 35
- บัญชีธนาคารของทั้งสองหน่วยงานรองรับผู้ลงนาม 5 คน ใช้ 3 ใน 5 และรองรับการโอนผ่าน K PLUS Biz (`kbiz_enabled`)

## โครงข้อมูลที่เพิ่ม

- `legal_entities` หน่วยงานบัญชี
- `bank_accounts` บัญชีธนาคาร + กติกาผู้ลงนาม
- `payment_requests` คำขอจ่ายเงิน + policy ที่ผูกกับ threshold
- `payment_request_approvals` รายการอนุมัติ/ปฏิเสธรายคน
- `account_chart`, `journal_entries`, `journal_lines` โครงบัญชีแบบ double-entry

## API เบื้องต้น (Admin)

> ตอนนี้ endpoint กลุ่มนี้อยู่ใต้ `x-admin-key` เพื่อทดสอบ flow ก่อนระบบ token/role สมบูรณ์

- `GET /api/admin/finance/overview`
  - ดูภาพรวมคำขอจ่ายเงินค้าง + สรุปยอดบริจาครายรุ่น
- `POST /api/admin/finance/payment-requests`
  - สร้างคำขอจ่ายเงิน (ระบบเลือก rule ให้อัตโนมัติตามยอด)
  - body ตัวอย่าง:
    - `legal_entity_code`: `association` หรือ `cram_school`
    - `purpose`
    - `amount`
    - `requested_by`
- `POST /api/admin/finance/payment-requests/:id/approve`
  - บันทึกการอนุมัติ/ปฏิเสธ
  - body ตัวอย่าง:
    - `approver_name`
    - `approver_role_code`: `committee_authorized_3of5` หรือ `committee`
    - `decision`: `approve` / `reject`

## แผนต่อยอด

1. ผูก approval กับ user session จริง (`app_users` + `app_user_roles`) แทนรับ role จาก body
2. รองรับไฟล์สลิปจริงผ่าน object storage + signed URL
3. เพิ่มรายงานบัญชีมาตรฐาน:
   - งบทดลอง
   - งบกำไรขาดทุน
   - งบดุล
   - Cash flow
4. เชื่อม meeting/vote กับวาระจ่ายเงินจริง (approval gate ก่อน execute)
