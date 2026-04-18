-- รอบปีบัญชีสำหรับงานปิดงบปลายปี
create table if not exists public.fiscal_years (
  id uuid primary key default gen_random_uuid (),
  legal_entity_id uuid not null references public.legal_entities (id) on delete restrict,
  fiscal_label text not null,
  period_from date not null,
  period_to date not null,
  is_closed boolean not null default false,
  closed_at timestamptz,
  closed_by text,
  close_note text,
  closing_journal_entry_id uuid references public.journal_entries (id) on delete set null,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint fiscal_years_period_check check (period_from <= period_to),
  constraint fiscal_years_unique_period unique (legal_entity_id, period_from, period_to)
);

create index if not exists fiscal_years_entity_period_idx
  on public.fiscal_years (legal_entity_id, period_to desc);

create index if not exists fiscal_years_closed_idx
  on public.fiscal_years (is_closed, period_to desc);

alter table public.fiscal_years enable row level security;
