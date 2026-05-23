import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { AppLucideIconsModule } from '../../shared/lucide-icons.module';
import { LeaderboardService, type LeaderboardRow } from '../../core/services/leaderboard.service';

@Component({
  selector: 'app-leaderboard',
  imports: [AppLucideIconsModule],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.scss',
})
export class Leaderboard {
  private readonly leaderboardApi = inject(LeaderboardService);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly rows = signal<LeaderboardRow[]>([]);

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    this.leaderboardApi.getLeaderboard().subscribe({
      next: (r) => {
        this.rows.set(r);
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
}
