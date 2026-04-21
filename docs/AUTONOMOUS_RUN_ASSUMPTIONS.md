# Autonomous run assumptions

บันทึกสมมติฐานเมื่อรันตาม `docs/TASK_INDEX.md` โดยไม่ถามผู้ใช้

## 2026-04-21 — TASK_INDEX ชิ้นที่ 1 (ล็อกขอบเขต + รายการหน้า priority)

- **ขอบเขตแบบ B:** ใช้คำจำกัดความเดิมใน `docs/UI_7_DAY_PLAN_2026-04.md` §2 (แบบ A + `/admin` + เชื่อม flow การเงิน–ประชุมผ่านลิงก์ไป `/committee/meetings` จากผู้ดูแล) — ไม่ขยายไปฟีเจอร์นอกข้อนี้
- **แหล่งที่มาของเส้นทาง:** ตาราง priority อิงเส้นทางที่ประกาศใน `frontend/src/App.tsx` (grep `path=`) เพื่อให้สอดคล้องกับโค้ดจริง
- **ลำดับ P0 / P1 / P2:** P0 = ทุกพอร์ทัลหลัก + shell + ผู้ดูแล + flow การเงิน–ประชุมที่ล็อกในแบบ B; P1 = เส้นทางที่ผู้ใช้ทั่วไป/สมาชิกอาจเข้าบ่อยแต่ไม่ใช่ “พอร์ทัลหลัก” (`/requests`, `/entry/cram-qr`); P2 = ช่องสำหรับรายการที่ทีมพบภายหลังภายในขอบเขต B
- **ลิสต์คำร้องจากผู้ใช้จริง:** ไม่พบไฟล์/issue ใน repo ที่รวบรวมไว้ — จึงระบุในข้อ 2.1 ว่าให้เติมทีหลังเมื่อมีข้อมูล

## 2026-04-21 — TASK_INDEX ชิ้นที่ 2 (Figma: user flow + หน้า lo-fi)

- **ไม่สามารถยืนยันไฟล์ Figma จาก repo:** ไม่มี snapshot/export ของ Figma ใน repo — สถานะ **เติมทีหลัง** อิงข้อความเดิมในแผน (มีลิงก์ + เชลล์มือถือ + โครงเมนู; รายละเอียดบางเฟรมเติมทีหลัง) และข้อ DoD §6 ที่ทีมติ๊กไว้แล้ว
- **คำว่า “ครบ” ใน checklist §5.1:** หมายถึงความคาดหวังของแผนแบบ B ไม่ใช่การ audit แบบเปิด Figma จริงในรอบ autonomous — ถ้าลิงก์หมดอายุหรือไฟล์ย้าย ให้ทีมอัปเดต URL ใน §5
- **ลิงก์ Figma:** ใช้ URL เดิมใน `UI_7_DAY_PLAN_2026-04.md` (`https://www.figma.com/design/YTvWsoZ0PlCltlrlSG9euH/`) โดยสมมติว่ายังเป็นไฟล์ทางการของทีม

## 2026-04-21 — TASK_INDEX ชิ้นที่ 3 (พอร์ทัลสมาชิก: โครง + เมนูย่อยมือถือ)

- **`PortalShell` เป็น shared component:** การปรับ `min-w-0` / `touch-pan-x` / `overscroll-x-contain` ใน `frontend/src/portal/ui.tsx` มีผลกับพอร์ทัลอื่นที่ใช้ `PortalShell` (committee, academy) ด้วย — ถือว่าเป็นพฤติกรรมเดียวกัน (เลื่อนเมนูแนวนอนไม่ดันความกว้างเกิน parent) ไม่ใช่การขยายขอบเขตงานไปแก้พอร์ทัลอื่นโดยเจตนา
- **ไม่ได้ทดสอบบนอุปกรณ์จริงในรอบนี้:** ปรับด้วยคลาส Tailwind ตามแนวทาง flex/grid overflow; เกณฑ์เสร็จอิง `npm run ci` ผ่าน

## 2026-04-21 — TASK_INDEX ชิ้นที่ 4 (พอร์ทัลสมาชิก: เนื้อหาแท็บ / ฟอร์ม)

