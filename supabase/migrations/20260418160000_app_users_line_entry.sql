-- บันทึกช่องทางเข้าระบบด้วย LINE (สอดคล้อง frontend lineEntrySource + POST /api/members/app-roles)

alter table public.app_users
  add column if not exists first_entry_source text,
  add column if not exists last_entry_source text,
  add column if not exists last_entry_recorded_at timestamptz;

alter table public.app_users
  drop constraint if exists app_users_line_entry_source_values;

alter table public.app_users
  add constraint app_users_line_entry_source_values check (
    (first_entry_source is null or first_entry_source in ('alumni_url', 'cram_qr', 'cram_alumni_url'))
    and (last_entry_source is null or last_entry_source in ('alumni_url', 'cram_qr', 'cram_alumni_url'))
  );

comment on column public.app_users.first_entry_source is 'ช่องทางเข้าครั้งแรกที่ client ส่งมา (บันทึกครั้งเดียว)';
comment on column public.app_users.last_entry_source is 'ช่องทางเข้าล่าสุดจาก client';
comment on column public.app_users.last_entry_recorded_at is 'เวลาที่อัปเดต last_entry_source ล่าสุด';
