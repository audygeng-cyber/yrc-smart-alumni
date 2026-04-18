-- Meeting documents (metadata + optional inline text content)

create table if not exists public.meeting_documents (
  id uuid primary key default gen_random_uuid (),
  scope text not null,
  meeting_session_id uuid references public.meeting_sessions (id) on delete set null,
  agenda_id uuid references public.meeting_agendas (id) on delete set null,
  title text not null,
  document_url text,
  document_text text,
  uploaded_by text,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint meeting_documents_scope_check check (
    scope in ('association', 'cram_school')
  ),
  constraint meeting_documents_content_check check (
    document_url is not null
    or document_text is not null
  )
);

create index if not exists meeting_documents_created_idx on public.meeting_documents (created_at desc);
create index if not exists meeting_documents_scope_idx on public.meeting_documents (scope);
create index if not exists meeting_documents_session_idx on public.meeting_documents (meeting_session_id);
create index if not exists meeting_documents_agenda_idx on public.meeting_documents (agenda_id);

alter table public.meeting_documents enable row level security;
