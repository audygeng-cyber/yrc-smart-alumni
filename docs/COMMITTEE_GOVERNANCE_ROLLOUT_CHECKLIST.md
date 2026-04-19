# Checklist — คณะกรรมการ 35 / องค์ประชุม / RSVP / ผู้อนุมัติจ่าย

ใช้ตารางนี้ติ๊กงานที่เสร็จแล้ว (`[ ]` → `[x]`). ลำดับแนะนำ: Phase A → H

## Phase A — เกณฑ์ 100% ฝั่ง repo (ทำแล้ว = พร้อม merge)

| รายการ | สถานะ |
|--------|--------|
| `npm run ci` ผ่าน (build + lint + test ทั้ง frontend/backend) | [x] |
| เทส API: `GET /` มี `paths.adminMemberRoles` และ portal อ้างถึง `rsvp-summary` (`backend/src/app.test.ts`) | [x] |
| เทส API: `PATCH /api/admin/members/app-roles/:id` ต้องใส่ `x-admin-key` (ไม่ใส่ = 401) | [x] |

**ยังทำใน repo ไม่ได้ (ต้องทำบน Git / hosting):** Merge PR ขึ้น `main`, deploy Cloud Run + Vercel — ติ๊กแถว 1 ในตารางรวมเมื่อเสร็จ

---

## ตารางรวม (สถานะเดียว)

| ลำดับ | Phase | งานย่อย | สถานะ |
|------:|-------|----------|--------|
| 1 | A | Merge / deploy โค้ด branch นี้ขึ้น main และปล่อย backend + frontend | [ ] |
| 2 | A | รัน `npm run ci` บน branch ก่อน merge (หรือบน CI) | [x] |
| 3 | B | รัน migration `20260418130000_committee_rsvp_payment_approver_role.sql` บน Supabase (ทดสอบก่อน แล้วค่อย production) | [ ] |
| 4 | B | ตรวจใน Table Editor: มี `payment_approver` ใน constraint ของ `app_user_roles` | [ ] |
| 5 | B | ตรวจ: มีตาราง `meeting_session_rsvp` และ index | [ ] |
| 6 | C | ตั้ง `ADMIN_UPLOAD_KEY` / secrets บน Cloud Run ให้ตรงกับที่ frontend ใช้ | [ ] |
| 7 | C | Deploy API แล้วทดสอบ `GET /health` | [ ] |
| 8 | C | Deploy frontend (Vercel) แล้วตรวจ `VITE_API_URL` ชี้ API ถูกต้อง | [ ] |
| 9 | D | สมาชิกกรรมการ: ผูก LINE + เปิดแอปให้เกิด `app_users` + ซิงก์ `POST /api/members/app-roles` | [ ] |
| 10 | D | Admin: หน้า สมาชิกและนำเข้า → ส่วน «บทบาทกรรมการและผู้อนุมัติจ่าย» → ใส่ `members.id` + ติ๊ก committee / payment_approver | [ ] |
| 11 | D | บันทึกรายชื่อว่าใครได้ role อะไร (สำรององค์กร) | [ ] |
| 12 | E | สร้าง `meeting_session` สำหรับรอบประชุมจริง | [ ] |
| 13 | E | กรรมการทดสอบ RSVP ที่ `/committee/attendance` (ต้อง login LINE) | [ ] |
| 14 | E | ตรวจตัวเลข RSVP บนแดชบอร์ดคณะกรรมการหลังรีเฟรช | [ ] |
| 15 | F | ลงชื่อเข้าประชุม (`sign-attendance` หรือ flow ที่ใช้จริง) ให้ครบอย่างน้อย **24 คน** ก่อนทำเรื่องเงิน | [ ] |
| 16 | F | ทดสอบ `GET /api/admin/finance/meeting-sessions/:id/summary` — quorum = 24, majority จากจำนวนผู้เข้าประชุม | [ ] |
| 17 | G | สร้างคำขอจ่ายยอด **> 20,000** พร้อม `meeting_session_id` | [ ] |
| 18 | G | อนุมัติด้วย role **payment_approver** ในแผงการเงิน (ไม่ใช่ committee อย่างเดียวสำหรับคำขอใหม่) | [ ] |
| 19 | G | ถ้ามีคำขอเก่า `required_role_code = committee` ทดสอบว่ายังอนุมัติได้ (ช่วงเปลี่ยนผ่าน) | [ ] |
| 20 | H | UAT: วาระประชุมผูก `meeting_session_id` → โหวต → `vote-summary` แสดง quorum/majority สมเหตุสมผล | [ ] |
| 21 | H | ปิดวาระ (`close`) แล้วตรวจผลบน portal / admin | [ ] |
| 22 | H | อัปเดตเอกสารภายในองค์กร (ใครทำอะไร / องค์ประชุม 24 คน) — ถ้าต้องการ | [ ] |

---

## แยกตาม Phase (หัวข้อสั้น)

### Phase A — โค้ดและ CI
- [ ] Branch พร้อม merge (เปิด PR / merge บน GitHub — ทำเมื่อพร้อมปล่อย)
- [x] `npm run ci` ผ่าน (ยืนยันในเครื่องแล้ว; รันซ้ำก่อน push ทุกครั้ง)

### Phase B — Database
- [ ] Migration รันครบบนสภาพแวดล้อมเป้าหมาย
- [ ] ตรวจ schema หลัง migration

### Phase C — Deploy & env
- [ ] Backend + frontend deploy
- [ ] Env / CORS / API URL ถูกต้อง

### Phase D — บทบาทผู้ใช้
- [ ] กรรมการมี `app_users` + role ตามที่กำหนด
- [ ] Admin กำหนด `committee` และ `payment_approver` ครบตามนโยบาย

### Phase E — ประชุม (RSVP)
- [ ] มี meeting session
- [ ] RSVP ทดสอบได้และตัวเลขขึ้นบน UI

### Phase F — องค์ประชุม (ลงชื่อ)
- [ ] ผู้เข้าประชุม ≥ 24 คน (ตามระบบนับ `meeting_attendance`)
- [ ] สรุปรอบประชุมตรวจสอบได้

### Phase G — การเงิน (>20k)
- [ ] คำขอจ่าย + meeting ผูกถูก
- [ ] อนุมัติด้วย `payment_approver` สำเร็จ

### Phase H — มติ / UAT สุดท้าย
- [ ] วาระ + โหวต + ปิดวาระ
- [ ] สรุปภายในองค์กร (ถ้ามี)

---

## ลำดับคำสั่งทดสอบแบบย่อ (หลัง deploy)

แทนที่ `<BASE>` `<KEY>` `<MEMBER_ID>` `<SESSION_ID>` `<AGENDA_ID>` ด้วยค่าจริง

1. Health: `GET <BASE>/health`
2. กำหนดบทบาท: `PATCH <BASE>/api/admin/members/app-roles/<MEMBER_ID>` header `x-admin-key: <KEY>` body `{"committee":true,"payment_approver":true}`
3. สรุป RSVP: `GET <BASE>/api/portal/committee/meetings/<SESSION_ID>/rsvp-summary`
4. สรุปโหวต: `GET <BASE>/api/portal/committee/agendas/<AGENDA_ID>/vote-summary`
5. สรุปรอบประชุม (admin): `GET <BASE>/api/admin/finance/meeting-sessions/<SESSION_ID>/summary` header `x-admin-key: <KEY>`

---

*สร้างจากฟีเจอร์คณะกรรมการ / องค์ประชุม 2/3 ของ 35 คน / มติจากผู้เข้าประชุมจริง / `payment_approver` / RSVP*
