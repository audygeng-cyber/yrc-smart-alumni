# Pre-Commit Package

เอกสารนี้สรุปงานที่แก้ไว้ทั้งหมดเพื่อช่วยตรวจรอบสุดท้ายก่อน commit

## 1) Frontend: UX + A11y + Localization

### กลุ่มไฟล์หลัก

- `frontend/src/App.tsx`
- `frontend/src/components/AdminCramPanel.tsx`
- `frontend/src/components/AdminFinancePanel.tsx`
- `frontend/src/components/AdminImportPanel.tsx`
- `frontend/src/components/AdminSchoolActivitiesPanel.tsx`
- `frontend/src/components/MemberLinkPanel.tsx`
- `frontend/src/components/MemberPortal.tsx`
- `frontend/src/components/MemberProfileSection.tsx`
- `frontend/src/components/MemberRequestsPanel.tsx`
- `frontend/src/components/PushOptIn.tsx`
- `frontend/src/memberImportMap.ts`
- `frontend/src/portal/academyPages.tsx`
- `frontend/src/portal/committeePages.tsx`
- `frontend/src/portal/dataAdapter.ts`
- `frontend/src/portal/memberPages.tsx`
- `frontend/src/portal/mockData.ts`
- `frontend/src/portal/ui.tsx`
- `frontend/src/portal/portalLabels.ts` (ไฟล์ใหม่)

### สิ่งที่เปลี่ยนโดยสรุป

- ทำข้อความภาษาไทยให้คงรูปแบบเดียวกันทั้งพอร์ทัล
- ทำคำเทคนิคให้สอดคล้อง เช่น `LINE UID`, `Admin key`, `เซสชัน`, `สแนปช็อต`
- ขยายการใช้ focus ring กลางและ `focus-visible` ให้ครอบคลุมจุด interactive สำคัญ
- ปรับถ้อยคำช่วยผู้ใช้ใน toast/placeholder/label ให้เข้าใจง่ายขึ้น

## 2) Backend: API Response Messaging Alignment

### กลุ่มไฟล์หลัก

- `backend/src/app.ts`
- `backend/src/middleware/adminAuth.ts`
- `backend/src/middleware/presidentAuth.ts`
- `backend/src/routes/cramAdmin.ts`
- `backend/src/routes/financeAdmin.ts`
- `backend/src/routes/importMembers.ts`
- `backend/src/routes/lineAuth.ts`
- `backend/src/routes/memberRequestsAdmin.ts`
- `backend/src/routes/members.ts`
- `backend/src/routes/push.ts`
- `backend/src/routes/schoolActivitiesAdmin.ts`
- `backend/src/util/presidentKeys.ts`
- `backend/src/data/portalSnapshot.ts`
- `backend/src/app.test.ts` (ปรับ test string ตาม response ใหม่)

### สิ่งที่เปลี่ยนโดยสรุป

- แปลข้อความ user-facing ใน error/validation ให้เป็นไทยอย่างสม่ำเสมอ
- คง machine code / field สำคัญไว้เพื่อไม่กระทบ contract และการ debug
- ทำรูปแบบถ้อยคำกลางให้เสถียร เช่น `ต้องระบุ...`, `ไม่พบ...`, `...ไม่สำเร็จ`, `ไม่ได้รับอนุญาต`
- ปรับ snapshot fallback text ให้ตรงคำศัพท์เดียวกับ frontend

## 3) Docs: Source of Truth Alignment

### กลุ่มไฟล์หลัก

- `README.md`
- `docs/ACCOUNTING_FLOW.md`
- `docs/MEMBER_FLOW.md`
- `docs/SYSTEM_V2_ROADMAP.md`
- `docs/UI_TH_TERMINOLOGY_CHECKLIST.md` (ไฟล์ใหม่)
- `docs/LOCALIZATION_A11Y_HANDOFF.md` (ไฟล์ใหม่)

### สิ่งที่เปลี่ยนโดยสรุป

- ทำคำอธิบาย `Admin key (x-admin-key)` และคำศัพท์มาตรฐานให้ตรงกับโค้ด
- เพิ่มเอกสารมาตรฐานคำศัพท์ + handoff + checklist ข้ามอุปกรณ์
- ลดโอกาส regression ของถ้อยคำในรอบแก้ถัดไป

## 4) Suggested Commit Message

ตัวเลือกแนะนำ (commit เดียว):

`standardize thai ux/a11y wording across frontend, backend responses, and docs`

ตัวเลือกแนะนำ (แยก 2 commits):

1. `improve portal accessibility and thai ui terminology consistency`
2. `align backend response wording and update localization handoff docs`

## 5) Final Verification Status

- `npm run ci` ผ่านหลังการปรับล่าสุด
- `frontend` build/lint ผ่าน
- `backend` build/lint/test ผ่าน
