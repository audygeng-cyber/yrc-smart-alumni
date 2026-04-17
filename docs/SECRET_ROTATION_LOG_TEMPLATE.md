# Secret Rotation Log Template

ใช้ไฟล์นี้เป็นแม่แบบบันทึกผล “หลังหมุนคีย์จริง” เพื่อเก็บหลักฐานการดำเนินการและตรวจสอบย้อนหลัง

> อ้างอิงขั้นตอนหลัก: `docs/SECRET_ROTATION_CHECKLIST.md`

## Incident Metadata

- Incident ID:
- วันที่เริ่มพบความเสี่ยง:
- ผู้รับผิดชอบหลัก:
- ผู้ตรวจทาน:
- สาเหตุ (สรุปสั้น):

## Secrets Rotated

| Secret | Scope/Environment | Rotated At | Rotated By | Verification |
|---|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | | | | |
| `ADMIN_UPLOAD_KEY` | | | | |
| `PRESIDENT_UPLOAD_KEY` / `PRESIDENT_KEYS_JSON` | | | | |
| `LINE_CHANNEL_SECRET` | | | | |
| `VAPID_PRIVATE_KEY` | | | | |

## Deployment/Restart Record

| Service | Environment | Action | Time | Operator | Result |
|---|---|---|---|---|---|
| Backend API | | Deploy/Restart | | | |
| Frontend | | Deploy (if needed) | | | |
| Other | | | | | |

## Verification Evidence

- Local check:
  - [ ] `npm run ci` ผ่าน
- GitHub Actions:
  - [ ] `build-and-lint` ผ่าน
  - [ ] `docker-image` ผ่าน
  - [ ] `smoke-production` ผ่าน
- Functional smoke:
  - [ ] `/health`
  - [ ] admin endpoints (`x-admin-key`)
  - [ ] member link/request flow
  - [ ] LINE login flow (ถ้าใช้งาน)
  - [ ] push subscribe flow (ถ้าใช้งาน)

ลิงก์หลักฐาน:

- CI run URL:
- Release/Tag URL (ถ้ามี):
- Incident ticket URL:

## Cleanup Confirmation

- [ ] ลบหรือทำให้ปลอดภัยแล้วสำหรับข้อความ/ไฟล์ที่เคยมีค่า secret จริง
- [ ] ยืนยันว่าห้ามเผยแพร่ค่าเดิมซ้ำในช่องทางทีม
- [ ] ตรวจว่า `.env` local files ถูก ignore (`backend/.env`, `frontend/.env`)

## Closure

- วันที่ปิด incident:
- ผู้อนุมัติปิดงาน:
- หมายเหตุบทเรียนที่ได้:
