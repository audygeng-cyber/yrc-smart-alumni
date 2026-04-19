# YRC Smart Alumni — Project Master Guidelines (บันทึก workflow + สถานะ repo)

เอกสารนี้สอดคล้องกับ **Master Guidelines** ที่ทีมกำหนด และเชื่อมกับเอกสาร/โค้ดที่มีอยู่จริงใน repo — ใช้เป็นแผนที่เดียวสำหรับนักพัฒนาและผู้บริหารโครงการ

**อัปเดตล่าสุด:** 2026-04-18

---

## 1. ภาพรวมโปรเจกต์และบทบาท

| แนวทาง Master | สถานะใน repo | อ้างอิง |
|----------------|-------------|---------|
| แอดมินจัดการงานหลัก (วาระ, โหวต, ลงชื่อ ฯลฯ) ผ่าน UI โดยไม่ต้องแตะซอร์สเป็นประจำ | **ใกล้เป้า** — โมดูล Admin Finance + งานประชุม/เอกสาร/ปิดงวดมีใน UI + API; งานบางส่วนยังต้อง QA ข้อมูลจริง | [`MODULE_PROGRESS_2026-04-17.md`](./MODULE_PROGRESS_2026-04-17.md), [`OPERATIONAL_RUNBOOK.md`](./OPERATIONAL_RUNBOOK.md) |
| สถาปัตยกรรมชัด — แยกฝั่งบัญชีสมาคม vs กวดวิชาใน DB | **ทำแล้วใน schema** — `legal_entities`, `fund_scope` (เช่น `association`, `cram_school`, `yupparaj_school`) | [`ACCOUNTING_FLOW.md`](./ACCOUNTING_FLOW.md), migrations ใน `supabase/migrations/` |

---

## 2. Tech Stack

| Master ระบุ | ความเป็นจริงใน repo | หมายเหตุ |
|-------------|---------------------|-----------|
| React, Tailwind | **มี** — Vite 7, React 19, Tailwind 3 | `frontend/package.json` |
| Shadcn/ui | **ยังไม่ได้ติดตั้ง** — UI เป็น Tailwind + component ภายใน | ถ้าต้องการให้ตรง Master แบบเต็ม: เพิ่ม Shadcn เป็นงานแยก (ไม่บังคับสำหรับการทำงานปัจจุบัน) |
| Node.js, Vercel, Cloud Run | **มี** — Frontend deploy Vercel; API Cloud Run | [`README.md`](../README.md), skill `.cursor/skills/yrc-smart-alumni/SKILL.md` |
| Supabase (PostgreSQL) | **มี** — migrations ใน `supabase/migrations/` | ไม่มีไฟล์ `schema.sql` เดี่ยวที่เป็น source of truth — **source of truth คือ migrations** |
| LINE Login / Push | **มี** — `backend/src/routes/lineAuth.ts`, push routes | [`LINE_LOGIN_CHECKLIST.md`](./LINE_LOGIN_CHECKLIST.md) |
| GitHub | **มี** — CI ใน `.github/workflows/ci.yml` | `npm run ci` ก่อน merge |

---

## 3. ฐานข้อมูลและสถาปัตยกรรม (Supabase)

| Master | สถานะ | ที่ไปดู |
|--------|--------|---------|
| ไม่ผูกนิยามคอลัมน์กับ Excel ถาวร — ใช้ relational + PK, timestamps | **ทำผ่าน migrations** | `supabase/migrations/*.sql` |
| แยกบัญชีสมาคม vs กวดวิชา | **มี** — entity + `fund_scope` | `ACCOUNTING_FLOW.md`, migration กิจกรรม/บริจาค |
| อ้าง schema ก่อน query | **ใช้ migrations + types ในโค้ด** — ไม่มี `schema.sql` แยก | ก่อนแก้ SQL ให้เปิด migration ล่าสุดที่เกี่ยวกับตารางนั้น |
| Error handling ตอนดึงข้อมูล | **ฝั่ง API** — แต่ละ route มี try/catch และ HTTP status | แนวทางเพิ่ม: ครอบคลุม edge case ตาม MODULE_PROGRESS |

---

## 4. Logic ธุรกิจหลัก

### 4.1 การบริจาค — แยก “กองอาหารกลางวัน” vs “ทุนการศึกษา”

| Master | สถานะใน repo |
|--------|----------------|
| จัดหมวดบริจาคและติดตามตามชื่อ/รุ่น | **บริจาคผูกกับ `members`, `batch`, `fund_scope`, กิจกรรม** — ไม่ได้ตั้งชื่อ enum ว่า “Lunch/Scholarship” ตรงตัวใน DB แต่ใช้ **`fund_scope`** + กิจกรรมโรงเรียน (`school_activities`) แยกโรงเรียน/สมาคม/กวดวิชา |

**งานต่อถ้าต้องการตรงคำศัพท์ Master เป๊ะ:** เพิ่มป้ายกำกับ/หมวดใน UI หรือ metadata ให้ map ไปยัง `fund_scope` + ชื่อกิจกรรม (ไม่บังคับเปลี่ยน schema ถ้ายังไม่มี requirement ชัด)

### 4.2 ระบบลงมติคณะกรรมการ + LINE

