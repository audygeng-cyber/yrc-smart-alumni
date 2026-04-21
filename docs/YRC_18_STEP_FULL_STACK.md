# YRC Smart Alumni — แผน 18 ขั้นตอน (รันทีละขั้น)

**เทมเพลตแก้เลข/พาธได้:** [`YRC_18_STEP_FULL_STACK.template.md`](./YRC_18_STEP_FULL_STACK.template.md) (placeholder `{{REPO_ROOT}}`, `{{S01}}`–`{{S18}}`, พอร์ต) — **สคริปต์ PowerShell ตัวอย่าง:** [`scripts/yrc-18-steps.example.ps1`](../scripts/yrc-18-steps.example.ps1) (แก้ `$StepFirst`, `$RepoRoot`, `$PortApi` ที่หัวไฟล์)

**จำนวนขั้นตอนทั้งหมด: 18 ขั้นตอน** — ออกแบบให้รันทีละขั้นจากบนลงล่าง

**ความหมาย “ทำงานได้ 100%”:** ใน repo นี้หมายถึง **โค้ด build/test ผ่าน + API/DB/LINE/CORS ตั้งค่าครบตามที่ระบบต้องการ** ส่วนที่ repo ทำแทนไม่ได้คือ **บัญชี LINE Developers, โปรเจกต์ Supabase, และโฮสต์ production (Vercel/Cloud Run)** — ต้องมีค่าจริงจากคุณในขั้นที่ระบุ

รากโปรเจกต์ (ใช้ PowerShell ที่โฟลเดอร์ `YRC Smart Alumni`):

```powershell
Set-Location "C:\Users\gengk\Desktop\YRC Smart Alumni"
```

---

## ขั้นที่ 1 — ตรวจ Node.js

**ทำ:** ต้องเป็น Node 20 ขึ้นไป

```powershell
node -v
```

**ผ่าน:** แสดง `v20.x` หรือสูงกว่า

---

## ขั้นที่ 2 — ติดตั้งแพ็กเกจ (ราก monorepo)

```powershell
npm install
```

---

## ขั้นที่ 3 — สร้างไฟล์ env จากตัวอย่าง (ครั้งแรก)

```powershell
npm run setup:env
```

สร้าง `backend/.env` และ `frontend/.env` จาก `.env.example` เมื่อยังไม่มีไฟล์

---

## ขั้นที่ 4 — Supabase: โปรเจกต์ + migration ตามลำดับ

**ทำใน Supabase Dashboard (หรือ Supabase CLI):** สร้างโปรเจกต์ แล้วรัน SQL ใน `supabase/migrations/` **ตามลำดับชื่อไฟล์** — อย่าข้ามถ้าต้องการฟีเจอร์ครบ (ดูรายการล่าสุดด้วย `npm run migrations:list`)

ขั้นต่ำที่ README เน้น:

- `20260415120000_initial_members.sql`
- `20260415140000_push_subscriptions.sql` (ถ้าใช้ Web Push)

---

## ขั้นที่ 5 — กรอก `backend/.env` ส่วนฐานข้อมูล + คีย์แอดมิน

แก้ไฟล์ `backend/.env` ให้มีอย่างน้อย:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_UPLOAD_KEY` (สำหรับ import/admin ที่ต้องใช้ header)

(ยังไม่ใส่ LINE ได้ — บางหน้าใช้ข้อมูลตัวอย่างในโค้ดได้ตาม README)

---

## ขั้นที่ 6 — LINE Login: ช่องทาง + ค่า env ให้ตรงกันทุกที่

**ทำใน LINE Developers:** สร้าง LINE Login channel, เปิด OpenID (`openid profile`), ตั้ง **Callback URL** ให้ตรงกับที่แอปใช้

**แล้วกรอก:**

- `backend/.env`: `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`, `LINE_REDIRECT_URIS` (ต้องครอบคลุม URI ที่ใช้จริง)
- `frontend/.env`: `VITE_LINE_CHANNEL_ID`, `VITE_LINE_REDIRECT_URI`

รายละเอียดเช็กลิสต์: [`docs/LINE_LOGIN_CHECKLIST.md`](./LINE_LOGIN_CHECKLIST.md) และ [`README.md`](../README.md) ส่วน LINE Login

---

## ขั้นที่ 7 — ตรวจ `frontend/.env` ชี้ API

อย่างน้อย:

- `VITE_API_URL=http://localhost:4000` (dev)
- ค่า `VITE_LINE_*` ให้สอดคล้องขั้นที่ 6

---

## ขั้นที่ 8 — ตรวจสุขภาพเครื่อง (env + `/health`)

เปิดเทอร์มินัลหนึ่งรัน API ก่อน:

```powershell
npm run dev -w backend
```

เปิดอีกเทอร์มินัล:

```powershell
npm run doctor
```

**ผ่าน:** มีเครื่องหมายถูกสำหรับ env ที่จำเป็น และ `/health` ตอบได้ (ถ้า backend รันอยู่)

---

