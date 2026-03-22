-- Telegram: chat_id em profiles (já pode existir em 001 — garantir coluna)

alter table public.profiles
  add column if not exists telegram_chat_id text;

create index if not exists profiles_telegram_chat_id_idx
  on public.profiles (telegram_chat_id)
  where telegram_chat_id is not null;
