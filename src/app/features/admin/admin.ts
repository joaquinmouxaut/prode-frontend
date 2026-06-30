import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppLucideIconsModule } from '../../shared/lucide-icons.module';
import { AdminService, type FixtureSyncStatusResponse } from '../../core/services/admin.service';
import {
  formatMatchPhaseLabel,
  isKnockoutPhase,
  MATCH_PHASE_LABELS,
  type MatchPhase,
  type MatchStage,
} from '../../core/models/match-phase';
import type { Match, TeamSide } from '../../core/models/match.model';
import {
  fixtureGroupTodayDateKey,
  formatArgentinaMatchTime,
} from '../../core/utils/argentina-datetime';
import {
  buildFixtureTree,
  resolveActivePath,
  type FixtureJornadaNode,
  type FixtureStageNode,
} from '../../core/utils/fixture-grouping';
import { isMatchFinalized } from '../../core/utils/match-lifecycle';
import { penaltyWinnerName } from '../../core/utils/knockout-result';
import { PredictionsService } from '../../core/services/predictions.service';
import { ToastService } from '../../core/services/toast.service';

function isMatchPending(match: Match): boolean {
  return match.homeGoals == null || match.awayGoals == null;
}

function draftGoalsForMatch(match: Match): {
  home: number;
  away: number;
  advancingTeam: TeamSide | null;
} {
  return {
    home: match.homeGoals ?? 0,
    away: match.awayGoals ?? 0,
    advancingTeam: match.winnerSide ?? null,
  };
}

