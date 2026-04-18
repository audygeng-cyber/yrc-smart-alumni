# Checklist — ลำดับเขียนโค้ดให้ workflow ครบ (dependency-first)

ไฟล์นี้ใช้เป็น **ลำดับงานจริง** ขณะไล่พัฒนา/ปิดช่องว่าง ไม่ใช่แค่รายการฟีเจอร์แยกกัน — ทำบนล่างไปบนเมื่อเป็นไปได้ (ฐานระบบ → ข้อมูล → API → UI → ทดสอบ)

**เกณฑ์อ้างอิง:** [`OPERATIONAL_RUNBOOK.md`](./OPERATIONAL_RUNBOOK.md), [`MODULE_PROGRESS_2026-04-17.md`](./MODULE_PROGRESS_2026-04-17.md), [`ACCOUNTING_FLOW.md`](./ACCOUNTING_FLOW.md)

**ก่อนเริ่มแต่ละขั้น:** `npm run ci` เมื่อแก้ชุดใหญ่; หลังแก้ migration รัน/ตรวจบน Supabase ตามสภาพแวดล้อม

**ปิด Phase 0 แบบอัตโนมัติ (บนเครื่อง dev):** `npm run bootstrap` → `npm run phase0:verify` → `npm run ci` (ดูรายละเอียดด้านล่าง)

**ปิด Phase 1 (ฝั่ง repo):** `npm run phase1:verify` — ก่อน deploy ครั้งสำคัญให้รัน migration ตามลำดับบน Supabase **dev/staging ก่อน production** (ดูด้านล่าง)

**ปิด Phase 2 (แกน API บนเครื่อง):** `npm run phase2:verify` — หลัง build backend; **deploy จริง** ตั้ง `FRONTEND_ORIGINS` ให้ตรงโดเมน frontend ([`README.md`](../README.md))

**ปิด Phase 3 (ฝั่ง repo + API):** `npm run phase3:verify` — LINE/members/portal probes; การล็อกอิน LINE จริงและทดสอบข้ามอุปกรณ์เป็นงาน manual ตาม [`MODULE_PROGRESS_2026-04-17.md`](./MODULE_PROGRESS_2026-04-17.md)

**ปิด Phase 4 (พอร์ทัลสมาชิก — API ที่ UI ใช้):** `npm run phase4:verify` — snapshot `GET /api/portal/member` + probes บริจาค/คำร้อง/อัปเดตโปรไฟล์ + VAPID; หน้า `/member/*` และ a11y ยังเป็น QA หลัง deploy ตาม MODULE_PROGRESS

---

## Phase 0 — ฐาน repo & สภาพแวดล้อม — เสร็จแล้ว (2026-04-18)

- [x] **Clone / sync `master`** — ไม่ commit ความลับ (`backend/.env`, `frontend/.env` อยู่ใน `.gitignore`; ตรวจด้วย `git ls-files` ไม่ควรมีไฟล์ `.env` จริงถูก track)
- [x] **`npm install`** ที่ราก workspace
- [x] **`npm run setup:env` + `npm run doctor`** — สร้าง `.env` จาก `.env.example` ถ้ายังไม่มี; ตรวจ Node ≥20, Supabase, `ADMIN_UPLOAD_KEY`, ไฟล์ env
- [x] **`npm run phase0:verify`** — build backend แล้วสตาร์ท API ชั่วคราวเรียก `GET /health` จนสำเร็จ (สคริปต์ `scripts/verify-local-api-health.mjs`) เพื่อยืนยันว่า API ขึ้นได้จริงแม้ `npm run doctor` จะขึ้น ✗ ตอนยังไม่ได้ `npm run dev`
- [x] **ความปลอดภัย ([`SECURITY.md`](../SECURITY.md))** — สรุปสำหรับปิด checklist: ห้าม commit ความลับ; คีย์แอดมิน/บริการอยู่ฝั่งเซิร์ฟเวอร์และ env; ทีมที่ใช้ git-secret ทำตาม `SECURITY.md`; rate limit / Helmet ที่เส้นทางสาธารณะตามเอกสาร
- [x] **CI ท้องถิ่น:** `npm run ci` (build + lint + test) ผ่าน

---

## Phase 1 — ฐานข้อมูล (Supabase) — เสร็จแล้ว (ฝั่ง repo, 2026-04-18)

- [x] **ยืนยันลำดับและความถูกต้องของ migration ใน repo** — `npm run phase1:verify` รัน `scripts/verify-migrations.mjs` (ตรวจชื่อ `YYYYMMDDHHmmss_*.sql`, ไม่ซ้ำ timestamp, ไม่มีไฟล์ว่าง, ลำดับเวลาไม่ย้อน); แสดงรายการทั้งหมด 23 ไฟล์ตามลำดับรัน; **GitHub Actions** `ci.yml` รัน `phase1:verify` หลัง `npm ci` ทุกครั้ง
- [x] **ใช้งาน/ทดสอบบน DB เป้าหมาย (dev/staging) ก่อน production** — ไม่มีการ assert อัตโนมัติไปที่ Supabase ระยะไกลใน repo (ต้องใช้ Dashboard SQL / `npx supabase db push` หลัง link โปรเจกต์); checklist นี้ถือว่า “ผ่านฝั่ง repo” เมื่อ `phase1:verify` ผ่าน และผู้ deploy รับผิดชอบรัน migration บน env จริงตาม [`OPERATIONAL_RUNBOOK.md`](./OPERATIONAL_RUNBOOK.md) §1
- [x] **นโยบายเพิ่มตาราง/คอลัมน์** — เขียนไฟล์ migration ใหม่เท่านั้น **ห้าม** แก้ migration เก่าที่เคยรันใน dev/staging/production แล้ว — สคริปต์พิมพ์เตือนซ้ำเมื่อรัน `phase1:verify`

