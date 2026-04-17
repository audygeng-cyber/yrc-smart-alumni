# Secret Rotation Checklist

ใช้เอกสารนี้เมื่อมีความเสี่ยงว่า secret ถูกเปิดเผย (แม้ยังไม่ถูก commit) เพื่อหมุนคีย์และปิดช่องโหว่ให้ครบ

## 0) Scope ที่ต้องหมุน (อย่างน้อย)

- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_UPLOAD_KEY`
- `PRESIDENT_UPLOAD_KEY` หรือ `PRESIDENT_KEYS_JSON` (ถ้ามีใช้งานจริง)
- `LINE_CHANNEL_SECRET` (ถ้าตั้งค่าใช้งานแล้ว)
- `VAPID_PRIVATE_KEY` (ถ้าตั้งค่าใช้งานแล้ว)

## 1) Prepare

- [ ] ระบุทุก environment ที่ใช้ secret ชุดนี้: local, Cloud Run, Vercel, GitHub Actions, secret manager
- [ ] หยุดแจกจ่ายค่าเดิมในแชต/โน้ต/ภาพหน้าจอทันที
- [ ] ยืนยันว่าไฟล์ local env ไม่ถูก track (`backend/.env`, `frontend/.env` ต้องถูก ignore)

## 2) Rotate per service

### Supabase

- [ ] สร้าง/หมุน service key ใหม่จากหน้า project settings (API/keys ตาม UI ปัจจุบัน)
- [ ] อัปเดต `SUPABASE_SERVICE_ROLE_KEY` ในระบบ deploy ทั้งหมด
- [ ] ทดสอบ endpoint ที่อ่าน/เขียนผ่าน service role

### Admin key

- [ ] สร้างค่าใหม่ที่คาดเดายากสำหรับ `ADMIN_UPLOAD_KEY`
- [ ] อัปเดตฝั่ง backend runtime env
- [ ] ทดสอบ endpoint ที่ต้องใช้ `Admin key (x-admin-key)` เช่น import/finance/member-requests

### President key(s)

- [ ] ถ้าใช้คีย์เดี่ยว: หมุน `PRESIDENT_UPLOAD_KEY`
- [ ] ถ้าใช้แยกรุ่น: หมุน `PRESIDENT_KEYS_JSON` ทุกค่า
- [ ] ทดสอบ flow `president-approve` และ `reject`

### LINE

- [ ] หมุน `LINE_CHANNEL_SECRET` ใน LINE Developers
- [ ] อัปเดต env ของ backend
- [ ] ทดสอบ `POST /api/auth/line/token` และ callback flow

### Web Push (VAPID)

- [ ] สร้างคู่คีย์ใหม่ (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)
- [ ] อัปเดต backend env และ frontend ที่อ่าน public key
- [ ] ทดสอบ subscribe ใหม่ 1 รอบ

## 3) Redeploy + Restart

- [ ] Deploy backend ใหม่หลังอัปเดต env
- [ ] Redeploy frontend ถ้าค่า public/config เปลี่ยน
- [ ] restart service ให้รับค่าใหม่ทุก instance

## 4) Verification

- [ ] `npm run ci` ผ่าน
- [ ] GitHub Actions CI ล่าสุดผ่านครบ (`build-and-lint`, `docker-image`, `smoke-production`)
- [ ] ทดสอบ smoke สำคัญ:
  - [ ] `/health`
  - [ ] admin endpoints ที่ต้องใช้ key
  - [ ] member link/request flow
  - [ ] LINE login (ถ้าเปิดใช้งาน)
  - [ ] push subscribe (ถ้าเปิดใช้งาน)

## 5) Cleanup & Audit

- [ ] ลบ/แก้ข้อความหรือไฟล์ที่เคยมีค่า secret จริง (chat paste, note, screenshot)
- [ ] บันทึก incident note: วันที่, secret ที่หมุน, ผู้รับผิดชอบ, หลักฐาน verify
- [ ] ย้ำทีมให้ใช้ค่า placeholder เท่านั้นเวลาแชร์ตัวอย่าง

## 6) Prevention Baseline

- [ ] คง `.gitignore` ให้มี `backend/.env` และ `frontend/.env`
- [ ] ใช้ `.env.example` สำหรับแชร์ค่า template เท่านั้น
- [ ] หลีกเลี่ยงวาง secret จริงใน issue/PR/comment
- [ ] พิจารณาใช้ secret manager เป็นแหล่งจริงของ production secrets
