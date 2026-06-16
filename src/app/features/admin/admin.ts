import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppLucideIconsModule } from '../../shared/lucide-icons.module';
import { AdminService, type FixtureSyncStatusResponse } from '../../core/services/admin.service';
import { formatMatchPhaseMinimal, MATCH_PHASE_LABELS } from '../../core/models/match-phase';
import type { Match } from '../../core/models/match.model';
import {
  fixtureGroupDateKey,
  fixtureGroupTodayDateKey,
  formatArgentinaMatchTime,
  formatFixtureGroupDayHeading,
} from '../../core/utils/argentina-datetime';
import { isMatchFinalized } from '../../core/utils/match-lifecycle';
import { PredictionsService } from '../../core/services/predictions.service';
import { ToastService } from '../../core/services/toast.service';

function isMatchPending(match: Match): boolean {
  return match.homeGoals == null || match.awayGoals == null;
}

function draftGoalsForMatch(match: Match): { home: number; away: number } {
  return {
    home: match.homeGoals ?? 0,
    away: match.awayGoals ?? 0,
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
  protected readonly formatMatchPhaseMinimal = formatMatchPhaseMinimal;

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly matches = signal<Match[]>([]);
  protected readonly draft = signal<Record<number, { home: number; away: number }>>({});
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
  protected readonly groupedResultMatches = computed(() => this.buildResultGroups(this.resultMatches()));
  protected readonly expandedDayKeys = signal<Set<string>>(new Set());

  protected readonly pendingCount = computed(() => this.matches().filter(isMatchPending).length);

  protected readonly isMatchPending = isMatchPending;
  protected readonly isMatchFinalized = isMatchFinalized;

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
        this.initDayExpansion(matches);
        const draft: Record<number, { home: number; away: number }> = {};
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

  trackDay(_: number, group: { dateKey: string }): string {
    return group.dateKey;
  }

  formatWhen(iso: string): string {
    return formatArgentinaMatchTime(iso);
  }

  matchCountForDay(group: { matches: Match[] }): number {
    return group.matches.length;
  }

  isDayExpanded(dateKey: string): boolean {
    return this.expandedDayKeys().has(dateKey);
  }

  isTodayDay(dateKey: string): boolean {
    return dateKey === fixtureGroupTodayDateKey();
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
    this.draft.update((d) => ({
      ...d,
      [matchId]: {
        home: side === 'home' ? n : (d[matchId]?.home ?? 0),
        away: side === 'away' ? n : (d[matchId]?.away ?? 0),
      },
    }));
  }

  saveResult(match: Match): void {
    const d = this.draft()[match.id];
    if (!d) return;
    this.savingId.set(match.id);
    this.adminApi.setMatchResult(match.id, { homeGoals: d.home, awayGoals: d.away }).subscribe({
      next: (res) => {
        this.matches.update((list) =>
          list.map((m) =>
            m.id === match.id
              ? {
                  ...m,
                  homeGoals: d.home,
                  awayGoals: d.away,
                  resultSource: 'ADMIN',
                }
              : m,
          ),
        );
        this.draft.update((current) => ({
          ...current,
          [match.id]: { home: d.home, away: d.away },
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

  private initDayExpansion(matches: Match[]): void {
    const groups = this.buildResultGroups(matches);
    const today = fixtureGroupTodayDateKey();
    const dayKeys = new Set(groups.map((group) => group.dateKey));
    this.expandedDayKeys.set(dayKeys.has(today) ? new Set([today]) : new Set(dayKeys.size ? [groups[0].dateKey] : []));
  }

  private buildResultGroups(matches: Match[]): Array<{ dateKey: string; heading: string; matches: Match[] }> {
    const byDate = new Map<string, Match[]>();
    for (const match of matches) {
      const dateKey = fixtureGroupDateKey(match.date);
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push(match);
    }
    const groups = Array.from(byDate.entries()).map(([dateKey, groupMatches]) => ({
      dateKey,
      heading: formatFixtureGroupDayHeading(dateKey),
      matches: groupMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    }));
    return groups.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }
}
