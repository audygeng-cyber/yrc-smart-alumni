# Localization + A11y Handoff

เอกสารนี้ใช้สรุปรอบงานปรับ UX/a11y/localization ล่าสุด เพื่อส่งต่องานก่อนปล่อยใช้งาน

## ขอบเขตงานที่ปรับ

- ปรับข้อความผู้ใช้ฝั่ง `frontend` ให้สอดคล้องภาษาไทยและคำเทคนิคมาตรฐาน
- ปรับ `focus-visible` และคลาสโฟกัสกลาง (`portalFocusRing`, `appFocusRing`) ให้ใช้งานคีย์บอร์ดชัดเจนขึ้น
- ปรับข้อความ response ฝั่ง `backend` ใน route หลักให้ใช้ถ้อยคำไทยสอดคล้องกัน
- ปรับเอกสารใน `docs/` ให้ตรงกับคำศัพท์ปัจจุบันของระบบ

## มาตรฐานคำศัพท์ (ใช้งานจริง)

- ใช้ `ผู้ดูแล (Admin)` หรือ `Admin key (x-admin-key)` ตามบริบท
- ใช้ `LINE UID` ตัวพิมพ์ใหญ่เสมอ
- ใช้ `เซสชัน` แทน `session` เมื่อเป็นข้อความผู้ใช้
- ใช้ `สแนปช็อต` แทน `snapshot` เมื่อเป็นข้อความผู้ใช้
- ข้อความ API ให้ใช้ถ้อยคำคงที่ เช่น:
  - `ต้องระบุ...`
  - `ไม่พบ...`
  - `...ไม่สำเร็จ`
  - `ไม่ได้รับอนุญาต`

## พื้นที่ที่ปรับหลัก

- `frontend/src/components/*`
- `frontend/src/portal/*`
- `frontend/src/App.tsx`
- `backend/src/routes/*`
- `backend/src/middleware/*`
- `backend/src/util/presidentKeys.ts`
- `docs/UI_TH_TERMINOLOGY_CHECKLIST.md`
- `docs/MEMBER_FLOW.md`
- `docs/ACCOUNTING_FLOW.md`

## Smoke Test ก่อนปล่อย

- Web desktop (Chrome/Edge):
  - เข้าหน้า Member/Committee/Academy ได้ครบ
  - Tab ด้วยคีย์บอร์ดเห็น focus ring ทุกจุด interactive
  - ข้อความ toast/error เป็นไทยตามมาตรฐาน
- Tablet (iPad/Android tablet):
  - เมนู/การ์ดไม่ล้นจอ
  - ฟอร์มกรอกข้อมูลและปุ่มสำคัญกดได้ครบ
- Mobile (iPhone/Android):
  - หน้า Link/Requests/Admin ใช้งานได้ ไม่ซ้อนทับ
  - ข้อความสำคัญอ่านง่าย ไม่ตัดผิดบริบท
  - Web Push flow แสดงข้อความแนะนำถูกต้อง

## จุดที่ควรจับตาหลังปล่อย

- ข้อความจาก upstream/service ภายนอก (เช่น LINE API) อาจยังส่งรายละเอียดอังกฤษใน `details`
- error ที่เป็น machine code (เช่น `line_token_exchange_failed`) ตั้งใจคงไว้เพื่อ debug
- หากเพิ่ม route ใหม่ ให้ยึดรูปแบบภาษาเดียวกับเอกสารนี้และ checklist คำศัพท์
