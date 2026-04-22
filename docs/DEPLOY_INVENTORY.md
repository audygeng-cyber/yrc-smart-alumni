# YRC Smart Alumni — สินทรัพย์ URL & flow deploy (บันทึกใน repo)

อัปเดตไฟล์นี้เมื่อเปลี่ยนโปรเจกต์ / service / โดเมน — Agent และทีมใช้เป็นแหล่งเดียวก่อน **push / deploy**

## ลิงก์แดชบอร์ด (มนุษย์เปิด)

| ระบบ | URL |
|------|-----|
| **GitHub (remote ปัจจุบัน)** | https://github.com/audygeng-cyber/yrc-smart-alumni |
| **Vercel (ทีม / โปรเจกต์)** | https://vercel.com/gengs-projects-a154f934 |
| **Google Cloud (โปรเจกต์)** | https://console.cloud.google.com/welcome?project=yrc-smart-alumni |
| **Supabase (โปรเจกต์)** | https://supabase.com/dashboard/project/yowiqqcvdzjdkntgxbkb |

## URL บริการ production (ที่ใช้กับเว็บ / env)

| รายการ | ค่า / หมายเหตุ |
|--------|------------------|
| **Frontend (Vercel production)** | `https://yrc-smart-alumni-frontend.vercel.app` |
| **API (Cloud Run — ฐาน VITE_API_URL)** | `https://yrc-api-860180276522.asia-southeast1.run.app` — **ไม่** ลงท้ายด้วย `/api` (frontend ต่อ path เอง) |
| **Vercel project (จาก `.vercel/repo.json`)** | ชื่อโปรเจกต์: `yrc-smart-alumni-frontend` · directory ใน monorepo: `frontend` |

ถ้า URL Cloud Run เปลี่ยน: แก้แถวด้านบน → ตั้ง **`VITE_API_URL`** บน Vercel ให้ตรง → **Redeploy** frontend → ตั้ง **`FRONTEND_ORIGINS`** บน Cloud Run ให้มี origin เว็บ Vercel (ดู `docs/DEPLOY_VERIFY.md`, `docs/LINE_LOGIN_CHECKLIST.md`)

## Flow หลังแก้โค้ด (ให้ Agent / ทีมทำตามลำดับ)

1. **ทดสอบในเครื่อง:** ราก repo — `npm run ci` (หรืออย่างน้อย build + test ที่เกี่ยวข้อง)
2. **Commit** ข้อความสั้นชัดว่าแก้อะไร
3. **Push** ไป branch หลักที่เชื่อม Vercel (ปัจจุบัน: **`master`**) → Vercel จะ build **frontend** อัตโนมัติเมื่อ repo เชื่อม Git
4. **Backend:** ถ้ามีการแก้ `backend/` — **deploy Cloud Run แยก** (image / revision ใหม่) — push อย่างเดียวไม่อัปเดต API บน Cloud Run
5. **ตรวจหลังปล่อย:** จากราก repo  
   `node scripts/verify-deployment.mjs <CLOUD_RUN_URL> <VERCEL_FRONTEND_URL>`  
   รายละเอียด: `docs/DEPLOY_VERIFY.md`

## CLI ที่ใช้บ่อย (สรุป)

- Push: `git push origin master` (หรือ branch ที่ตั้ง Git integration ไว้)
- ดู deployment Vercel (เมื่อล็อกอิน CLI แล้ว): จาก `frontend/` — `vercel ls yrc-smart-alumni-frontend`
- Cloud Run: build/push image ตาม `README.md` → Deploy new revision ใน Console หรือ `gcloud run deploy` ตามมาตรฐานทีม

## เอกสารที่เกี่ยวข้อง

- `README.md` — ตั้งค่า Vercel (root, build command, output), Docker / Cloud Run แนวทาง
- `docs/DEPLOY_VERIFY.md` — checklist หลัง deploy
- `docs/LINE_LOGIN_CHECKLIST.md` — `VITE_API_URL`, `FRONTEND_ORIGINS`, LINE callback
