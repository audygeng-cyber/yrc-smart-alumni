-- Storage: รูปโปรไฟล์สมาชิก — อ่านสาธารณะผ่าน public URL (bucket public = true)
-- อัปโหลดผ่าน API backend (service_role) เท่านั้น — ไม่สร้าง policy บน storage.objects ใน migration
-- เพราะบน Supabase Cloud บัญชีที่รัน migration มักไม่ใช่ owner ของ relation นี้ (ERROR: must be owner of relation objects)
-- การอ่านไฟล์ใน public bucket ไม่ต้องมี RLS policy แยกสำหรับ SELECT

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-profile-photos',
  'member-profile-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
