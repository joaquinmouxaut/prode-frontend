import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  computed,
  inject,
  Injector,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { BRANDING } from '../../core/constants/branding';
import { AuthService } from '../../core/services/auth.service';
import { LeaderboardService } from '../../core/services/leaderboard.service';
import { AppLucideIconsModule } from '../../shared/lucide-icons.module';
import { PredictionsService } from '../../core/services/predictions.service';
import {
  formatMatchPhaseLabel,
  isKnockoutPhase,
  MATCH_PHASE_LABELS,
  type MatchPhase,
} from '../../core/models/match-phase';
import type { Match, TeamSide } from '../../core/models/match.model';
import type { Prediction } from '../../core/models/prediction.model';
import type { User } from '../../core/models/user.model';
import {
  fixtureGroupDateKey,
  fixtureGroupTodayDateKey,
  formatArgentinaMatchTime,
  formatFixtureGroupDayHeading,
} from '../../core/utils/argentina-datetime';
import {
  formatMatchScore,
  hasScoreableResult,
  isMatchApiFinished,
  isMatchFinished,
  isMatchInProgress,
  isMatchStarted,
} from '../../core/utils/match-lifecycle';

interface FixtureSection {
  phase: MatchPhase;
  phaseLabel: string;
  matches: Match[];
}

interface FixtureDayGroup {
  dateKey: string;
  heading: string;
  sections: FixtureSection[];
}

interface GroupPredictionEntry {
  user: Pick<User, 'id' | 'name'>;
  prediction: Prediction | null;
}

@Component({
  selector: 'app-fixture',
  imports: [FormsModule, RouterLink, AppLucideIconsModule],
  templateUrl: './fixture.html',
  styleUrl: './fixture.scss',
})
export class Fixture {
  private readonly predictionsApi = inject(PredictionsService);
  private readonly leaderboardApi = inject(LeaderboardService);
  private readonly injector = inject(Injector);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly auth = inject(AuthService);
  protected readonly branding = BRANDING;

  private dayExpansionInitialized = false;
  private scrolledToToday = false;

  protected readonly MATCH_PHASE_LABELS = MATCH_PHASE_LABELS;
  protected readonly formatMatchPhaseLabel = formatMatchPhaseLabel;

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly matches = signal<Match[]>([]);
  protected readonly predictionByMatchId = signal<Map<number, Prediction>>(new Map());
  protected readonly visiblePredictions = signal<Prediction[]>([]);
  protected readonly groupParticipants = signal<Pick<User, 'id' | 'name'>[]>([]);
  /** Borrador local: matchId -> goles + equipo que avanza (mata-mata) */
  protected readonly draft = signal<
    Record<number, { home: number; away: number; advancingTeam: TeamSide | null }>
  >({});
  protected readonly savingId = signal<number | null>(null);
  protected readonly rowError = signal<string | null>(null);
  protected readonly expandedPredictionMatchIds = signal<Set<number>>(new Set());
  protected readonly expandedDayKeys = signal<Set<string>>(new Set());

  protected readonly groups = computed(() => this.buildGroups(this.matches()));
  protected readonly todayDateKey = computed(() => fixtureGroupTodayDateKey());
  private readonly matchById = computed(
    () => new Map(this.matches().map((m) => [m.id, m])),
  );

  protected readonly isMatchStarted = isMatchStarted;
  protected readonly isMatchInProgress = isMatchInProgress;
  protected readonly isMatchFinished = isMatchFinished;
  protected readonly isMatchApiFinished = isMatchApiFinished;
  protected readonly hasScoreableResult = hasScoreableResult;
  protected readonly formatMatchScore = formatMatchScore;

  constructor() {
    this.refresh();
  }

  refresh(): void {
    const user = this.auth.currentUser();
    if (!user) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.loadError.set(null);
    forkJoin({
      matches: this.predictionsApi.getMatches(),
      predictions: this.predictionsApi.getPredictions(),
      leaderboard: this.leaderboardApi.getLeaderboard(),
    }).subscribe({
      next: ({ matches, predictions, leaderboard }) => {
        const sorted = [...matches].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        this.matches.set(sorted);
        this.visiblePredictions.set(predictions);
        this.groupParticipants.set(
          leaderboard.rows.map((row) => ({ id: row.user.id, name: row.user.name })),
        );
        const map = new Map<number, Prediction>();
        const draft: Record<
          number,
          { home: number; away: number; advancingTeam: TeamSide | null }
        > = {};
        for (const p of predictions.filter((item) => item.userId === user.id)) {
          map.set(p.matchId, p);
          draft[p.matchId] = {
            home: p.homeGoals,
            away: p.awayGoals,
            advancingTeam: p.advancingTeam ?? null,
          };
        }
        for (const m of sorted) {
          if (!draft[m.id]) {
            draft[m.id] = { home: 0, away: 0, advancingTeam: null };
          }
        }
        this.predictionByMatchId.set(map);
        this.draft.set(draft);
        if (!this.dayExpansionInitialized) {
          this.initDayExpansion(sorted);
          this.dayExpansionInitialized = true;
        }
        this.loading.set(false);
        if (!this.scrolledToToday) {
          this.scheduleScrollToToday();
          this.scrolledToToday = true;
        }
      },
      error: () => {
        this.loadError.set('No pudimos cargar el fixture. ¿Está corriendo el backend?');
        this.loading.set(false);
      },
    });
  }

