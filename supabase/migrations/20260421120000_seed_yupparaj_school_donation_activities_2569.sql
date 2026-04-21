-- โครงการบริจาคโรงเรียนยุพราช (fund_scope = yupparaj_school) — พอร์ทัลสมาชิกหน้าสนับสนุนกิจกรรม
-- idempotent: ไม่สร้างซ้ำถ้ามี title เดิม

insert into public.school_activities (title, category, description, active, fund_scope)
select 'กิจกรรมทุนการศึกษาประจำปี 2569', 'ทุนการศึกษา', null, true, 'yupparaj_school'
where not exists (
  select 1 from public.school_activities sa where sa.title = 'กิจกรรมทุนการศึกษาประจำปี 2569'
);

insert into public.school_activities (title, category, description, active, fund_scope)
select 'กิจกรรมทุนอาหารกลางวันประจำปี 2569', 'ทุนอาหารกลางวัน', null, true, 'yupparaj_school'
where not exists (
  select 1 from public.school_activities sa where sa.title = 'กิจกรรมทุนอาหารกลางวันประจำปี 2569'
);
