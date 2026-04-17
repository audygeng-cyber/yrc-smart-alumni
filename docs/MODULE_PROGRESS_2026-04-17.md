# Module Progress — 2026-04-17

สรุปเปอร์เซ็นต์ความคืบหน้าเชิง “ความพร้อมใช้งานจริง” ของแต่ละโมดูลตามสถานะโค้ด/เอกสาร/การทดสอบปัจจุบัน

> เกณฑ์คิดโดยรวม: ฟีเจอร์หลัก + UX/a11y + ความสม่ำเสมอข้อความ + เสถียรภาพ CI

## Progress by Module

- หน้า Login / ผูกบัญชี (`/auth/link`): **85%**
  - จุดแข็ง: flow LINE UID + verify/register + ข้อความไทย + error handling
  - ค้างหลัก: ทดสอบข้ามอุปกรณ์ครบทุก scenario production
- งานทะเบียนสมาชิก (`/member/*` + update-self): **88%**
  - จุดแข็ง: dashboard/profile/card/statistics + ถ้อยคำ/โฟกัสปรับแล้ว
  - ค้างหลัก: การทดสอบข้อมูลจริงและ edge cases หลังหมุนคีย์/deploy รอบถัดไป
- งานคณะกรรมการ (`/committee/*`): **86%**
  - จุดแข็ง: dashboard/meetings/attendance/voting พร้อมข้อความมาตรฐาน
  - ค้างหลัก: เก็บผลทดสอบเชิงบทบาทจริง (chair/member) เพิ่มเติม
- งานโรงเรียนกวดวิชา (`/academy/*`): **85%**
  - จุดแข็ง: หลายหน้าใช้งานได้ + ข้อความ/โฟกัสคีย์บอร์ดปรับแล้ว
  - ค้างหลัก: ตรวจความลื่นไหลบนจอเล็กและข้อมูลจริงมากขึ้น
- งานคำร้อง (`/requests`): **90%**
  - จุดแข็ง: workflow ชัด, filter/search/activity log, ถ้อยคำไทยเกือบครบ
  - ค้างหลัก: smoke test manual cross-device เพิ่มหลักฐานรอบปิด
- งาน Admin (import/cram/school activities): **89%**
  - จุดแข็ง: API flow ครบ, key messaging มาตรฐาน, UX ภาษาไทยดีขึ้น
  - ค้างหลัก: field-level QA บาง placeholder และข้อมูลจริง production-like
- งานบัญชี (`/admin` finance): **84%**
  - จุดแข็ง: reports/exports/payment approvals/meeting sessions พร้อมและข้อความสอดคล้องขึ้น
  - ค้างหลัก: QA scenario การเงินเชิงธุรกิจจริง (policy edge cases, long-run ops)

## งานถัดไป (แนะนำ)

1. ปิด manual smoke test ข้ามอุปกรณ์ครบทุก checklist ใน `docs/SMOKE_TEST_EXECUTION_2026-04-17.md`
2. บันทึกผลหมุนคีย์จริงใน `docs/SECRET_ROTATION_LOG_2026-04-17.md`
3. เก็บหลักฐาน verify หลัง rotate key (run URL + endpoint checks)
