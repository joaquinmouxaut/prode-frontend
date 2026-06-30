import type { LeaderboardRow } from '../../core/services/leaderboard.service';
import type { MatchPhase } from '../../core/models/match-phase';
import { MATCH_PHASES } from '../../core/models/match-phase';

/** Columnas por las que se puede ordenar la tabla de posiciones. */
export type SortKey =
  | 'total'
  | 'bonus'
  | 'groups'
  | 'knockout'
  | MatchPhase;

export type SortDir = 'asc' | 'desc';

function isMatchPhase(key: SortKey): key is MatchPhase {
  return (MATCH_PHASES as readonly string[]).includes(key);
}

/** Valor numérico de una fila para una columna ordenable. */
export function rowMetric(row: LeaderboardRow, key: SortKey): number {
  switch (key) {
    case 'total':
      return row.total;
    case 'bonus':
      return row.championPoints + row.topScorerPoints;
    case 'groups':
      return row.groupsPoints;
    case 'knockout':
      return row.knockoutPoints;
    default:
      if (isMatchPhase(key)) {
        return row.byPhase[key] ?? 0;
      }
      return 0;
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
