// The Finpath assistant's reasoning, as plain functions over transactions.
import { SUBSCRIPTIONS } from './data.js';

const money = n => `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
export const fmt = (n, cents = true) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`;

export function monthly(txns, category, days = 90) {
  const total = txns.filter(t => t.category === category).reduce((a, t) => a + t.amount, 0);
  return Math.abs(total) / (days / 30);
}

// Subscriptions nobody has opened in 30+ days
export function unusedSubscriptions(subs = SUBSCRIPTIONS, threshold = 30) {
  const unused = subs.filter(s => s.lastUsedDays >= threshold);
  return { unused, saving: Math.round(unused.reduce((a, s) => a + s.amount, 0)) };
}

// Trim a category by a share and say what it's worth
export function trim(txns, category = 'Dining', share = 0.25) {
  const perMonth = monthly(txns, category);
  return { perMonth: Math.round(perMonth), saving: Math.round(perMonth * share / 10) * 10, share };
}

// Flag spend far outside the merchant-category norm (z-score on this account's outflows)
export function unusual(txns, z = 3) {
  const out = txns.filter(t => t.amount < 0 && !['Housing', 'Subscriptions'].includes(t.category));
  const vals = out.map(t => -t.amount), mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length);
  return out.filter(t => (-t.amount - mean) / sd > z).map(t => ({ ...t, z: Math.round(((-t.amount - mean) / sd) * 10) / 10 }));
}

// Straight-line forecast from the last 90 days of net flow
export function forecast(balance, txns, daysAhead = 30, days = 90) {
  const net = txns.reduce((a, t) => a + t.amount, 0) / days;
  return { perDay: Math.round(net * 100) / 100, projected: Math.round(balance + net * daysAhead), daysAhead };
}

export function byCategory(txns) {
  const m = new Map();
  for (const t of txns) if (t.amount < 0) m.set(t.category, (m.get(t.category) || 0) - t.amount);
  return [...m].map(([category, total]) => ({ category, total: Math.round(total) })).sort((a, b) => b.total - a.total);
}

export function weeklyCashflow(txns, weeks = 10, today = '2026-03-28') {
  const end = new Date(today + 'T12:00:00Z').getTime(), out = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const from = end - (w + 1) * 7 * 864e5, to = end - w * 7 * 864e5;
    const inRange = txns.filter(t => { const d = new Date(t.date + 'T12:00:00Z').getTime(); return d > from && d <= to; });
    out.push({ income: Math.round(inRange.filter(t => t.amount > 0).reduce((a, t) => a + t.amount, 0)), expense: Math.round(-inRange.filter(t => t.amount < 0).reduce((a, t) => a + t.amount, 0)) });
  }
  return out;
}

// The assistant: route a question to one of the analyses and answer in Finpath's voice
export function answer(q, { txns, balance }) {
  const t = q.toLowerCase();
  if (/save|fix|cut|reduce|optimi|quick win|budget/.test(t)) {
    const s = unusedSubscriptions(), d = trim(txns);
    return { kind: 'wins', text: 'Here are 2 quick wins:', items: [
      { title: `Cancel ${s.unused.length} unused subscriptions`, sub: `${s.unused.map(x => x.merchant).join(' and ')} not opened in 30+ days · Potential saving: ${money(s.saving)}/month` },
      { title: 'Reduce dining out', sub: `You spend about ${money(d.perMonth)}/month. If reduced by 25%, you save ~${money(d.saving)}/month` },
    ], follow: 'Want me to optimize this for you?' };
  }
  if (/unusual|fraud|weird|suspicious|detect/.test(t)) {
    const u = unusual(txns);
    return { kind: 'list', text: u.length ? `I found ${u.length} transaction${u.length > 1 ? 's' : ''} well outside your usual pattern:` : 'Nothing unusual in the last 90 days.',
      items: u.map(x => ({ title: `${x.merchant} · ${fmt(x.amount)}`, sub: `${x.date} · ${x.z}σ above your typical purchase` })), follow: u.length ? 'Should I lock the card while you check?' : '' };
  }
  if (/forecast|next month|project|end of month|will i/.test(t)) {
    const f = forecast(balance, txns);
    return { kind: 'text', text: `At your current pace (${fmt(f.perDay)} a day net), your balance lands near ${money(f.projected)} in ${f.daysAhead} days.`, follow: f.perDay < 0 ? 'Want a plan to flip that to positive?' : 'You\'re on track. Move the surplus to savings?' };
  }
  if (/capital|overview|net worth|balance(s)? overview|accounts/.test(t))
    return { kind: 'list', text: `You hold ${money(balance)} across 3 accounts:`, items: [{ title: 'Savings', sub: '$24,558 · 56% of total' }, { title: 'Mastercard', sub: '$13,792 · 31%' }, { title: 'Visa', sub: '$5,710 · 13%' }], follow: 'Want me to move idle cash into savings?' };
  if (/recent|latest|last transactions/.test(t))
    return { kind: 'list', text: 'Your 4 most recent transactions:', items: txns.slice(0, 4).map(x => ({ title: `${x.merchant} · ${fmt(x.amount)}`, sub: `${x.date} · ${x.category}` })), follow: '' };
  if (/where|spend|spent|categor|breakdown|money go/.test(t)) {
    const c = byCategory(txns).slice(0, 4);
    return { kind: 'list', text: 'Your top categories over 90 days:', items: c.map(x => ({ title: x.category, sub: money(x.total) })), follow: 'Want me to set a limit on any of these?' };
  }
  return { kind: 'text', text: 'I can plan your monthly budget, detect unusual transactions, forecast your balance or show where your money goes.', follow: '' };
}
