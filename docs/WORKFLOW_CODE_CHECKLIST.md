# Checklist — ลำดับเขียนโค้ดให้ workflow ครบ (dependency-first)

ไฟล์นี้ใช้เป็น **ลำดับงานจริง** ขณะไล่พัฒนา/ปิดช่องว่าง ไม่ใช่แค่รายการฟีเจอร์แยกกัน — ทำบนล่างไปบนเมื่อเป็นไปได้ (ฐานระบบ → ข้อมูล → API → UI → ทดสอบ)

**เกณฑ์อ้างอิง:** [`OPERATIONAL_RUNBOOK.md`](./OPERATIONAL_RUNBOOK.md), [`MODULE_PROGRESS_2026-04-17.md`](./MODULE_PROGRESS_2026-04-17.md), [`ACCOUNTING_FLOW.md`](./ACCOUNTING_FLOW.md)

**ก่อนเริ่มแต่ละขั้น:** `npm run ci` เมื่อแก้ชุดใหญ่; หลังแก้ migration รัน/ตรวจบน Supabase ตามสภาพแวดล้อม

**ปิด Phase 0 แบบอัตโนมัติ (บนเครื่อง dev):** `npm run bootstrap` → `npm run phase0:verify` → `npm run ci` (ดูรายละเอียดด้านล่าง)

---

## Phase 0 — ฐาน repo & สภาพแวดล้อม — เสร็จแล้ว (2026-04-18)

- [x] **Clone / sync `master`** — ไม่ commit ความลับ (`backend/.env`, `frontend/.env` อยู่ใน `.gitignore`; ตรวจด้วย `git ls-files` ไม่ควรมีไฟล์ `.env` จริงถูก track)
- [x] **`npm install`** ที่ราก workspace
- [x] **`npm run setup:env` + `npm run doctor`** — สร้าง `.env` จาก `.env.example` ถ้ายังไม่มี; ตรวจ Node ≥20, Supabase, `ADMIN_UPLOAD_KEY`, ไฟล์ env
- [x] **`npm run phase0:verify`** — build backend แล้วสตาร์ท API ชั่วคราวเรียก `GET /health` จนสำเร็จ (สคริปต์ `scripts/verify-local-api-health.mjs`) เพื่อยืนยันว่า API ขึ้นได้จริงแม้ `npm run doctor` จะขึ้น ✗ ตอนยังไม่ได้ `npm run dev`
- [x] **ความปลอดภัย ([`SECURITY.md`](../SECURITY.md))** — สรุปสำหรับปิด checklist: ห้าม commit ความลับ; คีย์แอดมิน/บริการอยู่ฝั่งเซิร์ฟเวอร์และ env; ทีมที่ใช้ git-secret ทำตาม `SECURITY.md`; rate limit / Helmet ที่เส้นทางสาธารณะตามเอกสาร
- [x] **CI ท้องถิ่น:** `npm run ci` (build + lint + test) ผ่าน

---

## Phase 1 — ฐานข้อมูล (Supabase)

- [ ] ยืนยันลำดับ migration ใน `supabase/migrations/` ครบสำหรับฟีเจอร์ที่ต้องใช้ (อย่าข้ามถ้าต้องการ workflow ครบ)
- [ ] ใช้งาน/ทดสอบบน DB เป้าหมาย (dev/staging) ก่อนชี้ production
- [ ] ถ้าเพิ่มตาราง/คอลัมน์ใหม่: เขียน migration ใหม่ **อย่า** แก้ migration เก่าที่ deploy แล้ว

---

## Phase 2 — Backend API แกนกลาง (Express)

- [ ] CORS / `FRONTEND_ORIGINS` — สอดคล้อง [`README.md`](../README.md) และ deploy จริง
- [ ] เส้นทางสาธารณะที่จำเป็น: `/health`, เอกสาร service index ใน `backend/src/app.ts` (เมื่อเพิ่ม route)
- [ ] Admin: `x-admin-key` ครอบคลุมเส้นทางที่เกี่ยวข้อง
- [ ] Push (ถ้าใช้): `GET /api/push/vapid-public`, `POST /api/push/subscribe` ทำงานคู่กับ frontend

---

## Phase 3 — สมาชิก & การผูก LINE (ต้องมาก่อนพอร์ทัลสมาชิกหลายอย่าง)

- [ ] Flow `/auth/link` — verify / register / ผูกสมาชิก (backend + frontend)
- [ ] กู้เซสชัน / สถานะการเชื่อม — ข้อความ error และ a11y ตามที่ MODULE_PROGRESS ระบุ
- [ ] (ถ้ายังขาด) ทดสอบข้ามอุปกรณ์ / scenario production ที่ MODULE_PROGRESS ยังถือเป็น gap

---

## Phase 4 — พอร์ทัลสมาชิก (`/member/*`)

- [ ] Dashboard / โปรไฟล์ / การ์ด / สถิติ
- [ ] บริจาค + ประวัติ (เชื่อม snapshot/API ที่มี)
- [ ] คำร้องจากสมาชิก (ถ้ามีในพอร์ทัล)
- [ ] Web Push opt-in — คู่กับ Phase 2 push endpoints
- [ ] สลับบทบาท / เมนูพอร์ทัล — สอดคล้อง `AppRoles` / `RequireAppRoles` ถ้าใช้

---

