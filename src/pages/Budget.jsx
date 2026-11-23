import { useState } from 'preact/hooks';
import { update, useStore } from '../store.js';
import { EXPENSE_CATS, GOAL_STYLES, expenseCat } from '../data/catalog.js';
import { monthBudget } from '../lib/stats.js';
import { addMonths, cap, eur, fmtMonth, fmtShort, monthKey, num, pct, today, uid } from '../lib/util.js';
import { Icon } from '../ui/icons.jsx';
import { Bar, DeleteButton, Field, Sheet, toast } from '../ui/kit.jsx';

const tint = (hex) => `${hex}24`;

const GoalSheet = ({ goal, monthly, onClose }) => {
  const [amount, setAmount] = useState('');
  const st = GOAL_STYLES[goal.style % GOAL_STYLES.length];
  const add = (sign) => {
    const a = num(amount);
    if (!a) { toast('Indiquez un montant'); return; }
    update((d) => { const g = d.budget.goals.find((x) => x.id === goal.id); g.saved = Math.max(0, g.saved + sign * a); });
    toast(sign > 0 ? `${eur(a)} mis de côté pour « ${goal.name} »` : 'Montant retiré');
    onClose();
  };
  const left = goal.target - goal.saved;
  return (
    <Sheet title={goal.name} onClose={onClose}>
      <div class="card color" style={{ background: st.color }}>
        <span class="big num" style={{ fontSize: '34px' }}>{eur(goal.saved)}</span>
        <span class="sm" style={{ opacity: 0.9 }}>sur {eur(goal.target)} · {pct(goal.saved, goal.target)} %</span>
        <Bar value={pct(goal.saved, goal.target)} color="#FFFFFF" track="rgba(255,255,255,.25)" />
        <span class="sm" style={{ opacity: 0.9 }}>{left <= 0 ? 'Objectif atteint, bravo !' : monthly > 0 ? `Au rythme de votre épargne actuelle : environ ${Math.ceil(left / monthly)} mois` : `Encore ${eur(left)}`}</span>
      </div>
      <Field label="Montant (€)"><input class="input" inputMode="decimal" value={amount} onInput={(e) => setAmount(e.target.value)} placeholder="ex. 100" /></Field>
      <div class="grid2">
        <button class="btn soft" onClick={() => add(-1)}><Icon name="minus" size={18} />Retirer</button>
        <button class="btn accent" onClick={() => add(1)}><Icon name="plus" size={18} />Mettre de côté</button>
      </div>
      <DeleteButton label="Supprimer l'objectif" onConfirm={() => { update((d) => { d.budget.goals = d.budget.goals.filter((x) => x.id !== goal.id); }); onClose(); }} />
    </Sheet>
  );
};

