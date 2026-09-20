import { STORAGE_KEY, VIRUSES, freshState, restoreState, dayKey, refill, startWalk, tickWalk, walkMetrics, finishWalk } from './fitness-state.mjs';

const $ = selector => document.querySelector(selector);
const paths = {
  home: '<ellipse cx="8" cy="8" rx="3" ry="5" transform="rotate(-20 8 8)"/><path d="M7 15c-3 0-3 5 0 5s3-5 0-5"/><ellipse cx="17" cy="13" rx="3" ry="5" transform="rotate(20 17 13)"/><path d="M17 3c-3 0-3 4 0 4s3-4 0-4"/>',
  viruses: '<path d="M8 3c0 7 8 11 8 18M16 3C16 10 8 14 8 21M8 4h8M7 9h10M7 15h10M8 20h8"/>',
  stats: '<path d="M2 13h5l3-10 4 18 3-8h5"/>',
  market: '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 5V3h8v2M8 9c0 5 8 5 8 0"/>',
  wallet: '<path d="M19 8V4H6a3 3 0 0 0 0 6h14v10H6a3 3 0 0 1-3-3V7M20 13h-5v4h5"/>',
  energy: '<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
  back: '<path d="m14 5-7 7 7 7"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m8 4 12 8-12 8z"/>',
  finish: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.viruses}</svg>`;
const number = value => Math.round(value).toLocaleString('en-US');
const pfe = nano => (nano / 1e9).toFixed(9);
const clock = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const descriptions = ['Lime green 3D virus with trumpet spikes', 'Bright pink 3D virus with round bumps', 'Purple 3D virus with long trumpet spikes', 'Orange faceted 3D virus with red lobes'];
const art = v => `<span class="virus-art art-${v.art}" role="img" aria-label="${descriptions[v.art]}"></span>`;
let storageAvailable = true;
let state;
try { state = restoreState(localStorage.getItem(STORAGE_KEY)); } catch { state = freshState(); storageAvailable = false; }
let page = 'home';
let collectionTab = 'Viruses';
let rarity = 'All rarities';
let toastTimer;
let lastResult = null;
let dialogReturnFocus = null;
const main = $('#main');
const dialog = $('#dialog');
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { if (storageAvailable) toast('Storage is unavailable. Progress lasts only for this visit.'); storageAvailable = false; }
}
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4500); }
function openDialog(title, content) {
  dialogReturnFocus = document.activeElement;
  $('#dialog-title').textContent = title;
  $('#dialog-content').innerHTML = content;
  if (!dialog.open) dialog.showModal();
}
function closeDialog() { dialog.close(); if (dialogReturnFocus?.isConnected) dialogReturnFocus.focus(); }
function balance() { $('#pfe-balance').textContent = pfe(state.pfeNano); $('#umb-balance').textContent = number(state.umb); }
function todayInfected() { return state.history.filter(h => dayKey(h.endedAt) === dayKey(Date.now())).reduce((sum, h) => sum + h.infected, 0); }
function card(v, controls = false) {
  return `<div class="virus-card" style="--rarity:${v.color}"><div class="rarity">${v.rarity.toUpperCase()}</div>${controls ? '<button class="carousel-arrow prev" data-action="previous" aria-label="Previous Virus">‹</button>' : ''}<button class="art-button" data-action="detail" data-index="${state.viruses.findIndex(x => x.id === v.id)}" aria-label="Open selected Virus details">${art(v)}</button>${controls ? '<button class="carousel-arrow next" data-action="next" aria-label="Next Virus">›</button>' : ''}<div class="pills"><span class="pill"># ${v.id}</span><span class="pill durability">◈ ${Math.round(v.durability)} / 100</span><span class="pill">LV ${v.level}</span></div></div>`;
}
function home() {
  const v = state.viruses[state.selected];
  return `<div class="section-label"><span class="eyebrow">YOUR DAILY DOSE OF MOVEMENT</span><span class="arrow" aria-hidden="true">↗</span></div>${card(v, true)}<section class="impact" aria-label="Today's impact"><div class="eyebrow">TODAY'S IMPACT</div><div class="number">${number(todayInfected())}</div><div class="infected">INFECTED</div><p class="caption">Small steps. A bigger outbreak.</p></section><section aria-label="Energy"><div class="energy-label"><span>${icon('energy')} ENERGY</span><span><b id="energy-value">${state.energy.toFixed(2)}</b> / 6.00</span></div><div class="energy-track" role="meter" aria-label="Energy" aria-valuemin="0" aria-valuemax="6" aria-valuenow="${state.energy.toFixed(2)}"><span class="energy-fill" style="width:${state.energy / 6 * 100}%"></span></div><div class="refill"><span id="refill-countdown">${refillLabel()}</span><br>+25% every 6 hours</div></section><button class="primary start-button" data-action="start-choice" ${!state.walk && (state.energy <= 0 || v.durability <= 0) ? 'disabled' : ''}>${state.walk ? 'RESUME WALK' : 'START'}</button><button class="text-button" data-action="start-demo" ${!state.walk && (state.energy <= 0 || v.durability <= 0) ? 'disabled' : ''}>Demo Walk · 30× speed · No GPS needed</button>${state.energy <= 0 ? '<p class="footer-note">Your energy is depleted. It will refill automatically.</p>' : ''}`;
}
function refillLabel() { const minutes = Math.max(0, Math.ceil((state.nextRefillAt - Date.now()) / 60000)); return `Refill in ${Math.floor(minutes / 60)}h ${minutes % 60}m`; }
function options() { return ['All rarities', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'].map(r => `<option ${r === rarity ? 'selected' : ''}>${r}</option>`).join(''); }
function collection() {
  const tabs = ['Viruses', 'Badges', 'Capsules'].map(t => `<button class="tab ${collectionTab === t ? 'active' : ''}" data-action="collection-tab" data-tab="${t}" role="tab" aria-selected="${collectionTab === t}">${t}</button>`).join('');
  if (collectionTab !== 'Viruses') return `<h1 class="page-heading">Your collection</h1><div class="tabs" role="tablist" aria-label="Collection type">${tabs}</div><div class="empty">${icon('viruses')}<h2>No ${collectionTab.toLowerCase()} yet</h2><p>${collectionTab === 'Capsules' ? 'Capsule minting and opening will arrive in the next phase.' : 'Badges and achievement rules will arrive in the next phase.'}</p></div>`;
  const items = state.viruses.map((v, i) => ({ v, i })).filter(({ v }) => rarity === 'All rarities' || v.rarity === rarity);
  return `<h1 class="page-heading">Your collection</h1><div class="tabs" role="tablist" aria-label="Collection type">${tabs}</div><div class="filters"><select id="rarity-filter" aria-label="Filter rarity">${options()}</select></div><div class="section-label"><span class="eyebrow">YOUR COLLECTION</span><span class="eyebrow">${items.length} VIRUSES</span></div><div class="grid">${items.map(({v, i}) => `<button class="collection-card ${i === state.selected ? 'selected' : ''}" data-action="detail" data-index="${i}"><span class="rarity-label">${v.rarity.toUpperCase()}</span>${i === state.selected ? '<span class="active-label">ACTIVE</span>' : ''}${art(v)}<div class="meta"><span># ${v.id}</span><span>LV ${v.level}</span></div><div class="caption">Mint 0/7 <span style="float:right">${Math.round(v.durability)} / 100</span></div><div class="energy-track"><span class="energy-fill" style="width:${v.durability}%"></span></div><div class="attributes"><span>◈ 24</span><span>✳ 32</span><span>✧ 16</span><span>⛨ 20</span></div></button>`).join('')}</div>${items.length === 0 ? '<p class="empty">No Viruses match this rarity.</p>' : ''}`;
}
function stats() {
  const days = Array.from({ length: 7 }, (_, i) => { const date = new Date(); date.setDate(date.getDate() - 6 + i); return { date, rows: state.history.filter(h => dayKey(h.endedAt) === dayKey(date)) }; });
  const week = days.flatMap(d => d.rows);
  const total = key => week.reduce((sum, h) => sum + h[key], 0);
  const max = Math.max(1, ...days.map(d => d.rows.reduce((sum, h) => sum + h.infected, 0)));
  let streak = 0;
  for (let i = days.length - 1; i >= 0 && days[i].rows.length; i--) streak++;
  return `<h1 class="page-heading">Your footprint</h1><section class="stats-hero"><div class="eyebrow">INFECTED TODAY</div><div class="number">${number(todayInfected())}</div><p class="caption">Every step starts something.</p></section><div class="stats-grid">${stat('THIS WEEK', number(total('infected')))}${stat('PFE EARNED', pfe(total('pfeNano')))}${stat('ENERGY USED', total('energy').toFixed(2))}${stat('ACTIVITY STREAK', `${streak} days`)}</div><h2 class="subheading">Your week <span class="eyebrow" style="float:right">INFECTED</span></h2><div class="chart" role="img" aria-label="Infected in the last seven days: ${days.map(d => `${d.date.toLocaleDateString('en-US', {weekday:'short'})}: ${d.rows.reduce((s,h)=>s+h.infected,0)}`).join(', ')}">${days.map(d => { const n = d.rows.reduce((s,h) => s+h.infected, 0); return `<div class="bar-column"><span>${n ? number(n) : '—'}</span><i style="height:${n / max * 80}px"></i><span>${d.date.toLocaleDateString('en-US', {weekday:'short'}).slice(0,1)}</span></div>`; }).join('')}</div><h2 class="subheading">Session history</h2>${state.history.slice(0, 20).map((h, i) => `<button class="history-row" data-action="history" data-index="${i}"><span>${h.sample ? 'Cedar Park walk' : 'Demo walk'}<small>${new Date(h.endedAt).toLocaleDateString('en-US', {month:'short', day:'numeric'})} · ${clock(h.seconds)}${h.sample ? ' · sample' : ''}</small></span><span><b>${number(h.infected)}</b><small>infected</small></span></button>`).join('')}<p class="footer-note">Sample sessions and simulated activity. No live GPS data.</p>`;
}
function stat(label, value) { return `<div class="stat"><span class="eyebrow">${label}</span><span class="value">${value}</span></div>`; }
function market() {
  return `<div class="page-heading-row"><h1 class="page-heading">The exchange</h1><span class="badge">PREVIEW</span></div><p class="notice">A preview of the reference marketplace. Buying, selling and Capsule trading are not available in this phase.</p><div class="section-label"><span class="eyebrow">CURATED FOR YOUR NEXT MOVE</span></div><div class="grid">${['Common','Uncommon','Rare','Epic','Legendary','Common'].map((r, i) => `<button class="collection-card" data-action="listing" data-index="${i}"><span class="rarity-label">${r.toUpperCase()}</span>${art(VIRUSES[i % 4])}<div class="meta">${r} Virus</div><p class="caption"># ${String(i+1).padStart(5,'0')} · Lv 5</p><div class="price">◆ ${number(1000 + i * 450)}</div><span class="preview-tag">View preview ↗</span></button>`).join('')}</div><h2 class="subheading">Your listings</h2><p class="empty">Your shelf is empty.<br>Listing collectibles will be available in the next phase.</p>`;
}
function detail(index) {
  const v = state.viruses[index];
  if (!v) return home();
  return `<div class="back-heading"><button class="icon-button" data-action="back" aria-label="Go back">${icon('back')}</button><h1 class="page-heading">Virus lab</h1></div>${card(v)}<p class="caption" style="text-align:center">${v.rarity} · Mint 0/7 · 4–10 km/h</p><div class="detail-attributes" style="margin-top:20px">${['Efficiency','Infectivity','Luck','Resilience'].map((name, i) => `<div class="stat"><span>${name}</span><b>${[24,32,16,20][i]}</b></div>`).join('')}</div><button class="primary" data-action="equip" data-index="${index}" ${state.selected === index || state.walk ? 'disabled' : ''}>${state.selected === index ? 'Equipped' : state.walk ? 'Finish your walk to equip' : 'Equip Virus'}</button><p class="notice">Repair, leveling, attribute allocation and minting are planned for the next phase. These demo attributes are illustrative.</p>`;
}
function walking() {
  return `<section class="walk-surface" aria-label="Demo walk"><div class="walk-header"><button class="icon-button" data-action="walk-home" aria-label="Back to Home">${icon('back')}</button><span><i class="live-dot"></i><span id="walk-status">Infecting</span></span><span class="badge">DEMO GPS ▥</span></div><div class="walk-bars"><div><div class="eyebrow">ENERGY</div><strong id="walk-energy"></strong><div class="energy-track"><span id="walk-energy-fill" class="energy-fill"></span></div></div><div><div class="eyebrow">DURABILITY</div><strong id="walk-durability"></strong><div class="energy-track"><span id="walk-durability-fill" class="energy-fill"></span></div></div></div><div class="walk-metrics"><div><strong id="walk-time"></strong><small>TIME</small></div><div><strong>7.2 <span style="font-size:10px">km/h</span></strong><small>SIMULATED SPEED</small></div><div><strong id="walk-steps"></strong><small>STEPS</small></div></div><div class="zone"><div class="zone-line"></div>IN THE ZONE · 4–10 km/h</div><div class="walk-impact"><div class="eyebrow">LEAVE YOUR MARK</div><div id="walk-infected" class="number"></div><div class="infected">Infected</div></div><div class="walk-reward">◉ +<span id="walk-pfe"></span> <small>PFE</small></div><div class="walk-footer"><div class="eyebrow">DEMO WALK · 30× TIME</div><p class="caption">A little movement goes a long way.</p><div class="walk-actions"><button data-action="pause" id="pause-button" aria-label="Pause walk"><span class="round">${icon('pause')}</span><span>PAUSE</span></button><button data-action="finish-choice" aria-label="Finish walk"><span class="round">${icon('finish')}</span><span>FINISH</span></button></div><p class="footer-note" style="color:#35532e">Simulated movement and provisional demo rewards.</p></div></section>`;
}
function updateWalk() {
  if (!state.walk || page !== 'walk') return;
  const w = state.walk, m = walkMetrics(w), durability = state.viruses[w.virus].durability;
  $('#walk-status').textContent = w.paused ? 'Paused' : 'Infecting';
  $('#walk-energy').textContent = `${state.energy.toFixed(2)} / 6`;
  $('#walk-durability').textContent = `${durability.toFixed(1)} / 100`;
  $('#walk-energy-fill').style.width = `${state.energy / 6 * 100}%`;
  $('#walk-durability-fill').style.width = `${durability}%`;
  $('#walk-time').textContent = clock(w.seconds);
  $('#walk-steps').textContent = number(m.steps);
  $('#walk-infected').textContent = number(m.infected);
  $('#walk-pfe').textContent = pfe(m.pfeNano);
  const pause = $('#pause-button');
  pause.setAttribute('aria-label', w.paused ? 'Resume walk' : 'Pause walk');
  pause.innerHTML = `<span class="round">${icon(w.paused ? 'play' : 'pause')}</span><span>${w.paused ? 'RESUME' : 'PAUSE'}</span>`;
  pause.disabled = state.energy <= 0 || durability <= 0;
}
function result(h) {
  if (!h) return home();
  return `<div class="back-heading"><button class="icon-button" data-action="home" aria-label="Go back">${icon('back')}</button><h1 class="page-heading">Walk complete</h1></div><div class="result-heading"><div class="eyebrow">ONE WALK. A BIGGER WORLD.</div><div class="result-number">${number(h.infected)}</div><p class="caption">Infected</p></div><div class="result-reward">+ ${pfe(h.pfeNano)} PFE<p class="caption">${h.sample ? 'Sample session' : 'Settled to your demo wallet'}</p></div><div class="stats-grid">${stat('DURATION', clock(h.seconds))}${stat('ENERGY USED', h.energy.toFixed(3))}${stat('DURABILITY LOST', h.durability.toFixed(2))}${stat('ESTIMATED STEPS', number(h.steps))}</div><button class="primary" data-action="wallet">View wallet</button><button class="secondary" data-action="detail" data-index="${state.selected}">Care for your Virus</button><button class="text-button" data-action="home">Back to Home</button>`;
}
function render(focus = false) {
  const isWalk = page === 'walk' && !!state.walk;
  if (page === 'walk' && !state.walk) page = 'home';
  $('#app').classList.toggle('walking', isWalk);
  const active = page.startsWith('detail') ? 'viruses' : page === 'result' ? 'stats' : page;
  $('.navigation').innerHTML = ['home', 'viruses', 'stats', 'market'].map(name => `<a class="nav-link" href="#${name}" ${active === name ? 'aria-current="page"' : ''}>${icon(name)}<span>${name[0].toUpperCase()+name.slice(1)}</span></a>`).join('');
  balance();
  main.innerHTML = page === 'home' ? home() : page === 'viruses' ? collection() : page === 'stats' ? stats() : page === 'market' ? market() : page.startsWith('detail-') ? detail(Number(page.split('-')[1])) : page === 'walk' ? walking() : result(lastResult);
  if (isWalk) updateWalk();
  if (focus) { main.focus({preventScroll:true}); window.scrollTo(0,0); }
}
function navigate(destination) {
  if (location.hash === `#${destination}`) { page = destination; render(true); }
  else location.hash = destination;
}
function route() {
  const requested = location.hash.slice(1);
  if (page === 'walk' && requested !== 'walk' && state.walk) { tickWalk(state); state.walk.paused = true; save(); }
  page = /^(home|viruses|stats|market|walk|result|detail-[0-3])$/.test(requested) ? requested : 'home';
  if (page === 'result' && !lastResult) page = 'home';
  render(true);
}
function beginDemo() {
  if (state.walk) { closeDialog(); navigate('walk'); return; }
  if (!startWalk(state)) { toast('Your Virus needs energy and durability to walk.'); return; }
  save(); closeDialog(); navigate('walk');
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action, index = Number(button.dataset.index);
  if (action === 'close-dialog') closeDialog();
  else if (action === 'home') navigate('home');
  else if (action === 'back') navigate('viruses');
  else if (action === 'detail') navigate(`detail-${index}`);
  else if (action === 'previous' || action === 'next') {
    if (state.walk) { toast('Finish your current walk before switching Viruses.'); return; }
    state.selected = (state.selected + (action === 'next' ? 1 : 3)) % 4; save(); render();
    main.querySelector(`[data-action="${action}"]`)?.focus();
  }
  else if (action === 'equip') { state.selected = index; save(); render(); toast('Virus equipped. Ready for your next move.'); }
  else if (action === 'collection-tab') { collectionTab = button.dataset.tab; render(); main.querySelector(`[data-tab="${collectionTab}"]`)?.focus(); }
  else if (action === 'about') openDialog('A little movement. A bigger world.', '<p>This is a local fitness prototype inspired by the reference UMBRELLA app. Balances, Viruses and walking activity are simulated.</p><p>Demo walks run at 30× speed. Progress is stored in this browser. GPS tracking, trading, minting and real rewards are not connected.</p><button class="secondary" data-action="reset-choice">Reset fitness demo</button><div class="dialog-links"><a href="./umbrella.html">Open the original staking demo ↗</a></div>');
  else if (action === 'wallet') openDialog('Your wallet', `<span class="badge">SIMULATED BALANCES</span><div class="balance-row"><span>◉ PFE</span><b>${pfe(state.pfeNano)}</b></div><div class="balance-row"><span>◆ UMB</span><b>${number(state.umb)}</b></div><p>Demo walk rewards appear here. These balances have no monetary value. Deposits, withdrawals and wallet connection are not available.</p>`);
  else if (action === 'reset-choice') openDialog('Reset fitness demo?', '<p>This clears fitness activity in this browser and restores the sample account. The original staking demo has separate storage.</p><button class="primary" data-action="reset">Reset demo</button><button class="secondary" data-action="close-dialog">Cancel</button>');
  else if (action === 'reset') { state = freshState(); lastResult = null; save(); closeDialog(); navigate('home'); toast('Fitness demo reset.'); }
  else if (action === 'start-choice') {
    if (state.walk) navigate('walk');
    else openDialog('Ready to move?', '<p>Try the complete walking flow with simulated movement. Live GPS tracking is planned for a later phase.</p><button class="primary" data-action="start-demo">Start demo walk</button><p class="footer-note">30× speed · No location permission needed</p>');
  }
  else if (action === 'start-demo') beginDemo();
  else if (action === 'pause') { tickWalk(state); state.walk.paused = !state.walk.paused; state.walk.lastTick = Date.now(); save(); updateWalk(); }
  else if (action === 'walk-home') { tickWalk(state); state.walk.paused = true; save(); navigate('home'); }
  else if (action === 'finish-choice') { tickWalk(state); state.walk.paused = true; save(); updateWalk(); openDialog('Finish your walk?', '<p>Your earned PFE will be added to your demo wallet. Energy and durability already reflect this walk.</p><div class="balance-row"><span>No fee</span><b>FREE</b></div><button class="primary" data-action="finish">Finish & collect</button><button class="secondary" data-action="close-dialog">Keep paused</button>'); }
  else if (action === 'finish') { lastResult = finishWalk(state); save(); closeDialog(); navigate('result'); toast('Done. Your demo account is updated.'); }
  else if (action === 'history') { lastResult = state.history[index]; navigate('result'); }
  else if (action === 'listing') { const r = ['Common','Uncommon','Rare','Epic','Legendary','Common'][index]; openDialog(`${r} Virus`, `${art(VIRUSES[index % 4])}<div class="balance-row"><span># ${String(index+1).padStart(5,'0')} · Lv 5</span><b>◆ ${number(1000+index*450)}</b></div><p>This is a visual preview. Purchasing and selling will be added after the marketplace rules are specified.</p><button class="secondary" disabled>Trading coming in the next phase</button>`); }
});
document.addEventListener('change', event => { if (event.target.id === 'rarity-filter') { rarity = event.target.value; render(); $('#rarity-filter')?.focus(); } });
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDialog(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden && state.walk) { tickWalk(state); state.walk.paused = true; save(); updateWalk(); } });
window.addEventListener('pagehide', () => { if (state.walk) { tickWalk(state); state.walk.paused = true; } save(); });
window.addEventListener('hashchange', route);
$('#wallet-icon').innerHTML = icon('wallet');
route();
if (!storageAvailable) toast('Storage is unavailable. Progress lasts only for this visit.');
setInterval(() => {
  if (state.walk) { const wasActive = !state.walk.paused; tickWalk(state); updateWalk(); if (wasActive) save(); }
  else { const previous = state.energy; refill(state, Date.now()); if (state.energy !== previous) { save(); if (page === 'home') render(); } }
  if (page === 'home' && $('#refill-countdown')) $('#refill-countdown').textContent = refillLabel();
}, 500);
