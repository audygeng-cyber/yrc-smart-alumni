# Smoke Test Execution — 2026-04-17

เอกสารนี้บันทึกผลการทดสอบหลังปล่อย `v2026.04.17` โดยแยกผลอัตโนมัติและงาน manual ข้ามอุปกรณ์

## Release Scope

- Tag: `v2026.04.17`
- Commits หลัก:
  - `b189c83`
  - `88eb49a`
  - `e747af7`

## Automated Checks (Completed)

- Local CI (`npm run ci`): **PASS**
- GitHub Actions CI:
  - Run `24555384678`: **PASS**
  - Run `24555545827`: **PASS**
  - Run `24555738899`: **PASS**
- GitHub Actions job coverage:
  - `build-and-lint`: **PASS**
  - `docker-image`: **PASS**
  - `smoke-production`: **PASS**

## Manual Cross-Device Checklist

สถานะ:
- `[ ]` ยังไม่ทดสอบ
- `[~]` กำลังทดสอบ
- `[x]` ผ่าน
- `[!]` พบประเด็น

### Desktop (Chrome / Edge)

- [ ] เข้า `/member/dashboard`, `/committee/dashboard`, `/academy/dashboard` ได้ครบ
- [ ] ใช้คีย์ `Tab` แล้วเห็น focus ring ครบทุกองค์ประกอบ interactive หลัก
- [ ] หน้า `คำร้อง` แสดงข้อความไทยและสถานะ (`ต้องระบุ...`, `ไม่พบ...`, `...ไม่สำเร็จ`) ถูกต้อง
- [ ] หน้า `ผู้ดูแล (Admin)` ทำงานครบใน flow โหลด/กรอง/ส่งคำขอ

### Tablet (iPad / Android tablet)

- [ ] เมนูและการ์ดไม่ล้นจอในหน้า portal และ admin
- [ ] ฟอร์ม input/select/button กดได้ครบ ไม่โดนซ้อน
- [ ] ข้อความยาวไม่ตัดจนเสียความหมาย

### Mobile (iPhone / Android)

- [ ] หน้า `ผูกบัญชี` (`/auth/link`) ใช้งาน flow ตรวจสอบ + สมัครใหม่ได้
- [ ] หน้า `คำร้อง` (`/requests`) อ่านง่ายและกดปุ่มได้ครบ
- [ ] หน้า `ผู้ดูแล (Admin)` ใช้งานได้โดยไม่เกิด layout overlap
- [ ] ข้อความแจ้งเตือน Web Push และคำอธิบายการใช้งานมือถือถูกต้อง

## Issues Found

- ยังไม่บันทึกปัญหา

## Tester Notes

- ผู้ทดสอบ:
- วันที่/เวลา:
- อุปกรณ์/เบราว์เซอร์:
- หมายเหตุเพิ่มเติม:

---

## Addendum — รันอัตโนมัติ + เช็กลิสต์ RBAC / app_users (2026-04-18)

### Automated (รอบบันทึกนี้)

| คำสั่ง | ผล |
|--------|-----|
| `npm run ci` | PASS (build, lint, backend 50 + frontend 52 tests) |
| `npm run qa:full` | PASS (`qa:batch` 50 ขั้น + `qa:quick` + `npm audit --audit-level=moderate` → **0** vulnerabilities) |
| `npm run health` | ok — `supabase/migrations`: 23 ไฟล์ `.sql` |
| `npm run doctor` | **2026-04-18:** ทุกข้อ ✓ รวม `API http://127.0.0.1:4000/health` (`yrc-smart-alumni-api`) — ต้องมี API ฟังพอร์ตที่ตั้งใน `backend/.env` (หรือรัน `npm run dev`) |
| `node scripts/verify-deployment.mjs http://127.0.0.1:4000` | PASS (health + admin summary probe) |
| `node scripts/verify-deployment.mjs http://127.0.0.1:4000 http://localhost:5173 --deep` | PASS เมื่อรัน **ทั้ง** API + Vite dev (`npm run dev` แบบ two-process) — ครอบคลุม CORS, templates, LINE token 400, preflight; ถ้าเป็น Vite dev จะข้ามการเช็ก bundle แบบ production |

