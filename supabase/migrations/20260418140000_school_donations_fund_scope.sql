-- แยกกองบริจาค: โรงเรียนยุพราชวิทยาลัย ไม่นับเป็นรายรับนิติบุคคลสมาคม/กวดวิชา
alter table public.school_activities
  add column if not exists fund_scope text not null default 'association';

alter table public.school_activities
  drop constraint if exists school_activities_fund_scope_check;

alter table public.school_activities
  add constraint school_activities_fund_scope_check
  check (fund_scope in ('yupparaj_school', 'association', 'cram_school'));

alter table public.school_activities
  add column if not exists target_amount numeric(14, 2);

alter table public.donations
  add column if not exists fund_scope text;

alter table public.donations
  drop constraint if exists donations_fund_scope_check;

alter table public.donations
  add constraint donations_fund_scope_check
  check (fund_scope is null or fund_scope in ('yupparaj_school', 'association', 'cram_school'));

alter table public.donations
  add column if not exists donor_first_name text;

alter table public.donations
  add column if not exists donor_last_name text;

alter table public.donations
  add column if not exists donor_batch text;

alter table public.donations
  add column if not exists donor_batch_name text;

create index if not exists donations_fund_scope_idx on public.donations (fund_scope, created_at desc);

comment on column public.school_activities.fund_scope is 'yupparaj_school = กองโรงเรียนยุพราช (ไม่รวมรายได้สมาคม/กวดวิชา); association / cram_school = ผูกนิติบุคคล';
comment on column public.donations.fund_scope is 'สำเนาจากกิจกรรมตอนบันทึก — null = ข้อมูลเก่าก่อนมีคอลัมน์นี้';
