-- Web Push subscriptions (VAPID) — ส่งจาก backend ด้วย web-push

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid (),
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now (),
  constraint push_subscriptions_endpoint_unique unique (endpoint)
);

create index if not exists push_subscriptions_created_at_idx on public.push_subscriptions (created_at desc);

alter table public.push_subscriptions enable row level security;
