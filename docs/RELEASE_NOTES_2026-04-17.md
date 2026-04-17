# Release Notes — 2026-04-17

## Highlights

- ยกระดับความสม่ำเสมอของภาษาไทยทั้งระบบ (Frontend + Backend + Docs)
- ปรับปรุงการเข้าถึงด้วยคีย์บอร์ด (focus-visible / focus ring) ครอบคลุมจุดสำคัญของพอร์ทัล
- ทำมาตรฐานคำศัพท์และเอกสาร handoff เพื่อป้องกัน regression ในรอบพัฒนาถัดไป

## What Changed

### Frontend UX/A11y

- ปรับข้อความ UI ในพอร์ทัลสมาชิก/คณะกรรมการ/โรงเรียนกวดวิชาให้สื่อสารสม่ำเสมอขึ้น
- ใช้มาตรฐานคำศัพท์หลักเดียวกัน เช่น `LINE UID`, `Admin key`, `เซสชัน`, `สแนปช็อต`
- เพิ่มความชัดเจนของ keyboard focus โดยรวมคลาสโฟกัสไว้ในชุดกลางและใช้กับองค์ประกอบ interactive หลัก

### Backend API Messaging

- ปรับข้อความ response ที่ผู้ใช้เห็นให้เป็นภาษาไทยและมีรูปแบบคงที่
- ใช้แนวทางถ้อยคำเดียวกัน เช่น:
  - `ต้องระบุ...`
  - `ไม่พบ...`
  - `...ไม่สำเร็จ`
  - `ไม่ได้รับอนุญาต`
- คง error code/field เชิงเทคนิคที่จำเป็นต่อการ debug และรักษา API contract

### Documentation

- เพิ่ม `docs/UI_TH_TERMINOLOGY_CHECKLIST.md` เป็นมาตรฐานคำศัพท์
- เพิ่ม `docs/LOCALIZATION_A11Y_HANDOFF.md` สำหรับส่งมอบงานก่อนปล่อย
- เพิ่ม `docs/PRE_COMMIT_PACKAGE.md` เพื่อสรุปงานก่อน commit
- ปรับ `README.md` และเอกสาร flow ที่เกี่ยวข้องให้ตรงกับพฤติกรรมระบบล่าสุด

### Security Incident Response Docs (Follow-up)

- เพิ่ม `docs/SECRET_ROTATION_CHECKLIST.md` สำหรับขั้นตอนหมุนคีย์ลับแบบ incident response
- เพิ่ม `docs/SECRET_ROTATION_LOG_TEMPLATE.md` สำหรับบันทึกหลักฐานการหมุนคีย์
- เพิ่ม `docs/SECRET_ROTATION_LOG_2026-04-17.md` เป็น incident log รอบปัจจุบัน

## Impact

- ผู้ใช้เห็นข้อความที่สม่ำเสมอและเข้าใจง่ายขึ้น
- การใช้งานด้วยคีย์บอร์ดมีความชัดเจนขึ้นในจุดสำคัญ
- ทีมพัฒนามีเอกสารอ้างอิงและ checklist ชัดเจนสำหรับรอบถัดไป

## Validation

- GitHub Actions CI ของ commit ล่าสุดผ่าน (`success`)
- การตรวจในเครื่อง (`npm run ci`) ผ่านครบ (build/lint/test)
- บันทึกผลหลัง merge: `docs/POST_MERGE_VERIFICATION_2026-04-17.md`
- บันทึกผล smoke test execution: `docs/SMOKE_TEST_EXECUTION_2026-04-17.md`
- บันทึกการหมุนคีย์ (incident): `docs/SECRET_ROTATION_LOG_2026-04-17.md`

## Follow-up (Recommended)

- ทำ smoke test ข้ามอุปกรณ์ตาม `docs/LOCALIZATION_A11Y_HANDOFF.md`
- ใช้มาตรฐานคำศัพท์ใน `docs/UI_TH_TERMINOLOGY_CHECKLIST.md` ทุกครั้งที่เพิ่ม route หรือหน้าใหม่
