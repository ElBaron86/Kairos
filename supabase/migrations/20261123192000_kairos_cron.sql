-- Appelle la fonction d'envoi des rappels chaque minute s'il y a quelque chose à envoyer
-- (et une fois par heure pour le ménage de la file).
select cron.schedule(
  'kairos-send-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://coaiwgpbwybgfpebvcns.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  )
  where exists (
    select 1 from public.push_queue
    where not sent and send_at <= now() and send_at > now() - interval '15 minutes'
  )
     or extract(minute from now()) = 0;
  $$
);
