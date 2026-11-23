# Kairos

Application d'organisation personnelle, installable sur téléphone (PWA) :

- **Agenda** en cadran 24 h (vue jour et vue semaine), catégories en couleur, rappels par événement.
- **Budget** mensuel : 12 catégories avec icônes, épargne potentielle calculée en direct, objectifs d'épargne nommés.
- **Lecture** : plans bibliques par thème (Foi, Courage, Finances, Paix, Sagesse, Pardon), plans personnalisés (livres, rythme, jours, rappel), bibliothèque pour les autres livres avec suivi des pages et défi annuel.
- **Progrès** : apprentissages (instrument, langue, sport…) avec niveaux, parcours d'étapes, minuteur, calendrier de régularité et badges.
- **Rappels** : tous les rappels de la semaine au même endroit, avec notifications.
- **Mode nuit automatique** (suit le réglage du téléphone).

Les données sont enregistrées sur l'appareil (localStorage) et, une fois connecté (Réglages → Compte), synchronisées avec Supabase entre le téléphone et l'ordinateur. Réglages → *Sauvegarder* exporte aussi un fichier JSON.

## Lancer sur votre ordinateur

Il faut [Node.js](https://nodejs.org) 20 ou plus récent.

```bash
npm install
npm run dev        # ouvre http://localhost:5173
```

## Mettre en ligne gratuitement

Ce dépôt est publié par **GitHub Pages** : le fichier `.github/workflows/deploy.yml` construit et publie l'application à chaque envoi sur `main`.

À faire une seule fois : **Settings → Pages → Build and deployment → Source : GitHub Actions**. L'application est ensuite à l'adresse **https://elbaron86.github.io/Kairos/**.

(Alternative : Cloudflare Pages, commande `npm run build`, dossier `dist`.)

## Supabase (compte et synchronisation)

- Projet : `coaiwgpbwybgfpebvcns`. La table `kairos_state` et ses règles de sécurité sont dans `supabase/migrations/`.
- L'URL du projet et la clé *publishable* sont dans `src/lib/cloud.js` (publiques par nature ; on peut aussi les fournir avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_KEY`). La clé secrète ne doit jamais apparaître dans ce dépôt.
- Dans le tableau de bord Supabase, **Authentication → URL Configuration** : *Site URL* = `https://elbaron86.github.io/Kairos/`, et ajouter la même adresse dans *Redirect URLs* (pour les liens de confirmation et de mot de passe oublié).

## Installer sur le téléphone

- **iPhone** : ouvrez l'adresse dans Safari → bouton Partager → *Sur l'écran d'accueil*. Les notifications ne fonctionnent qu'une fois l'application installée ainsi.
- **Android** : ouvrez l'adresse dans Chrome → menu ⋮ → *Installer l'application*.

Puis Réglages (roue dentée sur l'accueil) ou onglet Rappels → *Activer les notifications*.

## Notifications application fermée

1. Générez une paire de clés : `pip install cryptography` puis `python scripts/generate_vapid_keys.py`.
2. Supabase → **Edge Functions → Secrets** : ajoutez `VAPID_PUBLIC_KEY` et `VAPID_PRIVATE_KEY`.
3. Mettez la clé **publique** dans l'application : variable `VITE_VAPID_PUBLIC_KEY` (fichier `.env` ou secret du workflow GitHub), ou directement dans `src/lib/push.js`.

L'application dépose ses rappels des 14 prochains jours dans la table `push_queue` ; la fonction `send-reminders`, appelée chaque minute par `pg_cron`, envoie ceux qui sont arrivés à échéance. Si Kairos n'est pas ouvert pendant plus de deux semaines, les rappels s'arrêtent jusqu'à la prochaine ouverture.

## Limites

- Si deux appareils modifient exactement la même donnée hors ligne, la modification la plus récente l'emporte ; le reste est fusionné.

## Organisation du code

```
src/
  main.jsx          navigation, boucle des rappels
  store.js          état global + enregistrement local
  lib/cloud.js      compte Supabase + synchronisation
  lib/merge.js      fusion des modifications de plusieurs appareils
  lib/push.js       notifications application fermée
  styles.css        thème clair / nuit, composants
  data/             catégories, plans bibliques, données d'exemple
  lib/              dates, calculs, rappels
  ui/               icônes, cadran, composants communs
  pages/            un fichier par écran
public/             icônes, manifeste PWA, service worker
supabase/           migrations et fonction d'envoi des rappels
scripts/            outils (génération des clés de notification)
```

`npm run build:demo` produit une version en un seul fichier HTML (`dist-demo/index.html`), pratique pour un aperçu.