@Component({
  selector: 'app-admin',
  imports: [FormsModule, AppLucideIconsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin {
  private readonly matchesApi = inject(PredictionsService);
  private readonly adminApi = inject(AdminService);
  private readonly toast = inject(ToastService);

  protected readonly MATCH_PHASE_LABELS = MATCH_PHASE_LABELS;
  protected readonly formatMatchPhaseLabel = formatMatchPhaseLabel;

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly matches = signal<Match[]>([]);
  protected readonly draft = signal<
    Record<number, { home: number; away: number; advancingTeam: TeamSide | null }>
  >({});
  protected readonly savingId = signal<number | null>(null);
  protected readonly finalizingId = signal<number | null>(null);
  protected readonly unfinalizingId = signal<number | null>(null);
  protected readonly importingFixture = signal(false);
  protected readonly syncingNow = signal(false);
  protected readonly syncStatus = signal<FixtureSyncStatusResponse | null>(null);
  protected readonly loadingSyncStatus = signal(false);
  protected readonly savingTournamentResults = signal(false);
  protected readonly tournamentChampion = signal('');
  protected readonly tournamentTopScorer = signal('');

  protected readonly resultMatches = computed(() =>
    [...this.matches()].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
  );
  protected readonly stages = computed(() => buildFixtureTree(this.resultMatches(), (m) => m));
  protected readonly expandedStageKeys = signal<Set<MatchStage>>(new Set());
  protected readonly expandedJornadaKeys = signal<Set<MatchPhase>>(new Set());
  protected readonly expandedDayKeys = signal<Set<string>>(new Set());
  private readonly matchById = computed(() => new Map(this.matches().map((m) => [m.id, m])));

  protected readonly pendingCount = computed(() => this.matches().filter(isMatchPending).length);

  protected readonly isMatchPending = isMatchPending;
  protected readonly isMatchFinalized = isMatchFinalized;
  protected readonly penaltyWinnerName = penaltyWinnerName;

  constructor() {
    this.refresh();
    this.refreshSyncStatus();
    this.loadTournamentResults();
  }

  refresh(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.matchesApi.getMatches().subscribe({
      next: (matches) => {
        this.matches.set(matches);
        this.initExpansion(matches);
        const draft: Record<
          number,
          { home: number; away: number; advancingTeam: TeamSide | null }
        > = {};
        for (const m of matches) {
          draft[m.id] = draftGoalsForMatch(m);
        }
        this.draft.set(draft);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('No pudimos cargar los partidos. ¿Está corriendo el backend?');
        this.loading.set(false);
      },
    });
  }

  refreshSyncStatus(): void {
    this.loadingSyncStatus.set(true);
    this.adminApi.getFixtureSyncStatus().subscribe({
      next: (status) => {
        this.syncStatus.set(status);
        this.loadingSyncStatus.set(false);
      },
      error: () => {
        this.loadingSyncStatus.set(false);
      },
    });
  }

  trackMatch(_: number, m: Match): number {
    return m.id;
  }

  trackStage(_: number, s: FixtureStageNode<Match>): string {
    return s.stage;
  }

  trackJornada(_: number, j: FixtureJornadaNode<Match>): string {
    return j.phase;
  }

  trackDay(_: number, group: { dateKey: string }): string {
    return group.dateKey;
  }

  formatWhen(iso: string): string {
    return formatArgentinaMatchTime(iso);
  }

  isStageExpanded(stage: MatchStage): boolean {
    return this.expandedStageKeys().has(stage);
  }

  toggleStage(stage: MatchStage): void {
    this.expandedStageKeys.update((keys) => {
      const next = new Set(keys);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });
  }

  isJornadaExpanded(phase: MatchPhase): boolean {
    return this.expandedJornadaKeys().has(phase);
  }

  toggleJornada(phase: MatchPhase): void {
    this.expandedJornadaKeys.update((keys) => {
      const next = new Set(keys);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
  }

  isDayExpanded(dateKey: string): boolean {
    return this.expandedDayKeys().has(dateKey);
  }

  isTodayDay(dateKey: string): boolean {
    return dateKey === fixtureGroupTodayDateKey();
  }

  stageHasToday(stage: FixtureStageNode<Match>): boolean {
    const today = fixtureGroupTodayDateKey();
    return stage.jornadas.some((j) => j.days.some((d) => d.dateKey === today));
  }

  jornadaHasToday(jornada: FixtureJornadaNode<Match>): boolean {
    const today = fixtureGroupTodayDateKey();
    return jornada.days.some((d) => d.dateKey === today);
  }

  toggleDay(dateKey: string): void {
    this.expandedDayKeys.update((keys) => {
      const next = new Set(keys);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  }

  clampGoals(raw: string | number): number {
    const n = Number.parseInt(typeof raw === 'number' ? String(raw) : raw, 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(n, 99);
  }

  onGoalsChange(matchId: number, side: 'home' | 'away', value: string | number): void {
    const n = this.clampGoals(value);
    this.draft.update((d) => {
      const current = d[matchId] ?? { home: 0, away: 0, advancingTeam: null };
      const home = side === 'home' ? n : current.home;
      const away = side === 'away' ? n : current.away;
      let advancingTeam = current.advancingTeam;
      const match = this.matchById().get(matchId);
      if (match && isKnockoutPhase(match.phase)) {
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

  isKnockoutMatch(match: Match): boolean {
    return isKnockoutPhase(match.phase);
  }

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
      'truncate rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60';
    return this.advancingTeamDraft(matchId) === side
      ? `${base} border-emerald-400 bg-emerald-500/15 text-emerald-100`
      : `${base} border-prode-border bg-prode-bg text-prode-muted hover:text-white`;
  }

  saveResult(match: Match): void {
    const d = this.draft()[match.id];
    if (!d) return;

    let winnerSide: TeamSide | undefined;
    if (isKnockoutPhase(match.phase)) {
      const derived = d.home > d.away ? 'HOME' : d.away > d.home ? 'AWAY' : d.advancingTeam;
      if (!derived) {
        this.toast.error('Elegí qué equipo avanza antes de guardar.');
        return;
      }
      winnerSide = derived;
    }

    this.savingId.set(match.id);
    this.adminApi
      .setMatchResult(match.id, {
        homeGoals: d.home,
        awayGoals: d.away,
        ...(winnerSide ? { winnerSide } : {}),
      })
      .subscribe({
        next: (res) => {
          this.matches.update((list) =>
            list.map((m) =>
              m.id === match.id
                ? {
                    ...m,
                    homeGoals: d.home,
                    awayGoals: d.away,
                    winnerSide: winnerSide ?? m.winnerSide,
                    resultSource: 'ADMIN',
                  }
                : m,
            ),
          );
          this.draft.update((current) => ({
            ...current,
            [match.id]: {
              home: d.home,
              away: d.away,
              advancingTeam: winnerSide ?? d.advancingTeam,
            },
          }));
          this.savingId.set(null);
          this.refreshSyncStatus();
          this.toast.success(
            `Resultado guardado. Recalculadas ${res.recalculatedPredictions} predicciones.`,
          );
        },
        error: () => {
          this.savingId.set(null);
        },
      });
  }

  importFixture(): void {
    this.importingFixture.set(true);
    this.adminApi.importFixture().subscribe({
      next: (result) => {
        this.importingFixture.set(false);
        this.refreshSyncStatus();
        if (result.error === 'missing_api_key') {
          this.toast.error(
            'Falta FOOTBALL_DATA_API_TOKEN en el backend (.env). Ver guía de pruebas.',
          );
          return;
        }
        this.refresh();
        this.toast.success(
          `Fixture importado: ${result.importedMatches} partidos (${result.createdMatches} nuevos).`,
        );
      },
      error: () => {
        this.importingFixture.set(false);
      },
    });
  }

  runSyncNow(): void {
    this.syncingNow.set(true);
    this.adminApi.runFixtureSyncNow().subscribe({
      next: (result) => {
        this.syncingNow.set(false);
        this.refresh();
        this.refreshSyncStatus();
        if (result.skipped) {
          this.toast.success(`Sync no ejecutado: ${result.skipped}.`);
          return;
        }
        this.toast.success(
          `Sync OK: ${result.syncedMatches} partidos revisados, ${result.scoreChanges ?? 0} con cambios.`,
        );
      },
      error: () => {
        this.syncingNow.set(false);
      },
    });
  }

  finalizeMatch(match: Match): void {
    this.finalizingId.set(match.id);
    this.adminApi.finalizeMatch(match.id).subscribe({
      next: (res) => {
        this.matches.update((list) =>
          list.map((m) =>
            m.id === match.id
              ? {
                  ...m,
                  finalizedAt: res.finalizedAt,
                  externalStatus: 'FINISHED',
                }
              : m,
          ),
        );
        this.finalizingId.set(null);
        this.refreshSyncStatus();
        this.toast.success(
          `Partido finalizado. Recalculadas ${res.recalculatedPredictions} predicciones.`,
        );
      },
      error: () => {
        this.finalizingId.set(null);
      },
    });
  }

  unfinalizeMatch(match: Match): void {
    this.unfinalizingId.set(match.id);
    this.adminApi.unfinalizeMatch(match.id).subscribe({
      next: () => {
        this.matches.update((list) =>
          list.map((m) =>
            m.id === match.id
              ? {
                  ...m,
                  finalizedAt: null,
                }
              : m,
          ),
        );
        this.unfinalizingId.set(null);
        this.refreshSyncStatus();
        this.toast.success('Finalización revertida. Podés volver a editar el resultado.');
      },
      error: () => {
        this.unfinalizingId.set(null);
      },
    });
  }

  loadTournamentResults(): void {
    this.adminApi.getTournamentResults().subscribe({
      next: (config) => {
        this.tournamentChampion.set(config.championTeam ?? '');
        this.tournamentTopScorer.set(config.topScorerPlayer ?? '');
      },
    });
  }

  saveTournamentResults(): void {
    this.savingTournamentResults.set(true);
    this.adminApi
      .setTournamentResults({
        championTeam: this.tournamentChampion().trim(),
        topScorerPlayer: this.tournamentTopScorer().trim(),
      })
      .subscribe({
        next: (result) => {
          this.savingTournamentResults.set(false);
          this.tournamentChampion.set(result.config.championTeam ?? '');
          this.tournamentTopScorer.set(result.config.topScorerPlayer ?? '');
          this.toast.success(
            `Resultados del torneo guardados. ${result.recalculatedUsers} usuarios recalculados.`,
          );
        },
        error: () => {
          this.savingTournamentResults.set(false);
        },
      });
  }

  private initExpansion(matches: Match[]): void {
    const stages = buildFixtureTree(matches, (m) => m);
    const path = resolveActivePath(stages, fixtureGroupTodayDateKey());
    if (!path) {
      this.expandedStageKeys.set(new Set());
      this.expandedJornadaKeys.set(new Set());
      this.expandedDayKeys.set(new Set());
      return;
    }
    this.expandedStageKeys.set(new Set([path.stage]));
    this.expandedJornadaKeys.set(new Set([path.phase]));
    this.expandedDayKeys.set(new Set([path.dateKey]));
  }
}
