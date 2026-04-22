# เช็คลิสต์: ตรวจระบบหลัง deploy (Cloud Run + Vercel + Supabase)

ลิงก์แดชบอร์ดและ URL production ของทีม (GitHub / Vercel / GCP / Supabase): [`DEPLOY_INVENTORY.md`](./DEPLOY_INVENTORY.md)

ทำตามลำดับ — ถ้าข้อใดล้มเหลว แก้ก่อนไปข้อถัดไป

---

## ขั้น 0 — โค้ดและ CI

1. บนเครื่องพัฒนา ราก repo รัน `npm run ci` ให้ผ่าน
2. บน GitHub: workflow CI (ถ้ามี) บน branch ที่ deploy **ผ่าน**
3. ยืนยันว่า image Cloud Run มาจาก commit ล่าสุดที่ต้องการ (build/deploy ใหม่หลังแก้โค้ด)

### ทดสอบจากเครื่อง (CLI — health + CORS)

ราก repo:

```bash
node scripts/verify-deployment.mjs https://<CLOUD_RUN_URL> https://<VERCEL_FRONTEND_URL>
```

PowerShell:

```powershell
$env:VERIFY_API_BASE="https://xxx.run.app"; $env:VERIFY_FRONTEND_ORIGIN="https://yyy.vercel.app"; npm run verify:deploy
```

**ลำดับความสำคัญ:** URL ที่ส่งเป็นอาร์กิวเมนต์หลัง `node scripts/verify-deployment.mjs` **มาก่อน** ค่า `VERIFY_*` ใน env — กันค่า placeholder ใน shell ทับ URL จริง ถ้าเคยตั้ง `VERIFY_API_BASE` ผิดในเซสชัน PowerShell ให้ `Remove-Item Env:VERIFY_API_BASE` หรือพิมพ์ URL บนบรรทัดคำสั่ง

คำสั่งนี้เรียก `GET /health` ตรวจว่า `GET /api/admin/members/summary` มีอยู่ (probe ไม่ใส่ key) และถ้ามี origin ของ Vercel จะตรวจ CORS

**ตรวจแบบละเอียด** (เทมเพลตนำเข้า, VAPID, **LINE route** (POST ว่างต้องได้ 400 ตามที่ออกแบบ), CORS preflight, และว่า bundle หน้าเว็บฝัง host ของ API ตรงกับ URL ที่ให้):

```bash
npm run verify:deploy:deep -- https://<CLOUD_RUN_URL> https://<VERCEL_FRONTEND_URL>
```

**ตรวจ Admin ด้วย key จริง** (ใส่ key ใน env เท่านั้น — ห้าม commit):

```bash
# PowerShell
$env:VERIFY_API_BASE="https://<CLOUD_RUN_URL>"
$env:VERIFY_ADMIN_KEY="<ADMIN_UPLOAD_KEY>"
npm run verify:admin
```

จะเรียก `GET /api/admin/members/summary` และ `GET /api/admin/member-requests` พร้อม `x-admin-key`  
ถ้าต้องการกรองเฉพาะ batch: `$env:VERIFY_IMPORT_BATCH_ID="<uuid>"`

**รายการ migration สำหรับรันใน Supabase (ลำดับ + ตัวอย่างหัวไฟล์):**

```bash
npm run migrations:list
```

**ตรวจว่า Cloud Run พร้อมสำหรับ LINE Login (ไม่ต้องใส่ Channel Secret):**

```bash
npm run verify:line -- https://<CLOUD_RUN_URL> https://<VERCEL_FRONTEND_URL>
```

ถ้าได้ **401 + line_token_exchange_failed** ถือว่าโครงสร้างพร้อมแล้ว (LINE ปฏิเสธ code ทดสอบ) — จากนั้นตั้ง `VITE_LINE_*` บน Vercel และ Callback URL ใน LINE Developers

**จาก GitHub:** ไปที่ **Actions** → workflow **Verify production** → **Run workflow** แล้วใส่ URL ทั้งสอง (ไฟล์ `.github/workflows/verify-production.yml`) — workflow นี้ยังเป็นแบบเบื้องต้น ไม่รวมโหมด deep

---

## ขั้น 1 — Supabase (ฐานข้อมูล)

