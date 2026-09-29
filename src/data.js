// 90 days of sample transactions for "Steven", generated from a fixed seed so the demo and tests agree.
// All merchants, amounts and people are illustrative.
export function seeded(seed = 7) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export const ACCOUNTS = [
  { id: 'visa', name: 'Visa', last4: '3625', balance: 5710 },
  { id: 'mc', name: 'Mastercard', last4: '8841', balance: 13792 },
  { id: 'savings', name: 'Savings', last4: '0192', balance: 24558 },
];

export const SUBSCRIPTIONS = [
  { merchant: 'Spotify', amount: 12.98, lastUsedDays: 2 },
  { merchant: 'Netflix', amount: 15.49, lastUsedDays: 4 },
  { merchant: 'PlayStation Plus', amount: 17.99, lastUsedDays: 61 },
  { merchant: 'Headspace', amount: 14.0, lastUsedDays: 48 },
  { merchant: 'iCloud+', amount: 2.99, lastUsedDays: 1 },
];

export function transactions(today = new Date('2026-03-28T12:00:00Z'), days = 90) {
  const r = seeded(11), out = [];
  const day = n => new Date(today.getTime() - n * 864e5).toISOString().slice(0, 10);
  const push = (d, merchant, category, amount, account = 'visa') => out.push({ id: `t${out.length + 1}`, date: day(d), merchant, category, amount: Math.round(amount * 100) / 100, account });
  for (let d = days - 1; d >= 0; d--) {
    const dow = new Date(today.getTime() - d * 864e5).getUTCDay();
    if (r() < 0.62) push(d, ['Chipotle', 'Sweetgreen', 'Blue Bottle', 'Sushi Den', 'Local Bistro'][Math.floor(r() * 5)], 'Dining', 14 + r() * 38, r() < .5 ? 'visa' : 'mc');
    if (dow === 6 && r() < 0.8) push(d, 'Friday Night Out', 'Dining', 70 + r() * 60, 'mc');
    if (r() < 0.22) push(d, ['Amazon', 'Target', 'Uniqlo'][Math.floor(r() * 3)], 'Shopping', 20 + r() * 110, 'mc');
    if (r() < 0.25) push(d, ['Whole Foods', 'Trader Joe\'s'][Math.floor(r() * 2)], 'Groceries', 35 + r() * 70);
    if (r() < 0.12) push(d, 'Uber', 'Transport', 9 + r() * 22);
    if (d % 14 === 3) push(d, 'Acme Corp Payroll', 'Income', 3450, 'savings');
    if (d % 30 === 5) push(d, 'Rent · Parkview Apts', 'Housing', 1850, 'savings');
    for (const s of SUBSCRIPTIONS) if (d % 30 === (s.merchant.length % 27)) push(d, s.merchant, 'Subscriptions', s.amount);
  }
  push(1, 'Liam Harper', 'Transfer in', 280, 'savings');
  push(9, 'ElectroMart Online', 'Shopping', 1249.0, 'visa'); // the unusual one
  return out.map(t => ({ ...t, amount: ['Income', 'Transfer in'].includes(t.category) ? Math.abs(t.amount) : -Math.abs(t.amount) }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
