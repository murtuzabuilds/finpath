import { transactions, ACCOUNTS } from './src/data.js';
import { answer, fmt, weeklyCashflow, byCategory, unusedSubscriptions, trim, forecast, unusual } from './src/insights.js';

const $ = id => document.getElementById(id), esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TX = transactions(), BAL = ACCOUNTS.reduce((a, x) => a + x.balance, 0);
const frozen = new Set();

/* ---------- views ---------- */
function show() {
  const v = (location.hash || '#dashboard').slice(1);
  document.querySelectorAll('.view').forEach(s => (s.hidden = s.id !== v));
  document.querySelectorAll('.tabs a').forEach(a => a.classList.toggle('on', a.dataset.v === v));
  window.scrollTo({ top: 0 });
}
addEventListener('hashchange', show);
document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) location.hash = g.dataset.go; });

/* ---------- dashboard ---------- */
const [whole, cents] = BAL.toFixed(2).split('.');
$('total').innerHTML = `$${Number(whole).toLocaleString('en-US')}<span>.${cents}</span>`;
$('bubbles').innerHTML = ACCOUNTS.map((a, i) => `<button type="button" class="bub ${i === 1 ? 'hot' : ''}" data-go="cards"><span><b>$${a.balance.toLocaleString('en-US')}</b><small>${a.name}</small></span></button>`).join('');
const STOCKS = [['a', 'Amazon', '3.3528', '+4.48%'], ['N', 'Nvidia', '2.3221', '+3.12%'], ['A', 'Apple', '0.4221', '-0.28%']];
$('stocks').innerHTML = STOCKS.map((s, i) => `<li class="${i === 1 ? 'hl' : ''}"><span class="ic">${s[0]}</span><span>${s[1]}<small>${s[2]} shares</small></span><span class="${s[3][0] === '+' ? 'up' : 'dn'}">${s[3]}<small>Per month</small></span></li>`).join('');

const weeks = weeklyCashflow(TX);
let series = 'net';
function drawBars() {
  const vals = weeks.map(w => series === 'income' ? w.income : series === 'expense' ? w.expense : Math.max(0, w.income - w.expense));
  const max = Math.max(...vals, 1), hi = vals.indexOf(Math.max(...vals));
  $('bars').innerHTML = vals.map((v, i) => `<div class="bar ${i === hi ? 'hl' : ''}" style="height:${8 + 92 * v / max}%"><em>$${v.toLocaleString('en-US')}</em></div>`).join('');
  $('cashTotal').textContent = fmt(vals.reduce((a, b) => a + b, 0));
}
document.querySelector('.legend').addEventListener('click', e => { const s = e.target.dataset.series; if (!s) return; series = s; document.querySelectorAll('.legend span').forEach(x => x.classList.toggle('on', x.dataset.series === s)); drawBars(); });
drawBars();

const initials = m => m.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const row = t => `<li><span class="ic">${esc(initials(t.merchant))}</span><span>${esc(t.merchant)}<small>${esc(t.category)}</small></span><small>${t.date.slice(8)}.${t.date.slice(5, 7)}.${t.date.slice(2, 4)}</small><b class="${t.amount > 0 ? 'pos' : 'neg'}">${t.amount > 0 ? '+' : ''}${fmt(t.amount)}</b></li>`;
$('tx').innerHTML = TX.slice(0, 5).map(row).join('');

/* ---------- payments ---------- */
$('txAll').innerHTML = TX.slice(0, 60).map(row).join(''); $('txCount').textContent = `${TX.length} in 90 days`;
$('from').innerHTML = ACCOUNTS.map(a => `<option value="${a.id}">${a.name} •••• ${a.last4} · $${a.balance.toLocaleString('en-US')}</option>`).join('');
$('sendForm').addEventListener('submit', e => { e.preventDefault(); const amt = parseFloat($('amt').value) || 0; const acc = ACCOUNTS.find(a => a.id === $('from').value);
  $('sendNote').textContent = amt > acc.balance ? `That's more than your ${acc.name} balance.` : `Ready: ${fmt(amt)} to ${$('to').value} from ${acc.name}. In the real product this is where you'd confirm with Face ID.`; });

