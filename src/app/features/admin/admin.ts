import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppLucideIconsModule } from '../../shared/lucide-icons.module';
import { AdminService, type FixtureSyncStatusResponse } from '../../core/services/admin.service';
import { MATCH_PHASE_LABELS } from '../../core/models/match-phase';
import type { Match } from '../../core/models/match.model';
import { PredictionsService } from '../../core/services/predictions.service';
import { ToastService } from '../../core/services/toast.service';

function isMatchPending(match: Match): boolean {
  return match.homeGoals == null || match.awayGoals == null;
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

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly matches = signal<Match[]>([]);
  protected readonly draft = signal<Record<number, { home: number; away: number }>>({});
  protected readonly savingId = signal<number | null>(null);
  protected readonly unlockingId = signal<number | null>(null);
  protected readonly importingFixture = signal(false);
  protected readonly syncingNow = signal(false);
  protected readonly syncStatus = signal<FixtureSyncStatusResponse | null>(null);
  protected readonly loadingSyncStatus = signal(false);

  protected readonly pendingMatches = computed(() =>
    this.matches()
      .filter(isMatchPending)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
  );

  constructor() {
    this.refresh();
    this.refreshSyncStatus();
  }

  refresh(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.matchesApi.getMatches().subscribe({
      next: (matches) => {
        this.matches.set(matches);
        const draft: Record<number, { home: number; away: number }> = {};
        for (const m of matches) {
          if (isMatchPending(m)) {
            draft[m.id] = { home: 0, away: 0 };
          }
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

  formatWhen(iso: string): string {
    try {
      return new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
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
          list.map((m) => (m.id === match.id ? { ...m, homeGoals: d.home, awayGoals: d.away } : m)),
        );
        this.draft.update((current) => {
          const next = { ...current };
          delete next[match.id];
          return next;
        });
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
        this.refresh();
        this.refreshSyncStatus();
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

  unlockSync(match: Match): void {
    this.unlockingId.set(match.id);
    this.adminApi.unlockMatchSync(match.id).subscribe({
      next: () => {
        this.unlockingId.set(null);
        this.matches.update((list) =>
          list.map((m) => (m.id === match.id ? { ...m, manualOverride: false } : m)),
        );
        this.toast.success('Override manual desactivado para este partido.');
      },
      error: () => {
        this.unlockingId.set(null);
      },
    });
  }
}
