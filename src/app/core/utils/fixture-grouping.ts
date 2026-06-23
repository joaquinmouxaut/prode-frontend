import {
  formatJornadaLabel,
  phaseOrder,
  phaseStage,
  STAGE_LABELS,
  type MatchPhase,
  type MatchStage,
} from '../models/match-phase';
import type { Match } from '../models/match.model';
import { fixtureGroupDateKey, formatFixtureGroupDayHeading } from './argentina-datetime';

/** Día calendario del torneo con sus partidos (nivel más fino del árbol). */
export interface FixtureDayNode<T> {
  dateKey: string;
  heading: string;
  items: T[];
}

/** Jornada (fase fina): Jornada 1/2/3, Dieciseisavos, Octavos, etc. */
export interface FixtureJornadaNode<T> {
  phase: MatchPhase;
  label: string;
  days: FixtureDayNode<T>[];
  count: number;
}

/** Etapa de alto nivel: fase de grupos o mata-mata. */
export interface FixtureStageNode<T> {
  stage: MatchStage;
  label: string;
  jornadas: FixtureJornadaNode<T>[];
  count: number;
}

/** Camino activo (etapa → jornada → día) usado para auto-despliegue y scroll. */
export interface FixturePath {
  stage: MatchStage;
  phase: MatchPhase;
  dateKey: string;
}

const STAGE_ORDER: readonly MatchStage[] = ['GROUPS', 'KNOCKOUT'];

/**
 * Construye el árbol de agrupamiento en tres niveles (etapa → jornada → día)
 * a partir de una lista de items, donde cada item expone un `Match`.
 * Genérico para reutilizar en fixture, perfil de participante y admin.
 */
export function buildFixtureTree<T>(
  items: readonly T[],
  getMatch: (item: T) => Match,
): FixtureStageNode<T>[] {
  const stageMap = new Map<MatchStage, Map<MatchPhase, Map<string, T[]>>>();

  for (const item of items) {
    const match = getMatch(item);
    const stage = phaseStage(match.phase);
    const dateKey = fixtureGroupDateKey(match.date);

    let phaseMap = stageMap.get(stage);
    if (!phaseMap) {
      phaseMap = new Map();
      stageMap.set(stage, phaseMap);
    }
    let dayMap = phaseMap.get(match.phase);
    if (!dayMap) {
      dayMap = new Map();
      phaseMap.set(match.phase, dayMap);
    }
    let dayItems = dayMap.get(dateKey);
    if (!dayItems) {
      dayItems = [];
      dayMap.set(dateKey, dayItems);
    }
    dayItems.push(item);
  }

  const stages: FixtureStageNode<T>[] = [];
  for (const stage of STAGE_ORDER) {
    const phaseMap = stageMap.get(stage);
    if (!phaseMap) {
      continue;
    }
    const jornadas: FixtureJornadaNode<T>[] = Array.from(phaseMap.keys())
      .sort((a, b) => phaseOrder(a) - phaseOrder(b))
      .map((phase) => {
        const dayMap = phaseMap.get(phase)!;
        const days: FixtureDayNode<T>[] = Array.from(dayMap.entries())
          .map(([dateKey, dayItems]) => ({
            dateKey,
            heading: formatFixtureGroupDayHeading(dateKey),
            items: [...dayItems].sort(
              (a, b) => new Date(getMatch(a).date).getTime() - new Date(getMatch(b).date).getTime(),
            ),
          }))
          .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        const count = days.reduce((total, day) => total + day.items.length, 0);
        return { phase, label: formatJornadaLabel(phase), days, count };
      });
    const count = jornadas.reduce((total, jornada) => total + jornada.count, 0);
    stages.push({ stage, label: STAGE_LABELS[stage], jornadas, count });
  }
  return stages;
}

/**
 * Resuelve el camino a auto-desplegar/scrollear: el día de hoy si existe,
 * si no el próximo día con fixture, y como último recurso el último pasado.
 */
export function resolveActivePath<T>(
  stages: readonly FixtureStageNode<T>[],
  todayKey: string,
): FixturePath | null {
  const flat: FixturePath[] = [];
  for (const stage of stages) {
    for (const jornada of stage.jornadas) {
      for (const day of jornada.days) {
        flat.push({ stage: stage.stage, phase: jornada.phase, dateKey: day.dateKey });
      }
    }
  }
  if (flat.length === 0) {
    return null;
  }
  const exact = flat.find((path) => path.dateKey === todayKey);
  if (exact) {
    return exact;
  }
  const upcoming = flat.find((path) => path.dateKey > todayKey);
  return upcoming ?? flat[flat.length - 1];
}
