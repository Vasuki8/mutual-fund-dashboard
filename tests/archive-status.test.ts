import assert from 'node:assert/strict';
import { test } from 'node:test';
import { archiveActivity, nextPlannedUpdate } from '../src/lib/archive-status.ts';
import type { SyncStatus } from '../src/lib/sync-types.ts';

const schedule = { timezone: 'UTC', times: ['05:37', '17:37'] };
function status(overrides: Partial<SyncStatus> = {}): SyncStatus {
  return {
    source: 'mfapi.in', catalogueCount: 37_982, archivedCount: 287,
    observationCount: 1_000_922, historyBacklog: 37_695,
    lastCatalogueSyncAt: '2026-10-22T04:00:00.000Z', latestNavDate: '2026-10-21',
    lastHistorySyncAt: '2026-10-22T04:06:52.000Z',
    lastRun: { id: 'run', status: 'partial', startedAt: '2026-10-22T04:00:00.000Z',
      finishedAt: '2026-10-22T04:06:52.000Z', processed: 287, failed: 0, error: null },
    schedule, warnings: [], ...overrides,
  };
}

test('a closed partial import waits for the next job while saved coverage remains visible', () => {
  assert.deepEqual(archiveActivity(status()), { kind: 'waiting', label: 'Waiting for next scheduled update' });
});

test('an unfinished run reports its saved state without asserting current activity', () => {
  const snapshot = status();
  assert.deepEqual(archiveActivity(status({ lastRun: { ...snapshot.lastRun!, status: 'running', finishedAt: null } })),
    { kind: 'running', label: 'Import last reported as running' });
  for (const lastRunStatus of ['completed', 'partial', 'failed'] as const) {
    assert.notEqual(archiveActivity(status({ lastRun: { ...snapshot.lastRun!, status: lastRunStatus } })).kind, 'running');
  }
  assert.notEqual(archiveActivity(status({ lastRun: null })).kind, 'running');
});

test('a failed run needs attention even when histories were previously saved', () => {
  const snapshot = status();
  assert.deepEqual(archiveActivity(status({ archivedCount: 37_982, historyBacklog: 0,
    lastRun: { ...snapshot.lastRun!, status: 'failed' } })), { kind: 'failed', label: 'Import failed — needs attention' });
});

test('complete coverage is reported only for a nonempty catalogue with no remaining follow-up', () => {
  const snapshot = status();
  const lastRun = { ...snapshot.lastRun!, status: 'completed' as const };
  assert.deepEqual(archiveActivity(status({ archivedCount: 37_982, historyBacklog: 0, lastRun })),
    { kind: 'complete', label: 'All catalogued histories saved' });
  assert.equal(archiveActivity(status({ archivedCount: 37_982, historyBacklog: 1, lastRun })).kind, 'waiting');
  assert.equal(archiveActivity(status({ catalogueCount: 0, archivedCount: 0, historyBacklog: 0, lastRun })).kind, 'waiting');
});

test('a partial run stays labelled as waiting after on-demand histories fill its backlog', () => {
  assert.equal(archiveActivity(status({ archivedCount: 37_982, historyBacklog: 0 })).kind, 'waiting');
});

test('the next planned time advances at each UTC schedule boundary', () => {
  for (const [now, expected] of [
    ['2026-10-22T05:36:59.999Z', '2026-10-22T05:37:00.000Z'],
    ['2026-10-22T05:37:00.000Z', '2026-10-22T17:37:00.000Z'],
    ['2026-10-22T12:00:00.000Z', '2026-10-22T17:37:00.000Z'],
    ['2026-10-22T17:36:59.999Z', '2026-10-22T17:37:00.000Z'],
    ['2026-10-22T17:37:00.000Z', '2026-10-23T05:37:00.000Z'],
  ]) assert.equal(nextPlannedUpdate(schedule, Date.parse(now)), expected, now);
});

test('UTC scheduling crosses the IST date change and year boundary correctly', () => {
  assert.equal(nextPlannedUpdate(schedule, Date.parse('2026-10-22T20:00:00.000Z')), '2026-10-23T05:37:00.000Z');
  assert.equal(nextPlannedUpdate(schedule, Date.parse('2026-12-31T23:59:59.999Z')), '2027-01-01T05:37:00.000Z');
});

test('the next planned update uses the supplied times regardless of their order', () => {
  assert.equal(nextPlannedUpdate({ timezone: 'UTC', times: ['17:37', '01:15'] },
    Date.parse('2026-10-22T00:00:00.000Z')), '2026-10-22T01:15:00.000Z');
});

test('missing or invalid schedule metadata does not produce an invented next time', () => {
  const now = Date.parse('2026-10-22T04:00:00.000Z');
  assert.equal(nextPlannedUpdate(undefined, now), null);
  assert.equal(nextPlannedUpdate({ timezone: 'Asia/Kolkata', times: ['05:37'] }, now), null);
  for (const times of [[], ['25:00'], ['05:60'], ['5:37'], ['05:37', 'invalid']]) {
    assert.equal(nextPlannedUpdate({ timezone: 'UTC', times }, now), null);
  }
  assert.equal(nextPlannedUpdate(schedule, Number.NaN), null);
});
