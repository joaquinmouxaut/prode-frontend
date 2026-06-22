import type { MatchPhase } from './match-phase';

/** Lado del partido. En mata-mata indica el equipo que avanza. */
export type TeamSide = 'HOME' | 'AWAY';

/** Cómo se definió un partido de eliminatoria. */
export type MatchDecision = 'REGULAR' | 'EXTRA_TIME' | 'PENALTIES';

/** Partido alineado con el modelo Prisma `Match`. */
export interface Match {
  id: number;
  externalId?: string | null;
  homeTeam: string;
  awayTeam: string;
  date: string;
  phase: MatchPhase;
  groupCode?: string | null;
  homeGoals?: number | null;
  awayGoals?: number | null;
  externalStatus?: string | null;
  resultSource?: 'ADMIN' | 'API' | 'IMPORT' | null;
  manualOverride?: boolean;
  lastSyncedAt?: string | null;
  finalizedAt?: string | null;
  /** Equipo que avanza (solo mata-mata). */
  winnerSide?: TeamSide | null;
  /** Cómo se definió el partido (solo mata-mata). */
  decidedBy?: MatchDecision | null;
}

export interface CreateMatchDto {
  homeTeam: string;
  awayTeam: string;
  date: string;
  phase: MatchPhase;
  homeGoals?: number;
  awayGoals?: number;
}

export interface UpdateMatchDto {
  homeTeam?: string;
  awayTeam?: string;
  date?: string;
  phase?: MatchPhase;
  homeGoals?: number | null;
  awayGoals?: number | null;
}
