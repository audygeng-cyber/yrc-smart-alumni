-- เพิ่มหมวดวัตถุประสงค์คำขอจ่ายเงินสำหรับการตรวจสอบย้อนหลัง (audit)
alter table public.payment_requests
  add column if not exists purpose_category text not null default 'other';

alter table public.payment_requests
  drop constraint if exists payment_requests_purpose_category_check;

alter table public.payment_requests
  add constraint payment_requests_purpose_category_check
  check (
    purpose_category in (
      'electricity',
      'water',
      'internet',
      'staff_wage',
      'cleaning',
      'office_supply',
      'hospitality',
      'other'
    )
  );

create index if not exists payment_requests_purpose_category_idx
  on public.payment_requests (purpose_category, requested_at desc);
