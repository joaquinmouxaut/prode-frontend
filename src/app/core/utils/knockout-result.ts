import { isKnockoutPhase } from '../models/match-phase';
import type { Match } from '../models/match.model';
import type { Prediction } from '../models/prediction.model';

/**
 * Nombre del equipo que avanzó por penales (empate definido en la tanda).
 * Devuelve null si el partido no se definió por penales o falta el ganador.
 */
export function penaltyWinnerName(match: Match): string | null {
  if (match.decidedBy !== 'PENALTIES' || !match.winnerSide) {
    return null;
  }
  return match.winnerSide === 'HOME' ? match.homeTeam : match.awayTeam;
}

/**
 * Equipo que el jugador eligió como avance, solo cuando predijo empate
 * (es decir, ganador "por penales"). En marcadores decisivos el ganador ya se
 * desprende del resultado, así que devuelve null.
 */
export function predictionPenaltyWinnerName(match: Match, prediction: Prediction): string | null {
  if (!isKnockoutPhase(match.phase) || prediction.homeGoals !== prediction.awayGoals) {
    return null;
  }
  const side = prediction.advancingTeam;
  if (!side) {
    return null;
  }
  return side === 'HOME' ? match.homeTeam : match.awayTeam;
}
