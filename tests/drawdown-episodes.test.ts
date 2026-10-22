import assert from 'node:assert/strict';
import { test } from 'node:test';
import { drawdownEpisodes, selectDrawdownEpisodes, selectPeriod } from '../src/lib/analytics.ts';
import type { DrawdownEpisode } from '../src/lib/analytics.ts';
import type { NavPoint } from '../src/lib/types.ts';

const point = (date: string, nav: number): NavPoint => ({ date, nav });

function episode(month: number, drawdown: number, recovered = true): DrawdownEpisode {
  const prefix = `2024-${String(month).padStart(2, '0')}`;
  return {
    peakDate: `${prefix}-01`, troughDate: `${prefix}-02`,
    recoveryDate: recovered ? `${prefix}-03` : null,
    endDate: `${prefix}-${recovered ? '03' : '04'}`,
    drawdown, declineDays: 1, recoveryDays: recovered ? 1 : null,
    underwaterDays: recovered ? 2 : 3,
  };
}

test('episodes preserve chronological closed declines and the final unrecovered decline', () => {
  const points = [
    point('2024-01-01', 100), point('2024-01-03', 80), point('2024-01-04', 90),
    point('2024-01-06', 70), point('2024-01-09', 100), point('2024-01-10', 120),
    point('2024-01-12', 60), point('2024-01-15', 130), point('2024-01-20', 104),
    point('2024-01-30', 117),
  ];
  assert.deepEqual(drawdownEpisodes(points), [
    {
      peakDate: '2024-01-01', troughDate: '2024-01-06', recoveryDate: '2024-01-09',
      endDate: '2024-01-09', drawdown: 0.7 - 1, declineDays: 5, recoveryDays: 3, underwaterDays: 8,
    },
    {
      peakDate: '2024-01-10', troughDate: '2024-01-12', recoveryDate: '2024-01-15',
      endDate: '2024-01-15', drawdown: -0.5, declineDays: 2, recoveryDays: 3, underwaterDays: 5,
    },
    {
      peakDate: '2024-01-15', troughDate: '2024-01-20', recoveryDate: null,
      endDate: '2024-01-30', drawdown: 0.8 - 1, declineDays: 5, recoveryDays: null, underwaterDays: 15,
    },
  ]);
});

test('partial rebounds remain within the original episode until its peak is recovered', () => {
  const points = [
    point('2024-04-01', 100), point('2024-04-02', 75), point('2024-04-03', 90),
    point('2024-04-04', 80), point('2024-04-05', 99),
  ];
  assert.deepEqual(drawdownEpisodes(points), [{
    peakDate: '2024-04-01', troughDate: '2024-04-02', recoveryDate: null,
    endDate: '2024-04-05', drawdown: -0.25, declineDays: 1, recoveryDays: null, underwaterDays: 4,
  }]);
});

test('a plateau uses its latest high and equality recovery becomes the next episode peak', () => {
  const points = [
    point('2024-01-01', 100), point('2024-01-02', 100), point('2024-01-03', 75),
    point('2024-01-04', 100), point('2024-01-05', 50), point('2024-01-06', 100),
  ];
  assert.deepEqual(drawdownEpisodes(points), [
    {
      peakDate: '2024-01-02', troughDate: '2024-01-03', recoveryDate: '2024-01-04',
      endDate: '2024-01-04', drawdown: -0.25, declineDays: 1, recoveryDays: 1, underwaterDays: 2,
    },
    {
      peakDate: '2024-01-04', troughDate: '2024-01-05', recoveryDate: '2024-01-06',
      endDate: '2024-01-06', drawdown: -0.5, declineDays: 1, recoveryDays: 1, underwaterDays: 2,
    },
  ]);
});

test('equal trough NAVs retain the first observed minimum', () => {
  const points = [
    point('2024-02-01', 100), point('2024-02-02', 75), point('2024-02-05', 90),
    point('2024-02-09', 75), point('2024-02-12', 100),
  ];
  assert.deepEqual(drawdownEpisodes(points), [{
    peakDate: '2024-02-01', troughDate: '2024-02-02', recoveryDate: '2024-02-12',
    endDate: '2024-02-12', drawdown: -0.25, declineDays: 1, recoveryDays: 10, underwaterDays: 11,
  }]);
});

test('irregular observations count calendar days across leap day and recover on the first observed crossing', () => {
  const points = [
    point('2024-02-27', 100), point('2024-02-29', 75), point('2024-03-09', 90),
    point('2024-03-11', 105), point('2024-03-15', 110),
  ];
  assert.deepEqual(drawdownEpisodes(points), [{
    peakDate: '2024-02-27', troughDate: '2024-02-29', recoveryDate: '2024-03-11',
    endDate: '2024-03-11', drawdown: -0.25, declineDays: 2, recoveryDays: 11, underwaterDays: 13,
  }]);
});

