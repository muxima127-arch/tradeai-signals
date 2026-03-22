-- Subscrições Stripe (fonte de verdade para billing + middleware)

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text not null,
  plan text not null check (plan in ('basic', 'premium')),
  status text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stripe_subscription_id)
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated using (auth.uid() = user_id);
