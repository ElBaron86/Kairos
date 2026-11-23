-- Historique automatique : avant chaque mise à jour, l'ancienne version est gardée
-- (au plus une copie toutes les 6 heures, 30 copies par utilisateur).
create table if not exists public.kairos_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  saved_at timestamptz not null default now()
);

create index if not exists kairos_history_user_saved_idx on public.kairos_history (user_id, saved_at desc);

alter table public.kairos_history enable row level security;

create policy "Lire son propre historique" on public.kairos_history
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.kairos_history from anon, authenticated;
grant select on public.kairos_history to authenticated;

create or replace function public.kairos_keep_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.kairos_history h
    where h.user_id = old.user_id and h.saved_at > now() - interval '6 hours'
  ) then
    insert into public.kairos_history (user_id, data) values (old.user_id, old.data);
    delete from public.kairos_history h
    where h.user_id = old.user_id
      and h.id not in (
        select h2.id from public.kairos_history h2
        where h2.user_id = old.user_id
        order by h2.saved_at desc
        limit 30
      );
  end if;
  return new;
end;
$$;

revoke execute on function public.kairos_keep_history() from public, anon, authenticated;

drop trigger if exists kairos_state_history on public.kairos_state;
create trigger kairos_state_history
  before update on public.kairos_state
  for each row execute function public.kairos_keep_history();
