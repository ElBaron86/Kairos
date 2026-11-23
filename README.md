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

## Limites de cette version

- Les rappels sont déclenchés par l'application elle-même : ils partent quand Kairos est ouvert ou en arrière-plan récent. Prochaine étape : une fonction planifiée Supabase qui envoie des notifications *Web Push* application fermée (le service worker `public/sw.js` sait déjà les afficher).
- Si deux appareils sont modifiés en même temps hors ligne, la version la plus récente l'emporte.

## Organisation du code

```
src/
  main.jsx          navigation, boucle des rappels
  store.js          état global + enregistrement local
  lib/cloud.js      compte Supabase + synchronisation
  styles.css        thème clair / nuit, composants
  data/             catégories, plans bibliques, données d'exemple
  lib/              dates, calculs, rappels
  ui/               icônes, cadran, composants communs
  pages/            un fichier par écran
public/             icônes, manifeste PWA, service worker
supabase/           migrations de la base de données
```

`npm run build:demo` produit une version en un seul fichier HTML (`dist-demo/index.html`), pratique pour un aperçu.
