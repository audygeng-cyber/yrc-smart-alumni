---
name: yrc-smart-alumni
description: >-
  YRC Smart Alumni monorepo (Vite 7 + Express + Supabase). Covers local dev,
  GitHub CI, Cloud Run API, Vercel frontend, Supabase migrations, secrets via
  git-secret, CORS/FRONTEND_ORIGINS, LINE/VAPID. Use when working on this
  repo, deploy, env, security, or alumni/member flows.
---

# YRC Smart Alumni — คู่มือ Agent

## สแต็ก

- **Frontend:** `frontend/` — Vite 7, React, Tailwind (`npm run dev -w frontend`)
- **Backend:** `backend/` — Express, Supabase service role (`npm run dev -w backend`)
- **DB:** Supabase PostgreSQL — SQL ใน `supabase/migrations/` (รันตามลำดับใน README)
- **CI:** ราก repo — `npm ci`, `npm run build`, `npm run lint -w frontend`, Docker image

## รากโปรเจกต์

```bash
npm install
npm.cmd run dev          # Windows PowerShell ถ้า npm ถูกบล็อกใช้ npm.cmd
npm run ci               # ก่อน push
```

## URL ที่ deploy แล้ว (อัปเดตใน skill ถ้าเปลี่ยน)

- API (Cloud Run): ตั้ง `VITE_API_URL` บน Vercel ให้ชี้มาที่ URL นี้ (ไม่ใส่ path `/api` เป็นท้าย base ถ้าโค้ดต่อ path เอง)
- Frontend (Vercel): ตั้ง `FRONTEND_ORIGINS` บน Cloud Run = URL Vercel เต็ม `https://...`

## ความลับ / env

- **ห้าม** commit `backend/.env`, `frontend/.env` — อยู่ใน `.gitignore`
- Production: Cloud Run + Vercel Environment Variables (หรือ Secret Manager)
- ทีมที่ต้องการไฟล์เข้ารหัสใน repo: ใช้ **git-secret** ตาม `SECURITY.md`

## git-secret (สรุป)

1. ติดตั้ง [git-secret](https://git-secret.io/) + GPG (บน Windows ใช้ Git Bash หรือ WSL มักง่ายกว่า PowerShell ล้วน)
2. `git secret init` → `git secret tell <email-gpg>` → `git secret add backend/.env` (หลังแนใจว่าไฟล์ถูก ignore)
3. `git secret hide` ก่อน commit — ไฟล์เข้ารหัสถูก track; ผู้อื่นใช้ `git secret reveal`

## การแก้ปัญหาที่พบบ่อย

- **PowerShell บล็อก npm:** ใช้ `npm.cmd` หรือ `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`
- **พอร์ต 4000/5173 ถูกใช้:** ปิด process เก่าหรือ `Ctrl+C` ในเทอร์มินัลที่รัน dev
- **Vercel ไม่ build หลัง push:** Settings → Git → เชื่อม `audygeng-cyber/yrc-smart-alumni` branch `master`
- **CORS จาก Vercel:** ต้องมี `FRONTEND_ORIGINS` บน API

## เอกสารเพิ่ม

- `README.md` — setup, API, LINE, VAPID, deploy
- `SECURITY.md` — นโยบายความปลอดภัยและ git-secret