- **การจัดกลุ่มฟิลด์ใน `MemberProfileSection`:** แบ่งเป็น «ข้อมูลทะเบียน / ที่อยู่ / การติดต่อ» โดยสมมติว่าครบทุกหัวใน `MEMBER_SELF_EDIT_HEADERS` ตามลำดับเดิมของระบบ — ถ้าเพิ่มหัวคอลัมน์ใน `memberImportMap.ts` ภายหลัง ต้องอัปเดต `PROFILE_FIELD_GROUPS` ให้ครอบคลุม
- **หน้า member อื่นใน `memberPages.tsx`:** ไม่แก้ในรอบนี้ — โฟกัสเฉพาะ `MemberPortal.tsx` + `MemberProfileSection.tsx` ตามขอบเขตชิ้นที่ 4

## 2026-04-21 — TASK_INDEX ชิ้นที่ 5 (พอร์ทัลคณะกรรมการ: โครง + เมนูย่อยมือถือ)

- **`frontend/src/portal/ui.tsx`:** ไม่แก้ในรอบนี้ — `PortalShell` ได้รับการปรับเมนูมือถือแนวนอนแล้วในชิ้นที่ 3 พอร์ทัลคณะกรรมการใช้คอมโพเนนต์เดียวกัน
- **`committeePages.tsx`:** เพิ่ม `min-w-0` ที่แถบมุมมองบทบาทและที่ห่อหน้า route หลัก เพื่อให้สอดคล้องแนวทางเดียวกับ `memberPages` — ไม่แก้ RBAC ใน backend

## 2026-04-21 — TASK_INDEX ชิ้นที่ 6 (พอร์ทัลคณะกรรมการ: หน้าลึก / รายละเอียด)

- **หน้าที่ปรับ:** โฟกัสหน้ายาวที่ `/committee/meetings`, `/committee/voting`, `/committee/dashboard` — แยก `<section>` + ลิงก์ข้ามส่วน (มุมมอง `lg`/`xl` ที่ซ่อนแถบ jump ตามแต่ละหน้า) และจำกัดความสูงรายการด้วย `committeePortalScrollList` เมื่อรายการเกินเกณฑ์ (ประชุม >4 รายการ, เอกสาร/รายงาน >3, ผลมติ >2, วาระลงมติ >2, แดชบอร์ด: กล่องงานด่วนใช้ scroll เสมอ; สถานะประชุมเมื่อ >4 รายการ)
- **หน้าอื่นใน committee:** `CommitteeMembersPage`, `CommitteeAttendancePage`, `CommitteeFinancePage` ไม่แก้ในรอบนี้ — ถือว่าโครงเดิมพอสำหรับความยาวปัจจุบัน หรือมีตาราง/เลย์เอาต์แยกอยู่แล้ว
- **ไม่แตะ finance backend** ตามข้อห้ามของชิ้นนี้

## 2026-04-21 — TASK_INDEX ชิ้นที่ 7 (พอร์ทัล Academy: โครง + เมนูย่อยมือถือ)

- **เหมือนชิ้นที่ 3 แต่เฉพาะ Academy:** เพิ่ม `min-w-0` ที่แถบมุมมองบทบาท ที่ห่อหน้า route หลัก (`min-w-0 space-y-4`) และที่ section ย่อยของมุมมอง student/parent ที่เป็นหน้าเดี่ยว — ลดการดันความกว้างเกิน parent / เลื่อนแนวนอนผิดจุด
- **`PortalShell` (`ui.tsx`):** เมนูย่อยมือถือแนวนอน (`touch-pan-x`, `overflow-x-auto`, …) มีอยู่แล้วจากชิ้นที่ 3 — เพิ่มเฉพาะ `min-w-0` ที่ grid หลักของ shell เพื่อให้เลย์เอาต์พอร์ทัล (รวม Academy) หดใน viewport สม่ำเสมอ
- **ไม่เปลี่ยนพฤติกรรม API/backend**

## 2026-04-21 — TASK_INDEX ชิ้นที่ 8 (พอร์ทัล Academy: หน้าลึก)

- **แนวทาง:** คล้ายชิ้นที่ 6 (committee) — แยก `<section>` + ลิงก์ข้ามส่วน (`academyJumpLinkClass`) บนมือถือ (`lg:hidden` / `xl:hidden` ตามหน้า) และใช้ `academyPortalScrollList` เมื่อรายการ/ตารางยาว (เกณฑ์เช่น คะแนนรายห้องบนแดชบอร์ด >4 แถว, ตารางห้องในหน้านักเรียน >5 แถว, ตารางคอร์ส >6 แถว)
- **หน้าที่ปรับ:** `AcademyDashboardPage`, `AcademyStudentsPage`, `AcademyCoursesPage`, `AcademyEnrollmentPage`, `AcademyResultsPage`, `AcademyReportsPage` — หน้า student/parent แบบข้อความสั้นยังไม่แตะ
- **`TrendBars`:** ไม่ห่อด้วย scroll แนวตั้ง — กราฟแท่งอาจถูกตัดผิดสัดส่วน; จำกัดความสูงเฉพาะรายการ/ตาราง
- **ไม่แก้ backend**