  trackDay(_: number, g: FixtureDayGroup): string {
    return g.dateKey;
  }

  trackSection(_: number, s: FixtureSection): string {
    return s.phase;
  }

  trackMatch(_: number, m: Match): number {
    return m.id;
  }

  formatWhen(iso: string): string {
    return formatArgentinaMatchTime(iso);
  }

  myPrediction(match: Match): Prediction | undefined {
    return this.predictionByMatchId().get(match.id);
  }

  matchCountForDay(group: FixtureDayGroup): number {
    return group.sections.reduce((total, section) => total + section.matches.length, 0);
  }

  isDayExpanded(dateKey: string): boolean {
    return this.expandedDayKeys().has(dateKey);
  }

  isTodayDay(dateKey: string): boolean {
    return dateKey === this.todayDateKey();
  }

  toggleDay(dateKey: string): void {
    this.expandedDayKeys.update((keys) => {
      const next = new Set(keys);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  }

  clampGoals(raw: string): number {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(n, 99);
  }

  onGoalsChange(matchId: number, side: 'home' | 'away', value: string | number): void {
    const n = this.clampGoals(typeof value === 'number' ? String(value) : value);
    this.draft.update((d) => {
      const current = d[matchId] ?? { home: 0, away: 0, advancingTeam: null };
      const home = side === 'home' ? n : current.home;
      const away = side === 'away' ? n : current.away;
      let advancingTeam = current.advancingTeam;
      const match = this.matchById().get(matchId);
      if (match && isKnockoutPhase(match.phase)) {
        // Marcador decisivo: el que avanza queda autoseleccionado y bloqueado.
        // Empate: se conserva la elección manual del jugador.
        const derived = home > away ? 'HOME' : away > home ? 'AWAY' : null;
        if (derived) {
          advancingTeam = derived;
        }
      } else {
        advancingTeam = null;
      }
      return { ...d, [matchId]: { home, away, advancingTeam } };
    });
  }

  /** True para partidos de eliminatoria (sin empate posible). */
  isKnockoutMatch(match: Match): boolean {
    return isKnockoutPhase(match.phase);
  }

  /** El equipo que avanza queda bloqueado cuando el marcador predicho es decisivo. */
  isAdvancerLocked(matchId: number): boolean {
    const d = this.draft()[matchId];
    if (!d) {
      return false;
    }
    return d.home !== d.away;
  }

  advancingTeamDraft(matchId: number): TeamSide | null {
    return this.draft()[matchId]?.advancingTeam ?? null;
  }

  setAdvancingTeam(matchId: number, side: TeamSide): void {
    this.draft.update((d) => {
      const current = d[matchId] ?? { home: 0, away: 0, advancingTeam: null };
      return { ...d, [matchId]: { ...current, advancingTeam: side } };
    });
  }

  advancerButtonClass(matchId: number, side: TeamSide): string {
    const base =
      'truncate rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60';
    return this.advancingTeamDraft(matchId) === side
      ? `${base} border-prode-accent bg-prode-accent/15 text-amber-100`
      : `${base} border-prode-border bg-prode-bg text-prode-muted hover:text-white`;
  }

  savePrediction(match: Match): void {
    const user = this.auth.currentUser();
    if (!user || isMatchStarted(match)) {
      this.rowError.set('Este partido ya comenzó: la predicción quedó bloqueada.');
      return;
    }
    const d = this.draft()[match.id];
    if (!d) return;

    let advancingTeam: TeamSide | undefined;
    if (isKnockoutPhase(match.phase)) {
      const derived =
        d.home > d.away ? 'HOME' : d.away > d.home ? 'AWAY' : d.advancingTeam;
      if (!derived) {
        this.rowError.set('Elegí qué equipo avanza a la próxima ronda.');
        return;
      }
      advancingTeam = derived;
    }

    this.rowError.set(null);
    this.savingId.set(match.id);
    const existing = this.predictionByMatchId().get(match.id);
    const req$ = existing
      ? this.predictionsApi.updatePrediction(existing.id, {
          homeGoals: d.home,
          awayGoals: d.away,
          ...(advancingTeam ? { advancingTeam } : {}),
        })
      : this.predictionsApi.createPrediction({
          userId: user.id,
          matchId: match.id,
          homeGoals: d.home,
          awayGoals: d.away,
          ...(advancingTeam ? { advancingTeam } : {}),
        });

    req$.subscribe({
      next: (pred) => {
        this.predictionByMatchId.update((m) => new Map(m).set(match.id, pred));
        this.savingId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.savingId.set(null);
        if (err.status === 409) {
          const message = typeof err.error?.message === 'string' ? err.error.message : '';
          if (message.includes('locked after kickoff')) {
            this.rowError.set('Este partido ya comenzó: la predicción quedó bloqueada.');
          } else {
            this.rowError.set('Ya tenés una predicción para este partido. Recargá la página.');
          }
        } else {
          this.rowError.set('Error al guardar. Reintentá.');
        }
      },
    });
  }

  /** Nombre del equipo que avanzó según el resultado oficial (mata-mata). */
  advancerTeamName(match: Match): string | null {
    if (!match.winnerSide) {
      return null;
    }
    return match.winnerSide === 'HOME' ? match.homeTeam : match.awayTeam;
  }

  /** Nombre del equipo que el jugador eligió como avance. */
  predictionAdvancerName(match: Match, prediction: Prediction): string | null {
    const side =
      prediction.advancingTeam ??
      (prediction.homeGoals > prediction.awayGoals
        ? 'HOME'
        : prediction.awayGoals > prediction.homeGoals
          ? 'AWAY'
          : null);
    if (!side) {
      return null;
    }
    return side === 'HOME' ? match.homeTeam : match.awayTeam;
  }

  /** Etiqueta de cómo se definió el partido (prórroga/penales). */
  decisionLabel(match: Match): string | null {
    switch (match.decidedBy) {
      case 'PENALTIES':
        return 'penales';
      case 'EXTRA_TIME':
        return 'prórroga';
      default:
        return null;
    }
  }

  groupPredictionEntriesForMatch(match: Match): GroupPredictionEntry[] {
    const user = this.auth.currentUser();
    if (!user || !isMatchStarted(match)) {
      return [];
    }

    const predictionsForMatch = this.visiblePredictions().filter(
      (prediction) => prediction.matchId === match.id,
    );
    const predictionByUserId = new Map(
      predictionsForMatch.map((prediction) => [prediction.userId, prediction]),
    );

    return this.groupParticipants()
      .filter((participant) => participant.id !== user.id)
      .map((participant) => ({
        user: participant,
        prediction: predictionByUserId.get(participant.id) ?? null,
      }))
      .sort((a, b) => a.user.name.localeCompare(b.user.name, 'es'));
  }

  isPredictionsExpanded(matchId: number): boolean {
    return this.expandedPredictionMatchIds().has(matchId);
  }

  togglePredictions(matchId: number): void {
    this.expandedPredictionMatchIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(matchId)) {
        next.delete(matchId);
      } else {
        next.add(matchId);
      }
      return next;
    });
  }

  private initDayExpansion(matches: Match[]): void {
    const today = fixtureGroupTodayDateKey();
    const dayKeys = new Set(matches.map((m) => fixtureGroupDateKey(m.date)));
    this.expandedDayKeys.set(dayKeys.has(today) ? new Set([today]) : new Set());
  }

  private scheduleScrollToToday(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    afterNextRender(
      () => {
        const targetKey = this.resolveScrollDayKey();
        if (!targetKey) {
          return;
        }
        document.getElementById(`fixture-day-${targetKey}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      },
      { injector: this.injector },
    );
  }

  /** Día de hoy si hay partidos; si no, el próximo con fixture o el último pasado. */
  private resolveScrollDayKey(): string | null {
    const groups = this.groups();
    if (groups.length === 0) {
      return null;
    }
    const today = fixtureGroupTodayDateKey();
    if (groups.some((group) => group.dateKey === today)) {
      return today;
    }
    const upcoming = groups.find((group) => group.dateKey > today);
    return upcoming?.dateKey ?? groups[groups.length - 1]?.dateKey ?? null;
  }

  private buildGroups(matches: Match[]): FixtureDayGroup[] {
    const byDate = new Map<string, Map<MatchPhase, Match[]>>();
    for (const m of matches) {
      const dateKey = fixtureGroupDateKey(m.date);
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, new Map());
      }
      const inner = byDate.get(dateKey)!;
      if (!inner.has(m.phase)) {
        inner.set(m.phase, []);
      }
      inner.get(m.phase)!.push(m);
    }
    const result: FixtureDayGroup[] = [];
    for (const [dateKey, phaseMap] of byDate) {
      const sections: FixtureSection[] = [];
      for (const [phase, ms] of phaseMap) {
        sections.push({
          phase,
          phaseLabel: MATCH_PHASE_LABELS[phase],
          matches: ms,
        });
      }
      sections.sort((a, b) => a.phase.localeCompare(b.phase));
      result.push({ dateKey, heading: formatFixtureGroupDayHeading(dateKey), sections });
    }
    result.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    return result;
  }
}