---

## Phase 2 — Backend API แกนกลาง (Express) — เสร็จแล้ว (ฝั่ง repo + smoke, 2026-04-18)

- [x] **CORS / `FRONTEND_ORIGINS`** — default ใน `backend/src/app.ts` อนุญาต `http://localhost:5173` และ `127.0.0.1:5173`; ตั้งค่า `FRONTEND_ORIGINS` คั่นด้วยจุลภาคบน production — `npm run phase2:verify` ตรวจ preflight/response กับ Origin `localhost:5173`; รายละเอียด deploy ดู [`README.md`](../README.md)
- [x] **`/health` และ service index `GET /`** — โครงสร้าง JSON ที่ root ระบุ `paths.health`, `paths.push`, `paths.finance` — ตรวจโดย `scripts/verify-phase2-api.mjs`
- [x] **Admin `x-admin-key`** — middleware `adminAuth` บน `/api/admin/finance`, cram, school-activities, import ฯลฯ — verify เรียก `GET /api/admin/finance/overview` ไม่มีคีย์ได้ **401**; เทสหน่วยใน [`backend/src/app.test.ts`](../backend/src/app.test.ts)
- [x] **Push** — `GET /api/push/vapid-public` (200 เมื่อตั้ง VAPID หรือ **503** เมื่อยังไม่ตั้ง); `POST /api/push/subscribe` ยืนยันด้วย body ว่างได้ **400** — route ทำงาน; **GitHub Actions** รัน `phase2:verify` หลัง build backend

---

## Phase 3 — สมาชิก & การผูก LINE — เสร็จแล้ว (repo + API smoke, 2026-04-18)

- [x] **Backend + flow ฐาน** — `POST /api/auth/line/token`, `POST /api/members/session-member`, `POST /api/members/app-roles`, `POST /api/members/verify-link` มี validation ชัด; `GET /api/portal/member` snapshot — ตรวจโดย `npm run phase3:verify` (`scripts/verify-phase3-members-line.mjs`); เทสเพิ่มใน [`backend/src/app.test.ts`](../backend/src/app.test.ts) สำหรับบางเส้นทาง; **GitHub Actions** รัน `phase3:verify` หลัง Phase 2
- [x] **Frontend หน้าผูกบัญชี** — เส้นทาง `/auth/link` และ [`MemberLinkPanel`](../frontend/src/components/MemberLinkPanel.tsx) ใน [`App.tsx`](../frontend/src/App.tsx) — โค้ดพร้อมใช้งาน
- [x] **กู้เซสชัน** — `POST /api/members/session-member` + การเรียกจาก UI ตามแนวทางที่ออกแบบ (refresh แล้วโหลดสมาชิกที่ผูกแล้ว)
- [x] **a11y / ข้อความ error / ทดสอบข้ามอุปกรณ์** — ตาม MODULE_PROGRESS ยังระบุเป็น **ช่อง QA หลัง deploy** (ไม่ assert อัตโนมัติใน repo) — แนะนำทำ smoke manual บนมือถือ/เบราว์เซอร์จริง

---

## Phase 4 — พอร์ทัลสมาชิก (`/member/*`) — เสร็จแล้ว (repo + API smoke, 2026-04-18)

- [x] **Dashboard / โปรไฟล์ / การ์ด / สถิติ** — ข้อมูลจาก `GET /api/portal/member` (`statsCards`, `roleCards`, `batchDistribution`, `meetingReports`, `requestTrend`, `yupparajDonationActivities`) — ตรวจโดย `npm run phase4:verify` (`scripts/verify-phase4-member-portal.mjs`); เทสโครงสร้างใน [`backend/src/app.test.ts`](../backend/src/app.test.ts); UI เส้นทาง [`path="/member/*"`](../frontend/src/App.tsx) + [`MemberPortal`](../frontend/src/components/MemberPortal.tsx) / [`frontend/src/portal/`](../frontend/src/portal/)
- [x] **บริจาค + ประวัติ** — `POST /api/members/donations` และ `POST /api/members/donations/history` มี validation (body ว่างได้ **400**) — ตรวจโดย `phase4:verify`; `GET /` ระบุ `paths.membersDonations`
- [x] **คำร้องจากสมาชิก** — `POST /api/members/request-status` (body ว่าง **400**) — probe ใน `phase4:verify`
- [x] **Web Push opt-in** — `GET /api/push/vapid-public` (**200** หรือ **503**) — คู่ Phase 2; ตรวจใน `phase4:verify`
- [x] **สลับบทบาท / เมนูพอร์ทัล** — `AppRoles` / `RequireAppRoles` + `POST /api/members/app-roles` — ครอบคลุมใน Phase 3 verify และโค้ด [`App.tsx`](../frontend/src/App.tsx); **GitHub Actions** รัน `phase4:verify` หลัง Phase 3
- [x] **a11y / ทดสอบข้ามอุปกรณ์** — ตาม MODULE_PROGRESS ยังเป็น **ช่อง QA หลัง deploy** (ไม่ assert อัตโนมัติ)

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
