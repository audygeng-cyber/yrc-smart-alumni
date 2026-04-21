-- รูปโปรไฟล์บัตรสมาชิก + ประวัติการแก้ไขข้อมูล (ชุดเก่า inactive / ชุดใหม่ active)

alter table public.members
  add column if not exists photo_url text;

comment on column public.members.photo_url is 'URL รูปสมาชิกสำหรับบัตร — อัปโหลดผ่าน Storage แล้วเก็บลิงก์สาธารณะหรือ signed URL ตามนโยบาย';

create table if not exists public.member_profile_versions (
  id uuid primary key default gen_random_uuid (),
  member_id uuid not null references public.members (id) on delete cascade,
  snapshot jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now ()
);

create index if not exists member_profile_versions_member_idx
  on public.member_profile_versions (member_id, created_at desc);

create unique index if not exists member_profile_versions_one_active_per_member
  on public.member_profile_versions (member_id)
  where (is_active = true);

comment on table public.member_profile_versions is 'ประวัติชุดข้อมูลที่สมาชิกแก้ผ่านพอร์ทัล — มีได้เพียงหนึ่งแถวที่ is_active ต่อหนึ่ง member_id';

-- ---------------------------------------------------------------------------
-- RLS: ปิดการเข้าถึง anon ผ่าน PostgREST — backend ใช้ service_role ข้าม RLS
-- ---------------------------------------------------------------------------
alter table public.member_profile_versions enable row level security;
