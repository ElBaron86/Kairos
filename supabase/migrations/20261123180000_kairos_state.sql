-- Données de chaque utilisateur de Kairos : un enregistrement par compte,
-- contenant tout l'état de l'application (agenda, budget, lecture, progrès, rappels).
create table if not exists public.kairos_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.kairos_state is 'État complet de l''application Kairos, un enregistrement par utilisateur.';

-- Sécurité : chacun ne voit et ne modifie que ses propres données.
alter table public.kairos_state enable row level security;

create policy "Lire ses propres données" on public.kairos_state
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Créer ses propres données" on public.kairos_state
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Modifier ses propres données" on public.kairos_state
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Supprimer ses propres données" on public.kairos_state
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.kairos_state from anon;
grant select, insert, update, delete on public.kairos_state to authenticated;
