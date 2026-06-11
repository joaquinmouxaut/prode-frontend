import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { BRANDING } from '../../core/constants/branding';
import { AuthService } from '../../core/services/auth.service';
import { AppLucideIconsModule } from '../../shared/lucide-icons.module';
import { PredictionsService } from '../../core/services/predictions.service';
import { MATCH_PHASE_LABELS, type MatchPhase } from '../../core/models/match-phase';
import type { Match } from '../../core/models/match.model';
import type { Prediction } from '../../core/models/prediction.model';
import {
  formatMatchScore,
  hasScoreableResult,
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

@Component({
  selector: 'app-fixture',
  imports: [FormsModule, RouterLink, AppLucideIconsModule],
  templateUrl: './fixture.html',
  styleUrl: './fixture.scss',
})
export class Fixture {
  private readonly predictionsApi = inject(PredictionsService);
  protected readonly auth = inject(AuthService);
  protected readonly branding = BRANDING;

  protected readonly MATCH_PHASE_LABELS = MATCH_PHASE_LABELS;

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly matches = signal<Match[]>([]);
  protected readonly predictionByMatchId = signal<Map<number, Prediction>>(new Map());
  protected readonly visiblePredictions = signal<Prediction[]>([]);
  /** Borrador local: matchId -> goles */
  protected readonly draft = signal<Record<number, { home: number; away: number }>>({});
  protected readonly savingId = signal<number | null>(null);
  protected readonly rowError = signal<string | null>(null);

  protected readonly groups = computed(() => this.buildGroups(this.matches()));

  protected readonly isMatchStarted = isMatchStarted;
  protected readonly isMatchInProgress = isMatchInProgress;
  protected readonly isMatchFinished = isMatchFinished;
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
    }).subscribe({
      next: ({ matches, predictions }) => {
        const sorted = [...matches].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        this.matches.set(sorted);
        this.visiblePredictions.set(predictions);
        const map = new Map<number, Prediction>();
        const draft: Record<number, { home: number; away: number }> = {};
        for (const p of predictions.filter((item) => item.userId === user.id)) {
          map.set(p.matchId, p);
          draft[p.matchId] = { home: p.homeGoals, away: p.awayGoals };
        }
        for (const m of sorted) {
          if (!draft[m.id]) {
            draft[m.id] = { home: 0, away: 0 };
          }
        }
        this.predictionByMatchId.set(map);
        this.draft.set(draft);
        this.loading.set(false);
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
    try {
      return new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  clampGoals(raw: string): number {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(n, 99);
  }

  onGoalsChange(matchId: number, side: 'home' | 'away', value: string | number): void {
    const n = this.clampGoals(typeof value === 'number' ? String(value) : value);
    this.draft.update((d) => ({
      ...d,
      [matchId]: {
        home: side === 'home' ? n : (d[matchId]?.home ?? 0),
        away: side === 'away' ? n : (d[matchId]?.away ?? 0),
      },
    }));
  }

  savePrediction(match: Match): void {
    const user = this.auth.currentUser();
    if (!user || isMatchStarted(match)) {
      this.rowError.set('Este partido ya comenzó: la predicción quedó bloqueada.');
      return;
    }
    const d = this.draft()[match.id];
    if (!d) return;
    this.rowError.set(null);
    this.savingId.set(match.id);
    const existing = this.predictionByMatchId().get(match.id);
    const req$ = existing
      ? this.predictionsApi.updatePrediction(existing.id, {
          homeGoals: d.home,
          awayGoals: d.away,
        })
      : this.predictionsApi.createPrediction({
          userId: user.id,
          matchId: match.id,
          homeGoals: d.home,
          awayGoals: d.away,
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

  otherPredictionsForMatch(match: Match): Prediction[] {
    const user = this.auth.currentUser();
    if (!user || !isMatchStarted(match)) {
      return [];
    }

    return this.visiblePredictions().filter(
      (prediction) =>
        prediction.matchId === match.id && prediction.userId !== user.id && prediction.user,
    );
  }

  private buildGroups(matches: Match[]): FixtureDayGroup[] {
    const byDate = new Map<string, Map<MatchPhase, Match[]>>();
    for (const m of matches) {
      const dateKey = m.date.slice(0, 10);
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, new Map());
      }
      const inner = byDate.get(dateKey)!;
      if (!inner.has(m.phase)) {
        inner.set(m.phase, []);
      }
      inner.get(m.phase)!.push(m);
    }
    const formatter = new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
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
      const heading = formatter.format(new Date(dateKey + 'T12:00:00'));
      result.push({ dateKey, heading, sections });
    }
    result.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    return result;
  }
}
