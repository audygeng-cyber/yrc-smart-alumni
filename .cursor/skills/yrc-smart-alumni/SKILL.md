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
- **CI:** ราก repo — `npm ci`, `npm run build`, `npm run lint` (frontend + backend), `npm run test` (backend + frontend Vitest), Docker image

## เอกสารปฏิบัติการ (repo root)

- [`docs/OPERATIONAL_RUNBOOK.md`](../../../docs/OPERATIONAL_RUNBOOK.md) — เส้นทางใช้งานหลักต้นจนจบ (checklist ฝั่งทีม/องค์กร) รวม **นักพัฒนา** — ทดสอบบนเว็บทุกชั่วโมงตรงเวลา, ความปลอดภัยการแก้ไขข้อมูล, และทำงานต่อเนื่องหลังจบงานย่อย (สอดคล้อง [`.cursorrules`](../../../.cursorrules) §7)
- [`docs/ACCOUNTING_FLOW.md`](../../../docs/ACCOUNTING_FLOW.md) — บทบาทโมดูลบัญชีเทียบโปรแกรมสำเร็จรูป + ส่งออกสิ้นปีให้ผู้ตรวจ (สอดคล้อง [`.cursorrules`](../../../.cursorrules) §8)
- [`docs/MODULE_PROGRESS_2026-04-17.md`](../../../docs/MODULE_PROGRESS_2026-04-17.md) — ความคืบหน้ารายโมดูล (%)
- [`docs/PROJECT_MASTER_GUIDELINES.md`](../../../docs/PROJECT_MASTER_GUIDELINES.md) — Master Guidelines เทียบ repo (stack, DB, ธุรกิจ, คำสั่งปฏิบัติ)

## รากโปรเจกต์

```bash
npm install
npm run bootstrap        # แนะนำหลัง clone: setup:env + doctor (ตรวจ env / API)
npm.cmd run dev          # Windows PowerShell ถ้า npm ถูกบล็อกใช้ npm.cmd
npm run doctor           # ตรวจว่า backend/.env และ API /health พร้อมหรือยัง
npm run ci               # ก่อน push
```

## URL ที่ deploy แล้ว (อัปเดตใน skill ถ้าเปลี่ยน)

- API (Cloud Run): ตั้ง `VITE_API_URL` บน Vercel ให้ชี้มาที่ URL นี้ (ไม่ใส่ path `/api` เป็นท้าย base ถ้าโค้ดต่อ path เอง)
- Frontend (Vercel): ตั้ง `FRONTEND_ORIGINS` บน Cloud Run = URL Vercel เต็ม `https://...`

## ความลับ / env

- **ห้าม** commit `backend/.env`, `frontend/.env` — อยู่ใน `.gitignore`
- API มี **Helmet** + **rate limit** ที่ `/api/members` และ `/api/auth/line` — ดู `SECURITY.md`
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

## skills.sh — ecosystem skill จากชุมชน

[skills.sh](https://skills.sh/) คือ **The Agent Skills Directory** — รวม skill สำหรับ AI agent หลายตัว รวมถึง **Cursor** (ค้นหา skill และ repo ต้นทางบนเว็บ)

**ใน repo นี้ติดตั้งแล้ว (vendor ใน `.cursor/skills/`):**

| โฟลเดอร์ | ใช้เมื่อ |
|-----------|----------|
| `deploy-to-vercel/` | deploy / preview บน Vercel |
| `react-best-practices/` | ตรงกับ leaderboard *vercel-react-best-practices* |
| `supabase-postgres-best-practices/` | SQL, RLS, performance Postgres |

แหล่งที่มาและวิธีรีเฟรช: [`.cursor/skills/VENDORED_SKILLS.md`](../VENDORED_SKILLS.md) — รันจากราก repo: `powershell -File scripts/sync-cursor-community-skills.ps1`

**หมายเหตุ CLI:** แพ็กเกจ npm `skillsadd` ถูก **deprecated** และชี้ไป **skills.ws** (ทดสอบแล้ว `--list` ล้มเหลว) — ไม่พึ่ง `npx skillsadd` สำหรับ repo นี้ ใช้ vendor จาก GitHub ตามตารางใน `VENDORED_SKILLS.md` แทน

Skill อื่นที่เข้ากับสแต็ก (ยังไม่ vendor — เพิ่มด้วย sparse clone แบบเดียวกับสคริปต์ หรือคัดลอกจาก repo บน skills.sh):

| งาน | ตัวอย่างจาก leaderboard |
|-----|-------------------------|
| Express / Node API | `nodejs-backend-patterns` ([wshobson/agents](https://github.com/wshobson/agents)) |
| GitHub Actions | `github-actions-docs` ([xixu-me/skills](https://github.com/xixu-me/skills)) |

**หมายเหตุ:** skill ชุมชน **เสริม** Agent — บริบท YRC เฉพาะในไฟล์นี้ยังเป็นหลัก

## เอกสารเพิ่ม

- `README.md` — setup, API, LINE, VAPID, deploy
- `SECURITY.md` — นโยบายความปลอดภัยและ git-secret
- `docs/LINE_LOGIN_CODE_REFERENCE.md` — **baseline โค้ดล็อกอิน LINE** (ลำดับ flow, ไฟล์, invariant) — อ่านก่อนแก้ส่วนนี้หรือเมื่อต้อง restore พฤติกรรมเดิม; คู่กับ `docs/LINE_LOGIN_CHECKLIST.md` (URL / env)
