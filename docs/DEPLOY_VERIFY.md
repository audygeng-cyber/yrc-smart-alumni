# เช็คลิสต์: ตรวจระบบหลัง deploy (Cloud Run + Vercel + Supabase)

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

คำสั่งนี้เรียก `GET /health` ตรวจว่า `GET /api/admin/members/summary` มีอยู่ (probe ไม่ใส่ key) และถ้ามี origin ของ Vercel จะตรวจ CORS

**ตรวจแบบละเอียด** (เทมเพลตนำเข้า, VAPID, CORS preflight, และว่า bundle หน้าเว็บฝัง host ของ API ตรงกับ URL ที่ให้):

```bash
npm run verify:deploy:deep -- https://<CLOUD_RUN_URL> https://<VERCEL_FRONTEND_URL>
```

**จาก GitHub:** ไปที่ **Actions** → workflow **Verify production** → **Run workflow** แล้วใส่ URL ทั้งสอง (ไฟล์ `.github/workflows/verify-production.yml`) — workflow นี้ยังเป็นแบบเบื้องต้น ไม่รวมโหมด deep

---

## ขั้น 1 — Supabase (ฐานข้อมูล)

1. เข้า [Supabase Dashboard](https://supabase.com/dashboard) → โปรเจกต์ที่ใช้จริง
2. **SQL Editor** หรือ Migration: รันไฟล์ใน `supabase/migrations/` **ตามลำดับเวลาในชื่อไฟล์**  
   - `20260415120000_initial_members.sql`  
   - `20260415140000_push_subscriptions.sql` (ถ้าใช้ Web Push)
3. ตรวจว่า **Project URL** และ **service role key** ตรงกับที่ใส่ใน **Cloud Run env** (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)

---

## ขั้น 2 — Cloud Run (Backend API)

1. ใน Google Cloud Console → Cloud Run → service ของ API → แท็บ **Variables & Secrets**
2. ตรวจค่าอย่างน้อย:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `FRONTEND_ORIGINS` = URL หน้าเว็บ Vercel แบบเต็ม เช่น `https://ชื่อ-app.vercel.app` (คั่นหลายค่าด้วย comma ไม่เว้นช่องเกินจำเป็น)
   - คีย์ที่ endpoint admin/ประธานใช้: `ADMIN_UPLOAD_KEY`, `PRESIDENT_UPLOAD_KEY` หรือ `PRESIDENT_KEYS_JSON` ตามที่ตั้งไว้
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

1. [LINE Developers](https://developers.line.biz/) → Channel LINE Login → **Callback URL**  
   - ต้องมี URL ของ Vercel (และ localhost ถ้ายังทดสอบ local) ตรงกับ `VITE_LINE_REDIRECT_URI` / `LINE_REDIRECT_URIS`
2. ทดลองล็อกอินจาก URL **production (HTTPS)** — ห้ามอ้างแค่ localhost ว่า “ใช้ได้” แล้ว production จะอัตโนมัติ
3. ถ้า redirect ผิดหรือ `invalid_grant` — เช็ค redirect URI ให้ตรงทุกจุด (รวม `/` ท้าย path)

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
