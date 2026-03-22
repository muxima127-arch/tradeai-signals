-- TradeAI Signals — schema inicial (executar no SQL Editor Supabase ou via CLI)

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'basic', 'premium')),
  stripe_customer_id text unique,
  telegram_chat_id text,
  trial_ends_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, trial_ends_at)
  values (
    new.id,
    new.email,
    now() + interval '7 days'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid references auth.users on delete set null,
  asset text not null,
  symbol text not null,
  direction text not null check (direction in ('buy', 'sell')),
  probability numeric not null,
  tp numeric not null,
  sl numeric not null,
  risk_score numeric not null,
  ensemble_gb numeric not null,
  ensemble_lstm numeric not null,
  backtest_win_rate numeric not null,
  timeframe text not null,
  meta jsonb default '{}'::jsonb
);

alter table public.signals enable row level security;

create policy "signals_select_auth" on public.signals
  for select to authenticated using (true);

create policy "signals_insert_auth" on public.signals
  for insert to authenticated with check (auth.uid() = user_id or user_id is null);

-- Realtime: em Supabase Dashboard → Database → Replication, ativar a tabela `signals`.
