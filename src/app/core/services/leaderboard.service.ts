import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { MatchPhase } from '../models/match-phase';
import type { User } from '../models/user.model';
import { API_BASE_URL } from '../tokens/api-base-url.token';

export interface LeaderboardRow {
  user: User;
  total: number;
  matchPoints: number;
  championPoints: number;
  topScorerPoints: number;
  groupsPoints: number;
  knockoutPoints: number;
  byPhase: Partial<Record<MatchPhase, number>>;
}

export interface LeaderboardResponse {
  tournamentPicksVisible: boolean;
  rows: LeaderboardRow[];
}

export function normalizeLeaderboardResponse(
  payload: LeaderboardResponse | LeaderboardRow[],
): LeaderboardResponse {
  if (Array.isArray(payload)) {
    return {
      rows: payload,
      tournamentPicksVisible: payload.some(
        (row) => row.user.championPick != null || row.user.topScorerPick != null,
      ),
    };
  }

  return {
    rows: payload.rows ?? [],
    tournamentPicksVisible: payload.tournamentPicksVisible ?? false,
  };
}

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getLeaderboard(): Observable<LeaderboardResponse> {
    return this.http
      .get<LeaderboardResponse | LeaderboardRow[]>(`${this.baseUrl}/leaderboard`)
      .pipe(map(normalizeLeaderboardResponse));
  }
}
