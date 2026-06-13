import { describe, expect, it } from 'vitest';
import {
  argentinaDateKey,
  fixtureGroupDateKey,
  formatArgentinaMatchTime,
} from './argentina-datetime';

describe('argentina-datetime', () => {
  it('groups late US Pacific evening matches on the US calendar day, not Argentina', () => {
    const iso = '2026-06-12T06:59:00.000Z';

    expect(fixtureGroupDateKey(iso)).toBe('2026-06-11');
    expect(argentinaDateKey(iso)).toBe('2026-06-12');
  });

  it('formats match time in Argentina', () => {
    const iso = '2026-06-12T06:59:00.000Z';

    expect(formatArgentinaMatchTime(iso)).toContain('3:59');
  });
});