## 2026-04-21 — TASK_INDEX ชิ้นที่ 9 (ผู้ดูแล: แถบหมวดเลื่อนแนวนอน + การ์ด `/committee/meetings`)

- **ข้อความสิทธิ์ในการ์ด:** ใช้คำว่า «บทบาทคณะกรรมการในแอป» และ «แยกจาก Admin API key» เพื่อสื่อว่าเป็นพอร์ทัล RBAC ไม่ใช่การยืนยันด้วย Admin key — ไม่ได้อ้างชื่อ role ใน DB โดยตรง
- **เส้นทางใน title:** ใส่ `` `/committee/meetings` `` ใน title ของ `AdminCard` เพื่อให้เห็น path ชัดบนหน้าภาพรวมผู้ดูแล
- **ทดสอบอุปกรณ์จริง:** ไม่ได้รันในรอบนี้ — ปรับด้วยคลาส Tailwind (`touch-pan-x`, `overscroll-x-contain`, `min-w-0`, `FinanceAdminSubNav` เป็นแถบเลื่อนแนวนอน); เกณฑ์เสร็จอิง `npm run ci`

## 2026-04-21 — TASK_INDEX ชิ้นที่ 10 (ทวน flow Admin → `/committee/meetings`)

- **เส้นทางใน `frontend/src/App.tsx`:** `/admin` (และลูก) ห่อด้วย `RequireAppRoles` + `RBAC_NAV.admin` (`admin` เท่านั้น) — `/committee/*` ห่อด้วย `RBAC_NAV.committee` ซึ่งรวม `committee`, `committee_authorized_3of5`, `bank_signer_3of5`, และ **`admin`**
- **ความสอดคล้อง RBAC:** ผู้ใช้ที่เข้าหน้าแรก `/admin` ได้มีบทบาท `admin` ในแอป — จึงอยู่ในรายการที่อนุญาตของพอร์ทัลคณะกรรมการด้วย; ลิงก์การ์ดไป `/committee/meetings` จึงไม่ควรถูก `AccessDenied` จาก RBAC ในกรณีปกติ (ยกเว้นโหลด roles ล้มเหลว หรือยังไม่มี LINE UID เมื่อบังคับ RBAC)
- **ไม่มี `RequireAppRoutes` ใน repo** — ใช้เฉพาะ `RequireAppRoles` ตามที่อ้างใน TASK_INDEX
- **เมื่อปิดการบังคับ RBAC (`VITE_ENFORCE_APP_RBAC` ไม่ใช่ `true`):** `RequireAppRoles` แสดง children โดยไม่ตรวจบทบาท — พฤติกรรมตามโค้ดเดิม
- **ช่องว่างเทียบแผน:** ใน `UI_7_DAY_PLAN_2026-04.md` แถว P0 «เชื่อมการเงิน–ประชุม» กล่าวถึงข้อความสิทธิ์ «ถ้าไม่มีบทบาทคณะกรรมการ» — สำหรับผู้ที่เข้า `/admin` ได้ กรณีหลักคือมีบทบาท `admin` ในแอป (ซึ่งรวมใน `RBAC_NAV.committee`) จึงไม่ได้แก้ตารางในแผนในรอบนี้; ปรับข้อความการ์ดใน `AdminArea` + คอมเมนต์ใน `appRoles.ts` ให้สอดคล้องแทน

## 2026-04-21 — TASK_INDEX ชิ้นที่ 11 (App shell: เมนูหลัก + มุมมองบทบาท + safe area + skip-to-main)

