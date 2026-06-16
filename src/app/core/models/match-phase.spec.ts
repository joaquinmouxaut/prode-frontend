import { describe, expect, it } from 'vitest';
import { formatGroupLetter, formatMatchPhaseLabel } from './match-phase';

describe('formatMatchPhaseLabel', () => {
  it('shows grupo and jornada when groupCode is present', () => {
    expect(formatMatchPhaseLabel('GROUPS_2', 'GROUP_F')).toBe('Grupo F, Jornada 2');
  });

  it('shows only jornada when group is missing', () => {
    expect(formatMatchPhaseLabel('GROUPS_1', null)).toBe('Jornada 1');
  });

  it('keeps knockout labels', () => {
    expect(formatMatchPhaseLabel('QUARTER_FINAL', null)).toBe('Cuartos');
  });
});

describe('formatGroupLetter', () => {
  it('parses football-data group codes', () => {
    expect(formatGroupLetter('GROUP_A')).toBe('A');
    expect(formatGroupLetter('f')).toBe('F');
  });
});
