import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, restoreState, startWalk, tickWalk, finishWalk, refill, REFILL_MS, walkMetrics } from '../fitness-state.mjs';

const now = 1800000000000;
test('walk settles exactly once and consumes bounded energy and durability', () => {
  const s = freshState(now);
  assert.equal(startWalk(s, now), true);
  assert.equal(startWalk(s, now), false);
  tickWalk(s, now + 10000);
  assert.equal(s.walk.seconds, 300);
  assert.equal(s.energy, 5);
  assert.equal(s.viruses[0].durability, 79);
  const result = finishWalk(s, now + 10000);
  assert.equal(s.pfeNano, 24850000 + result.pfeNano);
  assert.equal(s.history.length, 6);
  assert.equal(finishWalk(s, now + 10000), null);
  assert.equal(s.pfeNano, 24850000 + result.pfeNano);
});
test('pause and reload cannot accumulate rewards while away', () => {
  const s = freshState(now);
  startWalk(s, now);
  tickWalk(s, now + 1000);
  s.walk.paused = true;
  tickWalk(s, now + 100000);
  assert.equal(s.walk.seconds, 30);
  const restored = restoreState(JSON.stringify(s), now + 200000);
  assert.equal(restored.walk.paused, true);
  tickWalk(restored, now + 300000);
  assert.equal(restored.walk.seconds, 30);
  assert.equal(restored.selected, s.selected);
  assert.equal(restored.energy, s.energy);
});
test('a walk ends at energy or durability exhaustion', () => {
  for (const [energy, durability, seconds] of [[0.1, 82, 30], [6, 0.1, 10]]) {
    const s = freshState(now); s.energy = energy; s.viruses[0].durability = durability;
    startWalk(s, now); tickWalk(s, now + 1000000);
    assert.equal(s.walk.seconds, seconds);
    assert.equal(s.walk.paused, true);
    assert.ok(s.energy >= 0);
    assert.ok(s.viruses[0].durability >= 0);
    const metrics = walkMetrics(s.walk);
    tickWalk(s, now + 2000000);
    assert.deepEqual(walkMetrics(s.walk), metrics);
  }
});
test('empty energy and broken Virus cannot start', () => {
  const s = freshState(now); s.energy = 0;
  assert.equal(startWalk(s, now), false);
  s.energy = 6; s.viruses[0].durability = 0;
  assert.equal(startWalk(s, now), false);
});
test('six-hour refills catch up and stay capped', () => {
  const s = freshState(now); s.energy = 0;
  refill(s, now + REFILL_MS - 1); assert.equal(s.energy, 0);
  refill(s, now + REFILL_MS); assert.equal(s.energy, 1.5);
  refill(s, now + REFILL_MS * 12); assert.equal(s.energy, 6);
  assert.equal(s.nextRefillAt, now + REFILL_MS * 13);
});
test('bad saved data falls back to a valid account', () => {
  for (const raw of [null, '{', '{}', JSON.stringify({...freshState(now), selected: 9}), JSON.stringify({...freshState(now), history: [{}]})]) {
    assert.deepEqual(restoreState(raw, now), freshState(now));
  }
});
test('clock rollback never reduces walk duration', () => {
  const s = freshState(now); startWalk(s, now); tickWalk(s, now + 1000); tickWalk(s, now - 1000);
  assert.equal(s.walk.seconds, 30);
  tickWalk(s, now + 2000);
  assert.equal(s.walk.seconds, 60);
});
