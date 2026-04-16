-- Hotfix: รองรับฐานที่มีตาราง donations เดิมก่อนเพิ่ม legal_entity_id

alter table public.donations
  add column if not exists legal_entity_id uuid references public.legal_entities (id) on delete set null;

create index if not exists donations_legal_entity_idx on public.donations (legal_entity_id);

-- backfill เบื้องต้นให้รายการเดิมอยู่ใต้สมาคม (ปรับได้ภายหลังตามข้อมูลจริง)
update public.donations d
set legal_entity_id = e.id
from public.legal_entities e
where d.legal_entity_id is null
  and e.code = 'association';
