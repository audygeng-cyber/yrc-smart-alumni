-- YRC Smart Alumni: สมาชิก + นำเข้า + คำร้อง (ฐานสำหรับ LINE verify รุ่น+ชื่อ+นามสกุล)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- ชุดนำเข้า Excel
-- ---------------------------------------------------------------------------
create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid (),
  filename text,
  row_count integer not null default 0,
  created_by text,
  created_at timestamptz not null default now ()
);

-- ---------------------------------------------------------------------------
-- สมาชิก (แหล่งความจริงหลังอนุมัติ / นำเข้า)
-- ---------------------------------------------------------------------------
create table if not exists public.members (
  id uuid primary key default gen_random_uuid (),
  import_batch_id uuid references public.import_batches (id) on delete set null,
  row_number integer,
  line_uid text,
  member_code text,
  student_id text,
  batch text,
  batch_name text,
  batch_year text,
  title text,
  first_name text,
  last_name text,
  birth_date text,
  joined_date text,
  nickname text,
  house_number text,
  alley text,
  moo text,
  village text,
  road text,
  subdistrict text,
  district text,
  province text,
  postal_code text,
  phone text,
  email text,
  line_display_id text,
  membership_status text not null default 'Active',
  organization text not null default 'alumni',
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create unique index if not exists members_line_uid_unique
  on public.members (line_uid)
  where line_uid is not null and line_uid <> '';

create index if not exists members_verify_idx
  on public.members (batch, first_name, last_name);

create index if not exists members_org_idx on public.members (organization);

-- ---------------------------------------------------------------------------
-- คำร้องสมัครใหม่ / แก้ไขข้อมูล (อนุมัติ 2 ชั้น)
-- ---------------------------------------------------------------------------
create table if not exists public.member_update_requests (
  id uuid primary key default gen_random_uuid (),
  member_id uuid references public.members (id) on delete set null,
  line_uid text,
  request_type text not null default 'new_registration',
  requested_data jsonb not null default '{}'::jsonb,
  president_approved_by text,
  president_approved_at timestamptz,
  admin_approved_by text,
  admin_approved_at timestamptz,
  rejected_by text,
  rejected_at timestamptz,
  rejection_reason text,
  status text not null default 'pending_president',
  created_at timestamptz not null default now ()
);

create index if not exists member_update_requests_status_idx
  on public.member_update_requests (status);

-- ---------------------------------------------------------------------------
-- RLS: ปิดการเข้าถึง anon ผ่าน PostgREST — backend ใช้ service_role ข้าม RLS
-- ---------------------------------------------------------------------------
alter table public.import_batches enable row level security;
alter table public.members enable row level security;
alter table public.member_update_requests enable row level security;
