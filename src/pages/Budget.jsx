import { useState } from 'preact/hooks';
import { update, useStore } from '../store.js';
import { EXPENSE_CATS, GOAL_STYLES, expenseCat } from '../data/catalog.js';
import { applyRecurring, goalSaved, parseBankCSV, setGoalMonthly } from '../lib/budget.js';
import { monthBudget } from '../lib/stats.js';
import { addMonths, cap, eur, fmtMonth, fmtShort, monthKey, num, pct, today, uid } from '../lib/util.js';
import { Icon } from '../ui/icons.jsx';
import { Bar, DeleteButton, Field, Sheet, toast } from '../ui/kit.jsx';

const tint = (hex) => `${hex}24`;
const capState = (spent, limit) => (!limit ? null : spent > limit ? 'over' : spent >= limit * 0.9 ? 'near' : 'ok');
const CAP_COLOR = { over: '#C2412B', near: '#B7791F', ok: 'var(--muted)' };

const GoalSheet = ({ goal, monthlySavings, onClose }) => {
  const [amount, setAmount] = useState('');
  const [monthly, setMonthly] = useState(String(goal.monthly || ''));
  const st = GOAL_STYLES[goal.style % GOAL_STYLES.length];
  const saved = goalSaved(goal);
  const add = (sign) => {
    const a = num(amount);
    if (!a) { toast('Indiquez un montant'); return; }
    update((d) => { const g = d.budget.goals.find((x) => x.id === goal.id); g.saved = Math.max(0, g.saved + sign * a); });
    toast(sign > 0 ? `${eur(a)} mis de côté pour « ${goal.name} »` : 'Montant retiré');
    onClose();
  };
  const left = goal.target - saved;
  const pace = goal.monthly > 0 ? goal.monthly : monthlySavings;
  return (
    <Sheet title={goal.name} onClose={onClose}>
      <div class="card color" style={{ background: st.color }}>
        <span class="big num" style={{ fontSize: '34px' }}>{eur(saved)}</span>
        <span class="sm" style={{ opacity: 0.9 }}>sur {eur(goal.target)} · {pct(saved, goal.target)} %</span>
        <Bar value={pct(saved, goal.target)} color="#FFFFFF" track="rgba(255,255,255,.25)" />
        <span class="sm" style={{ opacity: 0.9 }}>{left <= 0 ? 'Objectif atteint, bravo !' : pace > 0 ? `À ce rythme : environ ${Math.ceil(left / pace)} mois` : `Encore ${eur(left)}`}</span>
      </div>
      <Field label="Montant (€)"><input class="input" inputMode="decimal" value={amount} onInput={(e) => setAmount(e.target.value)} placeholder="ex. 100" /></Field>
      <div class="grid2">
        <button class="btn soft" onClick={() => add(-1)}><Icon name="minus" size={18} />Retirer</button>
        <button class="btn accent" onClick={() => add(1)}><Icon name="plus" size={18} />Mettre de côté</button>
      </div>
      <Field label="Versement automatique chaque mois (€)" hint="Ajouté le 1er de chaque mois. 0 pour l'arrêter.">
        <div class="row"><input class="input" inputMode="decimal" value={monthly} onInput={(e) => setMonthly(e.target.value)} placeholder="ex. 150" />
          <button class="btn soft" onClick={() => { update((d) => setGoalMonthly(d.budget.goals.find((x) => x.id === goal.id), num(monthly))); toast(num(monthly) ? `${eur(num(monthly))} par mois à partir du mois prochain` : 'Versement automatique arrêté'); }}>OK</button></div>
      </Field>
      <DeleteButton label="Supprimer l'objectif" onConfirm={() => { update((d) => { d.budget.goals = d.budget.goals.filter((x) => x.id !== goal.id); }); onClose(); }} />
    </Sheet>
  );
};

