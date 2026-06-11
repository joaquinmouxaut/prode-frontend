import type { MatchPhase } from './match-phase';

/** Partido alineado con el modelo Prisma `Match`. */
export interface Match {
  id: number;
  externalId?: string | null;
  homeTeam: string;
  awayTeam: string;
  date: string;
  phase: MatchPhase;
  homeGoals?: number | null;
  awayGoals?: number | null;
  externalStatus?: string | null;
  resultSource?: 'ADMIN' | 'API' | 'IMPORT' | null;
  manualOverride?: boolean;
  lastSyncedAt?: string | null;
  finalizedAt?: string | null;
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
