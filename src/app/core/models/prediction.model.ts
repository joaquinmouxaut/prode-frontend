import type { Match, TeamSide } from './match.model';
import type { User } from './user.model';

/** Predicción alineada con el modelo Prisma `Prediction` y relaciones resumidas del GET /predictions/:id. */
export interface Prediction {
  id: number;
  userId: number;
  matchId: number;
  homeGoals: number;
  awayGoals: number;
  /** Equipo que el jugador cree que avanza (solo mata-mata). */
  advancingTeam?: TeamSide | null;
  points?: number | null;
  user?: Pick<User, 'id' | 'name' | 'email'>;
  match?: Match;
}

export interface CreatePredictionDto {
  userId: number;
  matchId: number;
  homeGoals: number;
  awayGoals: number;
  advancingTeam?: TeamSide;
}

export interface UpdatePredictionDto {
  homeGoals?: number;
  awayGoals?: number;
  advancingTeam?: TeamSide;
}