- **สถานะก่อนแก้:** `index.html` มี `viewport-fit=cover` อยู่แล้ว; `App.tsx` มีลิงก์ข้ามไป `#app-main`, header/main ใช้ `env(safe-area-inset-*)` บางส่วนแล้ว
- **การเสริมในรอบนี้:** ลิงก์ skip จัดตำแหน่ง `top` ให้เคารพ `safe-area-inset-top` เมื่อโฟกัส; เมนูหลักเพิ่ม `min-w-0`, `touch-pan-x`, `overscroll-x-contain`; แถบมุมมองบทบาท — `<select>` ใช้คลาส `tap-target` + ความกว้างเต็มจอบนมือถือ + ข้อความสรุปแยกบรรทัดพร้อม `break-words`; `<main>` เพิ่ม `min-w-0` และ `scroll-mt` บนจอเล็กเพื่อโฟกัสหลัง skip; `index.html` เพิ่ม `meta name="color-scheme" content="dark"` ให้สอดคล้องธีมมืดของแอป
- **กรอบมือถือจริง:** ไม่ได้ทดสอบบนอุปกรณ์จริงในรอบนี้ — ปรับด้วยคลาส Tailwind ตามแนวทางเดียวกับพอร์ทัล/Admin; เกณฑ์เสร็จอิง `npm run ci`

## 2026-04-21 — TASK_INDEX ชิ้นที่ 12 (`themeTokens` + `.tap-target` + gate งบ bundle)

- **`themeTokens.ts`:** เพิ่ม export `themeTapTarget` (`'tap-target'`) เป็นชื่อคลาสเดียวกับ `index.css` — ใช้คู่ `themeAccent.focusRing` / `portalFocusRing`
- **`App.tsx`:** ลบค่าคงที่ `appFocusRing` ที่ซ้ำกับ `themeAccent.focusRing`; ลิงก์/ปุ่มหลักใน shell ใช้ `` `${themeTapTarget}` `` + `themeAccent.focusRing`
- **`portal/ui.tsx` + `MemberPortal.tsx`:** พอร์ทัลที่แตะบ่อย (เมนู `PortalShell`, แท็บสมาชิก, ลิงก์ที่เกี่ยวข้อง) อ้าง `themeTapTarget` แทนการสะกดสตริง `tap-target` เอง
- **`index.css`:** คอมเมนต์อ้างอิง `themeTapTarget` ใน `themeTokens` (พฤติกรรม `.tap-target` เดิม — `min-h-[44px]` + `touch-manipulation`)
- **ไม่แทนทั้ง repo:** แผง Admin/finance และไฟล์อื่นที่ยังเขียน `tap-target` ตรงๆ คงไว้ — ลดขอบเขต diff ตาม TASK_INDEX
- **Gate:** รัน `npm run ci` แล้ว `npm run perf:baseline:fast` (อัปเดต `docs/PERFORMANCE_BASELINE.json` ฯลฯ จาก `frontend/dist` ปัจจุบัน) จากนั้น `npm run perf:budget` — ผ่านทั้งคู่

## 2026-04-21 — TASK_INDEX ชิ้นที่ 13 (หน้า entry สาธารณะ: `/`, `/auth/link`, `/entry/cram-qr`)

- **ขอบเขต:** ปรับเฉพาะคอมโพเนนต์ที่ route กล่าวถึงใช้ — `HomePage` + `LinkPage` + `MemberLinkPanel` + `PushOptIn` ใน `App.tsx`, `CramQrEntryPage.tsx`; ไม่แตะพอร์ทัล `/member/*` นอก flow ผูกบัญชี
- **แนวทางมือถือ:** `min-w-0` + `break-words` บนข้อความยาว; แถบทางลัด dev บนหน้าแรกใช้เลื่อนแนวนอนแทน `flex-wrap` ที่อาจดันความกว้าง; ปุ่ม/ลิงก์หลักใช้ `themeTapTarget` (คลาส `.tap-target` เดิม) และบนจอแคบให้ปุ่มบางจุดเต็มความกว้าง (`w-full sm:w-auto`) เพื่อให้แตะง่าย
- **ไม่รัน `perf:budget`:** ชิ้นที่ 13 เกณฑ์เสร็จคือ `npm run ci` เท่านั้น (ตาม TASK_INDEX)
- **ทดสอบอุปกรณ์จริง:** ไม่ได้รันในรอบนี้ — อิง CSS + Tailwind ตามข้อด้านบน

## 2026-04-21 — TASK_INDEX ชิ้นที่ 14 (คำร้อง `/requests` + `MemberRequestsPanel`)

