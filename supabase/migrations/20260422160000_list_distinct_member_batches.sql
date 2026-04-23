-- รายการรุ่นไม่ซ้ำจากทะเบียน — ใช้เติม dropdown หน้าผูก LINE / คำร้องสมัคร (เรียกผ่าน backend service role)

create or replace function public.list_distinct_member_batches()
returns text[]
language sql
stable
set search_path = public
as $$
  select coalesce(array_agg(v order by v), '{}'::text[])
  from (
    select distinct trim(batch::text) as v
    from public.members
    where batch is not null and trim(batch::text) <> ''
  ) t;
$$;

comment on function public.list_distinct_member_batches() is
  'คืน array ของรุ่น (trim, distinct, เรียง ascending) สำหรับ UI — ไม่เปิดเผยข้อมูลส่วนบุคคล';

revoke all on function public.list_distinct_member_batches() from public;
grant execute on function public.list_distinct_member_batches() to service_role;