const CapsSheet = ({ caps, onClose }) => {
  const [v, setV] = useState(Object.fromEntries(EXPENSE_CATS.map((c) => [c.id, caps[c.id] ? String(caps[c.id]) : ''])));
  return (
    <Sheet title="Plafonds par catégorie" onClose={onClose}>
      <p class="sm muted" style={{ margin: 0 }}>Kairos vous prévient à 90 % du plafond, puis quand il est dépassé. Laissez vide pour ne pas en fixer.</p>
      {EXPENSE_CATS.map((c) => (
        <div class="row">
          <span class="tile" style={{ background: tint(c.color), color: c.color }}><Icon name={c.icon} /></span>
          <span class="b grow">{c.name}</span>
          <input class="input" style={{ width: '120px' }} inputMode="decimal" placeholder="—" aria-label={`Plafond ${c.name}`} value={v[c.id]} onInput={(e) => setV({ ...v, [c.id]: e.target.value })} />
        </div>
      ))}
      <button class="btn accent block" onClick={() => { update((d) => { d.budget.caps = Object.fromEntries(Object.entries(v).filter(([, x]) => num(x) > 0).map(([k, x]) => [k, num(x)])); }); toast('Plafonds enregistrés'); onClose(); }}>Enregistrer</button>
    </Sheet>
  );
};

const ImportSheet = ({ onClose }) => {
  const [rows, setRows] = useState(null);
  const [picked, setPicked] = useState({});
  const load = (f) => f.text().then((txt) => {
    const list = parseBankCSV(txt);
    if (!list.length) { toast('Aucune dépense reconnue : vérifiez que le fichier contient des colonnes Date, Libellé et Montant'); return; }
    setRows(list);
    setPicked(Object.fromEntries(list.map((r) => [r.id, true])));
  });
  const doImport = () => {
    let n = 0;
    update((d) => {
      const known = new Set(d.budget.expenses.map((e) => e.id));
      rows.forEach((r) => { if (picked[r.id] && !known.has(r.id)) { d.budget.expenses.push({ ...r }); n += 1; } });
    });
    toast(`${n} dépense${n > 1 ? 's' : ''} importée${n > 1 ? 's' : ''}`);
    onClose();
  };
  return (
    <Sheet title="Importer un relevé" onClose={onClose}>
      {!rows && (
        <>
          <p class="sm muted" style={{ margin: 0 }}>Exportez vos opérations depuis votre banque au format CSV (colonnes Date, Libellé, Montant ou Débit). Seules les dépenses sont importées, et Kairos devine leur catégorie : vous pouvez la corriger avant de valider.</p>
          <label class="btn accent block">Choisir le fichier CSV<input type="file" accept=".csv,text/csv" class="sr" onChange={(e) => e.target.files[0] && load(e.target.files[0])} /></label>
        </>
      )}
      {rows && (
        <>
          <div class="row between"><span class="sm b">{rows.length} dépenses trouvées</span><span class="sm muted">{eur(rows.filter((r) => picked[r.id]).reduce((t, r) => t + r.amount, 0))}</span></div>
          <div class="col" style={{ gap: '8px' }}>
            {rows.map((r, i) => (
              <div class="card tight" style={{ gap: '8px' }}>
                <div class="row">
                  <input type="checkbox" checked={picked[r.id]} aria-label={`Importer ${r.label}`} onChange={() => setPicked({ ...picked, [r.id]: !picked[r.id] })} style={{ width: '20px', height: '20px' }} />
                  <span class="col grow" style={{ gap: 0 }}><span class="sm b">{r.label}</span><span class="small muted">{fmtShort(r.date)}</span></span>
                  <span class="sm b num">{eur(r.amount)}</span>
                </div>
                <select class="input" style={{ height: '40px', fontSize: '14px' }} value={r.cat} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, cat: e.target.value } : x)))}>
                  {EXPENSE_CATS.map((c) => <option value={c.id}>{c.name}</option>)}
                </select>
              </div>
            ))}
          </div>
          <button class="btn accent block" onClick={doImport}>Importer la sélection</button>
        </>
      )}
    </Sheet>
  );
};

