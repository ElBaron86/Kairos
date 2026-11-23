// Connexion, création de compte et état de la synchronisation.
import { useState } from 'preact/hooks';
import { pull, resetPassword, resolveConflict, signIn, signOut, signUp, useCloud } from '../lib/cloud.js';
import { Icon } from './icons.jsx';
import { Field, Sheet, toast } from './kit.jsx';

const ago = (d) => {
  if (!d) return '';
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

/** Formulaire e-mail + mot de passe. */
export const LoginForm = ({ onDone }) => {
  const [mode, setMode] = useState('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setMsg('Indiquez votre e-mail.'); return; }
    setBusy(true); setMsg(null);
    try {
      if (mode === 'reset') { await resetPassword(email.trim()); setMsg('Un lien pour choisir un nouveau mot de passe vient de partir par e-mail.'); }
      else if (mode === 'up') {
        const needConfirm = await signUp(email.trim(), password);
        if (needConfirm) setMsg('Compte créé ! Ouvrez le lien reçu par e-mail pour le confirmer, puis connectez-vous ici.');
        else { toast('Compte créé, synchronisation activée'); onDone && onDone(); }
        if (needConfirm) setMode('in');
      } else { await signIn(email.trim(), password); toast('Connecté'); onDone && onDone(); }
    } catch (err) { setMsg(err.message); }
    setBusy(false);
  };
  return (
    <form class="col" style={{ gap: '12px' }} onSubmit={submit}>
      {mode !== 'reset' && (
        <div class="seg">
          <button type="button" class={mode === 'in' ? 'on' : ''} onClick={() => setMode('in')}>Se connecter</button>
          <button type="button" class={mode === 'up' ? 'on' : ''} onClick={() => setMode('up')}>Créer un compte</button>
        </div>
      )}
      <Field label="E-mail"><input class="input" type="email" autoComplete="email" value={email} onInput={(e) => setEmail(e.target.value)} /></Field>
      {mode !== 'reset' && (
        <Field label="Mot de passe" hint={mode === 'up' ? '6 caractères minimum.' : undefined}>
          <input class="input" type="password" autoComplete={mode === 'up' ? 'new-password' : 'current-password'} value={password} onInput={(e) => setPassword(e.target.value)} />
        </Field>
      )}
      {msg && <p class="sm" role="status" style={{ margin: 0, padding: '10px 12px', borderRadius: '12px', background: 'var(--accent-soft)' }}>{msg}</p>}
      <button class="btn accent block" type="submit" disabled={busy}>{busy ? 'Un instant…' : mode === 'up' ? 'Créer mon compte' : mode === 'reset' ? 'Recevoir le lien' : 'Se connecter'}</button>
      <button type="button" class="btn small" style={{ background: 'transparent', color: 'var(--accent)' }} onClick={() => { setMode(mode === 'reset' ? 'in' : 'reset'); setMsg(null); }}>
        {mode === 'reset' ? 'Retour à la connexion' : 'Mot de passe oublié ?'}
      </button>
    </form>
  );
};

/** Carte « Compte et synchronisation » des réglages. */
export const AccountCard = () => {
  const c = useCloud();
  if (!c.user) {
    return (
      <section class="card">
        <div class="row">
          <span class="tile" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name="users" /></span>
          <div class="col grow"><span class="b">Compte et synchronisation</span><span class="small muted">Retrouvez vos données sur le téléphone et l'ordinateur.</span></div>
        </div>
        <LoginForm />
      </section>
    );
  }
  const label = { syncing: 'Synchronisation…', ok: `Synchronisé ${ago(c.at)}`, error: c.error, conflict: 'En attente de votre choix', off: 'Connexion…' }[c.state] || '';
  return (
    <section class="card">
      <div class="row">
        <span class="tile" style={{ background: c.state === 'error' ? 'rgba(194,65,43,.14)' : 'rgba(20,145,124,.14)', color: c.state === 'error' ? '#C2412B' : '#14917C' }}><Icon name={c.state === 'error' ? 'close' : 'check'} /></span>
        <div class="col grow"><span class="b">{c.user.email}</span><span class="small muted" role="status">{label}</span></div>
      </div>
      <div class="grid2">
        <button class="btn soft" onClick={() => pull()}>Synchroniser</button>
        <button class="btn ghost" onClick={() => signOut().then(() => toast('Déconnecté : les données restent sur cet appareil'))}>Se déconnecter</button>
      </div>
    </section>
  );
};

/** Question posée la première fois qu'un appareil déjà rempli se connecte à un compte qui a des données. */
export const ConflictSheet = () => {
  const c = useCloud();
  if (!c.conflict) return null;
  const when = new Date(c.conflict.remoteAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  return (
    <Sheet title="Quelles données garder ?" onClose={() => resolveConflict('remote')}>
      <p class="sm" style={{ margin: 0, color: 'var(--ink-2)' }}>Votre compte contient déjà des données (dernière modification le {when}), et cet appareil aussi.</p>
      <button class="btn accent block" onClick={() => resolveConflict('remote')}>Utiliser les données du compte</button>
      <button class="btn ghost block" onClick={() => resolveConflict('local')}>Remplacer par celles de cet appareil</button>
      <p class="small muted" style={{ margin: 0 }}>Conseil : si cet appareil ne contient que les exemples, gardez les données du compte.</p>
    </Sheet>
  );
};
