import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transactions, ACCOUNTS } from '../src/data.js';
import { unusedSubscriptions, trim, unusual, forecast, answer, byCategory } from '../src/insights.js';

const tx = transactions(), balance = ACCOUNTS.reduce((a, x) => a + x.balance, 0);

test('total balance matches the design', () => assert.equal(balance, 44060));
test('two unused subscriptions worth about $32 a month', () => {
  const s = unusedSubscriptions();
  assert.equal(s.unused.length, 2); assert.equal(s.saving, 32);
});
test('trimming dining by 25% is worth roughly $250 a month', () => {
  const d = trim(tx); assert.ok(d.saving >= 200 && d.saving <= 300, `got ${d.saving}`);
});
test('the ElectroMart purchase is flagged as unusual', () => {
  assert.deepEqual(unusual(tx).map(t => t.merchant), ['ElectroMart Online']);
});
test('forecast is a number near the current balance', () => {
  const f = forecast(balance, tx); assert.ok(Math.abs(f.projected - balance) < 5000);
});
test('assistant routes questions to the right analysis', () => {
  assert.equal(answer('Capital overview', { txns: tx, balance }).items.length, 3);
  assert.equal(answer('Anything I should fix?', { txns: tx, balance }).kind, 'wins');
  assert.equal(answer('Detect unusual transactions', { txns: tx, balance }).kind, 'list');
  assert.match(answer('forecast my balance', { txns: tx, balance }).text, /in 30 days/);
  assert.deepEqual(byCategory(tx).slice(0, 2).map(c => c.category), ['Housing', 'Dining']);
});
