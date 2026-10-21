import assert from 'node:assert/strict';
import { test } from 'node:test';
import { archiveActivity, initialImportSummary, nextPlannedUpdate, validBackfillStatus } from '../src/lib/archive-status.ts';
import type { SyncStatus } from '../src/lib/sync-types.ts';

const schedule = { timezone: 'UTC', times: ['05:37', '17:37'] };
const hourlySchedule = { timezone: 'UTC', times: Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:37`) };
function backfill(overrides = {}) {
  return { active: true, attemptedCount: 317, unattemptedCount: 37_665, retryPendingCount: 15,
    exhaustedCount: 5, unresolvedSavedCount: 10, remainingCount: 37_680, maxAttempts: 3,
    startedAt: '2026-10-22T04:00:00.000Z', completedAt: null, ...overrides };
}
function importing(overrides = {}, state = backfill()): SyncStatus {
  return { ...status({ archivedCount: 297, ...overrides }), backfill: state } as SyncStatus;
}
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

test('an active initial import with a closed run waits for the next hourly batch', () => {
  assert.deepEqual(archiveActivity(importing()), { kind: 'waiting', label: 'Waiting for next hourly import batch' });
  const snapshot = importing();
  assert.equal(archiveActivity(importing({ lastRun: { ...snapshot.lastRun!, status: 'running', finishedAt: null } })).label,
    'Import last reported as running');
});

test('hourly import times advance at :37 and across midnight', () => {
  for (const [now, expected] of [
    ['2026-10-22T04:36:59.999Z', '2026-10-22T04:37:00.000Z'],
    ['2026-10-22T04:37:00.000Z', '2026-10-22T05:37:00.000Z'],
    ['2026-10-22T23:37:00.000Z', '2026-10-23T00:37:00.000Z'],
    ['2026-12-31T23:59:59.999Z', '2027-01-01T00:37:00.000Z'],
  ]) assert.equal(nextPlannedUpdate(hourlySchedule, Date.parse(now)), expected, now);
});

test('legacy responses omit the initial-import section and remain valid', () => {
  assert.equal(validBackfillStatus(status()), true);
  assert.equal(initialImportSummary(status()), null);
});

test('initial import counts separate checks, retries, unavailable histories, and saved quality gaps', () => {
  const snapshot = importing();
  assert.equal(validBackfillStatus(snapshot), true);
  assert.deepEqual(initialImportSummary(snapshot), {
    label: 'First pass incomplete', checked: 317, total: 37_982,
    awaiting: 37_665, retrying: 15, unavailable: 5, needsReview: 10,
  });
});

test('a finished first pass with retryable failures is not reported as a finished import', () => {
  const snapshot = importing({ catalogueCount: 100, archivedCount: 90, historyBacklog: 13 },
    backfill({ attemptedCount: 100, unattemptedCount: 0, retryPendingCount: 7, exhaustedCount: 3,
      unresolvedSavedCount: 3, remainingCount: 7 }));
  assert.equal(validBackfillStatus(snapshot), true);
  assert.equal(initialImportSummary(snapshot)?.label, 'First pass finished — retries pending');
  assert.equal(archiveActivity(snapshot).kind, 'waiting');
});

test('completion with unavailable or unresolved saved histories stays visible without claiming complete coverage', () => {
  const snapshot = importing({ catalogueCount: 100, archivedCount: 95, historyBacklog: 8 },
    backfill({ active: false, attemptedCount: 100, unattemptedCount: 0, retryPendingCount: 0,
      exhaustedCount: 5, unresolvedSavedCount: 3, remainingCount: 0, completedAt: '2026-10-22T10:00:00.000Z' }));
  assert.equal(validBackfillStatus(snapshot), true);
  assert.equal(initialImportSummary(snapshot)?.label, 'Initial import finished with gaps');
  assert.notEqual(archiveActivity(snapshot).kind, 'complete');
  assert.equal(snapshot.archivedCount, 95);
});

test('an initial import reports completion only after its completion timestamp is recorded', () => {
  const done = backfill({ active: false, attemptedCount: 100, unattemptedCount: 0,
    retryPendingCount: 0, exhaustedCount: 0, unresolvedSavedCount: 0, remainingCount: 0,
    completedAt: '2026-10-22T10:00:00.000Z' });
  const snapshot = importing({ catalogueCount: 100, archivedCount: 100, historyBacklog: 0 }, done);
  assert.equal(validBackfillStatus(snapshot), true);
  assert.equal(initialImportSummary(snapshot)?.label, 'Initial import finished');
  assert.equal(initialImportSummary(importing({ catalogueCount: 100, archivedCount: 100, historyBacklog: 0 },
    { ...done, active: true, completedAt: null }))?.label, 'Initial import awaiting completion check');
});

test('malformed or inconsistent optional import counters cannot reach the display', () => {
  for (const invalid of [null, [], {}, backfill({ active: 'yes' }), backfill({ maxAttempts: 4 }),
    backfill({ attemptedCount: -1 }), backfill({ attemptedCount: 317.5 }), backfill({ attemptedCount: '317' }),
    backfill({ attemptedCount: 318 }), backfill({ remainingCount: 37_679 }),
    backfill({ exhaustedCount: 6 }), backfill({ unresolvedSavedCount: 298 }),
    backfill({ startedAt: 'not-a-date' }), backfill({ startedAt: null }),
    backfill({ completedAt: '2026-10-22T10:00:00.000Z' }),
    backfill({ active: false, completedAt: '2026-10-21T10:00:00.000Z' }),
  ]) assert.equal(validBackfillStatus({ ...importing(), backfill: invalid }), false, JSON.stringify(invalid));
});

test('new catalogue entries after a completed pass are shown as remaining work', () => {
  const snapshot = importing({ catalogueCount: 101, archivedCount: 100, historyBacklog: 1 },
    backfill({ active: false, attemptedCount: 100, unattemptedCount: 1, retryPendingCount: 0,
      exhaustedCount: 0, unresolvedSavedCount: 0, remainingCount: 1, completedAt: '2026-10-22T10:00:00.000Z' }));
  assert.equal(validBackfillStatus(snapshot), true);
  assert.equal(initialImportSummary(snapshot)?.label, 'Additional schemes awaiting import');
  assert.equal(archiveActivity(snapshot).label, 'Waiting for next scheduled update');
});

test('an unstarted or empty catalogue does not claim the initial import is finished', () => {
  const snapshot = importing({ catalogueCount: 0, archivedCount: 0, historyBacklog: 0 },
    backfill({ active: false, attemptedCount: 0, unattemptedCount: 0, retryPendingCount: 0,
      exhaustedCount: 0, unresolvedSavedCount: 0, remainingCount: 0, startedAt: null }));
  assert.equal(validBackfillStatus(snapshot), true);
  assert.equal(initialImportSummary(snapshot)?.label, 'Initial import not started');
});
