-- ติดตามการปิดงานหลังผู้ตรวจสอบรับงวดบัญชี
alter table public.finance_period_closings
  add column if not exists auditor_completed_at timestamptz,
  add column if not exists auditor_completed_by text,
  add column if not exists auditor_completed_note text;

alter table public.finance_period_closings
  drop constraint if exists finance_period_closings_auditor_handoff_status_check;

alter table public.finance_period_closings
  add constraint finance_period_closings_auditor_handoff_status_check
  check (auditor_handoff_status in ('pending', 'sent', 'completed'));