## Phase 5 — คำร้องฝั่งประธาน/แอดมิน (`/requests`)

- [ ] รายการ + กรอง + ค้น
- [ ] อนุมัติ / ปฏิเสธ + activity log
- [ ] ส่งออก / คัดลอก (ถ้ามีใน UI)

---

## Phase 6 — แอดมินเชิงปฏิบัติการ

ลำดับภายใน: **ข้อมูลสมาชิกก่อน** แล้วค่อยโมดูลอื่นที่อ้างอิงสมาชิก

- [ ] **นำเข้าสมาชิก** — เทมเพลต, `POST /api/admin/members/import`, สรุป batch
- [ ] **Cram** — ห้อง / นักเรียน (ตามที่ deploy)
- [ ] **กิจกรรมโรงเรียน** — CRUD + บริจาค/ส่งออกถ้าใช้

---

## Phase 7 — การเงิน–บัญชี (`/admin` finance) — ลำดับภายใน

ทำตามลำดับนี้เพื่อลด regression (master → สมุด → คำขอจ่าย → ประชุม → รายงาน → ปิดงวด)

### 7.1 Master & overview

- [ ] นิติบุคคล + ผังบัญชี — สอดคล้อง entity และ CoA (ดู `.cursorrules` §8)
- [ ] `GET /api/admin/finance/overview` + บัญชีธนาคาร / ผู้ลงนาม KBiz ใน UI

### 7.2 สมุดรายวัน

- [ ] สร้าง journal draft → ใส่บรรทัด → post เมื่อสมดุล → void เมื่อต้องกลับรายการ

### 7.3 คำขอจ่าย (payment requests)

- [ ] สร้างคำขอ — หมวดวัตถุประสงค์, VAT/WHT, กฎยอด ≤20k / >20k
- [ ] อนุมัติ — KBiz 3 ใน 5 / มติประชุม ตาม policy
- [ ] หลังอนุมัติ — บันทึก KBiz ref, URL สลิป, note, มาร์คโอนแล้ว (`PATCH payment-requests/:id`) + UI (`FinanceAssociationExpenseHub`)
- [ ] **ถ้ายังขาดตาม MODULE_PROGRESS:** อัปโหลดสลิปไป storage จริง; แจ้งเตือน LINE (ต้องออกแบบ backend + ความลับ)

### 7.4 ประชุม · วาระ · มติ · เอกสาร · minutes

- [ ] Meeting session → agenda → โหวต → ปิดวาระ
- [ ] เอกสารประชุม + เผยแพร่/ซ่อนต่อพอร์ทัล
- [ ] Minutes + เผยแพร่
- [ ] เชื่อมพอร์ทัลคณะกรรมการ (snapshot + ดาวน์โหลด)

### 7.5 รายงาน & ส่งออก

- [ ] รายงานที่ใช้จริง: Trial Balance, GL, P&L, งบดุล, ภาษี ฯลฯ
- [ ] Export CSV ที่เกี่ยวข้อง (บริจาค, payment requests, meeting sessions, ฯลฯ)

### 7.6 ปิดงวด & ผู้ตรวจ

- [ ] ปิดงวด → snapshot → auditor package → สถานะ handoff / ผู้ตรวจเสร็จ

### 7.7 ขั้นสูง (เมื่อโปรเจกต์ใช้งานเต็ม)

- [ ] ปีบัญชี (`fiscal_years`) / ปิดปี
- [ ] สินทรัพย์ถาวร + ค่าเสื่อมรายเดือน

---

## Phase 8 — พอร์ทัลคณะกรรมการ (`/committee/*`)

- [ ] อ่าน snapshot `/api/portal/committee` — เอกสาร, minutes, สรุปมติ
- [ ] หน้าประชุม / ลงชื่อ / ลงมติ — คู่กับ Phase 7.4
- [ ] ดาวน์โหลดไฟล์ที่เผยแพร่แล้วเท่านั้น (ตาม policy backend)

---

## Phase 9 — พอร์ทัล Academy (`/academy/*`)

- [ ] ห้อง / นักเรียน / รายงาน — ตามที่ deploy และสิทธิ์

---

## Phase 10 — ก่อน/หลัง production

- [ ] Smoke — [`SMOKE_TEST_EXECUTION_2026-04-17.md`](./SMOKE_TEST_EXECUTION_2026-04-17.md) (หรือรุ่นล่าสุด)
- [ ] บันทึกผล verification หลัง merge
- [ ] ทบทวน [`MODULE_PROGRESS_2026-04-17.md`](./MODULE_PROGRESS_2026-04-17.md) อัปเดต % และช่อง QA

---

## หมายเหตุการใช้งาน

- **งานย่อยที่ “ข้ามลำดับ” ได้:** แก้ copy/UX, ปรับ a11y ในโมดูลเดียว — แต่ **อย่าสร้าง API ใหม่ที่อ้างตารางที่ยังไม่ migrate**
- **งานที่ควรทำคู่กัน:** เมื่อแตะการเงิน → รัน `npm run ci` + ทดสอบช่วงวันที่/entity อย่างน้อยหนึ่งชุด
- **Refactor ใหญ่:** แยก hook จาก `AdminFinancePanel.tsx` ทำทีละก้อนตาม MODULE_PROGRESS — ไม่ย้ายทั้งไฟล์ในครั้งเดียว
