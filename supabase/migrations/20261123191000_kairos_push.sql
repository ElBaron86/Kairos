-- Notifications application fermée : abonnements des appareils et file des rappels à envoyer.
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.push_queue (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  title text not null,
  body text not null default '',
  send_at timestamptz not null,
  sent boolean not null default false,
  unique (user_id, key)
);

create index if not exists push_queue_due_idx on public.push_queue (send_at) where not sent;
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
alter table public.push_queue enable row level security;

create policy "Gérer ses abonnements" on public.push_subscriptions
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Gérer ses rappels" on public.push_queue
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.push_subscriptions, public.push_queue from anon;
grant select, insert, update, delete on public.push_subscriptions, public.push_queue to authenticated;

-- Appel de la fonction d'envoi chaque minute, seulement s'il y a quelque chose à envoyer.
create extension if not exists pg_cron;
create extension if not exists pg_net;