## ขั้นที่ 9 — เกณฑ์คุณภาพโค้ด (build + lint + test)

```powershell
npm run ci
```

**ผ่าน:** build ทั้งสอง workspace, lint, test ผ่านหมด

---

## ขั้นที่ 10 — Phase 0: API health หลัง build backend

```powershell
npm run phase0:verify
```

---

## ขั้นที่ 11 — Phase 1: ตรวจ migration ใน repo

```powershell
npm run phase1:verify
```

---

## ขั้นที่ 12 — Phase 2: ตรวจ API ชุด phase 2

```powershell
npm run phase2:verify
```

---

## ขั้นที่ 13 — Phase 3: สมาชิก + เส้นทาง LINE (ไม่แทนการล็อกอิน LINE จริง)

```powershell
npm run phase3:verify
```

---

## ขั้นที่ 14 — Phase 4: พอร์ทัลสมาชิก

```powershell
npm run phase4:verify
```

---

## ขั้นที่ 15 — รันแอปเต็มสแต็ก + ทดสอบด้วยมือ

หยุด process เก่าถ้ามี แล้ว:

```powershell
npm run dev
```

- เปิดเบราว์เซอร์: `http://localhost:5173`
- ทดสอบ **LINE Login** จริง (ต้องได้ `line_uid` หลัง callback ตรงตามขั้นที่ 6)
- ทดสอบ flow ผูกสมาชิก/คำร้องตาม [`README.md`](../README.md) และ [`docs/MEMBER_FLOW.md`](./MEMBER_FLOW.md) ถ้าต้องการครบ end-to-end

---

## ขั้นที่ 16 — (ถ้าต้องการแจ้งเตือน Push ในเบราว์เซอร์) VAPID + migration push

1. ยืนยันว่ารัน migration push แล้ว (ขั้นที่ 4)
2. สร้างคีย์: `npx web-push generate-vapid-keys`
3. ใส่ใน `backend/.env`: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:...`
4. รีสตาร์ท backend

ดู [`README.md`](../README.md) ส่วน Web Push

---

## ขั้นที่ 17 — Production: Vercel + Cloud Run + CORS + อัปเดต LINE callback

1. **Vercel:** Root = ราก repo, `npm ci`, build `npm run build -w frontend`, output `frontend/dist`, ตั้ง `VITE_API_URL` และ `VITE_*` ให้ตรง production
2. **Cloud Run:** deploy Docker จากราก, ใส่ env เทียบ `backend/.env` รวม **`FRONTEND_ORIGINS`** = origin เว็บ Vercelแบบเต็ม `https://...`
3. อัปเดต **Callback URL** ใน LINE ให้เป็น URL Vercel

รายละเอียด: [`README.md`](../README.md) Deploy, [`docs/DEPLOY_VERIFY.md`](./DEPLOY_VERIFY.md)

---

## ขั้นที่ 18 — ตรวจหลัง deploy + QA รวดเร็ว

แทนที่ URL ให้เป็นของคุณ:

```powershell
npm run verify:deploy -- https://YOUR_API.run.app https://YOUR_APP.vercel.app
```

(ถ้าต้องการละเอียดขึ้น: `npm run verify:deploy:deep`)

ตรวจ LINE/CORS แบบไม่ต้องมี secret ใน repo:

```powershell
npm run verify:vercel-line-cors -- https://YOUR_API.run.app https://YOUR_APP.vercel.app
```

จากนั้น (บนเครื่องที่ติดตั้ง deps แล้ว):

```powershell
npm run qa:quick
```

**หมายเหตุ GitHub Actions:** ตั้ง repository secrets `VERIFY_API_BASE` และ `VERIFY_FRONTEND_ORIGIN` ถ้าต้องการให้ job smoke บน CI รันจริง — ดู [`README.md`](../README.md) ส่วน CI

---

## สรุปจำนวนขั้นตอน

| ลำดับ | หัวข้อสั้นๆ |
|---:|---|
| 1 | ตรวจ Node 20+ |
| 2 | `npm install` |
| 3 | `npm run setup:env` |
| 4 | Supabase + migrations |
| 5 | `backend/.env` DB + admin |
| 6 | LINE Developers + LINE env |
| 7 | `frontend/.env` API + LINE |
| 8 | `npm run doctor` (มี backend รัน) |
| 9 | `npm run ci` |
| 10 | `npm run phase0:verify` |
| 11 | `npm run phase1:verify` |
| 12 | `npm run phase2:verify` |
| 13 | `npm run phase3:verify` |
| 14 | `npm run phase4:verify` |
| 15 | `npm run dev` + ทดสอบมือ |
| 16 | VAPID (ถ้าใช้ Push) |
| 17 | Deploy + CORS + LINE callback |
| 18 | `verify:deploy` + `qa:quick` |

คำสั่งย่อหลัง clone ครั้งแรก (ไม่ครบทุกขั้น แต่ช่วยเริ่มเร็ว): `npm run bootstrap` (= `setup:env` + `doctor`)
