# YRC Smart Alumni

Monorepo: **React (Vite) + Express + Supabase (PostgreSQL)**.

## ความต้องการ

- Node.js 20+
- บัญชี [Supabase](https://supabase.com) และโปรเจกต์ที่สร้าง migration แล้ว

## ตั้งค่า

1. ใน Supabase: SQL Editor หรือ CLI **รัน migration ตามลำดับ** (อย่าข้ามข้อใดข้อหนึ่งถ้าต้องการฟีเจอร์ครบ):
   - `supabase/migrations/20260415120000_initial_members.sql` — ตารางสมาชิกและคำร้อง
   - `supabase/migrations/20260415140000_push_subscriptions.sql` — ตาราง Web Push (จำเป็นถ้าใช้แจ้งเตือนในบราว์เซอร์)
2. คัดลอก `backend/.env.example` เป็น `backend/.env` แล้วใส่ `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_UPLOAD_KEY` (และค่าอื่นตามส่วน LINE / VAPID ด้านล่างถ้าใช้)
3. คัดลอก `frontend/.env.example` เป็น `frontend/.env` (ค่าเริ่มต้น `VITE_API_URL=http://localhost:4000`)
4. จากโฟลเดอร์รากรัน `npm install` ให้ครบ workspaces ก่อน `npm run dev`

## รันพัฒนา

จากโฟลเดอร์ราก (หลัง `npm install` แล้ว):

```bash
npm run dev
```

- Frontend: http://localhost:5173  
- API: http://localhost:4000/health  

## CI (GitHub)

หลัง push ไป `main`/`master` หรือเปิด PR จะรัน `npm ci`, `npm run build`, `npm run lint` แล้วตามด้วย **`docker build`** (ยืนยัน image สำหรับ Cloud Run) ตาม `.github/workflows/ci.yml` — ต้องมี `package-lock.json` ที่รากและ push ขึ้น remote แล้ว workflow จึงทำงาน

บนเครื่องตรวจก่อน push ได้ด้วย `npm run ci` (เทียบเท่า build + lint หลัง `npm install`; ไม่รวม `docker build`)

[Dependabot](https://docs.github.com/en/code-security/dependabot) (ไฟล์ `.github/dependabot.yml`) จะเปิด PR อัปเดตแพ็กเกจ npm และ GitHub Actions เป็นระยะหลัง repo อยู่บน GitHub

### แรกครั้ง: เชื่อม GitHub แล้ว push

1. สร้าง repository เปล่าบน GitHub (ไม่ต้องสร้าง README จากเทมเพลตถ้าจะ push โค้ดนี้ทับ)
2. ในโฟลเดอร์รากของโปรเจกต์:

```bash
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin master
```

(ถ้าต้องการใช้ชื่อ branch `main` แทน: `git branch -M main` แล้ว `git push -u origin main` และตั้ง default branch บน GitHub ให้ตรง)

## นำเข้าสมาชิก (Admin)

```bash
curl -X POST http://localhost:4000/api/admin/members/import ^
  -H "x-admin-key: YOUR_ADMIN_UPLOAD_KEY" ^
  -F "file=@path/to/member_import.xlsx"
```

ลบสมาชิกทั้งหมด:

```bash
curl -X DELETE http://localhost:4000/api/admin/members/all ^
  -H "x-admin-key: YOUR_ADMIN_UPLOAD_KEY"
```

ไฟล์ `.xlsx` / `.csv` ที่มีข้อมูลส่วนบุคคล **ไม่ควร commit** — มีใน `.gitignore` แล้ว

## API สมาชิก (ไม่ต้องใช้ x-admin-key)

**ผูก Line UID** — ต้องมีแถวใน `members` ที่ `รุ่น` + `ชื่อ` + `นามสกุล` ตรงกันหนึ่งแถวเท่านั้น

`POST /api/members/verify-link`  
Body JSON: `{ "line_uid": "…", "batch": "…", "first_name": "…", "last_name": "…" }`

**สมัครใหม่ (คำร้อง)** — เมื่อ verify ไม่พบในทะเบียน

`POST /api/members/register-request`  
Body JSON: `{ "line_uid": "…", "batch": "…", "first_name": "…", "last_name": "…", … }`  
สร้างแถวใน `member_update_requests` (สถานะ `pending_president`)

หน้าเว็บแท็บ **ผูกบัญชี** / **Admin** ใช้ทดสอบ flow เหล่านี้ได้จาก UI

## LINE Login (OAuth 2.1)

1. [LINE Developers](https://developers.line.biz/) สร้าง **Provider** และ **LINE Login channel**
2. ใน channel: เปิด **OpenID Connect** — scope ใช้ `openid profile`
3. **Callback URL** ให้ตรงกับ `VITE_LINE_REDIRECT_URI` (และต้องอยู่ใน `LINE_REDIRECT_URIS` ฝั่ง backend) เช่น `http://localhost:5173/`
4. ใส่ **Channel ID** → `VITE_LINE_CHANNEL_ID` (frontend) และ `LINE_CHANNEL_ID` (backend)  
5. ใส่ **Channel secret** → `LINE_CHANNEL_SECRET` (backend เท่านั้น)

แลก code → ตรวจ token:

`POST /api/auth/line/token`  
Body: `{ "code": "…", "redirect_uri": "http://localhost:5173/" }`  
Response: `{ "line_uid": "…", "name": …, "picture": … }`

## คำร้องสมาชิก (อนุมัติ 2 ชั้น)

- `GET /api/admin/member-requests` — **เฉพาะ** `x-admin-key` — query `?status=...` (optional)
- `POST .../president-approve` และ `POST .../reject` — header **`x-admin-key`** (Admin ทำแทนได้) หรือ **`x-president-key`** ตรงกับ `PRESIDENT_UPLOAD_KEY` ใน `backend/.env`
- `POST .../admin-approve` — **เฉพาะ** `x-admin-key` — สำหรับ `new_registration` จะ **insert** เข้า `members`

หน้าเว็บแท็บ **คำร้อง** มีช่องใส่ทั้ง admin key และ president key

### ประธานรุ่นแยกตามรุ่น (`PRESIDENT_KEYS_JSON`)

ตั้งใน `backend/.env` เป็น JSON แมป **รุ่น → คีย์ลับ** (ต้องตรงกับ `batch` ในคำร้อง) ตัวอย่าง:

`PRESIDENT_KEYS_JSON={"0507":"key-a","1002":"key-b"}`

- ประธานรุ่น 0507 ส่ง `x-president-key: key-a` ได้เฉพาะคำร้องที่ `requested_data.batch` เป็น `0507` (หลัง trim/normalize)  
- Admin ยังใช้ `x-admin-key` ได้ทุกรุ่น  
- ถ้าไม่ตั้ง JSON แต่ตั้ง `PRESIDENT_UPLOAD_KEY` อย่างเดียว = คีย์เดียวใช้ได้ทุกรุ่น (จนกว่าจะเปลี่ยนเป็น JSON)

## Web Push (แจ้งเตือนคำร้องสมาชิกใหม่)

1. รัน migration `supabase/migrations/20260415140000_push_subscriptions.sql` ใน Supabase  
2. สร้างคู่คีย์ VAPID (ในเครื่องที่มี Node):

```bash
npx web-push generate-vapid-keys
```

3. ใส่ใน `backend/.env`: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:อีเมลของคุณ`  
4. รีสตาร์ท backend — หน้าแรกของแอปมีปุ่ม **เปิดการแจ้งเตือนในเบราว์เซอร์นี้**  
5. หลังมี `POST /api/members/register-request` สำเร็จ ระบบจะพยายามส่ง push ไปยัง subscription ที่บันทึกไว้

หมายเหตุ: โดเมนจริงต้องเป็น **HTTPS** (localhost ยกเว้นได้ในการทดสอบ)

## Deploy (แนวทางย่อ)

### Frontend — Vercel

Monorepo ใช้ `package-lock.json` เดียวที่ **รากโปรเจกต์** — ตั้ง Vercel ให้ build จากราก (ไม่ใช้โฟลเดอร์ `frontend` เป็น root อย่างเดียว):

1. เชื่อม GitHub repo กับ [Vercel](https://vercel.com)  
2. **Root Directory** = ราก repo (เว้นว่าง / `.`) — **ไม่**ใช่แค่ `frontend`  
3. **Install Command**: `npm ci`  
4. **Build Command**: `npm run build -w frontend`  
5. **Output Directory**: `frontend/dist`  
6. **Environment Variables**: `VITE_API_URL` = URL ของ API ที่ deploy แล้ว (เช่น `https://xxx.run.app`) และค่า `VITE_*` อื่นตาม `frontend/.env.example`  
7. ตั้งค่า **LINE Callback URL** + `VITE_LINE_REDIRECT_URI` + `LINE_REDIRECT_URIS` ให้ตรงกับ URL ที่ Vercel ให้ (HTTPS)  
8. ไฟล์ `vercel.json` ที่รากมี rewrite สำหรับ SPA แล้ว

### Backend — Cloud Run (Docker)

1. ไฟล์ `Dockerfile` ที่รากโปรเจกต์ build เฉพาะ backend  
2. Build & push:

```bash
docker build -t gcr.io/PROJECT_ID/yrc-api:latest .
```

3. Deploy ไป Cloud Run (ตั้ง `PORT` จาก platform โดยปกติเป็น 8080)  
4. **Secrets / env**: ค่าเดียวกับ `backend/.env` (Supabase, LINE, VAPID, keys, `FRONTEND_ORIGINS`)  
5. **`FRONTEND_ORIGINS`**: ใส่ URL ของ Vercel แบบเต็ม `https://your-app.vercel.app` (คั่นหลายค่าด้วย comma) — ถ้าไม่ตั้ง จะใช้แค่ localhost ใน CORS

### หลัง deploy

- อัปเดต `VITE_API_URL` บน Vercel  
- อัปเดต `FRONTEND_ORIGINS` บน Cloud Run  
- ตรวจ LINE / LINE Login callback ให้ตรงโดเมนใหม่