| Master | สถานะใน repo |
|--------|----------------|
| Real-time ผ่าน LINE | **Push มี** (`/api/push/*`); “real-time” แบบ WebSocket ยังไม่ใช่ — การแจ้งเตือนผ่าน push/refresh UI ตามที่ออกแบบ |
| กฎ “3 ใน 5” อนุมัติ | **ในโค้ดปัจจุบันใช้ quorum 2/3 + majority แบบมากกว่ากึ่งหนึ่ง** — ดู `backend/src/util/meetingRules.ts` | ถ้าต้องการ **3 จาก 5 โหวต** แบบเจาะจง ต้องนิยามใน policy + migration/คอลัมน์ผู้มีสิทธิ์ — **ยังไม่ใช่ค่า default** |
| กันโหวตซ้ำ / abstain | **มี workflow วาระ + โหวต + สรุป** — ดู MODULE_PROGRESS Core Work Update (meeting agendas, votes, close) |

### 4.3 โมดูลโรงเรียนกวดวิชา (ครู, เช็คชื่อ, คะแนน)

| Master | สถานะ |
|--------|--------|
| UI mobile-friendly สำหรับครู | **มีพอร์ทัล Academy + แอดมิน Cram** — เปอร์เซ็นต์และ QA ตาม [`MODULE_PROGRESS_2026-04-17.md`](./MODULE_PROGRESS_2026-04-17.md) |
| เช็คชื่อ present/late/absent, กรอกเกรด | **ตามที่ deploy** — ตรวจ route `/api/admin/cram/*` และหน้า `academyPages` / `AdminCramPanel` |

---

## 5. มาตรฐานโค้ดและ workflow AI

| Master | สถานะ |
|--------|--------|
| `.cursor/skills` / VENDORED_SKILLS | **มี** — ดู [`.cursor/skills/VENDORED_SKILLS.md`](../.cursor/skills/VENDORED_SKILLS.md) |
| UI สะอาด responsive | **ทำต่อเนื่อง** — ดู `UI_TH_TERMINOLOGY_CHECKLIST`, `LOCALIZATION_A11Y_HANDOFF` |
| ไม่ hardcode secret | **ใช้ env** — `backend/.env`, Vercel/Cloud Run; ห้าม commit `.env` |
| Prettier | **ไม่บังคับใน repo นี้** — มี ESLint; ถ้าต้องการให้ตรง Master แบบเต็ม: เพิ่ม Prettier + format on save เป็นงานแยก |
| Edge cases, loading | **บางหน้าใช้ aria-busy / skeleton ตาม MODULE_PROGRESS** — ปรับต่อได้ตามโมดูล |

---

## 6. คำสั่งปฏิบัติ (Execution)

ก่อน merge ชุดใหญ่หรือก่อนปิดงานสำคัญ:

```bash
npm run ci
```

ลำดับ deploy / ตรวจสอบ production:

| ขั้น | คำสั่ง / เอกสาร |
|------|------------------|
| Phase 0–4 verify | `npm run phase0:verify` … `npm run phase4:verify` | [`WORKFLOW_CODE_CHECKLIST.md`](./WORKFLOW_CODE_CHECKLIST.md) |
| LINE + CORS | `npm run verify:vercel-line-cors -- <API> <Origin>` | [`LINE_LOGIN_CHECKLIST.md`](./LINE_LOGIN_CHECKLIST.md) |
| Deploy หลัง merge | Push `master` → Vercel / Cloud Run ตาม runbook | [`OPERATIONAL_RUNBOOK.md`](./OPERATIONAL_RUNBOOK.md), [`DEPLOY_VERIFY.md`](./DEPLOY_VERIFY.md) |

**เอกสาร checklist เฟสโค้ด (dependency-first):** [`WORKFLOW_CODE_CHECKLIST.md`](./WORKFLOW_CODE_CHECKLIST.md) — บางช่อง Phase 5–7 อาจล้าหลังเมื่อเทียบกับรายละเอียดใน **MODULE_PROGRESS** (โมดูลหลายส่วนพัฒนาไปแล้ว) — เวลาปิดงานให้ยึด **MODULE_PROGRESS + โค้ดจริง** เป็นหลัก

---

## 7. งานที่ Master เน้นแต่ยังต้องติดตามต่อ (สรุป)

1. **นิยามโหวต “3 ใน 5”** ให้ชัดใน policy + โค้ด (ปัจจุบันเป็น quorum/majority แบบทั่วไป)  
2. **Shadcn/ui** — ถ้าต้องการให้ตรง stack ใน Master  
3. **Prettier** — ถ้าต้องการ format มาตรฐานเดียวกันทั้ง repo  
4. **QA ข้อมูลจริง / cross-device** — ตาม SMOKE และ MODULE_PROGRESS  
5. **แจ้งเตือน LINE หลังเหตุการณ์** — MODULE_PROGRESS ระบุบาง flow ยังไม่เชื่อม Messaging API เต็มรูปแบบ

---

## 8. ลิงก์ด่วน

| หัวข้อ | ไฟล์ |
|--------|------|
| Runbook องค์กร | [`OPERATIONAL_RUNBOOK.md`](./OPERATIONAL_RUNBOOK.md) |
| ความคืบหน้าโมดูล | [`MODULE_PROGRESS_2026-04-17.md`](./MODULE_PROGRESS_2026-04-17.md) |
| เช็กลิสต์เฟสโค้ด | [`WORKFLOW_CODE_CHECKLIST.md`](./WORKFLOW_CODE_CHECKLIST.md) |
| LINE Login + env | [`LINE_LOGIN_CHECKLIST.md`](./LINE_LOGIN_CHECKLIST.md) |
| บัญชี | [`ACCOUNTING_FLOW.md`](./ACCOUNTING_FLOW.md) |
| Cursor / skills | [`.cursor/skills/yrc-smart-alumni/SKILL.md`](../.cursor/skills/yrc-smart-alumni/SKILL.md) |
