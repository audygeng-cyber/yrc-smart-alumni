# Post-Merge Verification — 2026-04-17

## Scope

ยืนยันสถานะหลัง push งานรอบ localization + a11y + docs rollout บน `master`

## Commits Verified

- `b189c83` — `feat(i18n): standardize Thai UX messaging and focus accessibility`
- `88eb49a` — `docs: add release notes for localization and a11y rollout`

## GitHub Actions Result

### Run (latest docs follow-up)

- Workflow: `CI`
- Run ID: `24555545827`
- Commit: `88eb49a`
- Conclusion: `success`

### Jobs

- `build-and-lint`: success
- `docker-image`: success
- `smoke-production`: success

## Local Validation

- `npm run ci`: passed
- Working tree: clean after push

## Operational Note

- สถานะพร้อมใช้งานต่อเนื่อง
- หากมีการเพิ่ม route/page ใหม่ ให้ยึดมาตรฐานใน:
  - `docs/UI_TH_TERMINOLOGY_CHECKLIST.md`
  - `docs/LOCALIZATION_A11Y_HANDOFF.md`

---

## Automated QA — 2026-04-18 (RBAC / `app_users` / entry source)

รันในเครื่องพัฒนา (Windows, Node 22.x) — ไม่แทนการทดสอบบนเบราว์เซอร์จริงหรือ production

| คำสั่ง | ผล |
|--------|-----|
| `npm run qa:full` | PASS — `qa:batch` (50 checks), `npm run ci` (backend 50 + frontend 52 tests), `migrations:list`, `health`, `npm audit --audit-level=moderate` (0 vulnerabilities) |
| `npm run doctor` | PASS — `backend/.env` + Supabase + `ADMIN_UPLOAD_KEY` + `GET /health` บน `127.0.0.1:4000` |
| `verify-deployment.mjs` (local) | PASS — shallow + CORS; **--deep** กับ `http://127.0.0.1:4000` + `http://localhost:5173` เมื่อ Vite dev รันอยู่ (สคริปต์รองรับข้อความ LINE token ภาษาไทย + index แบบ Vite dev) |

**งาน manual ที่ยังต้องทำตามคน** (ดู checklist ใน [`SMOKE_TEST_EXECUTION_2026-04-17.md`](./SMOKE_TEST_EXECUTION_2026-04-17.md) Addendum + Manual Cross-Device): LINE login → ผูกบัญชี → ตรวจ `app_users` ใน Supabase, ทดสอบ `VITE_ENFORCE_APP_RBAC=true`, ข้ามอุปกรณ์, และ QA การเงินตาม [`OPERATIONAL_RUNBOOK.md`](./OPERATIONAL_RUNBOOK.md) §4 — หลัง deploy จริงให้รัน `node scripts/verify-deployment.mjs <API_URL> <FRONTEND_ORIGIN> [--deep]` กับ URL production

รายการทดสอบย่อยสำหรับทีม QA และเทมเพลตบันทึกผลอยู่ที่ **Appendix A / B** ใน [`SMOKE_TEST_EXECUTION_2026-04-17.md`](./SMOKE_TEST_EXECUTION_2026-04-17.md)

---

## Appendix B — บันทึกผลที่กรอกแล้ว (2026-04-18)

รอบไล่ Appendix A/B แบบอัตโนมัติ + static (ดูตารางผลใน [`SMOKE_TEST_EXECUTION_2026-04-17.md`](./SMOKE_TEST_EXECUTION_2026-04-17.md) หัวข้อ **ผลการไล่รายการครบชุด**)

### Smoke / QA session

| ฟิลด์ | ค่า |
|--------|-----|
| วันที่ (ท้องถิ่น) | 2026-04-18 |
| ผู้ทดสอบ | Cursor agent (session อัตโนมัติ + ตรวจโค้ด) |
| สภาพแวดล้อม | local |
| Frontend URL | `http://localhost:5173` (ค่าเริ่มต้น Vite) |
| API URL | `http://127.0.0.1:4000` |
| Git commit / tag / build | `9fb08f75d264d2398d42025012ccf8b8493712a7` (ณ เวลารัน `npm run ci`) |
| เบราว์เซอร์ + เวอร์ชัน | ยังไม่ได้บันทึก (รอ manual) |
| อุปกรณ์ / viewport | Windows, Node v22.22.0 |

### สรุปผลตามหมวด (Pass / Fail / Skip / Blocked)

| หมวด | ผล | หมายเหตุสั้นๆ |
|--------|-----|----------------|
| Automated (`npm run ci`) | Pass | build, lint, backend 50 + frontend 52 tests |
| Doctor / health | Pass | `npm run doctor` รวม GET `/health` |
| Entry + `POST /app-roles` | Pass / Verified-code | ลิงก์ + route ในโค้ด; API `ok: true` จาก Node `fetch` |
| LINE + verify-link + `app_users` | Skip | รอทดสอบบนเบราว์เซอร์ + Supabase |
| RBAC (`VITE_ENFORCE_APP_RBAC`) | Partial | logic + `appRoles.test.ts` + `RequireAppRoles`; สลับ env และ UI รอ manual |
| Admin sub-routes | Partial | โครงสร้าง route ยืนยันในโค้ด; ใส่ Admin key รอ manual |
| Cross-device (desktop / tablet / mobile) | Skip | ไม่ได้รันใน session นี้ |
| การเงิน–บัญชี (ถ้ามี) | Skip | อ้างอิงเอกสารแล้ว ยังไม่รันเทสธุรกิจ |
| verify-deployment (production) | Skip | รัน local แล้ว; URL production รอหลัง deploy |
| verify-deployment (local CORS) | Pass | `127.0.0.1:4000` + origin `127.0.0.1:5173` |

### ประเด็นที่พบ (ถ้าไม่มีให้เขียน “ไม่มี”)

ไม่มี — `verify-deployment --deep` กับ frontend ที่ `:5173` ไม่ได้รันครบใน session นี้เพราะไม่มี Vite ฟังพอร์ต (ถือเป็นเงื่อนไขแวดล้อม ไม่ใช่บั๊กโค้ด)

### ข้อสรุปรอบนี้

- [x] ผ่านเกณฑ์ **อัตโนมัติ + static** สำหรับ Appendix A/B — งานที่เหลือเป็น **manual** ตามตารางใน smoke doc
- [ ] ไม่ปิดเกณฑ์ปล่อย production จนกว่าจะทำรายการ “รอ manual” และ cross-device ครบ