- **ขอบเขต:** `MemberRequestsPanel.tsx` + route `/requests` ใน `App.tsx` (ห่อ `min-w-0` รอบแผง) — ไม่เปลี่ยนพฤติกรรม API หรือสิทธิ์
- **แนวทางมือถือ:** ลดการล้นแนวนอนด้วย `min-w-0` บนคอนเทนเนอร์หลัก/การ์ด/กริด; ช่องกรองที่เคยใช้ความกว้างคงที่ (`w-56` / `w-64` / `w-72`) เปลี่ยนเป็น `w-full min-w-0` บนจอแคบและจำกัดความกว้างบน `sm+` ด้วย `sm:max-w-*` ที่เหมาะสม; แถวเครื่องมือหลัก stack เป็นคอลัมน์บนมือถือ; ปุ่ม «โหลดรายการ» / ส่งออก / ทำเครื่องหมายอ่านแล้ว ให้เต็มความกว้างบนจอแคบ (`w-full sm:w-auto`); แถบสรุปกิจกรรม (ชิปหลายอัน) เลื่อนแนวนอนได้บนจอแคบ (`overflow-x-auto` + `flex-nowrap` แล้ว `sm:flex-wrap`); `pre`/JSON ใช้ `max-w-full overscroll-x-contain`; เทมเพลตเหตุผลปฏิเสธใช้ `max-w-full text-left leading-snug`; สตริง `tap-target` ในคลาสปุ่มแทนที่ด้วย `themeTapTarget` ให้สอดคล้องชิ้นที่ 12
- **เกณฑ์เสร็จ:** `npm run ci` ผ่าน (ไม่บังคับ `perf:budget` ในชิ้นนี้)
- **ทดสอบอุปกรณ์จริง:** ไม่ได้รันในรอบนี้

## 2026-04-21 — TASK_INDEX ชิ้นที่ 15 (ทบทวนมือถือ ~360–430px + บันทึกผล — checklist `UI_7_DAY_PLAN_2026-04.md` §8)

- **ข้อจำกัดสภาพแวดล้อง:** ไม่ได้เปิด Chrome DevTools / ไม่ได้จำลองความกว้างจอจริง และ**ไม่ได้ทดสอบบนเครื่องจริง** — ทำได้เพียง**ทบทวนแบบ static** จากโค้ดและเอกสารใน repo ตามที่ TASK_INDEX อนุญาตเมื่อไม่มี staging
- **บั๊กที่พบจากการทบทวน static:** **ไม่พบ** — ไม่มีรายการที่ยืนยันได้ว่าเป็นบั๊ก UX มือถือโดยไม่รันเบราว์เซอร์
- **สรุปตามรายการ §8 (ผล = สอดคล้องโค้ดที่มี / ต้องยืนยันใน DevTools):**

| รายการ §8 | ผล (static) | อ้างอิงสั้น |
|------------|-------------|--------------|
| ข้ามไปเนื้อหาหลัก → `#app-main` | สอดคล้อง | ลิงก์ `href="#app-main"` + `<main id="app-main" tabIndex={-1}>` ใน `frontend/src/App.tsx`; โฟกัสแนว `focus-visible` + `scroll-mt` |
| เมนูหลักเลื่อนแนวนอน ปุ่มไม่ทับกัน | สอดคล้อง | `<nav>` ใช้ `overflow-x-auto`, `touch-pan-x`, `min-w-0`; `NavPill` ในแถว `flex-nowrap` |
| พอร์ทัล — แถบเมนูย่อย + มุมมองบทบาท | สอดคล้อง (โครง) | `PortalShell` ใน `frontend/src/portal/ui.tsx` — แถบเมนูย่อยแนวนอน + งานก่อนหน้าเพิ่ม `min-w-0` ตามชิ้น 3–8 |
| `/admin` — แถบหมวด + การ์ดไป `/committee/meetings` | สอดคล้อง (โครง) | `AdminArea` + การ์ดลิงก์; RBAC ตาม `RequireAppRoles` — **การคลิกจริง + สิทธิ์** ต้องยืนยันใน DevTools/staging |
| แถบแนวตั้งยาวผิดปกติ | ไม่สรุปได้ | ต้องยืนยันด้วยสายตาใน DevTools ที่ความกว้าง ~360–430px |
| safe area / notch / home indicator | สอดคล้อง (โครง) | `viewport-fit=cover` ใน `frontend/index.html`; `header` / `<main>` ใช้ `env(safe-area-inset-*)` ใน `App.tsx` |

- **ขั้นตอนถัดไปสำหรับทีม:** เปิด local หรือ staging → DevTools device mode (ความกว้าง ~360–430px) → ติ๊ก checklist §8 ใน `UI_7_DAY_PLAN_2026-04.md` ตามผลจริง — รอบ autonomous นี้**ไม่ติ๊กช่อง**ใน §8 เป็น «ผ่านแล้ว» เพื่อไม่ให้เข้าใจผิดว่าได้รัน DevTools แล้ว

