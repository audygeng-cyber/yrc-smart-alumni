-- เก็บประวัติปิดงวดบัญชีเพื่อส่งต่อผู้ตรวจสอบบัญชี
create table if not exists public.finance_period_closings (
  id uuid primary key default gen_random_uuid (),
  legal_entity_id uuid not null references public.legal_entities (id) on delete restrict,
  period_from date not null,
  period_to date not null,
  closed_at timestamptz not null default now (),
  closed_by text not null,
  note text,
  journal_entry_count integer not null default 0,
  total_debit numeric(14, 2) not null default 0,
  total_credit numeric(14, 2) not null default 0,
  net_income numeric(14, 2) not null default 0,
  trial_balance_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now (),
  constraint finance_period_closings_period_check check (period_from <= period_to),
  constraint finance_period_closings_unique_period unique (legal_entity_id, period_from, period_to)
);

create index if not exists finance_period_closings_entity_period_idx
  on public.finance_period_closings (legal_entity_id, period_to desc);
create index if not exists finance_period_closings_closed_at_idx
  on public.finance_period_closings (closed_at desc);

alter table public.finance_period_closings enable row level security;
