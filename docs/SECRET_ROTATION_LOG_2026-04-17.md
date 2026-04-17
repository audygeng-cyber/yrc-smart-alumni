# Secret Rotation Log — 2026-04-17

> อ้างอิงขั้นตอนหลัก: `docs/SECRET_ROTATION_CHECKLIST.md`  
> แม่แบบ: `docs/SECRET_ROTATION_LOG_TEMPLATE.md`

## Incident Metadata

- Incident ID: `SEC-2026-04-17-ENV-EXPOSURE`
- วันที่เริ่มพบความเสี่ยง: `2026-04-17`
- ผู้รับผิดชอบหลัก: `TBD`
- ผู้ตรวจทาน: `TBD`
- สาเหตุ (สรุปสั้น): พบการเปิดเผยค่า secret ผ่านการแชร์เนื้อหา `.env` ในบริบทสนทนา แม้ไฟล์ไม่ได้ถูก commit ใน git

## Secrets Rotated

| Secret | Scope/Environment | Rotated At | Rotated By | Verification |
|---|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `TBD` | `TBD` | `TBD` | `TBD` |
| `ADMIN_UPLOAD_KEY` | `TBD` | `TBD` | `TBD` | `TBD` |
| `PRESIDENT_UPLOAD_KEY` / `PRESIDENT_KEYS_JSON` | `TBD` | `TBD` | `TBD` | `TBD` |
| `LINE_CHANNEL_SECRET` | `TBD` | `TBD` | `TBD` | `TBD` |
| `VAPID_PRIVATE_KEY` | `TBD` | `TBD` | `TBD` | `TBD` |

## Deployment/Restart Record

| Service | Environment | Action | Time | Operator | Result |
|---|---|---|---|---|---|
| Backend API | `TBD` | Deploy/Restart | `TBD` | `TBD` | `TBD` |
| Frontend | `TBD` | Deploy (if needed) | `TBD` | `TBD` | `TBD` |
| Other | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` |

## Verification Evidence

- Local check:
  - [x] `npm run ci` ผ่าน (ก่อนเริ่ม incident response doc รอบนี้)
- GitHub Actions:
  - [x] `build-and-lint` ผ่าน
  - [x] `docker-image` ผ่าน
  - [x] `smoke-production` ผ่าน
- Functional smoke:
  - [ ] `/health`
  - [ ] admin endpoints (`x-admin-key`)
  - [ ] member link/request flow
  - [ ] LINE login flow (ถ้าใช้งาน)
  - [ ] push subscribe flow (ถ้าใช้งาน)

ลิงก์หลักฐาน:

- CI run URL: `https://github.com/audygeng-cyber/yrc-smart-alumni/actions/runs/24557069717`
- Release/Tag URL: `https://github.com/audygeng-cyber/yrc-smart-alumni/releases/tag/v2026.04.17`
- Incident ticket URL: `TBD`

## Cleanup Confirmation

- [ ] ลบหรือทำให้ปลอดภัยแล้วสำหรับข้อความ/ไฟล์ที่เคยมีค่า secret จริง
- [ ] ยืนยันว่าห้ามเผยแพร่ค่าเดิมซ้ำในช่องทางทีม
- [x] ตรวจว่า `.env` local files ถูก ignore (`backend/.env`, `frontend/.env`)

## Closure

- วันที่ปิด incident: `TBD`
- ผู้อนุมัติปิดงาน: `TBD`
- หมายเหตุบทเรียนที่ได้: `TBD`
