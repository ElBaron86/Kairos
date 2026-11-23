// Fonction planifiée : envoie les rappels arrivés à échéance (file push_queue)
// à tous les appareils abonnés de chaque utilisateur. Appelée chaque minute par pg_cron.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

let ready = false;
const setup = () => {
  if (ready) return;
  webpush.setVapidDetails('https://elbaron86.github.io/Kairos/', Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);
  ready = true;
};

// Pas de secret d'appel : la fonction ne fait qu'envoyer des rappels déjà programmés
// par leurs propriétaires. L'appeler plus souvent n'envoie rien de plus.
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Méthode non autorisée', { status: 405 });
  if (!Deno.env.get('VAPID_PRIVATE_KEY') || !Deno.env.get('VAPID_PUBLIC_KEY')) {
    return new Response('Clés VAPID manquantes', { status: 503 });
  }
  setup();

  // Rappels dus depuis moins de 15 minutes et pas encore envoyés.
  const now = new Date();
  const since = new Date(now.getTime() - 15 * 60000).toISOString();
  const { data: due, error } = await admin
    .from('push_queue')
    .select('id, user_id, title, body')
    .eq('sent', false)
    .lte('send_at', now.toISOString())
    .gte('send_at', since)
    .limit(500);
  if (error) return new Response(error.message, { status: 500 });

  let sent = 0;
  if (due && due.length) {
    // On marque d'abord comme envoyés pour éviter un double envoi si la minute suivante démarre.
    await admin.from('push_queue').update({ sent: true }).in('id', due.map((d) => d.id));
    const users = [...new Set(due.map((d) => d.user_id))];
    const { data: subs } = await admin.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').in('user_id', users);
    for (const item of due) {
      for (const s of (subs || []).filter((x) => x.user_id === item.user_id)) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: item.title, body: item.body }),
            { TTL: 3600, urgency: 'high' }
          );
          sent += 1;
        } catch (e) {
          // Abonnement expiré ou révoqué : on le retire.
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await admin.from('push_subscriptions').delete().eq('id', s.id);
        }
      }
    }
  }

  // Ménage : rappels envoyés ou périmés depuis plus de 2 jours.
  await admin.from('push_queue').delete().lt('send_at', new Date(now.getTime() - 2 * 86400000).toISOString());

  return new Response(JSON.stringify({ due: due?.length ?? 0, sent }), { headers: { 'Content-Type': 'application/json' } });
});
