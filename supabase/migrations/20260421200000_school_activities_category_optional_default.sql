-- หมวด (category) ไม่ใช้ใน UI ใหม่ — ค่าว่าง = ไม่แสดงหมวด; คงคอลัมน์เพื่อความเข้ากันได้ย้อนหลัง
alter table public.school_activities
  alter column category set default '';

comment on column public.school_activities.category is
  'เดิมใช้เป็นหมวดใน UI; ตั้งว่างได้ — ลำดับและการแสดงผลหลักใช้ title / description';

comment on column public.school_activities.fund_scope is
  'กลุ่มบัญชี: yupparaj_school = กิจกรรมโรงเรียนยุพราช (แยกจากรายได้สมาคม/กวดวิชา); association / cram_school = นิติบุคคลที่เกี่ยวข้อง';
