-- Governance updates:
-- 1) ผู้ลงนามบัญชี 3 ใน 5 ต้องมีชื่อใน KBiz
-- 2) รายการ > 20,000 ใช้คณะกรรมการ 35 และมติ > 1/2 ผู้เข้าร่วมประชุม
-- 3) รองรับลงชื่อเข้าประชุมทาง LINE + กติกาองค์ประชุม 2/3

alter table public.app_user_roles
  drop constraint if exists app_user_roles_role_code_check;

alter table public.app_user_roles
  add constraint app_user_roles_role_code_check check (
    role_code in (
      'member',
      'committee',
      'committee_authorized_3of5',
      'bank_signer_3of5',
      'cram_executive',
      'teacher',
      'parent',
      'student',
      'admin'
    )
  );

create table if not exists public.bank_account_signers (
  id uuid primary key default gen_random_uuid (),
  bank_account_id uuid not null references public.bank_accounts (id) on delete cascade,
  app_user_id uuid references public.app_users (id) on delete set null,
  signer_name text not null,
  kbiz_name text not null,
  in_kbiz boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now (),
  unique (bank_account_id, signer_name)
);

create index if not exists bank_account_signers_account_idx
  on public.bank_account_signers (bank_account_id, active);

create table if not exists public.meeting_sessions (
  id uuid primary key default gen_random_uuid (),
  legal_entity_id uuid not null references public.legal_entities (id) on delete cascade,
  title text not null,
  scheduled_at timestamptz,
  expected_participants integer not null default 35,
  quorum_numerator integer not null default 2,
  quorum_denominator integer not null default 3,
  status text not null default 'open',
  created_by text,
  created_at timestamptz not null default now (),
  constraint meeting_sessions_status_check check (status in ('open', 'closed')),
  constraint meeting_sessions_quorum_check check (
    expected_participants > 0 and quorum_numerator > 0 and quorum_denominator > 0
  )
);

create index if not exists meeting_sessions_entity_idx
  on public.meeting_sessions (legal_entity_id, created_at desc);

alter table public.payment_requests
  add column if not exists meeting_session_id uuid;

alter table public.payment_requests
  drop constraint if exists payment_requests_meeting_session_fk;

alter table public.payment_requests
  add constraint payment_requests_meeting_session_fk
  foreign key (meeting_session_id)
  references public.meeting_sessions (id)
  on delete set null;

create table if not exists public.meeting_attendance (
  id uuid primary key default gen_random_uuid (),
  meeting_session_id uuid not null references public.meeting_sessions (id) on delete cascade,
  app_user_id uuid references public.app_users (id) on delete set null,
  line_uid text,
  attendee_name text not null,
  attendee_role_code text not null,
  signed_via text not null default 'line',
  signed_at timestamptz not null default now (),
  unique (meeting_session_id, attendee_name),
  constraint meeting_attendance_signed_via_check check (signed_via in ('line', 'manual'))
);

create index if not exists meeting_attendance_session_idx
  on public.meeting_attendance (meeting_session_id, signed_at);

alter table public.bank_account_signers enable row level security;
alter table public.meeting_sessions enable row level security;
alter table public.meeting_attendance enable row level security;