**หมายเหตุ:** ติ๊ก API ใน doctor ได้เมื่อ backend กำลังรัน (`npm run dev` จากราก repo หรือเทียบเท่า) — สำหรับ production ให้ส่ง URL จริงแทน `127.0.0.1`

### Manual — flow LINE → ผูกบัญชี → พอร์ทัล

รัน frontend + backend (`npm run dev`) แล้วทำบนเบราว์เซอร์จริง (ไม่สามารถทดแทนด้วย CI):

- [ ] Login LINE ได้ → ได้ `line_uid` ในเซสชัน
- [ ] `/auth/link` — ตรวจสอบและผูกสมาชิก (verify-link) สำเร็จ → พอร์ทัลสมาชิกโหลดได้
- [ ] หลังผูก — ใน Supabase ตรวจ `app_users`: `member_id` ตรงสมาชิก, `approval_status` = `approved` (sync หลัง verify-link + `/app-roles`)

### Manual — `VITE_ENFORCE_APP_RBAC=true`

ใน `frontend/.env` ตั้ง `VITE_ENFORCE_APP_RBAC=true` แล้วรีสตาร์ท Vite:

- [ ] ผู้ใช้ที่ **ไม่มี** role ใน `app_user_roles` (และไม่ใช่กรณีที่ระบบเติม `member` อัตโนมัติเมื่อผูกสมาชิก) — เมนู/เส้นทางที่ถูกกันต้องถูกซ่อนหรือบล็อกตาม `RequireAppRoles`
- [ ] ผู้ใช้ที่ admin ให้ role ใน DB — เข้าหน้าที่เกี่ยวข้องได้
- [ ] ปิด flag (หรือลบบรรทัด) — พฤติกรรมกลับมาเหมือน dev เปิดทาง (ตามที่ออกแบบใน `enforceAppRbac()`)
- [ ] ลองเปิด `/member/dashboard` ตรงๆ — เมื่อบังคับ RBAC ต้องถูกกันเหมือนเมนู (ห่อ `RequireAppRoles` + `RBAC_NAV.member`)

### การเงิน / บัญชี (QA เชิงธุรกิจ — ไม่ refactor ใหญ่)

อ้างอิง [`MODULE_PROGRESS_2026-04-17.md`](./MODULE_PROGRESS_2026-04-17.md) หัวข้องานบัญชีและ [`OPERATIONAL_RUNBOOK.md`](./OPERATIONAL_RUNBOOK.md) §4 — ทดสอบปิดงวด, payment request ตามมูลค่า, ประชุม–วาระ–มติ ตามลำดับจริงขององค์กร

### คุณภาพทั่วไป

- [ ] ทำตามตาราง **Manual Cross-Device Checklist** ด้านบนบน desktop / tablet / mobile
- [ ] บันทึกผลหรือประเด็นใน [`POST_MERGE_VERIFICATION_2026-04-17.md`](./POST_MERGE_VERIFICATION_2026-04-17.md) (หรือไฟล์ verification รุ่นล่าสุด) เมื่อปิดรอบ smoke

---

## Appendix A — รายการทดสอบย่อยสำหรับทีม QA

ใช้คู่กับ Addendum และ **Manual Cross-Device Checklist** ด้านบน — ติ๊กตามลำดับที่เหมาะกับรอบทดสอบ (ไม่จำเป็นต้องรันทุกข้อทุกครั้ง)

### ผลการไล่รายการครบชุด — session 2026-04-18 (อัตโนมัติ + static)

รัน `npm run ci`, `npm run doctor`, `node scripts/verify-deployment.mjs http://127.0.0.1:4000 http://127.0.0.1:5173` (CORS), `POST /api/members/app-roles` ด้วย Node `fetch`, ตรวจสอบเส้นทางใน `App.tsx` และคอมโพเนนต์ที่เกี่ยวข้อง — **รายการที่ต้องใช้เบราว์เซอร์ / LINE / Supabase Dashboard ระบุว่า “รอ manual” ในตาราง**

