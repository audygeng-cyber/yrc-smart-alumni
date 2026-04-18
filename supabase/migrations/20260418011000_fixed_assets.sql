-- ทะเบียนสินทรัพย์ถาวรและประวัติค่าเสื่อม
create table if not exists public.fixed_assets (
  id uuid primary key default gen_random_uuid (),
  legal_entity_id uuid not null references public.legal_entities (id) on delete restrict,
  asset_code text not null,
  asset_name text not null,
  purchase_date date not null,
  cost numeric(12, 2) not null,
  residual_value numeric(12, 2) not null default 0,
  useful_life_months integer not null,
  depreciation_account_id uuid not null references public.account_chart (id) on delete restrict,
  accumulated_depreciation_account_id uuid not null references public.account_chart (id) on delete restrict,
  active boolean not null default true,
  note text,
  created_by text,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint fixed_assets_cost_check check (cost > 0),
  constraint fixed_assets_residual_check check (residual_value >= 0 and residual_value <= cost),
  constraint fixed_assets_life_check check (useful_life_months > 0),
  unique (legal_entity_id, asset_code)
);

create index if not exists fixed_assets_entity_idx
  on public.fixed_assets (legal_entity_id, purchase_date desc);

create table if not exists public.fixed_asset_depreciations (
  id uuid primary key default gen_random_uuid (),
  fixed_asset_id uuid not null references public.fixed_assets (id) on delete cascade,
  month_key text not null,
  amount numeric(12, 2) not null,
  journal_entry_id uuid references public.journal_entries (id) on delete set null,
  created_by text,
  created_at timestamptz not null default now (),
  constraint fixed_asset_depreciations_amount_check check (amount > 0),
  constraint fixed_asset_depreciations_month_key_check check (month_key ~ '^\d{4}-\d{2}$'),
  unique (fixed_asset_id, month_key)
);

create index if not exists fixed_asset_depreciations_month_idx
  on public.fixed_asset_depreciations (month_key, created_at desc);

alter table public.fixed_assets enable row level security;
alter table public.fixed_asset_depreciations enable row level security;
