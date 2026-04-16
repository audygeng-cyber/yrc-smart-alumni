-- RBAC + activity foundation
-- รองรับการใช้งาน URL เดียว + LINE login แล้วแยกสิทธิ์ตามบทบาท

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid (),
  line_uid text not null unique,
  member_id uuid references public.members (id) on delete set null,
  approval_status text not null default 'pending',
  president_approved_by text,
  president_approved_at timestamptz,
  admin_approved_by text,
  admin_approved_at timestamptz,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint app_users_approval_status_check check (
    approval_status in ('pending', 'pending_president', 'pending_admin', 'approved', 'rejected')
  )
);

create index if not exists app_users_member_idx on public.app_users (member_id);
create index if not exists app_users_approval_idx on public.app_users (approval_status);

create table if not exists public.app_user_roles (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.app_users (id) on delete cascade,
  role_code text not null,
  granted_by text,
  created_at timestamptz not null default now (),
  unique (user_id, role_code),
  constraint app_user_roles_role_code_check check (
    role_code in (
      'member',
      'committee',
      'committee_authorized_3of5',
      'cram_executive',
      'teacher',
      'parent',
      'student',
      'admin'
    )
  )
);

create index if not exists app_user_roles_role_idx on public.app_user_roles (role_code);

-- กิจกรรม/บริจาค (foundation)
create table if not exists public.school_activities (
  id uuid primary key default gen_random_uuid (),
  title text not null,
  category text not null,
  description text,
  active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid (),
  activity_id uuid references public.school_activities (id) on delete set null,
  app_user_id uuid references public.app_users (id) on delete set null,
  member_id uuid references public.members (id) on delete set null,
  batch text,
  amount numeric(12, 2) not null,
  currency text not null default 'THB',
  transfer_at timestamptz,
  slip_file_url text,
  note text,
  created_at timestamptz not null default now ()
);

create index if not exists donations_activity_idx on public.donations (activity_id);
create index if not exists donations_batch_idx on public.donations (batch);
create index if not exists donations_created_idx on public.donations (created_at desc);

-- วาระ/มติ (foundation)
create table if not exists public.meeting_agendas (
  id uuid primary key default gen_random_uuid (),
  scope text not null,
  title text not null,
  details text,
  status text not null default 'open',
  created_by text,
  created_at timestamptz not null default now (),
  constraint meeting_agendas_scope_check check (
    scope in ('association', 'cram_school')
  ),
  constraint meeting_agendas_status_check check (
    status in ('open', 'closed')
  )
);

create table if not exists public.meeting_votes (
  id uuid primary key default gen_random_uuid (),
  agenda_id uuid not null references public.meeting_agendas (id) on delete cascade,
  app_user_id uuid not null references public.app_users (id) on delete cascade,
  vote text not null,
  voted_at timestamptz not null default now (),
  unique (agenda_id, app_user_id),
  constraint meeting_votes_vote_check check (
    vote in ('approve', 'reject', 'abstain')
  )
);

create index if not exists meeting_votes_agenda_idx on public.meeting_votes (agenda_id);

alter table public.app_users enable row level security;
alter table public.app_user_roles enable row level security;
alter table public.school_activities enable row level security;
alter table public.donations enable row level security;
alter table public.meeting_agendas enable row level security;
alter table public.meeting_votes enable row level security;
