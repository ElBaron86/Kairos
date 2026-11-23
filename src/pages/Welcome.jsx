import { useState } from 'preact/hooks';
import { replaceState, update } from '../store.js';
import { exampleState } from '../data/examples.js';
import { Icon } from '../ui/icons.jsx';
import { LoginForm } from '../ui/Account.jsx';

export const Welcome = () => {
  const [name, setName] = useState('');
  const [login, setLogin] = useState(false);
  const start = (withExamples) => {
    const n = name.trim();
    if (withExamples) replaceState(exampleState(n));
    else update((d) => { d.onboarded = true; d.settings.name = n; });
    location.hash = '/';
  };
  return (
    <div class="app">
      <div class="page" style={{ minHeight: '100dvh', justifyContent: 'center', gap: '28px', paddingBottom: '40px' }}>
        <div class="col" style={{ gap: '14px' }}>
          <span class="tile" style={{ width: '64px', height: '64px', borderRadius: '22px', background: 'var(--accent)', color: 'var(--accent-ink)' }}>
            <Icon name="clock" size={32} />
          </span>
          <h1 class="h1" style={{ fontSize: '44px' }}>Kairos</h1>
          <p class="serif" style={{ margin: 0, fontSize: '24px', lineHeight: 1.2, color: 'var(--ink-2)' }}>
            Votre temps, votre budget, vos lectures et vos progrès, au même endroit.
          </p>
        </div>
        <label class="field">Comment vous appelez-vous ?
          <input class="input" value={name} onInput={(e) => setName(e.target.value)} placeholder="Votre prénom" autoComplete="given-name" />
        </label>
        <div class="col" style={{ gap: '10px' }}>
          <button class="btn accent block" onClick={() => start(true)}><Icon name="sparkles" size={18} />Découvrir avec des exemples</button>
          <button class="btn ghost block" onClick={() => start(false)}>Commencer avec une application vide</button>
          <button class="btn small" style={{ background: 'transparent', color: 'var(--accent)' }} onClick={() => setLogin(!login)}>{login ? 'Fermer' : 'J\u2019ai déjà un compte Kairos'}</button>
          {login && <div class="card"><LoginForm /></div>}
          <p class="small muted center" style={{ margin: '4px 0 0' }}>Vous pourrez effacer les exemples dans les réglages, et activer la synchronisation à tout moment.</p>
        </div>
      </div>
    </div>
  );
};
