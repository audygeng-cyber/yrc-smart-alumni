# Operational runbook — โครงสร้างการใช้งานหลัก (ต้นจนจบ)

เอกสารนี้รวม **เส้นทางปฏิบัติการ** ที่ทีม/องค์กรต้องทำให้ครบเพื่อให้ระบบใช้งานได้จริง แยกจาก [`MODULE_PROGRESS_2026-04-17.md`](./MODULE_PROGRESS_2026-04-17.md) ที่เน้นสถานะความพร้อมรายโมดูล

**เกณฑ์บัญชีและสแตก:** ดู [`.cursorrules`](../.cursorrules) (double-entry, CoA 1–5, posted = immutable, void/reversal, audit trail, Maker/Checker)

---

## นักพัฒนา — วิธีทำงานขณะเขียนโค้ด (บันทึกในระบบ 2026-04-18)

ข้อต่อไปนี้เป็น **ข้อตกลงทีมพัฒนา** ให้สอดคล้องกับ [`.cursorrules`](../.cursorrules) §7

- [ ] **ทดสอบบนเว็บไซต์ทุก 1 ชั่วโมงตรงเวลา** ระหว่างช่วงที่กำลังพัฒนาต่อเนื่อง (เช่น 10.00, 11.00, 12.00) — ใช้สภาพแวดล้อมที่กำลังตรวจ (เครื่อง dev, Vercel preview หรือ production ตามงาน) เพื่อจับ regression เร็ว
- [ ] **ความปลอดภัย — ป้องกันผู้อื่นเข้ามาแก้ไขข้อมูลโดยไม่มีสิทธิ์** — พึ่งพาแอดมิน/ประธานคีย์, RLS (ถ้าใช้), RBAC, Maker/Checker ตามที่ API/UI กำหนดอยู่แล้ว; **ห้าม** เพิ่มเส้นทางที่ข้ามการตรวจสอบหรือเปิดเผย service role ไปฝั่งเบราว์เซอร์
- [ ] **เมื่อดำเนินการ (งานย่อย) เสร็จแล้ว** — ดำเนินการเขียนโค้ด/งานถัดไปต่อเนื่องในลำดับที่ตกลง ไม่ปล่อยค้างโดยไม่จำเป็น (ยกเว้นติด blocker)
- [ ] **บทบาทโมดูลบัญชี:** บันทึกรายรับ–รายจ่ายแยกหน่วยงาน (สมาคม / กวดวิชา) แบบโปรแกรมบัญชีสำเร็จรูป; สิ้นปีส่งออกข้อมูลให้ผู้ตรวจปิดงบฯ — ดู [`ACCOUNTING_FLOW.md`](./ACCOUNTING_FLOW.md) หัวข้อ **บทบาทของระบบเทียบโปรแกรมบัญชีสำเร็จรูป** และ [`.cursorrules`](../.cursorrules) §8

---

## 1. ฐานระบบ (ครั้งแรก / ก่อน production)

- [ ] Supabase: สร้างโปรเจกต์ รัน **migration ตามลำดับ** (`supabase/migrations/`) — อย่าข้ามถ้าต้องการฟีเจอร์ครบ
- [ ] `backend/.env` + `frontend/.env` — `SUPABASE_*`, keys ตามที่ใช้, `VITE_API_URL`, CORS / `FRONTEND_ORIGINS` บน production
- [ ] ความลับ: ตาม [`SECURITY.md`](../SECURITY.md) และ [`SECRET_ROTATION_CHECKLIST.md`](./SECRET_ROTATION_CHECKLIST.md)
- [ ] CI/CD: build + test + deploy; ตั้ง `VERIFY_API_BASE` / `VERIFY_FRONTEND_ORIGIN` ถ้าต้องการ smoke หลัง deploy ([`README.md`](../README.md))

---

## 2. ข้อมูลสมาชิกและการเข้าถึง

- [ ] นำเข้าสมาชิก — เทมเพลต import, สรุป batch (`/api/admin/members/summary`)
- [ ] ผู้ใช้ผูก LINE — `/auth/link` (verify / register / ผูกสมาชิก)
- [ ] พอร์ทัลสมาชิก — `/member/*` (โปรไฟล์, บริจาค, คำร้อง, Push ถ้าเปิด)

---

## 3. งานขนาน (ไม่บังคับลำดับเดียวกับบัญชี แต่สำคัญต่อการปกครองข้อมูล)

- [ ] คำร้อง — `/requests` (อนุมัติ/ปฏิเสธ, บันทึกกิจกรรม)
- [ ] แอดมิน — import, cram, กิจกรรมโรงเรียน ตามแท็บที่ deploy

---

## 4. การเงิน–บัญชี (ลำดับสมเหตุสมผล)

### 4.1 Master data

