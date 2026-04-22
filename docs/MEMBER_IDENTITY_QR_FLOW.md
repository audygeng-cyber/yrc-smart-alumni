# Flow: QR บัตรสมาชิก + รับบัตรเลือกตั้ง (`member_identity_qr_token`)

เอกสารนี้สำหรับผู้รับงานรุ่นถัดไป — ชื่อฟิลด์, API, หน้าเว็บ, และวิธีขยายต่อ

## เป้าหมาย

- แต่ละสมาชิกมี **UUID คนละค่า** ในคอลัมน์ `members.member_identity_qr_token` (unique)
- QR บนบัตรฝังลิงก์ **`/open/member-identity?t=<token>`** (และเลือกงานได้ด้วย **`&event=<slug>`** ถ้าต้องการเลือกล่วงหน้า)
- **บันทึกการรับบัตร** ต่อรอบงาน (`election_events`) ในตาราง `election_card_claims` (หนึ่งคนต่อหนึ่งงาน)
- **สถิติ:** จำนวนผู้รับ / สมาชิก Active ทั้งหมดเป็น %, แยกตามรุ่นจาก `batch_snapshot` ตอนรับ

## ฐานข้อมูล

| ตาราง/ฟังก์ชัน | รายละเอียด |
|----------------|------------|
| `members.member_identity_qr_token` | Migration `20260422140000_member_identity_qr_token.sql` |
| `election_events` | รอบงาน: `slug` (unique แบบ lower(trim)), `title_th`, `is_active`, `claim_starts_at`, `claim_ends_at` |
| `election_card_claims` | `election_event_id`, `member_id`, `source` (`scan`|`manual`), `batch_snapshot`, unique `(election_event_id, member_id)` |
| `count_membership_active()` | นับสมาชิกที่ `lower(trim(membership_status)) = 'active'` — ใช้คำนวณเปอร์เซ็นต์ใน stats |

Migration งานรับบัตร: `supabase/migrations/20260422150000_election_events_and_claims.sql`

## API สาธารณะ (ไม่ต้องล็อกอิน)

ฐาน: `/api/public/election` — rate limit ตาม `backend/src/app.ts`

| Method | Path | Body / หมายเหตุ |
|--------|------|------------------|
| GET | `/api/public/election/events/active` | รายการงานที่ `is_active` และอยู่ในช่วง `claim_*` |
| POST | `/api/public/election/card-claim` | `{ "t": "<member_identity_qr_token>", "election_event_slug": "..." }` หรือ `election_event_id` แทน slug |

พฤติกรรม `card-claim`:

- ค้นหา `members` จาก `member_identity_qr_token = t`
- ต้อง **สมาชิกภาพ Active** — ไม่ใช่ 403
- งานต้อง active และอยู่ในช่วงเวลา
- ซ้ำรับในวงเดิม → **409** พร้อมข้อความภาษาไทย

## API ผู้ดูแล (Admin key)

ฐาน: `/api/admin/election-events` — header `x-admin-key` เหมือนแผงนำเข้า

| Method | Path | หมายเหตุ |
|--------|------|----------|
| GET | `/` | รายการงานทั้งหมด |
| POST | `/` | สร้าง `{ slug, title_th, is_active?, claim_starts_at?, claim_ends_at? }` |
| PATCH | `/:id` | อัปเดต `title_th`, `is_active`, `claim_starts_at`, `claim_ends_at` |
| GET | `/:id/stats` | `claims_count`, `active_members_total`, `pct_of_active_members`, `by_batch[]` |

## Backend ไฟล์หลัก

- `backend/src/routes/electionPublic.ts` — active events + card-claim (rate limit แยกที่ POST)
- `backend/src/routes/electionAdmin.ts` — CRUD/stats, `normalizeElectionSlugInput`
- `backend/src/util/memberIdentityScanUrl.ts` — สร้าง URL ใน payload สมาชิก (`member_identity_scan_url`)
- `backend/src/routes/members.ts` — `fetchMemberWithDistinctions` แนบลิงก์ + มิติสมาชิก

## Frontend

| ส่วน | ที่อยู่ |
|------|---------|
| QR บัตร | `frontend/src/portal/memberPages.tsx` (`MemberCardQr`, `memberIdentityScanUrlForQr`) |
| หลังสแกน | `frontend/src/open/OpenMemberIdentityPage.tsx` — โหลดงาน active → เลือกงาน → POST claim |
| แผง Admin | `frontend/src/components/AdminElectionCardsPanel.tsx` — เส้นทาง `/admin/election-cards` |

## ความปลอดภัยและการปรับปรุงต่อ

- โทเคนใน URL ไม่ใช่รหัสผ่าน แต่ระบุตัวบุคคล — อย่าเผยแพร่ในรายงานทั่วไป
- Rate limit ที่ `/card-claim` ช่วยกันยิงซ้ำ
- ถ้าต้องการลดความเสี่ยงจากภาพ QR หลุด: พิจารณา JWT ระยะสั้นแทน UUID ถาวรในภายหลัง
- `source = manual` รองรับบันทึกจากแอดมิน (ยังไม่มี UI — insert ผ่าน SQL หรือ API ต่อได้)

## การทดสอบ

- `backend/src/routes/electionAdmin.test.ts` — normalize slug
- `backend/src/util/memberIdentityScanUrl.test.ts` — URL จาก env

## เอกสารที่เกี่ยวข้อง

- [`docs/MEMBER_FLOW.md`](./MEMBER_FLOW.md)
- [`docs/MEMBER_DISTINCTIONS_FLOW.md`](./MEMBER_DISTINCTIONS_FLOW.md)
