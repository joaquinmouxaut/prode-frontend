import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppLucideIconsModule } from '../../shared/lucide-icons.module';
import { LeaderboardService, type LeaderboardRow } from '../../core/services/leaderboard.service';
import {
  GROUP_PHASE_LIST,
  KNOCKOUT_PHASE_LIST,
  MATCH_PHASE_LABELS,
  MATCH_PHASE_SHORT_LABELS,
  type MatchPhase,
} from '../../core/models/match-phase';
import {
  sortLeaderboardRows,
  type SortDir,
  type SortKey,
} from './leaderboard.util';

@Component({
  selector: 'app-leaderboard',
  imports: [RouterLink, AppLucideIconsModule],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.scss',
})
export class Leaderboard {
  private readonly leaderboardApi = inject(LeaderboardService);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly rows = signal<LeaderboardRow[]>([]);
  protected readonly tournamentPicksVisible = signal(false);

  protected readonly sortKey = signal<SortKey>('total');
  protected readonly sortDir = signal<SortDir>('desc');

  protected readonly knockoutPhases = KNOCKOUT_PHASE_LIST;
  protected readonly groupPhases = GROUP_PHASE_LIST;
  protected readonly knockoutExpanded = signal(false);
  protected readonly groupsExpanded = signal(false);

  protected readonly phaseShortLabel = MATCH_PHASE_SHORT_LABELS;
  protected readonly phaseFullLabel = MATCH_PHASE_LABELS;

  /** Posición canónica por puntaje total (orden del backend), id → posición 1-based. */
  private readonly positionById = computed(() => {
    const map = new Map<number, number>();
    this.rows().forEach((row, index) => map.set(row.user.id, index + 1));
    return map;
  });

  protected readonly sortedRows = computed(() =>
    sortLeaderboardRows(this.rows(), this.sortKey(), this.sortDir()),
  );

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    this.leaderboardApi.getLeaderboard().subscribe({
      next: (response) => {
        this.rows.set(response.rows ?? []);
        this.tournamentPicksVisible.set(response.tournamentPicksVisible);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar el ranking.');
        this.loading.set(false);
      },
    });
  }

  trackRow(_: number, row: LeaderboardRow): number {
    return row.user.id;
  }

  isMe(row: LeaderboardRow): boolean {
    return this.auth.currentUser()?.id === row.user.id;
  }

  setSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    this.sortKey.set(key);
    this.sortDir.set('desc');
  }

  isSorted(key: SortKey): boolean {
    return this.sortKey() === key;
  }

  sortIcon(key: SortKey): string {
    if (this.sortKey() !== key) {
      return 'chevrons-up-down';
    }
    return this.sortDir() === 'asc' ? 'chevron-up' : 'chevron-down';
  }

  toggleKnockoutExpanded(event: MouseEvent): void {
    event.stopPropagation();
    this.knockoutExpanded.update((expanded) => !expanded);
  }

  toggleGroupsExpanded(event: MouseEvent): void {
    event.stopPropagation();
    this.groupsExpanded.update((expanded) => !expanded);
  }

  /** Posición real (por puntaje total), independiente del orden visible. */
  position(row: LeaderboardRow): number {
    return this.positionById().get(row.user.id) ?? 0;
  }

  phasePoints(row: LeaderboardRow, phase: MatchPhase): number {
    return row.byPhase[phase] ?? 0;
  }
}