const History = ({ s, month, setMonth }) => {
  const months = Array.from({ length: 6 }, (_, i) => addMonths(monthKey(), i - 5));
  const data = months.map((m) => monthBudget(s, m));
  const max = Math.max(1, ...data.map((d) => Math.max(d.income, d.spent)));
  return (
    <section class="card">
      <div class="row between"><h2 class="h2">6 derniers mois</h2><span class="row small muted" style={{ gap: '10px' }}><span class="row" style={{ gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--line)' }} />Revenus</span><span class="row" style={{ gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#F2A25B' }} />Dépenses</span></span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '8px', alignItems: 'end', height: '150px' }}>
        {data.map((d) => (
          <button onClick={() => setMonth(d.key)} aria-label={`${fmtMonth(d.key)} : ${eur(d.spent)} dépensés`} style={{ border: 0, background: 'transparent', padding: 0, height: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '110px' }}>
              <span style={{ width: '12px', height: `${Math.max(3, (d.income / max) * 110)}px`, borderRadius: '4px', background: 'var(--line)' }} />
              <span style={{ width: '12px', height: `${Math.max(3, (d.spent / max) * 110)}px`, borderRadius: '4px', background: d.spent > d.income && d.income ? '#C2412B' : '#F2A25B' }} />
            </span>
            <span class="small b" style={{ color: d.key === month ? 'var(--ink)' : 'var(--muted)', textTransform: 'capitalize' }}>{new Date(Number(d.key.slice(0, 4)), Number(d.key.slice(5)) - 1, 1).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
          </button>
        ))}
      </div>
      <span class="small muted">Épargne moyenne : {eur(Math.round(data.filter((d) => d.income || d.spent).reduce((t, d, _, a) => t + d.savings / a.length, 0)))} par mois</span>
    </section>
  );
};