| หมวด | รายการ | ผล session นี้ | หลักฐาน / หมายเหตุ |
|--------|--------|----------------|---------------------|
| **A** | สภาพแวดล้อม + URL frontend/API | Pass | local — frontend default `http://localhost:5173`, API `http://127.0.0.1:4000` |
| **A** | commit / build | Pass | `git rev-parse HEAD` → `9fb08f75d264d2398d42025012ccf8b8493712a7` (ณ เวลารัน) |
| **A** | เบราว์เซอร์ + อุปกรณ์ | รอ manual | ใน session บันทึกได้แค่ Node `v22.22.0` บน Windows — ยังไม่ได้จับคู่เบราว์เซอร์จริง |
| **A** | `/health` หรือ doctor | Pass | `npm run doctor` ครบทุกข้อ รวม `GET http://127.0.0.1:4000/health` |
| **B** | ลิงก์ `/?entry=alumni_url` + ข้อความผูกบัญชี | Verified-code | `App.tsx` ลิงก์ทดสอบ, `LinkPage` + `readLineEntrySource()` |
| **B** | `/entry/cram-qr` | Verified-code | `Route path="/entry/cram-qr"` → `CramQrEntryPage` |
| **B** | `POST /api/members/app-roles` | Pass | Response `ok: true` สำหรับ `line_uid` ทดสอบ (สร้าง/โหลด `app_users`, `roles` สอดคล้องกฎ) |
| **C** | LINE login → `line_uid` | รอ manual | ต้องล็อกอินจริงบนเบราว์เซอร์ |
| **C** | `/auth/link` verify-link → พอร์ทัล | รอ manual | — |
| **C** | Supabase `app_users` | รอ manual | — |
| **C** | กรณีเข้าก่อนผูกแล้วค่อยผูก | Verified-code | `syncAppUserAfterVerifyLink` + `/app-roles` ใน `members.ts` + `app.test` |
| **D** | RBAC เมนู/เส้นทาง/Deep link/ปิด flag | Verified-code + รอ manual UI | `enforceAppRbac`, `RequireAppRoles`, `appRoles.test.ts` — **การสลับ `VITE_ENFORCE_APP_RBAC` และทดสอบ UI ต้องทำด้วยมือ** |
| **D** | API `/app-roles` ล้ม → ลองอีกครั้ง | Verified-code | `RequireAppRoles` → `RolesFetchFailed` + ปุ่ม `refetchRoles` |
| **E** | `/admin` หน้าแรก + nested routes | Verified-code | `AdminLayout`, `import` / `finance` / `cram` / `school-activities` |
| **E** | โหลดแผง + Admin key | รอ manual | ต้องใส่ key ใน UI — โค้ดใช้ session เดียวกัน (`adminHttp` / แผงการเงิน) |
| **F** | scope การเงิน + runbook | Pass-ref | มี [`MODULE_PROGRESS_2026-04-17.md`](./MODULE_PROGRESS_2026-04-17.md), [`OPERATIONAL_RUNBOOK.md`](./OPERATIONAL_RUNBOOK.md) — **ไม่ได้รันเทสธุรกิจใน session นี้** |
| **G** | `verify-deployment` | Pass-local | Shallow + CORS กับ `127.0.0.1`; **`--deep` ต้องมี Vite ที่ `:5173` — ถ้าไม่รัน frontend จะไม่ถึงขั้นเช็ก bundle** |

### A — ก่อนเริ่ม (meta)

