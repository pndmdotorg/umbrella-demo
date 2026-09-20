export const STORAGE_KEY = 'umbrella-fitness-demo-v1';
export const REFILL_MS = 6 * 60 * 60 * 1000;
export const VIRUSES = [
  { id: '00842', rarity: 'Uncommon', level: 12, durability: 82, art: 0, color: '#cde8bb' },
  { id: '00917', rarity: 'Common', level: 5, durability: 100, art: 1, color: '#f2d0db' },
  { id: '01063', rarity: 'Rare', level: 5, durability: 100, art: 2, color: '#ddd1ef' },
  { id: '01128', rarity: 'Epic', level: 5, durability: 100, art: 3, color: '#f3d5b7' },
];
export function dayKey(time) {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function freshState(now = Date.now()) {
  return { version: 1, selected: 0, pfeNano: 24850000, umb: 12500, energy: 6, nextRefillAt: now + REFILL_MS,
    viruses: VIRUSES.map(v => ({ ...v })), walk: null,
    history: [5280, 2613, 3026, 3439, 3852].map((infected, index) => {
      const date = new Date(now); date.setDate(date.getDate() - [0, 1, 2, 3, 5][index]);
      return { id: `sample-${index}`, endedAt: date.getTime(), infected, seconds: 1200, energy: 2, durability: 12, pfeNano: 2300000, steps: Math.round(infected / 1.1), sample: true };
    }) };
}
const finite = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;
export function restoreState(raw, now = Date.now()) {
  try {
    const s = JSON.parse(raw);
    if (!s || s.version !== 1 || !Number.isInteger(s.selected) || !finite(s.selected, 0, 3) ||
      !Number.isSafeInteger(s.pfeNano) || s.pfeNano < 0 || !finite(s.umb, 0, 1e12) ||
      !finite(s.energy, 0, 6) || !finite(s.nextRefillAt, 0, now + REFILL_MS) ||
      !Array.isArray(s.viruses) || s.viruses.length !== 4 ||
      !s.viruses.every((v, i) => v.id === VIRUSES[i].id && finite(v.durability, 0, 100)) ||
      !Array.isArray(s.history) || s.history.length > 1000 ||
      !s.history.every(h => ['endedAt', 'infected', 'seconds', 'energy', 'durability', 'pfeNano', 'steps'].every(k => finite(h[k], 0, Number.MAX_SAFE_INTEGER)))) return freshState(now);
    s.viruses = s.viruses.map((v, i) => ({ ...VIRUSES[i], durability: v.durability }));
    if (s.walk) {
      const w = s.walk;
      if (!Number.isInteger(w.virus) || !finite(w.virus, 0, 3) || !finite(w.seconds, 0, 1800) || !finite(w.startEnergy, 0, 6) || !finite(w.startDurability, 0, 100) || !finite(w.startedAt, 0, Number.MAX_SAFE_INTEGER)) return freshState(now);
      w.paused = true; // Reloads never silently resume movement.
      w.lastTick = now;
    }
    refill(s, now);
    return s;
  } catch { return freshState(now); }
}
export function refill(s, now) {
  if (s.walk || now < s.nextRefillAt) return;
  const count = Math.floor((now - s.nextRefillAt) / REFILL_MS) + 1;
  s.energy = Math.min(6, s.energy + count * 1.5);
  s.nextRefillAt += count * REFILL_MS;
}
export function startWalk(s, now = Date.now()) {
  refill(s, now);
  if (s.walk || s.energy <= 0 || s.viruses[s.selected].durability <= 0) return false;
  s.walk = { virus: s.selected, startedAt: now, lastTick: now, seconds: 0, startEnergy: s.energy, startDurability: s.viruses[s.selected].durability, paused: false };
  return true;
}
export function tickWalk(s, now = Date.now()) {
  const w = s.walk;
  if (!w) return;
  if (!w.paused) {
    const limit = Math.min(w.startEnergy * 300, w.startDurability * 100);
    w.seconds = Math.min(limit, w.seconds + Math.max(0, now - w.lastTick) / 1000 * 30);
    s.energy = Math.max(0, w.startEnergy - w.seconds / 300);
    s.viruses[w.virus].durability = Math.max(0, w.startDurability - w.seconds / 100);
    if (w.seconds >= limit) w.paused = true;
  }
  w.lastTick = Math.max(w.lastTick, now);
}
export function walkMetrics(w) {
  const steps = Math.floor(w.seconds * 2.4);
  const infected = Math.floor(steps * 1.1);
  return { seconds: w.seconds, steps, infected, energy: w.seconds / 300, durability: w.seconds / 100, pfeNano: infected * 480 };
}
export function finishWalk(s, now = Date.now()) {
  if (!s.walk) return null;
  tickWalk(s, now);
  const result = { ...walkMetrics(s.walk), id: `walk-${s.walk.startedAt}`, endedAt: now, sample: false };
  s.pfeNano += result.pfeNano;
  s.history.unshift(result);
  s.history = s.history.slice(0, 1000);
  s.walk = null;
  refill(s, now);
  return result;
}
