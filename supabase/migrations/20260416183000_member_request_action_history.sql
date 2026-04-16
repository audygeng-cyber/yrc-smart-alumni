alter table public.member_update_requests
  add column if not exists action_history jsonb not null default '[]'::jsonb;

update public.member_update_requests
set action_history = (
  jsonb_build_array(
    jsonb_build_object(
      'action', 'submitted',
      'actor', 'member',
      'at', created_at,
      'comment', null,
      'from_status', null,
      'to_status', 'pending_president'
    )
  )
  ||
  case
    when president_approved_at is not null then jsonb_build_array(
      jsonb_build_object(
        'action', 'president_approved',
        'actor', coalesce(nullif(trim(president_approved_by), ''), 'president'),
        'at', president_approved_at,
        'comment', null,
        'from_status', 'pending_president',
        'to_status', 'pending_admin'
      )
    )
    else '[]'::jsonb
  end
  ||
  case
    when admin_approved_at is not null then jsonb_build_array(
      jsonb_build_object(
        'action', 'admin_approved',
        'actor', coalesce(nullif(trim(admin_approved_by), ''), 'admin'),
        'at', admin_approved_at,
        'comment', null,
        'from_status', 'pending_admin',
        'to_status', 'approved'
      )
    )
    else '[]'::jsonb
  end
  ||
  case
    when rejected_at is not null then jsonb_build_array(
      jsonb_build_object(
        'action', 'rejected',
        'actor', coalesce(nullif(trim(rejected_by), ''), 'admin'),
        'at', rejected_at,
        'comment', nullif(trim(rejection_reason), ''),
        'from_status', case
          when president_approved_at is not null then 'pending_admin'
          else 'pending_president'
        end,
        'to_status', 'rejected'
      )
    )
    else '[]'::jsonb
  end
)
where coalesce(jsonb_array_length(action_history), 0) = 0;
