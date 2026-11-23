import { useState } from 'preact/hooks';
import { update, useStore } from '../store.js';
import { askPermission, notify, upcoming } from '../lib/reminders.js';
import { addDays, cap, fmtLong, today, uid } from '../lib/util.js';
import { Icon } from '../ui/icons.jsx';
import { DeleteButton, Field, Header, Sheet, toast } from '../ui/kit.jsx';

const KIND = {
  agenda: { name: 'Agenda', icon: 'calendar', color: '#2F6BDB' },
  lecture: { name: 'Lecture', icon: 'book', color: '#B8441F' },
  budget: { name: 'Budget', icon: 'wallet', color: '#0F7A68' },
  perso: { name: 'Personnel', icon: 'bell', color: '#7A4FD6' }
};

const ReminderSheet = ({ initial, onClose }) => {
  const [r, set] = useState(initial);
  const isNew = !initial.id;
  const p = (x) => set({ ...r, ...x });
  const save = () => {
    if (!r.title.trim()) { toast('Donnez un titre au rappel'); return; }
    update((d) => {
      if (isNew) d.reminders.push({ ...r, id: uid(), title: r.title.trim() });
      else d.reminders = d.reminders.map((x) => (x.id === r.id ? { ...r, title: r.title.trim() } : x));
    });
    toast(isNew ? 'Rappel ajouté' : 'Rappel modifié');
    onClose();
  };
  return (
    <Sheet title={isNew ? 'Nouveau rappel' : 'Modifier le rappel'} onClose={onClose}>
      <Field label="Titre"><input class="input" value={r.title} onInput={(e) => p({ title: e.target.value })} placeholder="ex. Payer le loyer, appeler…" /></Field>
      <div class="grid2">
        <Field label="Date"><input class="input" type="date" value={r.date} onInput={(e) => p({ date: e.target.value })} /></Field>
        <Field label="Heure"><input class="input" type="time" value={r.time} onInput={(e) => p({ time: e.target.value })} /></Field>
      </div>
      <div class="field">Répéter
        <div class="seg">{[['none', 'Non'], ['daily', 'Jour'], ['weekly', 'Semaine'], ['monthly', 'Mois']].map(([v, l]) => <button class={r.repeat === v ? 'on' : ''} onClick={() => p({ repeat: v })}>{l}</button>)}</div>
      </div>
      <div class="field">Type
        <div class="wrap">{Object.entries(KIND).map(([k, c]) => <button class="chip" aria-pressed={r.kind === k} onClick={() => p({ kind: k })} style={{ background: r.kind === k ? c.color : 'var(--surface)', color: r.kind === k ? '#FFFFFF' : 'var(--ink)' }}><Icon name={c.icon} size={16} />{c.name}</button>)}</div>
      </div>
      <button class="btn accent block" onClick={save}>{isNew ? 'Ajouter' : 'Enregistrer'}</button>
      {!isNew && <DeleteButton onConfirm={() => { update((d) => { d.reminders = d.reminders.filter((x) => x.id !== r.id); }); onClose(); }} />}
    </Sheet>
  );
};

