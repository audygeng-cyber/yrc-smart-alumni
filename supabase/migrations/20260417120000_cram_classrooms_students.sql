-- โรงเรียนกวดวิชา: ห้องเรียน + นักเรียน (คะแนนเฉลี่ยรายคน) สำหรับ dashboard / portal

create table if not exists public.cram_classrooms (
  id uuid primary key default gen_random_uuid (),
  room_code text not null,
  display_name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now (),
  unique (room_code)
);

create index if not exists cram_classrooms_active_idx on public.cram_classrooms (active, sort_order);

create table if not exists public.cram_students (
  id uuid primary key default gen_random_uuid (),
  classroom_id uuid not null references public.cram_classrooms (id) on delete cascade,
  display_name text not null,
  current_avg_score numeric(6, 2),
  app_user_id uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now ()
);

create index if not exists cram_students_classroom_idx on public.cram_students (classroom_id);
create index if not exists cram_students_app_user_idx on public.cram_students (app_user_id);

alter table public.cram_classrooms enable row level security;
alter table public.cram_students enable row level security;
