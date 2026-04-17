# ระบบ V2 (URL เดียว + LINE login + RBAC)

## สรุปเป้าหมาย

- ผู้ใช้ทุกกลุ่มเข้าเว็บจาก URL เดียวกัน
- เริ่มต้นด้วย LINE login เพื่อได้ `line_uid`
- ระบบแยกสิทธิ์ตามบทบาท (RBAC) แล้วแสดงเมนู/ความสามารถต่างกัน
- มี approval flow สำหรับสมาชิก (ประธานรุ่น + admin)

## บทบาทหลัก

- `member`
- `committee` (คณะกรรมการ 35 คน)
- `committee_authorized_3of5` (ผู้มีอำนาจอนุมัติ 3 ใน 5)
- `cram_executive` (ผู้บริหารโรงเรียนกวดวิชา)
- `teacher`
- `parent`
- `student`
- `admin`

## สิ่งที่ทำแล้วในโค้ด

- สมาชิกที่ตรวจสอบและผูกสำเร็จจะเข้าแท็บ `หน้าสมาชิก` อัตโนมัติ
- หน้า `หน้าสมาชิก` มีโครงหัวข้อ:
  - เปลี่ยนแปลงข้อมูลสมาชิก
  - กิจกรรมโรงเรียน
  - สมาชิกศิษย์เก่า
  - กิจกรรมสมาคมศิษย์เก่า
  - โรงเรียนกวดวิชา
- มี API `POST /api/members/update-self` สำหรับแก้ข้อมูลรองของสมาชิก
- เพิ่ม migration foundation สำหรับ RBAC/กิจกรรม/บริจาค/วาระ/ลงคะแนน:
  - `app_users`, `app_user_roles`
  - `school_activities`, `donations`
  - `meeting_agendas`, `meeting_votes`
- เพิ่ม foundation ระบบบัญชี/การเงิน:
  - แยกหน่วยงาน `association` และ `cram_school`
  - ตารางคำขอจ่ายเงิน + การอนุมัติ + ผังบัญชี + สมุดรายวัน
  - policy อัตโนมัติ: <= 20,000 ใช้ผู้ลงนามบัญชี (KBiz) 3 ใน 5, > 20,000 ใช้กรรมการ 35 พร้อม majority ของผู้เข้าร่วมประชุม
  - รองรับลงชื่อเข้าประชุมด้วย LINE และคำนวณ quorum 2/3

## แผนถัดไป (แนะนำลำดับทำงาน)

1. **Identity + เซสชัน**
   - ออก token/เซสชัน หลัง LINE login
   - ผูก `line_uid` → `app_users`
   - middleware ตรวจสิทธิ์ตาม role
2. **Approval Flow จริง**
   - เมื่อสมาชิกใหม่สมัคร: `pending_president` → `pending_admin` → `approved`
   - เก็บผู้อนุมัติและเวลาใน `app_users`
3. **Donations MVP**
   - API สร้างกิจกรรม/รับบริจาค/อัปโหลดสลิป
   - dashboard ยอดรวมรายบุคคลและรายรุ่น
4. **Accounting & Payment Approval MVP**
   - ขอจ่ายเงินแยกหน่วยงาน (สมาคม/กวดวิชา)
   - workflow อนุมัติตาม threshold
   - เชื่อมผู้ลงนามบัญชีจริงกับ KBiz
   - บันทึก post รายการบัญชีแบบ double-entry
5. **Meeting & Voting MVP**
   - API วาระประชุม, ลงมติ realtime (polling/websocket)
   - สรุปผลโหวตแต่ละวาระ
6. **Cram school domain**
   - คอร์ส/สมัครเรียน/ชำระเงิน/เช็คชื่อ/ผลการเรียน + dashboard

## หมายเหตุ

- migration ใหม่เป็นฐานโครงสร้าง ยังไม่ได้เชื่อมทุก endpoint ในรอบนี้
- เพื่อไม่กระทบระบบที่ใช้งานอยู่จริง จึงแยกเป็น phase และต่อยอดทีละโมดูล