1. ยืนยันว่า migration ในโปรเจกต์ (โฟลเดอร์ `supabase/migrations/`) ถูกนำไปรันในโปรเจกต์ Supabase จริงแล้ว — อย่างน้อยตารางหลักจาก `initial_members` และถ้าใช้ Web Push ต้องมีตาราง `push_subscriptions`
2. เข้า [Supabase Dashboard](https://supabase.com/dashboard) → เลือกโปรเจกต์ที่ใช้กับ YRC
3. ตรวจว่า **Project URL** และ **service role key** ตรงกับที่ใส่ใน **Cloud Run env** (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)

### คำว่า “repo / ไฟล์ใน repo” คืออะไร

- **Repo** หมายถึง **โฟลเดอร์โปรเจกต์บนเครื่องคุณ** (โค้ดที่ clone/download ไว้) เช่น  
  `C:\Users\gengk\Desktop\YRC Smart Alumni`
- **ไฟล์ migration** คือไฟล์ `.sql` อยู่ใต้โฟลเดอร์ย่อย  
  `YRC Smart Alumni\supabase\migrations\`  
  มีอย่างน้อยสองไฟล์ (รันตามลำดับชื่อ — ตัวเลขหน้าชื่อไฟล์น้อยก่อน):
  - `20260415120000_initial_members.sql`
  - `20260415140000_push_subscriptions.sql`

### วิธีรัน SQL ใน Supabase แบบทีละขั้น (สำหรับคนที่ไม่เคยใช้ SQL Editor)

1. ในเว็บ Supabase ดู**แถบเมนูซ้าย** — หารายการชื่อ **SQL** หรือ **SQL Editor** (ไอคอนมักเป็น `>_` หรือคำว่า SQL) แล้วคลิก  
2. ถ้าไม่เห็นคำว่า “New query” ให้ลองมองหาอย่างใดอย่างหนึ่งแทน (ขึ้นกับเวอร์ชันหน้าเว็บ):
   - ปุ่ม **+** หรือ **New snippet** / **Create a new query**
   - แท็บว่างชื่อ **Untitled** / **New** — คลิกแล้วจะได้ช่องพิมพ์ SQL
   - หรือมีช่องพิมพ์ SQL อยู่กลางหน้าอยู่แล้ว ไม่ต้องกดอะไรเพิ่ม — วางโค้ดลงไปได้เลย
3. เปิดไฟล์ `.sql` บนเครื่องคุณ:
   - เปิด **File Explorer** → ไปที่  
     `Desktop\YRC Smart Alumni\supabase\migrations\`
   - ดับเบิลคลิกไฟล์ `20260415120000_initial_members.sql` — ถ้าเปิดด้วย Notepad / Cursor / VS Code ได้  
   - **Ctrl+A** เลือกทั้งหมด → **Ctrl+C** คัดลอก
4. กลับไปที่หน้า **SQL Editor** ของ Supabase — คลิกในช่องพิมพ์ SQL → **Ctrl+V** วาง
5. กดปุ่ม **Run** (หรือ **CTRL+Enter** ถ้าเว็บรองรับ) — รอจนขึ้นว่าสำเร็จหรือไม่มี error สำคัญ  
6. ทำซ้ำข้อ 3–5 กับไฟล์ที่สอง `20260415140000_push_subscriptions.sql`

ถ้า Supabase แจ้งว่าตารางมีอยู่แล้ว (`already exists`) มักถือว่าเคยรัน migration นี้ไปแล้ว — ใช้งานต่อได้ ถ้าไม่แน่ใจให้ดูใน **Table Editor** ว่ามีตาราง `members` หรือไม่

### ดูลำดับไฟล์จากเทอร์มินัล (ทางเลือก)

รากโปรเจกต์:

```bash
npm run migrations:list
```

จะพิมพ์ชื่อไฟล์เรียงลำดับและหัวข้อความให้

---

## ขั้น 2 — Cloud Run (Backend API)

1. ใน Google Cloud Console → Cloud Run → service ของ API → แท็บ **Variables & Secrets**
2. ตรวจค่าอย่างน้อย:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `FRONTEND_ORIGINS` = URL หน้าเว็บ Vercel แบบเต็ม เช่น `https://ชื่อ-app.vercel.app` (คั่นหลายค่าด้วย comma ไม่เว้นช่องเกินจำเป็น)
   - คีย์ที่ endpoint admin/ประธานใช้: `ADMIN_UPLOAD_KEY`, `PRESIDENT_UPLOAD_KEY` หรือ `PRESIDENT_KEYS_JSON` ตามที่ตั้งไว้ (ถ้า JSON มี `member_id` ต่อรุ่น หลัง deploy ใช้แผงนำเข้า → **ซิงก์ประธานรุ่น** หรือ `POST /api/admin/members/sync-registry-presidents` เพื่อเขียนมิติ `batch_president` ในตาราง `member_distinctions`)
   - ถ้าใช้ LINE / Push: `LINE_*`, `VAPID_*` ตาม `backend/.env.example`
3. **Revision ล่าสุด** ต้องเป็น revision ที่ deploy หลังแก้ env (หรือหลัง deploy image ใหม่)
4. ทดสอบจากเบราว์เซอร์หรือเทอร์มินัล:
   - `GET https://<CLOUD_RUN_URL>/health`  
   - คาดหวัง JSON มี `"ok": true`
5. ทดสอบ `GET https://<CLOUD_RUN_URL>/` — ควรได้ JSON อธิบาย path ของ API (ไม่ใช่หน้า HTML)

---

## ขั้น 3 — Vercel (Frontend)

1. Vercel → Project → **Settings → Environment Variables**
2. ตรวจ:
   - `VITE_API_URL` = **ฐาน URL ของ Cloud Run** เท่านั้น (เช่น `https://xxx.run.app`) — **ไม่** ใส่ path `/api` ถ้าโค้ด frontend ต่อ path เอง
   - `VITE_LINE_CHANNEL_ID`, `VITE_LINE_REDIRECT_URI` ให้ตรงกับที่ตั้งใน LINE Console และฝั่ง backend
3. ** redeploy** หลังแก้ env (Vite อ่าน `VITE_*` ตอน build)
4. เปิด URL production ของ Vercel — หน้าโหลดได้ ไม่ blank จาก build error

---

## ขั้น 4 — การเชื่อม Frontend ↔ API (CORS + URL)

1. เปิดเว็บ Vercel → กด F12 → **Network**
2. ทำ action ที่เรียก API (เช่น แท็บที่ยิง backend)
3. ตรวจ:
   - Request ไปที่โดเมน **Cloud Run** ตรงกับ `VITE_API_URL`
   - ไม่มี error **CORS** ใน Console
4. ถ้า CORS error: กลับไปแก้ `FRONTEND_ORIGINS` บน Cloud Run ให้มี origin ของ Vercel เป๊ะ (รวม `https://` และไม่มี slash ท้ายผิดแบบ — ให้ตรงกับที่ browser ส่ง)

---

## ขั้น 5 — LINE Login (ถ้าเปิดใช้)

คู่มือเจาะจง (ตาราง URL ให้ตรงทุกที่ + ตัวอย่าง production): [`LINE_LOGIN_CHECKLIST.md`](./LINE_LOGIN_CHECKLIST.md)

1. บน Cloud Run ใส่ **`LINE_CHANNEL_ID`**, **`LINE_CHANNEL_SECRET`**, **`LINE_REDIRECT_URIS`** (คั่นหลาย URL ด้วย comma — ถ้าใช้ `gcloud` บน Windows ค่ามี comma อาจต้องแก้ใน **Google Cloud Console** แทนการพิมพ์บรรทัดเดียว)
2. บน Vercel ใส่ **`VITE_LINE_CHANNEL_ID`**, **`VITE_LINE_REDIRECT_URI`** ให้ **ตรงกับหนึ่งในค่าใน `LINE_REDIRECT_URIS`** (รวมว่ามี `/` ท้ายหรือไม่ — ต้องตรงทุกที่)
3. [LINE Developers](https://developers.line.biz/) → Channel LINE Login → **Callback URL** = URL เดียวกับ `VITE_LINE_REDIRECT_URI`
4. รัน `npm run verify:line -- <API> <Vercel URL>` — ถ้าได้ **401 line_token_exchange_failed** แปลว่าโครงสร้าง API พร้อม
5. ทดลองล็อกอินจาก URL **production (HTTPS)**
6. ถ้า `invalid_grant` / redirect ผิด — เช็คให้ redirect ตรงทุกจุด (Console, env, ปุ่มล็อกอิน)

---

## ขั้น 6 — Web Push (ถ้าเปิดใช้)

1. บน Cloud Run มี `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
2. Migration `push_subscriptions` รันแล้วใน Supabase
3. ทดสอบบน **HTTPS** (โดเมน Vercel) — กด opt-in แจ้งเตือนในเบราว์เซอร์
4. ถ้าไม่ส่ง push — เช็ค log Cloud Run และว่า subscription ถูกบันทึกในฐานข้อมูล

---

## ขั้น 7 — Flow ธุรกิจ (สโมกเทส)

ทำครบตามที่ต้องการใช้งานจริง (ไม่จำเป็นต้องครบในวันเดียว):

| การทดสอบ | คาดหวัง |
|-----------|---------|
| Admin import (ถ้าใช้) | อัปโหลดด้วย `x-admin-key` สำเร็จ |
| ผูกบัญชี LINE กับทะเบียน | `verify-link` สำเร็จเมื่อข้อมูลตรง |
| คำร้องสมาชิกใหม่ | สร้างคำร้อง → อนุมัติตามขั้น (ประธาน/แอดมิน) |
| Rate limit | ยิง API ถี่ผิดปกติแล้วได้ 429 (ถ้าทดสอบ) — ไม่บังคับในวันแรก |

---

## สรุป: “เชื่อมกับทุกอย่างแล้วหรือไม่”

ถือว่า **พร้อมใช้งานหลัก** เมื่อ:

- [ ] `/health` บน Cloud Run ผ่าน  
- [ ] Vercel โหลดได้ และ Network **ไม่มี CORS** ตอนเรียก API  
- [ ] Supabase ต่อกับ API ได้ (flow ที่อ่าน/เขียนข้อมูลทำงาน)  
- [ ] (ถ้าใช้ LINE) ล็อกอินบน HTTPS สำเร็จ  
- [ ] (ถ้าใช้ Push) opt-in + ส่งแจ้งเตือนได้อย่างน้อยครั้งหนึ่ง  

ถ้าติดขั้นไหน ให้จด **ข้อความ error จาก Console / Network / Cloud Run logs** แล้วไล่แก้เฉพาะชั้นนั้นก่อน
