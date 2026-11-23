-- pg_net hors du schéma public (recommandation de sécurité Supabase).
drop extension if exists pg_net;
create extension if not exists pg_net with schema extensions;
