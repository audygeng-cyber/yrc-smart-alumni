-- เพิ่มช่องภาษีสำหรับคำขอจ่ายเงิน (VAT/WHT)
alter table public.payment_requests
  add column if not exists vat_rate numeric(5, 4) not null default 0,
  add column if not exists wht_rate numeric(5, 4) not null default 0,
  add column if not exists vat_amount numeric(12, 2) not null default 0,
  add column if not exists wht_amount numeric(12, 2) not null default 0,
  add column if not exists taxpayer_id text;

alter table public.payment_requests
  drop constraint if exists payment_requests_vat_rate_check;

alter table public.payment_requests
  add constraint payment_requests_vat_rate_check
  check (vat_rate in (0, 0.07));

alter table public.payment_requests
  drop constraint if exists payment_requests_wht_rate_check;

alter table public.payment_requests
  add constraint payment_requests_wht_rate_check
  check (wht_rate in (0, 0.01, 0.03, 0.05));

alter table public.payment_requests
  drop constraint if exists payment_requests_tax_amount_nonnegative_check;

alter table public.payment_requests
  add constraint payment_requests_tax_amount_nonnegative_check
  check (vat_amount >= 0 and wht_amount >= 0);
