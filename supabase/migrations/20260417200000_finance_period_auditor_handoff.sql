-- ติดตามสถานะการส่งงวดบัญชีให้ผู้ตรวจสอบ
alter table public.finance_period_closings
  add column if not exists auditor_handoff_status text not null default 'pending',
  add column if not exists auditor_sent_at timestamptz,
  add column if not exists auditor_sent_by text,
  add column if not exists auditor_handoff_note text;

alter table public.finance_period_closings
  drop constraint if exists finance_period_closings_auditor_handoff_status_check;

alter table public.finance_period_closings
  add constraint finance_period_closings_auditor_handoff_status_check
  check (auditor_handoff_status in ('pending', 'sent'));

create index if not exists finance_period_closings_handoff_status_idx
  on public.finance_period_closings (auditor_handoff_status, closed_at desc);
