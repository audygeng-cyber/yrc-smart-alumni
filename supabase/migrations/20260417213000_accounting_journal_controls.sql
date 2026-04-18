-- เพิ่มมาตรฐานสมุดรายวัน: draft/posted/voided + immutable + audit trail
alter table public.journal_entries
  add column if not exists status text not null default 'draft',
  add column if not exists posted_at timestamptz,
  add column if not exists posted_by text,
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by text,
  add column if not exists void_reason text,
  add column if not exists reversed_from_journal_id uuid references public.journal_entries (id) on delete restrict;

alter table public.journal_entries
  drop constraint if exists journal_entries_status_check;

alter table public.journal_entries
  add constraint journal_entries_status_check
  check (status in ('draft', 'posted', 'voided'));

create index if not exists journal_entries_status_idx
  on public.journal_entries (status, entry_date desc);

create index if not exists journal_entries_reversal_idx
  on public.journal_entries (reversed_from_journal_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid (),
  actor text not null,
  action text not null,
  target_table text,
  target_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now ()
);

create index if not exists audit_logs_target_idx
  on public.audit_logs (target_table, target_id, created_at desc);

create index if not exists audit_logs_actor_idx
  on public.audit_logs (actor, created_at desc);

alter table public.audit_logs enable row level security;

create or replace function public.fn_journal_lines_require_draft()
returns trigger
language plpgsql
as $$
declare
  v_entry_id uuid;
  v_status text;
begin
  v_entry_id := coalesce(new.journal_entry_id, old.journal_entry_id);
  if v_entry_id is null then
    raise exception 'journal_entry_id is required';
  end if;

  select status into v_status
  from public.journal_entries
  where id = v_entry_id;

  if v_status is distinct from 'draft' then
    raise exception 'journal entry % is immutable when status is %', v_entry_id, coalesce(v_status, 'unknown');
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_journal_lines_require_draft on public.journal_lines;
create trigger trg_journal_lines_require_draft
before insert or update or delete on public.journal_lines
for each row
execute function public.fn_journal_lines_require_draft();

create or replace function public.fn_journal_entry_validate_status_transition()
returns trigger
language plpgsql
as $$
declare
  v_total_debit numeric;
  v_total_credit numeric;
  v_line_count integer;
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'cannot delete journal entry in status %', old.status;
    end if;
    return old;
  end if;

  if old.status = 'voided' then
    raise exception 'voided journal entry is immutable';
  end if;

  if old.status = 'posted' and new.status <> 'voided' then
    raise exception 'posted journal entry can only transition to voided';
  end if;

  if old.status = 'posted' and new.status = 'voided' then
    if new.legal_entity_id <> old.legal_entity_id
      or new.entry_date <> old.entry_date
      or new.reference_no is distinct from old.reference_no
      or new.memo is distinct from old.memo
      or new.source_type is distinct from old.source_type
      or new.source_id is distinct from old.source_id then
      raise exception 'cannot edit posted journal content when voiding';
    end if;
    new.voided_at := coalesce(new.voided_at, now());
  end if;

  if old.status = 'draft' and new.status = 'posted' then
    select
      coalesce(sum(debit), 0),
      coalesce(sum(credit), 0),
      count(*)
    into v_total_debit, v_total_credit, v_line_count
    from public.journal_lines
    where journal_entry_id = old.id;

    if v_line_count = 0 then
      raise exception 'cannot post journal entry without lines';
    end if;
    if v_total_debit <> v_total_credit then
      raise exception 'cannot post unbalanced journal entry: debit=% credit=%', v_total_debit, v_total_credit;
    end if;
    new.posted_at := coalesce(new.posted_at, now());
  end if;

  if old.status = 'draft' and new.status = 'voided' then
    raise exception 'draft journal entry must be posted before voiding';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_journal_entry_validate_status_transition on public.journal_entries;
create trigger trg_journal_entry_validate_status_transition
before update or delete on public.journal_entries
for each row
execute function public.fn_journal_entry_validate_status_transition();
