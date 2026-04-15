# YRC Smart Alumni

Monorepo: **React (Vite) + Express + Supabase (PostgreSQL)**.

## ความต้องการ

- Node.js 20+
- บัญชี [Supabase](https://supabase.com) และโปรเจกต์ที่สร้าง migration แล้ว

## ตั้งค่า

1. ใน Supabase: SQL Editor หรือ CLI รันไฟล์ `supabase/migrations/20260415120000_initial_members.sql`
2. คัดลอก `backend/.env.example` เป็น `backend/.env` แล้วใส่ `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_UPLOAD_KEY`
3. คัดลอก `frontend/.env.example` เป็น `frontend/.env` (ค่าเริ่มต้น `VITE_API_URL=http://localhost:4000`)

## รันพัฒนา

จากโฟลเดอร์ราก:

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173  
- API: http://localhost:4000/health  

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
