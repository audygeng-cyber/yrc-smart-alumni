-- Publish flags for committee portal visibility workflow

alter table if exists public.meeting_documents
  add column if not exists published_to_portal boolean not null default false;

alter table if exists public.meeting_sessions
  add column if not exists minutes_published boolean not null default false;

-- Keep existing published content visible after migration
update public.meeting_documents
set published_to_portal = true
where published_to_portal = false;

update public.meeting_sessions
set minutes_published = true
where minutes_markdown is not null
  and minutes_published = false;
