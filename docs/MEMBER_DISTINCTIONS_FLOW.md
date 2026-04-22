# Flow: มิติสมาชิก (Member distinctions)

เอกสารนี้เป็นจุดอ้างอิงเดียวเมื่อเพิ่มมิติใหม่ (เช่น เกียรติยศ/แคมเปญ) ให้แก้ให้ครบทุกชั้นตาม checklist ด้านล่าง

## แหล่งความจริง (source of truth)

| มิติ | ที่เก็บ | หมายเหตุ |
|------|----------|-----------|
| สมาชิกทั่วไป | `members` | ข้อมูลทะเบียน รุ่น ชื่อ ฯลฯ — **ไม่**ใส่ boolean ประธานรุ่น/ดีเด่นอีกต่อไป |
| ประธานรุ่น, ดีเด่น, ดีเด่นตามปี พ.ศ., ดีเด่นตามโปรแกรม, ฐานสถานะ | `member_distinctions` | `(member_id, code, mark_key)` ไม่ซ้ำ — `mark_key` ว่างได้สำหรับมิติทั่วไป |
| กรรมการ | `app_user_roles` (`role_code = committee`) + `app_users.member_id` | ไม่ย้ายเข้า `member_distinctions` — รวมใน API directory เป็น `committee_role` |

## รหัส `code` (คงที่)

นิยามที่ `backend/src/constants/memberDistinctionCodes.ts` — ต้องสอดคล้องกับคอลัมน์นำเข้าและ `requested_data` ตอนสมัคร

- `batch_president` — ประธานรุ่น (`mark_key` ว่าง)
- `outstanding_alumni` — ดีเด่นทั่วไป (`mark_key` ว่าง)
- `outstanding_alumni_year` — ดีเด่นตามปี พ.ศ. (`mark_key` = ปี 4 หลัก เช่น `2560`)
- `outstanding_program` — ดีเด่นตามโปรแกรม (`mark_key` เช่น `yupparaj_120`)
- `alumni_base` — ฐานสถานะศิษย์เก่า (`mark_key` ว่าง)

โปรแกรมที่รู้จักชื่อไทย: map ใน `KNOWN_OUTSTANDING_PROGRAM_KEYS` + regex ใน `normalizeOutstandingProgramKey` (`memberDistinctions.ts`)

## Flow หลัก

1. **นำเข้า Excel** — `POST /api/admin/members/import`  
   - สร้าง `import_batches` แล้ว insert `members` ทีละ chunk พร้อม `import_batch_id`  
   - จากหัวคอลัมน์ไทย → `extractDistinctionSpecsFromImportRow` → `replaceMemberDistinctions` ต่อ `members.id` ที่ insert แล้ว  
   - **ถ้าล้มหลังมี `import_batch_id` แล้ว** (insert ล้ม / มิติล้ม / อัปเดต `import_batches` ล้ม / exception) — เรียก `rollbackFailedMemberImport`: ลบ `members` ที่ `import_batch_id` ตรงกัน แล้วลบแถว `import_batches` นั้น (ไม่ทิ้งทะเบียนค้างจากไฟล์ที่ล้มเหลว)

2. **อนุมัติคำร้องสมัคร** — `memberRequestsAdmin` (`POST .../admin-approve`, `new_registration`)  
   - `memberInsertFromRequestedData` **ไม่**ใส่มิติลงแถว members  
   - หลัง insert → `distinctionSpecsFromRegistrationData(requested_data)` → `replaceMemberDistinctions`  
   - หลัง `syncAppUserAfterMemberLink` สำเร็จ ถ้าอัปเดต `member_update_requests` เป็น `approved` ล้ม → เรียก `rollbackSyncedMemberRegistration` (คืน `app_users` เป็น `pending` + `member_id` null แล้วลบ `members` เพื่อไม่ให้ทะเบียนค้างโดยไม่มีคำร้องปิด)

3. **Directory / แผง Admin** — `GET /api/admin/members/directory`  
   - โหลด `members` ตาม view  
   - view `batch_presidents` / `outstanding` คัดจาก `member_distinctions` แล้วค่อย `.in('id', …)`  
   - รวม `fetchDistinctionsByMemberIds` + `rollupDistinctions` + `committee_role`

4. **ซิงก์ประธานรุ่นจาก ENV** — `POST /api/admin/members/sync-registry-presidents`  
   - ใช้ `setBatchPresidentDistinctionForBatch` — ลบมิติ `batch_president` ของทุกคนในรุ่น แล้วใส่ให้ `member_id` จาก `PRESIDENT_KEYS_JSON`

5. **PATCH แฟล็ก** — `PATCH .../directory-flags`  
   - แบบเต็ม: `{ distinctions: [{ code, mark_key?, label_th? }] }` แทนที่มิติทั้งหมดของสมาชิก  
   - แบบ legacy: `{ batch_president?, outstanding_alumni? }` สลับเฉพาะสองมิติทั่วไป คงปี/โปรแกรม/ฐานสถานะ

## เมื่อเพิ่มมิติใหม่ (checklist)

1. เพิ่มค่าใน `MemberDistinctionCode` (+ label ใน rollup ถ้าต้องการแสดงในตาราง)  
2. ถ้ามี `mark_key` รูปแบบใหม่: ฟังก์ชัน normalize + validation ใน `memberDistinctions.ts`  
3. คอลัมน์เทมเพลต + `HEADER_TO_DB` / `extractDistinctionSpecsFromImportRow` ถ้ามาจาก import  
4. ฟิลด์ใน `requested_data` + `distinctionSpecsFromRegistrationData` ถ้ามาจากคำร้องสมัคร  
5. `parseBodyDistinctionSpecs` / `ALLOWED_DISTINCTION_CODES` ใน `importMembers.ts` (PATCH)  
6. ถ้าเป็นมิติที่ต้อง **ค้นรายชื่อ** ใน directory: ปรับ `memberDirectoryQuery` + logic view ใน `importMembers.ts`  
7. Migration ถ้าต้องการ index หรือ seed — ระวัง `ON CONFLICT (member_id, code, mark_key)`  
8. อัปเดตเอกสารนี้และข้อความใน `README` / `DEPLOY_VERIFY` / help ใน `app.ts` ถ้ามี

## Migration

`supabase/migrations/20260421240000_member_distinctions.sql` — สร้างตาราง, backfill จากคอลัมน์เก่า (ถ้ามี), ลบ `members.batch_president` / `members.outstanding_alumni`