## 2026-04-21 — TASK_INDEX ชิ้นที่ 16 (ภาษาไทย + ชื่อเมนู + empty/error)

- **ขอบเขต:** จำกัดเฉพาะสตริง UI ในไฟล์ที่ชิ้นก่อนหน้าแตะ (`App.tsx`, `RequireAppRoles.tsx`, `portal/ui.tsx`, `MemberRequestsPanel.tsx`) — ไม่ไล่แก้ทั้ง monorepo
- **ชื่อเมนูพอร์ทัล:** สมมติว่าให้ป้ายที่มองเห็นบนมือถือใช้คำว่า «เมนูพอร์ทัล» เหมือนด้านข้างบนจอใหญ่ (เดิมมือถือใช้ «เมนูย่อย») เพื่อลดความรู้สึกว่าเป็นคนละเมนู; ยังคงบอกเลย์เอาต์ใน `aria-label` (เลื่อนแนวนอน มือถือ)
- **ขั้นตอนถัดไปใน empty/error:** ข้อความเพิ่มเป็นแนวทางทั่วไปจากสภาพ UI (โหลดรายการ / ล้างตัวกรอง / กลับหน้าหลัก) — ไม่ได้อ้างบทบาทหรือสิทธิ์เฉพาะรายนอกข้อความที่มีอยู่แล้ว

## 2026-04-21 — TASK_INDEX ชิ้นที่ 17 (Gate: `npm run ci` + `npm run perf:budget`)

- **รันจาก root monorepo:** `npm run ci` แล้ว `npm run perf:budget` — **ทั้งคู่ exit 0** โดยไม่ต้องแก้โค้ดหรืองบประมาณในรอบนี้
- **ผลล่าสุดจาก `perf:budget`:** ข้อความสคริปต์รายงาน `Performance budget OK` พร้อมตัวเลข gzip (main JS / total JS / all assets) อิง build ปัจจุบันหลัง `ci` build frontend
- **สมมติฐานเพิ่ม:** ไม่จำเป็น — gate ผ่านตรงตามเกณฑ์ TASK_INDEX

## 2026-04-21 — TASK_INDEX ชิ้นที่ 18 (Deploy staging + smoke + อัปเดตแผน)

- **สถานะ deploy / smoke:** รอบ autonomous **ไม่ได้รัน** `vercel deploy`, `gcloud run deploy`, หรือคำสั่ง deploy อื่นที่ต้องใช้บัญชี/โทเค็น — **ไม่มี** URL ของ preview/staging หรือ Cloud Run ที่ยืนยันได้ใน environment ของรอบนี้; **ไม่ได้รัน** `node scripts/verify-deployment.mjs` หรือ smoke มือถือบน URL จริง
- **เกณฑ์เสร็จตาม TASK_INDEX:** เอกสารสะท้อนความจริง — `docs/UI_7_DAY_PLAN_2026-04.md` ส่วน **§8** และ **ส่วนอัปเดต** บันทึกว่า deploy/smoke รอทีม; checklist §8 **ยังไม่ติ๊ก** (ไม่แกล้งว่า deploy แล้ว)
- **ขั้นตอนที่ทีมทำต่อ (อ้าง `docs/DEPLOY_VERIFY.md`):** (1) deploy frontend (เช่น Vercel) + API (เช่น Cloud Run) จาก commit ที่ต้องการ (2) รัน `npm run ci` / ยืนยัน CI บน branch ที่ deploy (3) ราก repo: `node scripts/verify-deployment.mjs https://<CLOUD_RUN_URL> https://<VERCEL_FRONTEND_URL>` หรือตั้ง `VERIFY_API_BASE` / `VERIFY_FRONTEND_ORIGIN` แล้ว `npm run verify:deploy` (4) ตามด้วย smoke มือถือ ~360–430px หรือ DevTools แล้วติ๊ก checklist ใน `UI_7_DAY_PLAN_2026-04.md` §8
- **หมายเหตุ §8:** ข้อความ checklist พอร์ทัลใช้คำว่า «เมนูพอร์ทัล» ให้สอดคล้องกับป้ายใน `PortalShell` (งานก่อนหน้า) — ไม่ใช่การขยายขอบเขตโค้ดในชิ้นที่ 18
