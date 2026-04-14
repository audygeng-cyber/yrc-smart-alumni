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
