-- Committee governance: RSVP per meeting session; distinct role for payment approvers on large requests.

alter table public.app_user_roles
  drop constraint if exists app_user_roles_role_code_check;

alter table public.app_user_roles
  add constraint app_user_roles_role_code_check check (
    role_code in (
      'member',
      'committee',
      'committee_authorized_3of5',
      'bank_signer_3of5',
      'payment_approver',
      'cram_executive',
      'teacher',
      'parent',
      'student',
      'admin'
    )
  );

create table if not exists public.meeting_session_rsvp (
  id uuid primary key default gen_random_uuid (),
  meeting_session_id uuid not null references public.meeting_sessions (id) on delete cascade,
  app_user_id uuid not null references public.app_users (id) on delete cascade,
  status text not null default 'yes',
  updated_at timestamptz not null default now (),
  unique (meeting_session_id, app_user_id),
  constraint meeting_session_rsvp_status_check check (status in ('yes', 'no', 'maybe'))
);

create index if not exists meeting_session_rsvp_session_idx
  on public.meeting_session_rsvp (meeting_session_id);

alter table public.meeting_session_rsvp enable row level security;
