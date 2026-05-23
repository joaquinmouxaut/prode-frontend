import { Injectable, inject } from '@angular/core';
import { forkJoin, map, type Observable } from 'rxjs';
import { GROUP_PHASES, type MatchPhase } from '../models/match-phase';
import type { Match } from '../models/match.model';
import type { Prediction } from '../models/prediction.model';
import type { User } from '../models/user.model';
import { PredictionsService } from './predictions.service';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../tokens/api-base-url.token';

export interface LeaderboardRow {
  user: User;
  total: number;
  groupsPoints: number;
  knockoutPoints: number;
  byPhase: Partial<Record<MatchPhase, number>>;
}

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private readonly predictionsApi = inject(PredictionsService);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** Agrega puntos desde predicciones + partidos; útil mientras no exista un endpoint dedicado de ranking. */
  getLeaderboard(): Observable<LeaderboardRow[]> {
    return forkJoin({
      users: this.http.get<User[]>(`${this.baseUrl}/users`),
      predictions: this.predictionsApi.getPredictions(),
      matches: this.predictionsApi.getMatches(),
    }).pipe(map(({ users, predictions, matches }) => this.buildRows(users, predictions, matches)));
  }

  private buildRows(users: User[], predictions: Prediction[], matches: Match[]): LeaderboardRow[] {
    const matchById = new Map(matches.map((m) => [m.id, m] as const));
    const byUser = new Map<
      number,
      {
        total: number;
        groups: number;
        knockout: number;
        byPhase: Partial<Record<MatchPhase, number>>;
      }
    >();

    for (const u of users) {
      byUser.set(u.id, { total: 0, groups: 0, knockout: 0, byPhase: {} });
    }

    for (const p of predictions) {
      const bucket = byUser.get(p.userId);
      if (!bucket) continue;
      const pts = p.points ?? 0;
      const match = p.match ?? matchById.get(p.matchId);
      const phase = match?.phase;
      bucket.total += pts;
      if (phase) {
        bucket.byPhase[phase] = (bucket.byPhase[phase] ?? 0) + pts;
        if (GROUP_PHASES.has(phase)) {
          bucket.groups += pts;
        } else {
          bucket.knockout += pts;
        }
      }
    }

    return users
      .map((user) => {
        const b = byUser.get(user.id)!;
        return {
          user,
          total: b.total,
          groupsPoints: b.groups,
          knockoutPoints: b.knockout,
          byPhase: b.byPhase,
        } satisfies LeaderboardRow;
      })
      .sort((a, b) => b.total - a.total);
  }
}