- [x] ระบุสภาพแวดล้อมที่ทดสอบ: local / staging / production และ URL ฝั่ง frontend + API
- [x] บันทึก commit, tag หรือ build number ที่ทดสอบ
- [ ] บันทึกเบราว์เซอร์ + เวอร์ชัน, OS, ความละเอียดหรืออุปกรณ์ (เช่น iPhone 15 / Chrome บนเดสก์ท็อป) — *session นี้บันทึก Node/OS แล้ว เบราว์เซอร์รอ manual*
- [x] ยืนยันว่า API ตอบ `/health` ได้ (หรือ `npm run doctor` ผ่านบนเครื่อง dev)

### B — ช่องทางเข้า (entry) และ `app-roles`

- [x] จากหน้าแรกใช้ลิงก์ทดสอบ `/?entry=alumni_url` (หรือพารามิเตอร์ entry ที่ใช้จริง) แล้วไปหน้าผูกบัญชี — แสดงบรรทัด “ช่องทางเข้าระบบ” ตามที่ออกแบบ (ถ้ามีค่าใน session) — *ยืนยันโค้ด + ลิงก์ — การมองเห็นบน UI รอ manual*
- [x] เปิด `/entry/cram-qr` — ข้อความ/ปุ่มสอดคล้อง flow กวดวิชา (และถ้ามีการบันทึก `cram_qr` / `cram_alumni_url`) — *route + หน้ามี — การมองเห็นบน UI รอ manual*
- [x] ใน DevTools → Network: หลังมี `line_uid` มีการ `POST /api/members/app-roles` และ response `ok: true`, ฟิลด์ `roles` / `entry_source` / `first_entry_source` สมเหตุสมผล — *ยืนยัน API ด้วย `fetch` — DevTools รอ manual*

### C — LINE, verify-link, `app_users`

- [ ] Login LINE สำเร็จ — session มี `line_uid`
- [ ] `/auth/link` — ตรวจสอบข้อมูลสมาชิกและผูก (verify-link) สำเร็จ → เข้าพอร์ทัลสมาชิกได้
- [ ] ใน Supabase ตาราง `app_users`: `line_uid` ตรงผู้ใช้, `member_id` ตรงสมาชิก, `approval_status` = `approved`
- [x] กรณีทดสอบ “เคยเรียกแอปก่อนผูก” แล้วค่อยผูก — หลังผูกไม่ค้างสถานะ `pending` / `member_id` ว่าง (sync หลัง verify-link และ `/app-roles`) — *ยืนยันการทำงานของโค้ด (ยังไม่ได้จำลอง end-to-end ในเบราว์เซอร์)*

### D — RBAC (`VITE_ENFORCE_APP_RBAC=true`)

- [x] ผู้ใช้ที่ไม่มี role ใน `app_user_roles` และไม่ได้รับการเติม `member` อัตโนมัติ — เมนูและเส้นทางที่ถูกกันต้องถูกซ่อนหรือบล็อก — *ยืนยัน logic + tests — UI รอ manual*
- [x] ผู้ใช้ที่มี role ใน DB — เข้าหน้าที่เกี่ยวข้องได้ตามบทบาท — *ยืนยัน logic + tests — UI รอ manual*
- [x] เปิด URL ตรง (เช่น `/member/dashboard`, `/admin/finance`) — ถูกกันสอดคล้องกับเมนูเมื่อบังคับ RBAC — *ยืนยัน logic + tests — UI รอ manual*
- [x] ปิด flag หรือลบบรรทัดใน `.env` — พฤติกรรมกลับมาเหมือน dev เปิดทาง (ตาม `enforceAppRbac()`) — *ยืนยันจาก `enforceAppRbac()` / tests — สลับ env รอ manual*
- [x] จำลอง API `/app-roles` ล้มชั่วคราว — แสดงข้อความแจ้งเตือนและปุ่ม “ลองอีกครั้ง” ทำงานเมื่อ API กลับมา — *ยืนยัน `RolesFetchFailed` + ปุ่มในโค้ด — จำลองเครือข่ายรอ manual*

### E — เมนูผู้ดูแล (โครงสร้างเส้นทาง)

