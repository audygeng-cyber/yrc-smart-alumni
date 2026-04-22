-- โทเคน UUID ต่อแถวสมาชิก — ใช้เป็นส่วนหนึ่งของ URL ใน QR บัตรสมาชิก (ไม่ซ้ำระหว่างคน)
-- อนาคต: สแกนเพื่อบันทึกการรับบัตรเลือกตั้ง / สถิติตามรุ่น (ดู docs/MEMBER_IDENTITY_QR_FLOW.md)

alter table public.members
  add column if not exists member_identity_qr_token uuid;

update public.members
set member_identity_qr_token = gen_random_uuid()
where member_identity_qr_token is null;

create unique index if not exists members_member_identity_qr_token_key
  on public.members (member_identity_qr_token);

alter table public.members
  alter column member_identity_qr_token set default gen_random_uuid (),
  alter column member_identity_qr_token set not null;

comment on column public.members.member_identity_qr_token is
  'UUID สาธารณะต่อคน (ไม่ซ้ำ) — ฝังในลิงก์สแกน QR บัตรสมาชิก; งานรับบัตรเลือกตั้งอนาคตอ้างอิงโทเคนนี้';
