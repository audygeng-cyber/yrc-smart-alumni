# YRC Smart Alumni — เทมเพลตแผนขั้นตอน (แก้ตัวเลข/พาธแล้วคัดลอกใช้)

คัดลอกไฟล์นี้เป็น `YRC_18_STEP_FULL_STACK.custom.md` (หรือชื่ออื่น) แล้ว **Find & Replace** ตามตารางด้านล่าง — ไม่ต้องแก้โค้ดใน repo

## ตารางตัวแปร (แก้ที่นี่ — แล้วแทนทั้งไฟล์)

| Placeholder | ตัวอย่างที่ใส่แทน | หมายเหตุ |
|-------------|------------------|----------|
| `{{REPO_ROOT}}` | `C:\Users\you\Desktop\YRC Smart Alumni` | พาธรากโปรเจกต์ |
| `{{NODE_MAJOR_MIN}}` | `20` | Node ขั้นต่ำ (major) |
| `{{PORT_API}}` | `4000` | พอร์ต Express |
| `{{PORT_FRONTEND}}` | `5173` | พอร์ต Vite dev |
| `{{VITE_API_URL_DEV}}` | `http://localhost:4000` | ต้องตรง `{{PORT_API}}` |
| `{{FRONTEND_ORIGIN_DEV}}` | `http://localhost:5173/` | ต้องตรง `{{PORT_FRONTEND}}` + slash ท้ายตามที่ LINE ใช้ |
| `{{VERIFY_API_URL}}` | `https://xxxx.run.app` | หลัง deploy API |
| `{{VERIFY_FRONTEND_ORIGIN}}` | `https://your-app.vercel.app` | origin เว็บ (ไม่มี path) |
| `{{S01}}` … `{{S18}}` | `1` … `18` หรือ `101` … `118` | **เลขลำดับขั้น** — เปลี่ยนทั้งชุดให้สอดคล้องกัน |

**เคล็ดลับ:** ถ้าต้องการให้ขั้นเริ่มที่ `10` ให้ตั้ง `{{S01}}` = `10`, `{{S02}}` = `11`, … `{{S18}}` = `27` (หรือใช้สคริปต์ `scripts/yrc-18-steps.example.ps1` ที่มี `$StepFirst`)

---

## ขั้นที่ {{S01}} — ตรวจ Node.js

ต้องเป็น Node `{{NODE_MAJOR_MIN}}` ขึ้นไป

```powershell
Set-Location "{{REPO_ROOT}}"
node -v
```

---

## ขั้นที่ {{S02}} — ติดตั้งแพ็กเกจ

```powershell
Set-Location "{{REPO_ROOT}}"
npm install
```

---

## ขั้นที่ {{S03}} — สร้างไฟล์ env จากตัวอย่าง

```powershell
Set-Location "{{REPO_ROOT}}"
npm run setup:env
```

---

## ขั้นที่ {{S04}} — Supabase + migration

ทำใน Supabase: รัน SQL ใน `supabase/migrations/` ตามลำดับชื่อไฟล์ — ดูรายการด้วย:

```powershell
Set-Location "{{REPO_ROOT}}"
npm run migrations:list
```

---

## ขั้นที่ {{S05}} — กรอก `backend/.env` (DB + admin)

อย่างน้อย: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_UPLOAD_KEY`

---

## ขั้นที่ {{S06}} — LINE Login + env

LINE Developers + `backend/.env` (`LINE_*`) + `frontend/.env` (`VITE_LINE_*`) — ดู `docs/LINE_LOGIN_CHECKLIST.md`

---

## ขั้นที่ {{S07}} — ตรวจ `frontend/.env`

อย่างน้อย: `VITE_API_URL={{VITE_API_URL_DEV}}` และ `VITE_LINE_REDIRECT_URI` ให้ตรง callback

---

## ขั้นที่ {{S08}} — doctor (มี API รัน)

เทอร์มินัล 1:

```powershell
Set-Location "{{REPO_ROOT}}"
npm run dev -w backend
```

เทอร์มินัล 2:

```powershell
Set-Location "{{REPO_ROOT}}"
npm run doctor
```

---

## ขั้นที่ {{S09}} — CI

```powershell
Set-Location "{{REPO_ROOT}}"
npm run ci
```

---

## ขั้นที่ {{S10}} — Phase 0

```powershell
Set-Location "{{REPO_ROOT}}"
npm run phase0:verify
```

---

## ขั้นที่ {{S11}} — Phase 1

```powershell
Set-Location "{{REPO_ROOT}}"
npm run phase1:verify
```

---

## ขั้นที่ {{S12}} — Phase 2

```powershell
Set-Location "{{REPO_ROOT}}"
npm run phase2:verify
```

---

## ขั้นที่ {{S13}} — Phase 3

```powershell
Set-Location "{{REPO_ROOT}}"
npm run phase3:verify
```

---

## ขั้นที่ {{S14}} — Phase 4

```powershell
Set-Location "{{REPO_ROOT}}"
npm run phase4:verify
```

---

## ขั้นที่ {{S15}} — dev เต็มสแต็ก + ทดสอบมือ

```powershell
Set-Location "{{REPO_ROOT}}"
npm run dev
```

เปิดเบราว์เซอร์: `http://localhost:{{PORT_FRONTEND}}` (ปรับพอร์ตให้ตรงที่รัน)

---

## ขั้นที่ {{S16}} — VAPID (ถ้าใช้ Web Push)

```powershell
Set-Location "{{REPO_ROOT}}"
npx web-push generate-vapid-keys
```

แล้วใส่ใน `backend/.env` ตาม `README.md` ส่วน Web Push

---

## ขั้นที่ {{S17}} — Deploy (Vercel + Cloud Run + LINE callback)

ตั้ง `FRONTEND_ORIGINS` บน API ให้ตรง origin เว็บ — ดู `docs/DEPLOY_VERIFY.md`

---

## ขั้นที่ {{S18}} — verify + qa:quick

```powershell
Set-Location "{{REPO_ROOT}}"
npm run verify:deploy -- {{VERIFY_API_URL}} {{VERIFY_FRONTEND_ORIGIN}}
npm run verify:vercel-line-cors -- {{VERIFY_API_URL}} {{VERIFY_FRONTEND_ORIGIN}}
npm run qa:quick
```

---

## สรุปลำดับ (หลังแทน placeholder แล้ว)

| เลขขั้น (เทมเพลต) | หัวข้อสั้นๆ |
|---:|---|
| {{S01}} | Node |
| {{S02}} | npm install |
| {{S03}} | setup:env |
| {{S04}} | Supabase migrations |
| {{S05}} | backend .env |
| {{S06}} | LINE |
| {{S07}} | frontend .env |
| {{S08}} | doctor |
| {{S09}} | ci |
| {{S10}}–{{S14}} | phase0–phase4 |
| {{S15}} | dev + มือ |
| {{S16}} | VAPID |
| {{S17}} | deploy |
| {{S18}} | verify + qa |
