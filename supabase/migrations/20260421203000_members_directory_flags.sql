-- ทะเบียนสมาชิก: แฟล็กสำหรับค้นหา/รายงาน (นำเข้า Excel + Admin directory API)
alter table public.members
  add column if not exists batch_president boolean not null default false;

alter table public.members
  add column if not exists outstanding_alumni boolean not null default false;

create index if not exists members_batch_president_idx
  on public.members (batch)
  where batch_president = true;

create index if not exists members_outstanding_alumni_idx
  on public.members (batch)
  where outstanding_alumni = true;

comment on column public.members.batch_president is 'ประธานรุ่น (ตั้งจากนำเข้า/แก้ไข Admin)';
comment on column public.members.outstanding_alumni is 'ศิษย์เก่าดีเด่น (ตั้งจากนำเข้า/แก้ไข Admin)';
