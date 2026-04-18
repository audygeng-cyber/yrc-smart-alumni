-- Extend agenda/voting foundation for real meeting workflow
-- - Link agendas to meeting sessions
-- - Allow manual named voters when app_user_id is unavailable

alter table if exists public.meeting_agendas
  add column if not exists meeting_session_id uuid references public.meeting_sessions (id) on delete set null;

alter table if exists public.meeting_votes
  alter column app_user_id drop not null;

alter table if exists public.meeting_votes
  add column if not exists voter_name text,
  add column if not exists voter_role_code text;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'meeting_votes_agenda_id_app_user_id_key'
  ) then
    alter table public.meeting_votes
      drop constraint meeting_votes_agenda_id_app_user_id_key;
  end if;
end $$;

create unique index if not exists meeting_votes_agenda_app_user_unique_idx
  on public.meeting_votes (agenda_id, app_user_id)
  where app_user_id is not null;

create unique index if not exists meeting_votes_agenda_voter_name_unique_idx
  on public.meeting_votes (agenda_id, lower(voter_name))
  where app_user_id is null and voter_name is not null and length(trim(voter_name)) > 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'meeting_votes_identity_check'
  ) then
    alter table public.meeting_votes
      add constraint meeting_votes_identity_check
      check (
        app_user_id is not null
        or (voter_name is not null and length(trim(voter_name)) > 0)
      );
  end if;
end $$;

alter table if exists public.meeting_sessions
  add column if not exists minutes_markdown text,
  add column if not exists minutes_recorded_by text,
  add column if not exists minutes_updated_at timestamptz;