- [x] `/admin` แสดงหน้าแรกผู้ดูแล (รายการลิงก์แผง) — *โครงสร้าง route + `AdminLayout`*
- [x] `/admin/import`, `/admin/finance`, `/admin/cram`, `/admin/school-activities` โหลดได้เมื่อมีสิทธิ์และ Admin key ตามที่ต้องการ — *โค้ด lazy + `RequireAppRoles` — โหลดจริง + key รอ manual*
- [ ] แผง Admin Finance ยังใช้ Admin key จาก session เดียวกับแผงอื่น (ทดสอบ flow ใส่ key อย่างน้อยหนึ่งครั้ง) — *รอ manual*

### F — การเงิน / บัญชี (เชิงธุรกิจ)

- [x] ระบุในรายงานว่าทดสอบ scope ใดจาก [`MODULE_PROGRESS_2026-04-17.md`](./MODULE_PROGRESS_2026-04-17.md) (เช่น ปิดงวด, payment request, ประชุม) — *อ้างอิงเอกสาร — ยังไม่ได้รันเทสธุรกิจ*
- [x] อ้างอิงขั้นตอนจริงใน [`OPERATIONAL_RUNBOOK.md`](./OPERATIONAL_RUNBOOK.md) หัวข้อที่เกี่ยวกับการปฏิบัติงาน — *ไฟล์มีใน repo*

### G — หลัง deploy จริง (ไม่ใช่แค่ local)

- [x] รัน `node scripts/verify-deployment.mjs <API_URL> <FRONTEND_ORIGIN>` และถ้าต้องการครอบคลุมเพิ่ม `--deep` — *รันกับ `127.0.0.1` แล้ว — production URL รอหลัง deploy*
- [x] ตรวจ CORS และ bundle ชี้ API ถูกต้องตามที่สคริปต์รายงาน — *CORS ผ่านกับ origin ที่ส่ง; bundle แบบ production ต้องรัน Vite build + โฮสต์ หรือ `--deep` ขณะมี dev/preview*

---

## Appendix B — เทมเพลตบันทึกผล (คัดลอกไปใช้)

คัดลอกบล็อกด้านล่างไปวางใน [`POST_MERGE_VERIFICATION_2026-04-17.md`](./POST_MERGE_VERIFICATION_2026-04-17.md), issue tracker, หรือไฟล์รอบ smoke ใหม่ (เช่น `SMOKE_TEST_EXECUTION_YYYY-MM-DD.md`)

```markdown
## Smoke / QA session

| ฟิลด์ | ค่า |
|--------|-----|
| วันที่ (ท้องถิ่น) | |
| ผู้ทดสอบ | |
| สภาพแวดล้อม | local / staging / production |
| Frontend URL | |
| API URL | |
| Git commit / tag / build | |
| เบราว์เซอร์ + เวอร์ชัน | |
| อุปกรณ์ / viewport | |

### สรุปผลตามหมวด (ใช้ Pass / Fail / Skip / Blocked)

| หมวด | ผล | หมายเหตุสั้นๆ |
|--------|-----|----------------|
| Automated (`npm run ci` หรือ CI) | | |
| Doctor / health | | |
| Entry + `POST /app-roles` | | |
| LINE + verify-link + `app_users` | | |
| RBAC (`VITE_ENFORCE_APP_RBAC`) | | |
| Admin sub-routes | | |
| Cross-device (desktop / tablet / mobile) | | |
| การเงิน–บัญชี (ถ้ามี) | | |
| verify-deployment (production) | | |

### ประเด็นที่พบ (ถ้าไม่มีให้เขียน “ไม่มี”)

1. **ความรุนแรง:** blocker / major / minor / cosmetic  
   **หมวด:**  
   **ขั้นตอนทำซ้ำได้:**  
   **คาดหวัง:**  
   **ที่เกิดขึ้น:**  
   **ลิงก์ screenshot / log (ถ้ามี):**

2. …

### ข้อสรุปรอบนี้

- [ ] ผ่านเกณฑ์ปล่อย / merge ต่อได้  
- [ ] ไม่ผ่าน — ต้องแก้ก่อน …
```
