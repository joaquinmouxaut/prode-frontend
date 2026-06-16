/** Alineado con el enum `Phase` de Prisma en el backend NestJS. */
export const MATCH_PHASES = [
  'GROUPS_1',
  'GROUPS_2',
  'GROUPS_3',
  'ROUND_OF_16',
  'QUARTER_FINAL',
  'SEMI_FINAL',
  'THIRD_PLACE',
  'FINAL',
] as const;

export type MatchPhase = (typeof MATCH_PHASES)[number];

export const GROUP_PHASES: ReadonlySet<MatchPhase> = new Set(['GROUPS_1', 'GROUPS_2', 'GROUPS_3']);

export function isKnockoutPhase(phase: MatchPhase): boolean {
  return !GROUP_PHASES.has(phase);
}

export const MATCH_PHASE_LABELS: Record<MatchPhase, string> = {
  GROUPS_1: 'Grupos — Jornada 1',
  GROUPS_2: 'Grupos — Jornada 2',
  GROUPS_3: 'Grupos — Jornada 3',
  ROUND_OF_16: 'Octavos',
  QUARTER_FINAL: 'Cuartos',
  SEMI_FINAL: 'Semifinal',
  THIRD_PLACE: 'Tercer puesto',
  FINAL: 'Final',
};

/** Letra de grupo (A–L) desde GROUP_F o "F". */
export function formatGroupLetter(groupCode: string | null | undefined): string | null {
  if (!groupCode) {
    return null;
  }
  const upper = groupCode.trim().toUpperCase();
  const fromEnum = upper.match(/^GROUP_([A-Z])$/);
  if (fromEnum) {
    return fromEnum[1];
  }
  if (/^[A-Z]$/.test(upper)) {
    return upper;
  }
  return null;
}

/** Etiqueta compacta para tarjetas de partido. */
export function formatMatchPhaseLabel(
  phase: MatchPhase,
  groupCode?: string | null,
): string {
  if (GROUP_PHASES.has(phase)) {
    const jornada = phase.slice(-1);
    const letter = formatGroupLetter(groupCode);
    if (letter) {
      return `Grupo ${letter}, Jornada ${jornada}`;
    }
    return `Jornada ${jornada}`;
  }
  return MATCH_PHASE_LABELS[phase];
}

/** @deprecated Usar formatMatchPhaseLabel */
export function formatMatchPhaseMinimal(phase: MatchPhase): string {
  return formatMatchPhaseLabel(phase);
}
