import { useState } from 'preact/hooks';
import { EMPTY, replaceState, update, useStore } from '../store.js';
import { exampleState } from '../data/examples.js';
import { askPermission, notify } from '../lib/reminders.js';
import { num, today } from '../lib/util.js';
import { Icon } from '../ui/icons.jsx';
import { DeleteButton, Field, Header, toast } from '../ui/kit.jsx';
import { AccountCard } from '../ui/Account.jsx';

export const Settings = () => {
  const s = useStore();
  const [income, setIncome] = useState(String(s.budget.income || ''));
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';

  const toggleNotif = async () => {
    if (s.settings.notifications) { update((d) => { d.settings.notifications = false; }); return; }
    const p = await askPermission();
    if (p === 'granted') {
      update((d) => { d.settings.notifications = true; });
      notify('Kairos', 'Les notifications sont activées.');
      toast('Notifications activées');
    } else toast(p === 'unsupported' ? 'Ce navigateur ne gère pas les notifications' : 'Autorisation refusée dans le navigateur');
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kairos-sauvegarde-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    f.text().then((txt) => {
      try {
        const data = JSON.parse(txt);
        if (!data || typeof data !== 'object' || !Array.isArray(data.events)) throw new Error('format');
        replaceState(data);
        toast('Sauvegarde restaurée');
      } catch (err) { toast('Ce fichier n’est pas une sauvegarde Kairos'); }
    });
  };

  return (
    <div class="page">
      <Header back="/" kicker="Kairos" title="Réglages" />
      <AccountCard />
      <section class="card">
        <Field label="Prénom">
          <input class="input" value={s.settings.name} onInput={(e) => update((d) => { d.settings.name = e.target.value; })} />
        </Field>
        <Field label="Revenus mensuels habituels (€)" hint="Utilisés pour calculer votre épargne potentielle chaque mois.">
          <input class="input" inputMode="decimal" value={income} onInput={(e) => setIncome(e.target.value)} onBlur={() => update((d) => { d.budget.income = num(income); })} />
        </Field>
      </section>

      <section class="card">
        <div class="row">
          <span class="tile" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name="bell" /></span>
          <div class="col grow">
            <span class="b">Notifications</span>
            <span class="small muted">{perm === 'denied' ? 'Bloquées dans les réglages du navigateur.' : 'Rappels d’événements, de lecture et de budget.'}</span>
          </div>
          <button role="switch" aria-checked={s.settings.notifications} aria-label="Activer les notifications" onClick={toggleNotif}
            style={{ width: '52px', height: '32px', borderRadius: '16px', border: 0, padding: '3px', display: 'flex', justifyContent: s.settings.notifications ? 'flex-end' : 'flex-start', background: s.settings.notifications ? 'var(--accent)' : 'var(--line)' }}>
            <span style={{ width: '26px', height: '26px', borderRadius: '13px', background: '#FFFFFF', display: 'block' }} />
          </button>
        </div>
        <p class="small muted" style={{ margin: 0 }}>
          Dans cette version, les rappels partent quand Kairos est ouvert ou en arrière-plan récent. Sur iPhone, ajoutez d'abord Kairos à l'écran d'accueil (Partager → Sur l'écran d'accueil).
        </p>
      </section>

      <section class="card">
        <h2 class="h2">Mes données</h2>
        <p class="sm muted" style={{ margin: 0 }}>Tout est enregistré sur cet appareil, et sur votre compte si vous êtes connecté. Une sauvegarde en fichier reste utile de temps en temps.</p>
        <div class="grid2">
          <button class="btn soft" onClick={exportData}><Icon name="download" size={18} />Sauvegarder</button>
          <label class="btn soft"><Icon name="upload" size={18} />Restaurer<input type="file" accept="application/json" class="sr" onChange={importData} /></label>
        </div>
        <button class="btn ghost block" onClick={() => { replaceState(exampleState(s.settings.name)); toast('Exemples chargés'); }}>Recharger les exemples</button>
        <DeleteButton label="Tout effacer" onConfirm={() => { replaceState({ ...structuredClone(EMPTY), onboarded: true, settings: { ...s.settings } }); toast('Toutes les données ont été effacées'); }} />
      </section>
      <p class="small muted center">Kairos 0.2</p>
    </div>
  );
};