test('an old unrecovered episode stops at its final NAV observation', () => {
  const points = [
    point('2020-02-27', 100), point('2020-02-29', 75), point('2020-03-11', 90),
  ];
  assert.deepEqual(drawdownEpisodes(points), [{
    peakDate: '2020-02-27', troughDate: '2020-02-29', recoveryDate: null,
    endDate: '2020-03-11', drawdown: -0.25, declineDays: 2, recoveryDays: null, underwaterDays: 13,
  }]);
});

test('empty, single, flat, and rising histories have no drawdown episodes', () => {
  const histories = [
    [], [point('2024-01-01', 100)],
    [point('2024-01-01', 100), point('2024-01-02', 100), point('2024-01-03', 100)],
    [point('2024-01-01', 100), point('2024-01-02', 110), point('2024-01-03', 120)],
  ];
  for (const points of histories) assert.deepEqual(drawdownEpisodes(points), []);
});

test('episode detection uses the selected window baseline without carrying in an earlier high', () => {
  const points = [
    point('2023-12-01', 200), point('2023-12-31', 100),
    point('2024-01-15', 75), point('2024-01-31', 100),
  ];
  const selected = selectPeriod(points, '1M');
  assert.deepEqual(drawdownEpisodes(selected), [{
    peakDate: '2023-12-31', troughDate: '2024-01-15', recoveryDate: '2024-01-31',
    endDate: '2024-01-31', drawdown: -0.25, declineDays: 15, recoveryDays: 16, underwaterDays: 31,
  }]);
});

test('episode detection leaves its NAV input unchanged', () => {
  const points = [point('2024-01-01', 100), point('2024-01-04', 75), point('2024-01-09', 100)];
  const snapshot = structuredClone(points);
  points.forEach(Object.freeze);
  Object.freeze(points);
  assert.deepEqual(drawdownEpisodes(points), [{
    peakDate: '2024-01-01', troughDate: '2024-01-04', recoveryDate: '2024-01-09',
    endDate: '2024-01-09', drawdown: -0.25, declineDays: 3, recoveryDays: 5, underwaterDays: 8,
  }]);
  assert.deepEqual(points, snapshot);
});

test('selection shows five deepest episodes plus the ongoing episode when it is shallower', () => {
  const episodes = [
    episode(1, -0.2), episode(2, -0.4), episode(3, -0.3), episode(4, -0.5),
    episode(5, -0.1), episode(6, -0.15), episode(7, -0.25), episode(8, -0.01, false),
  ];
  assert.deepEqual(selectDrawdownEpisodes(episodes), [
    episodes[3], episodes[1], episodes[2], episodes[6], episodes[0], episodes[7],
  ]);
});

test('selection includes an ongoing episode among the deepest five only once', () => {
  const episodes = [
    episode(1, -0.2), episode(2, -0.4), episode(3, -0.3), episode(4, -0.5),
    episode(5, -0.1), episode(6, -0.15), episode(7, -0.25), episode(8, -0.6, false),
  ];
  assert.deepEqual(selectDrawdownEpisodes(episodes), [
    episodes[7], episodes[3], episodes[1], episodes[2], episodes[6],
  ]);
});

test('selection resolves equal depths by earlier peak date without changing the input', () => {
  const first = episode(1, -0.2);
  const second = episode(2, -0.4);
  const third = episode(3, -0.2);
  const fourth = episode(4, -0.4);
  const fifth = episode(5, -0.2);
  const sixth = episode(6, -0.1);
  const episodes = [fifth, fourth, first, sixth, third, second];
  const snapshot = structuredClone(episodes);
  episodes.forEach(Object.freeze);
  Object.freeze(episodes);
  assert.deepEqual(selectDrawdownEpisodes(episodes), [second, fourth, first, third, fifth]);
  assert.deepEqual(episodes, snapshot);
});

test('selection respects a supplied limit and still includes an omitted ongoing episode', () => {
  const episodes = [episode(1, -0.2), episode(2, -0.4), episode(3, -0.1), episode(4, -0.05, false)];
  assert.deepEqual(selectDrawdownEpisodes(episodes, 2), [episodes[1], episodes[0], episodes[3]]);
});

test('selection handles empty histories and fewer than five episodes', () => {
  assert.deepEqual(selectDrawdownEpisodes([]), []);
  const episodes = [episode(1, -0.1), episode(2, -0.2, false)];
  assert.deepEqual(selectDrawdownEpisodes(episodes), [episodes[1], episodes[0]]);
});