export const Budget = () => {
  const s = useStore();
  const [month, setMonth] = useState(monthKey());
  const [cat, setCat] = useState('courses');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [open, setOpen] = useState(null);
  const [goal, setGoal] = useState(null);
  const [gName, setGName] = useState('');
  const [gTarget, setGTarget] = useState('');
  const [incomeEdit, setIncomeEdit] = useState(null);
  const b = monthBudget(s, month);
  const c = expenseCat(cat);
  const currentMonth = month === monthKey();

  const add = () => {
    const a = num(amount);
    if (a <= 0) { toast('Indiquez un montant'); return; }
    const date = currentMonth ? today() : `${month}-01`;
    update((d) => { d.budget.expenses.push({ id: uid(), date, cat, label: label.trim() || c.name, amount: a }); });
    setLabel(''); setAmount('');
    toast(`${eur(a)} ajoutés à ${c.name}`);
  };
  const addGoal = () => {
    const tgt = num(gTarget);
    if (!gName.trim() || tgt <= 0) { toast('Donnez un nom et un montant à l’objectif'); return; }
    update((d) => { d.budget.goals.push({ id: uid(), name: gName.trim(), target: tgt, saved: 0, style: d.budget.goals.length }); });
    setGName(''); setGTarget('');
    toast('Objectif créé');
  };

  const byCat = EXPENSE_CATS.map((x) => {
    const items = b.expenses.filter((e) => e.cat === x.id);
    return { ...x, items, total: items.reduce((t, e) => t + e.amount, 0) };
  }).filter((x) => x.total > 0).sort((a, z) => z.total - a.total);
  const max = byCat[0]?.total || 1;
  const monthly = Math.max(0, monthBudget(s).savings);

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
        <button class="btn block" onClick={add}><Icon name="plus" size={18} />Ajouter à {c.name}</button>
      </section>

      <section class="col" style={{ gap: '10px' }}>
        <div class="row between"><h2 class="h2">Dépenses par catégorie</h2><span class="sm muted">{eur(b.spent)}</span></div>
        {byCat.length === 0 && <div class="empty">Aucune dépense ce mois-ci.</div>}
        {byCat.length > 0 && (
          <div class="card" style={{ padding: '6px 16px', gap: 0 }}>
            {byCat.map((x) => (
              <div style={{ borderBottom: '1px solid var(--line-soft)' }}>
                <button onClick={() => setOpen(open === x.id ? null : x.id)} aria-expanded={open === x.id} class="row" style={{ width: '100%', border: 0, background: 'transparent', padding: '10px 0', color: 'var(--ink)', textAlign: 'left' }}>
                  <span class="tile" style={{ width: '38px', height: '38px', background: tint(x.color), color: x.color }}><Icon name={x.icon} size={18} /></span>
                  <span class="col grow" style={{ gap: '5px' }}>
                    <span class="row between b" style={{ fontSize: '14px' }}><span>{x.name}</span><span class="num">{eur(x.total)}</span></span>
                    <Bar value={(x.total / max) * 100} color={x.color} height={5} />
                    <span class="small muted">{x.items.length} dépense{x.items.length > 1 ? 's' : ''} · {x.items.map((i) => i.label).slice(0, 3).join(' · ')}</span>
                  </span>
                </button>
                {open === x.id && x.items.map((i) => (
                  <div class="row" style={{ padding: '6px 0 6px 50px' }}>
                    <span class="col grow" style={{ gap: 0 }}><span class="sm b">{i.label}</span><span class="small muted">{fmtShort(i.date)}</span></span>
                    <span class="sm b num">{eur(i.amount)}</span>
                    <button class="icon-btn" style={{ width: '34px', height: '34px', background: 'var(--surface-2)' }} aria-label={`Supprimer ${i.label}`} onClick={() => update((d) => { d.budget.expenses = d.budget.expenses.filter((e) => e.id !== i.id); })}><Icon name="trash" size={16} /></button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <section class="col" style={{ gap: '10px' }}>
        <h2 class="h2">Mes objectifs d'épargne</h2>
        {s.budget.goals.length > 0 && (
          <div class="hscroll hide-scroll" style={{ gap: '12px' }}>
            {s.budget.goals.map((g) => {
              const st = GOAL_STYLES[g.style % GOAL_STYLES.length];
              const p = pct(g.saved, g.target);
              const left = g.target - g.saved;
              return (
                <button onClick={() => setGoal(g)} style={{ flex: '0 0 200px', border: 0, textAlign: 'left', background: st.color, color: '#FFFFFF', borderRadius: '24px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span class="tile" style={{ background: 'rgba(255,255,255,.18)' }}><Icon name={st.icon} /></span>
                  <span class="big" style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.2 }}>{g.name}</span>
                  <span class="sm" style={{ opacity: 0.88 }}>{eur(g.saved)} sur {eur(g.target)}</span>
                  <Bar value={p} color="#FFFFFF" track="rgba(255,255,255,.22)" />
                  <span class="small b">{p} % · {left <= 0 ? 'atteint !' : monthly > 0 ? `≈ ${Math.ceil(left / monthly)} mois` : 'à planifier'}</span>
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

      {goal && <GoalSheet goal={s.budget.goals.find((g) => g.id === goal.id) || goal} monthly={monthly} onClose={() => setGoal(null)} />}
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
