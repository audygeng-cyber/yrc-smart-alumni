-- มิติสถานะศิษย์เก่า/ประธานรุ่น แบบหลายค่าต่อคน (แทนคอลัมน์ boolean เดิมบน members)
-- ดู flow: docs/MEMBER_DISTINCTIONS_FLOW.md

create table if not exists public.member_distinctions (
  id uuid primary key default gen_random_uuid (),
  member_id uuid not null references public.members (id) on delete cascade,
  code text not null,
  mark_key text not null default '',
  label_th text,
  created_at timestamptz not null default now ()
);

create unique index if not exists member_distinctions_member_code_mark_idx
  on public.member_distinctions (member_id, code, mark_key);

create index if not exists member_distinctions_code_idx on public.member_distinctions (code);
create index if not exists member_distinctions_member_idx on public.member_distinctions (member_id);

comment on table public.member_distinctions is 'สถานะ/เกียรติยศต่อสมาชิกหลายมิติ (ประธานรุ่น ดีเด่นตามปี โปรแกรม ฐานสถานะ ฯลฯ)';
comment on column public.member_distinctions.code is 'รหัสประเภท เช่น batch_president, outstanding_alumni, outstanding_alumni_year, outstanding_program, alumni_base';
comment on column public.member_distinctions.mark_key is 'คีย์ย่อย เช่น ปี พ.ศ. หรือ yupparaj_120 — ว่าง = ทั่วไป';

alter table public.member_distinctions enable row level security;

do $migrate$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'members' and column_name = 'batch_president'
  ) then
    insert into public.member_distinctions (member_id, code, mark_key, label_th)
    select id, 'batch_president', '', null
    from public.members
    where batch_president is true
    on conflict (member_id, code, mark_key) do nothing;

    insert into public.member_distinctions (member_id, code, mark_key, label_th)
    select id, 'outstanding_alumni', '', null
    from public.members
    where outstanding_alumni is true
    on conflict (member_id, code, mark_key) do nothing;
  end if;
end
$migrate$;

drop index if exists public.members_batch_president_idx;
drop index if exists public.members_outstanding_alumni_idx;

alter table public.members drop column if exists batch_president;
alter table public.members drop column if exists outstanding_alumni;
