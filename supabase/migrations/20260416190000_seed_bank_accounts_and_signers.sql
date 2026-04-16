-- Seed bank accounts + authorized signers (KBiz) from business requirements

insert into public.bank_accounts (
  legal_entity_id,
  bank_name,
  account_name,
  account_no_masked,
  signer_pool_size,
  required_signers,
  kbiz_enabled
)
select
  e.id,
  'Kasikornbank',
  'สมาคมศิษย์เก่า',
  '205-2-76989-5',
  5,
  3,
  true
from public.legal_entities e
where e.code = 'association'
  and not exists (
    select 1 from public.bank_accounts b where b.account_no_masked = '205-2-76989-5'
  );

insert into public.bank_accounts (
  legal_entity_id,
  bank_name,
  account_name,
  account_no_masked,
  signer_pool_size,
  required_signers,
  kbiz_enabled
)
select
  e.id,
  'Kasikornbank',
  'โรงเรียนกวดวิชา',
  '205-2-77071-0',
  5,
  3,
  true
from public.legal_entities e
where e.code = 'cram_school'
  and not exists (
    select 1 from public.bank_accounts b where b.account_no_masked = '205-2-77071-0'
  );

-- บัญชีสมาชิก (ใช้รับ/ถือเงินสมาชิก) ผูกกับหน่วยงานสมาคมในเฟสแรก
insert into public.bank_accounts (
  legal_entity_id,
  bank_name,
  account_name,
  account_no_masked,
  signer_pool_size,
  required_signers,
  kbiz_enabled
)
select
  e.id,
  'Kasikornbank',
  'บัญชีสมาชิก',
  '205-2-77086-9',
  5,
  3,
  true
from public.legal_entities e
where e.code = 'association'
  and not exists (
    select 1 from public.bank_accounts b where b.account_no_masked = '205-2-77086-9'
  );

with signer_names(name) as (
  values
    ('นิทัศน์ สุขทรัพย์ถาวร'),
    ('อัศวิญญ์ บุรานนท์'),
    ('วัฒนา จันทร์เพ็ง'),
    ('บุญเสริม สุริยา'),
    ('ชาญชัย กีฬาแปง')
),
accounts as (
  select id from public.bank_accounts
  where account_no_masked in ('205-2-76989-5', '205-2-77071-0', '205-2-77086-9')
)
insert into public.bank_account_signers (
  bank_account_id,
  signer_name,
  kbiz_name,
  in_kbiz,
  active
)
select
  a.id,
  s.name,
  s.name,
  true,
  true
from accounts a
cross join signer_names s
on conflict (bank_account_id, signer_name) do update
set
  kbiz_name = excluded.kbiz_name,
  in_kbiz = excluded.in_kbiz,
  active = excluded.active;
