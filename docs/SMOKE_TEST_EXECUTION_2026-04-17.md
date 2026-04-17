# Smoke Test Execution — 2026-04-17

เอกสารนี้บันทึกผลการทดสอบหลังปล่อย `v2026.04.17` โดยแยกผลอัตโนมัติและงาน manual ข้ามอุปกรณ์

## Release Scope

- Tag: `v2026.04.17`
- Commits หลัก:
  - `b189c83`
  - `88eb49a`
  - `e747af7`

## Automated Checks (Completed)

- Local CI (`npm run ci`): **PASS**
- GitHub Actions CI:
  - Run `24555384678`: **PASS**
  - Run `24555545827`: **PASS**
  - Run `24555738899`: **PASS**
- GitHub Actions job coverage:
  - `build-and-lint`: **PASS**
  - `docker-image`: **PASS**
  - `smoke-production`: **PASS**

## Manual Cross-Device Checklist

สถานะ:
- `[ ]` ยังไม่ทดสอบ
- `[~]` กำลังทดสอบ
- `[x]` ผ่าน
- `[!]` พบประเด็น

### Desktop (Chrome / Edge)

- [ ] เข้า `/member/dashboard`, `/committee/dashboard`, `/academy/dashboard` ได้ครบ
- [ ] ใช้คีย์ `Tab` แล้วเห็น focus ring ครบทุกองค์ประกอบ interactive หลัก
- [ ] หน้า `คำร้อง` แสดงข้อความไทยและสถานะ (`ต้องระบุ...`, `ไม่พบ...`, `...ไม่สำเร็จ`) ถูกต้อง
- [ ] หน้า `ผู้ดูแล (Admin)` ทำงานครบใน flow โหลด/กรอง/ส่งคำขอ

### Tablet (iPad / Android tablet)

- [ ] เมนูและการ์ดไม่ล้นจอในหน้า portal และ admin
- [ ] ฟอร์ม input/select/button กดได้ครบ ไม่โดนซ้อน
- [ ] ข้อความยาวไม่ตัดจนเสียความหมาย

### Mobile (iPhone / Android)

- [ ] หน้า `ผูกบัญชี` (`/auth/link`) ใช้งาน flow ตรวจสอบ + สมัครใหม่ได้
- [ ] หน้า `คำร้อง` (`/requests`) อ่านง่ายและกดปุ่มได้ครบ
- [ ] หน้า `ผู้ดูแล (Admin)` ใช้งานได้โดยไม่เกิด layout overlap
- [ ] ข้อความแจ้งเตือน Web Push และคำอธิบายการใช้งานมือถือถูกต้อง

## Issues Found

- ยังไม่บันทึกปัญหา

## Tester Notes

- ผู้ทดสอบ:
- วันที่/เวลา:
- อุปกรณ์/เบราว์เซอร์:
- หมายเหตุเพิ่มเติม:
