-- งานรับบัตรเลือกตั้ง / ยืนยันตัวตนจาก QR บัตรสมาชิก — ดู docs/MEMBER_IDENTITY_QR_FLOW.md

create table if not exists public.election_events (
  id uuid primary key default gen_random_uuid (),
  slug text not null,
  title_th text not null,
  is_active boolean not null default true,
  claim_starts_at timestamptz null,
  claim_ends_at timestamptz null,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint election_events_slug_len check (char_length(trim(slug)) between 2 and 64)
);

create unique index if not exists election_events_slug_lower_key on public.election_events (lower(trim(slug)));

create table if not exists public.election_card_claims (
  id uuid primary key default gen_random_uuid (),
  election_event_id uuid not null references public.election_events (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  claimed_at timestamptz not null default now (),
  source text not null default 'scan' check (source in ('scan', 'manual')),
  batch_snapshot text null,
  constraint election_card_claims_one_per_member unique (election_event_id, member_id)
);

create index if not exists election_card_claims_event_idx on public.election_card_claims (election_event_id);
create index if not exists election_card_claims_member_idx on public.election_card_claims (member_id);

comment on table public.election_events is 'กำหนดรอบรับบัตรเลือกตั้ง (slug ใช้ใน URL/API)';
comment on table public.election_card_claims is 'บันทึกว่าสมาชิกรับบัตรในรอบใดแล้ว — อ้างอิง member_identity_qr_token ตอน claim ผ่าน API';

alter table public.election_events enable row level security;
alter table public.election_card_claims enable row level security;

-- นับสมาชิก Active สำหรับเปอร์เซ็นต์ผู้รับบัตร (เทียบทะเบียน)
create or replace function public.count_membership_active ()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.members
  where lower(trim(coalesce(membership_status, ''))) = 'active';
$$;

comment on function public.count_membership_active () is 'นับสมาชิกที่ membership_status ถือว่า Active (ไม่สนตัวพิมพ์) — ใช้กับสถิติ election_card_claims';

grant execute on function public.count_membership_active () to service_role;
