import type { Match } from './match.model';
import type { User } from './user.model';

/** Predicción alineada con el modelo Prisma `Prediction` y relaciones resumidas del GET /predictions/:id. */
export interface Prediction {
  id: number;
  userId: number;
  matchId: number;
  homeGoals: number;
  awayGoals: number;
  points?: number | null;
  user?: Pick<User, 'id' | 'name' | 'email'>;
  match?: Match;
}

export interface CreatePredictionDto {
  userId: number;
  matchId: number;
  homeGoals: number;
  awayGoals: number;
}

export interface UpdatePredictionDto {
  homeGoals?: number;
  awayGoals?: number;
}