export const Reminders = () => {
  const s = useStore();
  const [filter, setFilter] = useState('all');
  const [edit, setEdit] = useState(null);
  const t = today();
  const all = upcoming(s, 7);
  const list = all.filter((r) => filter === 'all' || r.kind === filter);
  const next = all.find((r) => !s.muted[r.source] && r.when > new Date());
  const label = (d) => (d === t ? 'Aujourd’hui' : d === addDays(t, 1) ? 'Demain' : cap(fmtLong(d)));
  const groups = [...new Set(list.map((r) => r.date))];
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';

  const enable = async () => {
    const res = await askPermission();
    if (res === 'granted') { update((d) => { d.settings.notifications = true; }); notify('Kairos', 'Les notifications sont activées.'); toast('Notifications activées'); }
    else toast(res === 'unsupported' ? 'Ce navigateur ne gère pas les notifications' : 'Autorisation refusée dans le navigateur');
  };

  return (
    <div class="page">
      <Header title="Rappels" right={<button class="icon-btn accent" aria-label="Nouveau rappel" onClick={() => setEdit({ title: '', date: t, time: '09:00', repeat: 'none', kind: 'perso' })}><Icon name="plus" size={22} /></button>} />

      {!s.settings.notifications && perm !== 'unsupported' && (
        <section class="card" style={{ background: 'var(--accent-soft)', boxShadow: 'none' }}>
          <span class="b">Recevoir les rappels sur ce téléphone</span>
          <span class="sm" style={{ color: 'var(--ink-2)' }}>{perm === 'denied' ? 'Les notifications sont bloquées : autorisez-les dans les réglages du navigateur.' : 'Autorisez les notifications pour être prévenu à l’heure.'}</span>
          {perm !== 'denied' && <button class="btn accent" onClick={enable}><Icon name="bell" size={18} />Activer les notifications</button>}
        </section>
      )}

      {next && (
        <section class="card dark">
          <span class="small b" style={{ color: 'var(--on-dark-2)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Prochain rappel · {label(next.date)} {next.when.getHours().toString().padStart(2, '0')}:{next.when.getMinutes().toString().padStart(2, '0')}</span>
          <div class="row" style={{ background: 'rgba(255,255,255,.08)', borderRadius: '18px', padding: '12px 14px', alignItems: 'flex-start' }}>
            <span class="tile" style={{ width: '36px', height: '36px', borderRadius: '10px', background: KIND[next.kind]?.color || '#7A4FD6', color: '#FFFFFF' }}><Icon name={KIND[next.kind]?.icon || 'bell'} size={18} /></span>
            <div class="col grow" style={{ gap: '2px' }}><span class="b" style={{ fontSize: '15px' }}>{next.title}</span><span class="sm" style={{ color: 'var(--on-dark-2)' }}>{next.time} · {next.sub}</span></div>
          </div>
        </section>
      )}

      <div class="hscroll hide-scroll" role="tablist">
        {[['all', 'Tous'], ['agenda', 'Agenda'], ['lecture', 'Lecture'], ['budget', 'Budget'], ['perso', 'Personnel']].map(([k, l]) => <button role="tab" aria-selected={filter === k} class={'chip' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>{l}</button>)}
      </div>

      {groups.length === 0 && <div class="empty">Aucun rappel cette semaine. Ajoutez un rappel à un événement de l'agenda, à un plan de lecture, ou avec le bouton +.</div>}
      {groups.map((g) => (
        <section class="col" style={{ gap: '8px' }}>
          <h2 class="kicker" style={{ margin: '4px 0 0' }}>{label(g)}</h2>
          {list.filter((r) => r.date === g).map((r) => {
            const k = KIND[r.kind] || KIND.perso;
            const on = !s.muted[r.source];
            return (
              <div class="card tight" style={{ flexDirection: 'row', alignItems: 'center', opacity: on ? 1 : 0.55 }}>
                <span class="tile" style={{ width: '42px', height: '42px', background: `${k.color}22`, color: k.color }}><Icon name={k.icon} /></span>
                <button class="col grow" disabled={!r.reminderId} onClick={() => r.reminderId && setEdit(s.reminders.find((x) => x.id === r.reminderId))} style={{ gap: '2px', border: 0, background: 'transparent', padding: 0, textAlign: 'left', color: 'var(--ink)', cursor: r.reminderId ? 'pointer' : 'default' }}>
                  <span class="b" style={{ fontSize: '15px' }}>{r.title}</span>
                  <span class="small muted">{r.time} · {r.sub}</span>
                </button>
                <button role="switch" aria-checked={on} aria-label={`Rappel ${r.title}`} onClick={() => update((d) => { if (on) d.muted[r.source] = true; else delete d.muted[r.source]; })}
                  style={{ width: '50px', height: '30px', borderRadius: '15px', border: 0, padding: '3px', display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start', background: on ? 'var(--accent)' : 'var(--line)', flexShrink: 0 }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '12px', background: '#FFFFFF', display: 'block' }} />
                </button>
              </div>
            );
          })}
        </section>
      ))}
      <p class="small muted center" style={{ margin: 0 }}>Désactiver un rappel répété le coupe pour toutes ses occurrences.</p>
      {edit && <ReminderSheet initial={edit} onClose={() => setEdit(null)} />}
    </div>
  );
};
