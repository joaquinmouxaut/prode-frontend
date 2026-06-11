import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { MatchPhase } from '../models/match-phase';
import type { User } from '../models/user.model';
import { HttpClient } from '@angular/common/http';
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

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getLeaderboard(): Observable<LeaderboardResponse> {
    return this.http.get<LeaderboardResponse>(`${this.baseUrl}/leaderboard`);
  }
}