- [ ] นิติบุคคล (`legal_entities`) และ **ผังบัญชี** (`account_chart`) สอดคล้อง entity และ CoA 1–5

### 4.2 สมุดรายวัน

- [ ] สร้าง journal **draft** → ใส่บรรทัด (debit/credit) → **post** เมื่อสมดุล → **void** เมื่อต้องกลับรายการ (ไม่ลบทับ posted)

### 4.3 คำขอจ่ายเงิน

- [ ] สร้าง `payment_requests` พร้อมหมวดวัตถุประสงค์ / VAT–WHT ตาม API
- [ ] ยอด **≤ 20,000**: นโยบายผู้ลงนาม KBiz (3 ใน 5) + หมวดต้องเป็น **ค่าใช้จ่ายปกติธุระ** (ไม่ใช้หมวด “อื่นๆ” สำหรับเคสนี้)
- [ ] ยอด **> 20,000**: ต้องมี `meeting_session` / มติตาม flow

### 4.4 ประชุม · วาระ · มติ · เอกสาร · minutes

- [ ] สร้าง **meeting session** → **agenda** → ลงมติ → ปิดวาระ
- [ ] **เอกสารประชุม** → ตั้งค่าเผยแพร่/ซ่อนต่อพอร์ทัล
- [ ] **minutes** → เผยแพร่เมื่อพร้อม
- [ ] พอร์ทัลคณะกรรมการอ่าน snapshot (เอกสาร, minutes, สรุปมติ) — `/api/portal/committee` และ endpoint ดาวน์โหลดที่เกี่ยวข้อง

### 4.5 รายงานและปิดงวด

- [ ] รายงาน: Trial Balance, GL, งบกำไร, งบดุล, ภาษีรายเดือน (filter ตามช่วงวันที่และ entity)
- [ ] **ปิดงวด** → snapshot → ส่ง **auditor package** / อัปเดตสถานะ handoff → ปิดงานผู้ตรวจเมื่อครบ

### 4.6 รอบปีและสินทรัพย์ถาวร (เมื่อใช้งานเต็ม)

- [ ] `fiscal_years` → ปิดปี (closing journal ตาม backend)
- [ ] `fixed_assets` → รันค่าเสื่อมรายเดือนตามรอบ

### 4.7 ส่งออกและตรวจสอบ

- [ ] Export CSV ที่เกี่ยวข้อง (บริจาค, payment requests, meeting sessions, auditor package ฯลฯ) สำหรับ audit

---

## 5. พอร์ทัลตามบทบาท (หลังข้อมูลพร้อม)

- [ ] สมาชิก — dashboard / บริจาค / คำร้อง
- [ ] คณะกรรมการ — ประชุม, ลงชื่อ, ลงมติ, ดาวน์โหลดเอกสารและ minutes
- [ ] Academy — ห้องเรียน, นักเรียน, รายงาน (ถ้า deploy)

---

## 6. ก่อน/หลังปล่อย production

- [ ] Smoke test — [`SMOKE_TEST_EXECUTION_2026-04-17.md`](./SMOKE_TEST_EXECUTION_2026-04-17.md)
- [ ] บันทึกผล — [`POST_MERGE_VERIFICATION_2026-04-17.md`](./POST_MERGE_VERIFICATION_2026-04-17.md) (หรือไฟล์รุ่นล่าสุด)
- [ ] ทบทวน [`MODULE_PROGRESS_2026-04-17.md`](./MODULE_PROGRESS_2026-04-17.md) สำหรับช่อง “ค้าง QA”

---

## สรุปหนึ่งบรรทัด

ตั้งค่า DB + secret + deploy → นำเข้าสมาชิก + ผูก LINE → (ขนาน) คำร้อง/แอดมิน → master บัญชี → สมุดรายวัน → คำขอจ่ายตามนโยบาย → ประชุม–วาระ–มติ–เอกสาร–minutes → รายงาน–ปิดงวด–ผู้ตรวจ → (ถ้าใช้) รอบปี/สินทรัพย์ถาวร → พอร์ทัลอ่านข้อมูลที่เผยแพร่ → ทดสอบและเก็บหลักฐาน

---

## เอกสารเสริม (ทีมพัฒนา / บัญชี)

- [`ACCOUNTING_PROMPT_PACK.md`](./ACCOUNTING_PROMPT_PACK.md) — แม่แบบ prompt สำหรับออกแบบ/ขยายโมดูลบัญชีใน Cursor
- [`UI_TH_TERMINOLOGY_CHECKLIST.md`](./UI_TH_TERMINOLOGY_CHECKLIST.md), [`LOCALIZATION_A11Y_HANDOFF.md`](./LOCALIZATION_A11Y_HANDOFF.md) — ศัพท์และการเข้าถึง UI
