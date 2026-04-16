-- Accounting / Finance foundation
-- แยกสมาคมศิษย์เก่า vs โรงเรียนกวดวิชา และรองรับกติกาอนุมัติเงิน

create table if not exists public.legal_entities (
  id uuid primary key default gen_random_uuid (),
  code text not null unique,
  name_th text not null,
  active boolean not null default true,
  created_at timestamptz not null default now (),
  constraint legal_entities_code_check check (code in ('association', 'cram_school'))
);

insert into public.legal_entities (code, name_th)
values
  ('association', 'สมาคมศิษย์เก่า'),
  ('cram_school', 'โรงเรียนกวดวิชา')
on conflict (code) do nothing;

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid (),
  legal_entity_id uuid not null references public.legal_entities (id) on delete cascade,
  bank_name text not null,
  account_name text not null,
  account_no_masked text not null,
  signer_pool_size integer not null default 5,
  required_signers integer not null default 3,
  kbiz_enabled boolean not null default true,
  created_at timestamptz not null default now (),
  constraint bank_accounts_signer_pool_check check (signer_pool_size >= required_signers and required_signers >= 1)
);

create index if not exists bank_accounts_entity_idx on public.bank_accounts (legal_entity_id);

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid (),
  legal_entity_id uuid not null references public.legal_entities (id) on delete restrict,
  bank_account_id uuid references public.bank_accounts (id) on delete set null,
  purpose text not null,
  amount numeric(12, 2) not null,
  currency text not null default 'THB',
  requested_by text,
  requested_at timestamptz not null default now (),
  approval_rule text not null,
  required_approvals integer not null,
  required_role_code text not null,
  status text not null default 'pending',
  kbiz_transfer_ref text,
  transfer_slip_file_url text,
  note text,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint payment_requests_amount_check check (amount > 0),
  constraint payment_requests_status_check check (status in ('pending', 'approved', 'rejected', 'executed')),
  constraint payment_requests_rule_check check (
    approval_rule in ('committee_3of5_upto_20000', 'committee_35_over_20000')
  )
);

create index if not exists payment_requests_entity_idx on public.payment_requests (legal_entity_id);
create index if not exists payment_requests_status_idx on public.payment_requests (status);
create index if not exists payment_requests_created_idx on public.payment_requests (created_at desc);

create table if not exists public.payment_request_approvals (
  id uuid primary key default gen_random_uuid (),
  payment_request_id uuid not null references public.payment_requests (id) on delete cascade,
  app_user_id uuid references public.app_users (id) on delete set null,
  approver_name text not null,
  approver_role_code text not null,
  decision text not null,
  decided_at timestamptz not null default now (),
  comment text,
  unique (payment_request_id, approver_name),
  constraint payment_request_approvals_decision_check check (decision in ('approve', 'reject'))
);

create index if not exists payment_request_approvals_request_idx
  on public.payment_request_approvals (payment_request_id, decided_at desc);

-- โครงบัญชีมาตรฐาน (double-entry)
create table if not exists public.account_chart (
  id uuid primary key default gen_random_uuid (),
  legal_entity_id uuid not null references public.legal_entities (id) on delete cascade,
  account_code text not null,
  account_name text not null,
  account_type text not null,
  active boolean not null default true,
  unique (legal_entity_id, account_code),
  constraint account_chart_type_check check (
    account_type in ('asset', 'liability', 'equity', 'revenue', 'expense')
  )
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid (),
  legal_entity_id uuid not null references public.legal_entities (id) on delete restrict,
  entry_date date not null,
  reference_no text,
  memo text,
  source_type text,
  source_id uuid,
  created_by text,
  created_at timestamptz not null default now ()
);

create index if not exists journal_entries_entity_date_idx on public.journal_entries (legal_entity_id, entry_date desc);

create table if not exists public.journal_lines (
  id uuid primary key default gen_random_uuid (),
  journal_entry_id uuid not null references public.journal_entries (id) on delete cascade,
  account_id uuid not null references public.account_chart (id) on delete restrict,
  debit numeric(12, 2) not null default 0,
  credit numeric(12, 2) not null default 0,
  description text,
  constraint journal_lines_nonnegative_check check (debit >= 0 and credit >= 0),
  constraint journal_lines_one_side_check check ((debit = 0 and credit > 0) or (credit = 0 and debit > 0))
);

create index if not exists journal_lines_entry_idx on public.journal_lines (journal_entry_id);
create index if not exists journal_lines_account_idx on public.journal_lines (account_id);

alter table public.legal_entities enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.payment_requests enable row level security;
alter table public.payment_request_approvals enable row level security;
alter table public.account_chart enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
