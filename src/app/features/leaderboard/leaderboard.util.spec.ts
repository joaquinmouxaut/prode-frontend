import { describe, expect, it } from 'vitest';
import type { LeaderboardRow } from '../../core/services/leaderboard.service';
import { accoladeFor, rowMetric, sortLeaderboardRows } from './leaderboard.util';

function makeRow(
  overrides: Partial<LeaderboardRow> & { id: number; name: string },
): LeaderboardRow {
  const { id, name, ...rest } = overrides;
  return {
    user: { id, name, email: `${name}@test.dev` },
    total: 0,
    matchPoints: 0,
    championPoints: 0,
    topScorerPoints: 0,
    groupsPoints: 0,
    knockoutPoints: 0,
    byPhase: {},
    ...rest,
  };
}

describe('rowMetric', () => {
  const row = makeRow({
    id: 1,
    name: 'Ana',
    total: 30,
    championPoints: 50,
    topScorerPoints: 10,
    groupsPoints: 12,
    knockoutPoints: 18,
    byPhase: { GROUPS_1: 4, GROUPS_2: 5, GROUPS_3: 3 },
  });

  it('reads per-jornada group points', () => {
    expect(rowMetric(row, 'g1')).toBe(4);
    expect(rowMetric(row, 'g2')).toBe(5);
    expect(rowMetric(row, 'g3')).toBe(3);
  });

  it('sums bonus from champion and top scorer', () => {
    expect(rowMetric(row, 'bonus')).toBe(60);
  });

  it('defaults missing phases to zero', () => {
    expect(rowMetric(makeRow({ id: 2, name: 'Bea' }), 'g1')).toBe(0);
  });
});

describe('sortLeaderboardRows', () => {
  const rows: LeaderboardRow[] = [
    makeRow({ id: 1, name: 'Ana', total: 30, byPhase: { GROUPS_1: 2 } }),
    makeRow({ id: 2, name: 'Bea', total: 20, byPhase: { GROUPS_1: 9 } }),
    makeRow({ id: 3, name: 'Cid', total: 20, byPhase: { GROUPS_1: 1 } }),
  ];

  it('keeps total descending by default', () => {
    const sorted = sortLeaderboardRows(rows, 'total', 'desc');
    expect(sorted.map((r) => r.user.id)).toEqual([1, 2, 3]);
  });

  it('sorts by a jornada column', () => {
    const sorted = sortLeaderboardRows(rows, 'g1', 'desc');
    expect(sorted.map((r) => r.user.id)).toEqual([2, 1, 3]);
  });

  it('breaks ties using the canonical total order', () => {
    // Bea (id 2) and Cid (id 3) both have total 20; canonical order keeps 2 before 3.
    const sorted = sortLeaderboardRows(rows, 'total', 'desc');
    expect(sorted.map((r) => r.user.id)).toEqual([1, 2, 3]);
  });

  it('does not mutate the input array', () => {
    const snapshot = rows.map((r) => r.user.id);
    sortLeaderboardRows(rows, 'g1', 'asc');
    expect(rows.map((r) => r.user.id)).toEqual(snapshot);
  });
});

describe('accoladeFor', () => {
  it('crowns the first place as winner', () => {
    expect(accoladeFor(1, 10)).toEqual({ label: 'Ganador', tone: 'winner' });
  });

  it('labels losers from second place onward', () => {
    expect(accoladeFor(2, 10)).toEqual({ label: 'Primer perdedor', tone: 'loser' });
    expect(accoladeFor(3, 10)).toEqual({ label: 'Segundo perdedor', tone: 'loser' });
  });

  it('gives the last place the wooden spoon', () => {
    expect(accoladeFor(10, 10)).toEqual({ label: 'Cuchara de madera', tone: 'last' });
  });

  it('falls back to a numeric ordinal beyond the named list', () => {
    expect(accoladeFor(20, 30).label).toBe('19.º perdedor');
  });

  it('does not mark a lone winner as last', () => {
    expect(accoladeFor(1, 1)).toEqual({ label: 'Ganador', tone: 'winner' });
  });
});
