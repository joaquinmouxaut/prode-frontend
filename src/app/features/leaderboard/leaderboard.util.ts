import type { LeaderboardRow } from '../../core/services/leaderboard.service';

/** Columnas por las que se puede ordenar la tabla de posiciones. */
export type SortKey = 'total' | 'bonus' | 'g1' | 'g2' | 'g3' | 'groups' | 'knockout';
export type SortDir = 'asc' | 'desc';

/** Valor numérico de una fila para una columna ordenable. */
export function rowMetric(row: LeaderboardRow, key: SortKey): number {
  switch (key) {
    case 'total':
      return row.total;
    case 'bonus':
      return row.championPoints + row.topScorerPoints;
    case 'g1':
      return row.byPhase['GROUPS_1'] ?? 0;
    case 'g2':
      return row.byPhase['GROUPS_2'] ?? 0;
    case 'g3':
      return row.byPhase['GROUPS_3'] ?? 0;
    case 'groups':
      return row.groupsPoints;
    case 'knockout':
      return row.knockoutPoints;
  }
}

/**
 * Ordena una copia de las filas por la columna pedida.
 * El desempate siempre respeta el orden canónico recibido del backend
 * (mejor puntaje total primero), para que el ranking sea estable.
 */
export function sortLeaderboardRows(
  rows: readonly LeaderboardRow[],
  key: SortKey,
  dir: SortDir,
): LeaderboardRow[] {
  const factor = dir === 'asc' ? 1 : -1;
  const baseRank = new Map<number, number>();
  rows.forEach((row, index) => baseRank.set(row.user.id, index));

  return [...rows].sort((a, b) => {
    const diff = rowMetric(a, key) - rowMetric(b, key);
    if (diff !== 0) {
      return diff * factor;
    }
    return (baseRank.get(a.user.id) ?? 0) - (baseRank.get(b.user.id) ?? 0);
  });
}

export type AccoladeTone = 'winner' | 'loser' | 'last';

export interface Accolade {
  label: string;
  tone: AccoladeTone;
}

const LOSER_ORDINALS = [
  'Primer',
  'Segundo',
  'Tercer',
  'Cuarto',
  'Quinto',
  'Sexto',
  'Séptimo',
  'Octavo',
  'Noveno',
  'Décimo',
  'Undécimo',
  'Duodécimo',
  'Decimotercer',
  'Decimocuarto',
  'Decimoquinto',
];

/**
 * Etiqueta "de amigos": el primero es el Ganador y desde el segundo en
 * adelante son "Primer perdedor", "Segundo perdedor", etc. El último de la
 * tabla se marca además como "Farolito" (clásico del fútbol argentino).
 */
export function accoladeFor(position: number, totalPlayers: number): Accolade {
  if (position <= 1) {
    return { label: 'Ganador', tone: 'winner' };
  }
  if (totalPlayers > 1 && position === totalPlayers) {
    return { label: 'Cuchara de madera', tone: 'last' };
  }
  const loserIndex = position - 1;
  const ordinal = LOSER_ORDINALS[loserIndex - 1] ?? `${loserIndex}.º`;
  return { label: `${ordinal} perdedor`, tone: 'loser' };
}