export const Budget = () => {
  const s = useStore();
  const [month, setMonth] = useState(monthKey());
  const [cat, setCat] = useState('courses');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [open, setOpen] = useState(null);
  const [goal, setGoal] = useState(null);
  const [gName, setGName] = useState('');
  const [gTarget, setGTarget] = useState('');
  const [incomeEdit, setIncomeEdit] = useState(null);
  const [sheet, setSheet] = useState(null);
  const b = monthBudget(s, month);
  const c = expenseCat(cat);
  const caps = s.budget.caps || {};
  const currentMonth = month === monthKey();

  const add = () => {
    const a = num(amount);
    if (a <= 0) { toast('Indiquez un montant'); return; }
    const date = currentMonth ? today() : `${month}-01`;
    const lbl = label.trim() || c.name;
    const before = b.expenses.filter((e) => e.cat === cat).reduce((t, e) => t + e.amount, 0);
    update((d) => {
      if (recurring) {
        const id = uid();
        d.budget.recurring = [...(d.budget.recurring || []), { id, cat, label: lbl, amount: a, day: Math.min(28, Number(date.slice(8, 10))), since: month }];
        d.budget.expenses.push({ id: `rec:${id}:${month}`, date, cat, label: lbl, amount: a, recurringId: id });
      } else d.budget.expenses.push({ id: uid(), date, cat, label: lbl, amount: a });
    });
    setLabel(''); setAmount(''); setRecurring(false);
    const limit = caps[cat];
    const after = before + a;
    if (limit && after > limit) toast(`Plafond ${c.name} dépassé : ${eur(after)} sur ${eur(limit)}`);
    else if (limit && after >= limit * 0.9) toast(`Attention : ${c.name} à ${pct(after, limit)} % du plafond`);
    else toast(recurring ? `${eur(a)} ajoutés, et chaque mois désormais` : `${eur(a)} ajoutés à ${c.name}`);
  };
  const removeExpense = (e) => update((d) => {
    d.budget.expenses = d.budget.expenses.filter((x) => x.id !== e.id);
    if (e.recurringId) { const r = (d.budget.recurring || []).find((x) => x.id === e.recurringId); if (r) r.skip = [...(r.skip || []), e.date.slice(0, 7)]; }
  });
  const addGoal = () => {
    const tgt = num(gTarget);
    if (!gName.trim() || tgt <= 0) { toast('Donnez un nom et un montant à l’objectif'); return; }
    update((d) => { d.budget.goals.push({ id: uid(), name: gName.trim(), target: tgt, saved: 0, style: d.budget.goals.length, monthly: 0, autoFrom: null }); });
    setGName(''); setGTarget('');
    toast('Objectif créé');
  };

  const byCat = EXPENSE_CATS.map((x) => {
    const items = b.expenses.filter((e) => e.cat === x.id);
    return { ...x, items, total: items.reduce((t, e) => t + e.amount, 0), limit: caps[x.id] };
  }).filter((x) => x.total > 0 || x.limit).sort((a, z) => z.total - a.total);
  const max = Math.max(1, ...byCat.map((x) => Math.max(x.total, x.limit || 0)));
  const monthly = Math.max(0, monthBudget(s).savings);
  const alerts = byCat.filter((x) => capState(x.total, x.limit) === 'over' || capState(x.total, x.limit) === 'near');
  const recList = s.budget.recurring || [];

  return (
    <div class="page">
      <header class="row between" style={{ alignItems: 'flex-end' }}>
        <div class="col" style={{ gap: '2px' }}>
          <span class="kicker">{cap(fmtMonth(month))}</span>
          <h1 class="h1">Budget</h1>
        </div>
        <div class="row" style={{ gap: '6px' }}>
          <button class="icon-btn" aria-label="Mois précédent" onClick={() => setMonth(addMonths(month, -1))}><Icon name="left" /></button>
          <button class="icon-btn" aria-label="Mois suivant" onClick={() => setMonth(addMonths(month, 1))}><Icon name="right" /></button>
        </div>
      </header>

      <section class="card" style={{ background: '#0F3D35', color: '#FFFFFF', boxShadow: 'none' }}>
        <span class="sm b" style={{ color: '#BFE6DC' }}>Épargne potentielle</span>
        <div class="row" style={{ alignItems: 'baseline' }}>
          <span class="big num" style={{ fontSize: '46px' }}>{eur(b.savings)}</span>
          {b.income > 0 && <span class="pill" style={{ background: 'rgba(255,255,255,.14)' }}>{Math.round((b.savings / b.income) * 100)} %</span>}
        </div>
        <div style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', background: 'rgba(255,255,255,.14)' }}>
          <span style={{ width: `${Math.min(100, pct(b.spent, b.income || b.spent))}%`, background: '#F2A25B' }} />
          <span style={{ width: `${b.income ? Math.max(0, pct(b.savings, b.income)) : 0}%`, background: '#3CC9AE' }} />
        </div>
        <div class="grid3">
          <button onClick={() => setIncomeEdit(String(b.income || ''))} class="col" style={{ border: 0, background: 'transparent', color: '#FFFFFF', padding: 0, textAlign: 'left', gap: '2px' }}>
            <span class="small" style={{ color: '#BFE6DC', display: 'flex', alignItems: 'center', gap: '4px' }}>Revenus <Icon name="edit" size={12} /></span><span class="b num">{eur(b.income)}</span>
          </button>
          <div class="col" style={{ gap: '2px' }}><span class="small" style={{ color: '#BFE6DC' }}>Dépenses</span><span class="b num">{eur(b.spent)}</span></div>
          <div class="col" style={{ gap: '2px' }}><span class="small" style={{ color: '#BFE6DC' }}>Restant</span><span class="b num">{eur(b.savings)}</span></div>
        </div>
      </section>

      {alerts.length > 0 && (
        <section class="card tight" style={{ background: 'rgba(194,65,43,.1)', boxShadow: 'none' }}>
          {alerts.map((x) => (
            <div class="row sm">
              <span class="tile" style={{ width: '32px', height: '32px', borderRadius: '10px', background: tint(x.color), color: x.color }}><Icon name={x.icon} size={16} /></span>
              <span class="grow"><span class="b">{x.name}</span> {x.total > x.limit ? `dépasse son plafond de ${eur(x.total - x.limit)}` : `à ${pct(x.total, x.limit)} % du plafond`}</span>
            </div>
          ))}
        </section>
      )}

      <section class="card">
        <h2 class="h2">Ajouter une dépense</h2>
        <div class="grid4">
          {EXPENSE_CATS.map((x) => (
            <button onClick={() => setCat(x.id)} aria-pressed={cat === x.id}
              style={{ border: `2px solid ${cat === x.id ? x.color : 'var(--line-soft)'}`, background: 'var(--surface)', borderRadius: '16px', padding: '8px 2px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: 'var(--ink)' }}>
              <span class="tile" style={{ background: tint(x.color), color: x.color }}><Icon name={x.icon} /></span>
              <span style={{ fontSize: '11px', fontWeight: 600, lineHeight: 1.2, textAlign: 'center', hyphens: 'auto' }} lang="fr">{x.name}</span>
            </button>
          ))}
        </div>
        <div class="row" style={{ alignItems: 'flex-end' }}>
          <label class="field grow">Libellé<input class="input" value={label} onInput={(e) => setLabel(e.target.value)} placeholder={`ex. ${c.name}`} /></label>
          <label class="field" style={{ width: '120px' }}>Montant (€)<input class="input" inputMode="decimal" value={amount} onInput={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="0" /></label>
        </div>
        <label class="row sm b" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={recurring} onChange={() => setRecurring(!recurring)} style={{ width: '20px', height: '20px' }} />
          Revient chaque mois (loyer, abonnement…)
        </label>
        <button class="btn block" onClick={add}><Icon name="plus" size={18} />Ajouter à {c.name}</button>
      </section>

      <section class="col" style={{ gap: '10px' }}>
        <div class="row between"><h2 class="h2">Dépenses par catégorie</h2><button class="btn soft small" onClick={() => setSheet('caps')}><Icon name="target" size={16} />Plafonds</button></div>
        {byCat.length === 0 && <div class="empty">Aucune dépense ce mois-ci.</div>}
        {byCat.length > 0 && (
          <div class="card" style={{ padding: '6px 16px', gap: 0 }}>
            {byCat.map((x) => {
              const st = capState(x.total, x.limit);
              return (
                <div style={{ borderBottom: '1px solid var(--line-soft)' }}>
                  <button onClick={() => setOpen(open === x.id ? null : x.id)} aria-expanded={open === x.id} class="row" style={{ width: '100%', border: 0, background: 'transparent', padding: '10px 0', color: 'var(--ink)', textAlign: 'left' }}>
                    <span class="tile" style={{ width: '38px', height: '38px', background: tint(x.color), color: x.color }}><Icon name={x.icon} size={18} /></span>
                    <span class="col grow" style={{ gap: '5px' }}>
                      <span class="row between b" style={{ fontSize: '14px' }}><span>{x.name}</span><span class="num">{eur(x.total)}{x.limit ? <span class="small" style={{ color: CAP_COLOR[st], fontWeight: 600 }}> / {eur(x.limit)}</span> : null}</span></span>
                      <div class="bar" style={{ height: '5px', position: 'relative', overflow: 'visible' }}>
                        <span style={{ width: `${Math.min(100, (x.total / max) * 100)}%`, background: st === 'over' ? '#C2412B' : x.color }} />
                        {x.limit && <span style={{ position: 'absolute', top: '-3px', left: `${Math.min(99.5, (x.limit / max) * 100)}%`, width: '2px', height: '11px', background: 'var(--ink)', borderRadius: '1px' }} />}
                      </div>
                      <span class="small muted">{x.items.length} dépense{x.items.length > 1 ? 's' : ''}{x.items.length ? ' · ' + x.items.map((i) => i.label).slice(0, 3).join(' · ') : ''}</span>
                    </span>
                  </button>
                  {open === x.id && x.items.map((i) => (
                    <div class="row" style={{ padding: '6px 0 6px 50px' }}>
                      <span class="col grow" style={{ gap: 0 }}><span class="sm b">{i.label}</span><span class="small muted">{fmtShort(i.date)}{i.recurringId ? ' · chaque mois' : ''}</span></span>
                      <span class="sm b num">{eur(i.amount)}</span>
                      <button class="icon-btn" style={{ width: '34px', height: '34px', background: 'var(--surface-2)' }} aria-label={`Supprimer ${i.label}`} onClick={() => removeExpense(i)}><Icon name="trash" size={16} /></button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
        <button class="btn ghost small" onClick={() => setSheet('import')}><Icon name="upload" size={16} />Importer un relevé bancaire (CSV)</button>
      </section>

      {recList.length > 0 && (
        <section class="col" style={{ gap: '8px' }}>
          <h2 class="h2">Chaque mois</h2>
          <div class="card" style={{ padding: '6px 16px', gap: 0 }}>
            {recList.map((r) => {
              const x = expenseCat(r.cat);
              return (
                <div class="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
                  <span class="tile" style={{ width: '34px', height: '34px', borderRadius: '11px', background: tint(x.color), color: x.color }}><Icon name={x.icon} size={16} /></span>
                  <span class="col grow" style={{ gap: 0 }}><span class="sm b">{r.label}</span><span class="small muted">le {r.day} du mois · {x.name}</span></span>
                  <span class="sm b num">{eur(r.amount)}</span>
                  <button class="icon-btn" style={{ width: '34px', height: '34px', background: 'var(--surface-2)' }} aria-label={`Arrêter ${r.label}`} onClick={() => { update((d) => { d.budget.recurring = d.budget.recurring.filter((y) => y.id !== r.id); }); toast(`« ${r.label} » ne sera plus ajouté automatiquement`); }}><Icon name="close" size={16} /></button>
                </div>
              );
            })}
          </div>
          <span class="small muted">Total fixe : {eur(recList.reduce((t, r) => t + r.amount, 0))} par mois</span>
        </section>
      )}

      <History s={s} month={month} setMonth={setMonth} />

      <section class="col" style={{ gap: '10px' }}>
        <h2 class="h2">Mes objectifs d'épargne</h2>
        {s.budget.goals.length > 0 && (
          <div class="hscroll hide-scroll" style={{ gap: '12px' }}>
            {s.budget.goals.map((g) => {
              const st = GOAL_STYLES[g.style % GOAL_STYLES.length];
              const saved = goalSaved(g);
              const p = pct(saved, g.target);
              const left = g.target - saved;
              const pace = g.monthly > 0 ? g.monthly : monthly;
              return (
                <button onClick={() => setGoal(g)} style={{ flex: '0 0 200px', border: 0, textAlign: 'left', background: st.color, color: '#FFFFFF', borderRadius: '24px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span class="tile" style={{ background: 'rgba(255,255,255,.18)' }}><Icon name={st.icon} /></span>
                  <span class="big" style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.2 }}>{g.name}</span>
                  <span class="sm" style={{ opacity: 0.88 }}>{eur(saved)} sur {eur(g.target)}</span>
                  <Bar value={p} color="#FFFFFF" track="rgba(255,255,255,.22)" />
                  <span class="small b">{p} % · {left <= 0 ? 'atteint !' : pace > 0 ? `≈ ${Math.ceil(left / pace)} mois` : 'à planifier'}{g.monthly > 0 ? ` · ${eur(g.monthly)}/mois` : ''}</span>
                </button>
              );
            })}
          </div>
        )}
        <div class="card">
          <span class="b">Nouvel objectif</span>
          <div class="row" style={{ alignItems: 'flex-end' }}>
            <label class="field grow">Nom de l'objectif<input class="input" value={gName} onInput={(e) => setGName(e.target.value)} placeholder="ex. Mariage, voiture…" /></label>
            <label class="field" style={{ width: '120px' }}>Cible (€)<input class="input" inputMode="decimal" value={gTarget} onInput={(e) => setGTarget(e.target.value)} placeholder="1000" /></label>
          </div>
          <button class="btn ghost block" onClick={addGoal}>Créer l'objectif</button>
        </div>
      </section>

      {goal && <GoalSheet goal={s.budget.goals.find((g) => g.id === goal.id) || goal} monthlySavings={monthly} onClose={() => setGoal(null)} />}
      {sheet === 'caps' && <CapsSheet caps={caps} onClose={() => setSheet(null)} />}
      {sheet === 'import' && <ImportSheet onClose={() => setSheet(null)} />}
      {incomeEdit != null && (
        <Sheet title={`Revenus · ${fmtMonth(month)}`} onClose={() => setIncomeEdit(null)}>
          <Field label="Montant (€)" hint="Salaire et autres entrées d'argent du mois."><input class="input" inputMode="decimal" value={incomeEdit} onInput={(e) => setIncomeEdit(e.target.value)} /></Field>
          <button class="btn accent block" onClick={() => { update((d) => { d.budget.incomeByMonth[month] = num(incomeEdit); if (!d.budget.income) d.budget.income = num(incomeEdit); }); setIncomeEdit(null); }}>Enregistrer pour ce mois</button>
          <button class="btn ghost block" onClick={() => { update((d) => { d.budget.income = num(incomeEdit); delete d.budget.incomeByMonth[month]; }); setIncomeEdit(null); }}>Utiliser ce montant chaque mois</button>
        </Sheet>
      )}
    </div>
  );
};

export { applyRecurring };