/* ---------- analytics ---------- */
const cats = byCategory(TX), total = cats.reduce((a, c) => a + c.total, 0), COLORS = ['#D7FF67', '#FCFCFC', '#9BBF3A', '#6B6B6B', '#3F4F12', '#B8B8B8'];
let a0 = -Math.PI / 2;
$('donut').innerHTML = cats.map((c, i) => { const a1 = a0 + 2 * Math.PI * c.total / total, large = a1 - a0 > Math.PI ? 1 : 0, r = 80, R = (x, y) => `${100 + r * Math.cos(x)} ${100 + r * Math.sin(x)}`;
  const p = `<path d="M ${R(a0)} A ${r} ${r} 0 ${large} 1 ${R(a1)}" fill="none" stroke="${COLORS[i % 6]}" stroke-width="26"/>`; a0 = a1 + .02; return p; }).join('') + `<text x="100" y="96" text-anchor="middle" fill="#8C8C8C" font-size="11">spent</text><text x="100" y="116" text-anchor="middle" fill="#FCFCFC" font-size="18" font-weight="600">$${total.toLocaleString('en-US')}</text>`;
$('cats').innerHTML = cats.map((c, i) => `<li><span><i style="background:${COLORS[i % 6]}"></i>${c.category}</span><b>$${c.total.toLocaleString('en-US')}</b></li>`).join('');
const subs = unusedSubscriptions(), din = trim(TX), f = forecast(BAL, TX), odd = unusual(TX);
$('health').innerHTML = [
  [`$${subs.saving}/mo`, `in subscriptions you haven't opened in 30+ days (${subs.unused.map(s => s.merchant).join(', ')})`],
  [`~$${din.saving}/mo`, `if dining out drops 25% from about $${din.perMonth}/month`],
  [`$${f.projected.toLocaleString('en-US')}`, `projected balance in 30 days at your current pace`],
  [`${odd.length}`, `transaction${odd.length === 1 ? '' : 's'} flagged as unusual this quarter`],
].map(([b, s]) => `<li><b>${b}</b><small>${esc(s)}</small></li>`).join('');

/* ---------- cards ---------- */
function drawCards() {
  $('cardrow').innerHTML = ACCOUNTS.map((a, i) => `<div class="ccard ${i === 1 ? 'lime' : ''} ${frozen.has(a.id) ? 'frozen' : ''}"><div class="row"><span>${a.name}</span><span>◈</span></div><b>$${a.balance.toLocaleString('en-US')}</b><div class="row"><span class="num">•••• ${a.last4}</span><button type="button" data-freeze="${a.id}">${frozen.has(a.id) ? 'Unfreeze' : 'Freeze'}</button></div></div>`).join('');
}
$('cardrow').addEventListener('click', e => { const id = e.target.dataset.freeze; if (!id) return; frozen.has(id) ? frozen.delete(id) : frozen.add(id); drawCards(); });
drawCards();

/* ---------- AI Finpath ---------- */
function ask(q) {
  if (!q.trim()) return;
  if (location.hash !== '#ai') location.hash = 'ai';
  const r = answer(q, { txns: TX, balance: BAL });
  const me = document.createElement('li'); me.className = 'me'; me.textContent = q; $('chat').append(me);
  const bot = document.createElement('li'); bot.className = 'bot';
  bot.innerHTML = `<p style="margin:0">${esc(r.text)}</p>${r.items?.length ? `<ul>${r.items.map((it, i) => `<li><i>${r.kind === 'wins' ? ['♛', '◉'][i] || '•' : '•'}</i><span>${esc(it.title)}<small>${esc(it.sub).replace(/(\$[\d,]+\/month|~\$[\d,]+\/month)/g, '<b>$1</b>')}</small></span></li>`).join('')}</ul>` : ''}${r.follow ? `<p class="follow">${esc(r.follow)}</p><div class="acts"><button type="button" data-yes>Yes, do it</button><button type="button" data-ask-more>Not now</button></div>` : ''}`;
  setTimeout(() => { $('chat').append(bot); bot.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, 350);
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-ask] button'); if (c) ask(c.textContent.replace(/^[▣↻⚠↗]/, '').trim());
  if (e.target.matches('[data-yes]')) { const li = document.createElement('li'); li.className = 'bot'; li.textContent = 'Done in the prototype: I drafted the cancellations and a dining budget. In the real product you would approve each change before anything moves.'; $('chat').append(li); e.target.parentElement.remove(); }
  if (e.target.matches('[data-ask-more]')) e.target.parentElement.remove();
});
document.querySelectorAll('[data-askform]').forEach(f => f.addEventListener('submit', e => { e.preventDefault(); const i = f.querySelector('input'); ask(i.value); i.value = ''; }));
show();
