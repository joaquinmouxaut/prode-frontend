import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../tokens/api-base-url.token';

export interface SetMatchResultDto {
  homeGoals: number;
  awayGoals: number;
}

export interface SetMatchResultResponse {
  matchId: number;
  recalculatedPredictions: number;
  recalculatedUsers: number;
  skipped?: string;
}

export interface FixtureImportResponse {
  importedMatches: number;
  createdMatches: number;
  updatedMatches: number;
  skippedUnknownPhase: number;
  skippedManualOverride: number;
  discoveredTeams: number;
  error?: 'missing_api_key';
}

export interface FixtureSyncStatusResponse {
  enabled: boolean;
  frequencyMinutes: number;
  maxRequestsPerDay: number;
  requestsUsedToday: number;
  lastPollAt: string | null;
  lastPollResult: string | null;
  activeMatches: number;
}

export interface FixtureSyncRunResponse {
  trigger: 'manual' | 'scheduled';
  skipped?: string;
  syncedMatches: number;
  scoreChanges?: number;
  skippedByOverride?: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  setMatchResult(matchId: number, dto: SetMatchResultDto): Observable<SetMatchResultResponse> {
    return this.http.patch<SetMatchResultResponse>(
      `${this.baseUrl}/admin/matches/${matchId}/result`,
      dto,
    );
  }

  unlockMatchSync(matchId: number): Observable<{ matchId: number }> {
    return this.http.post<{ matchId: number }>(
      `${this.baseUrl}/admin/matches/${matchId}/unlock-sync`,
      {},
    );
  }

  importFixture(): Observable<FixtureImportResponse> {
    return this.http.post<FixtureImportResponse>(`${this.baseUrl}/admin/fixture/import`, {});
  }

  getFixtureSyncStatus(): Observable<FixtureSyncStatusResponse> {
    return this.http.get<FixtureSyncStatusResponse>(`${this.baseUrl}/admin/sync/status`);
  }

  runFixtureSyncNow(): Observable<FixtureSyncRunResponse> {
    return this.http.post<FixtureSyncRunResponse>(`${this.baseUrl}/admin/sync/run`, {});
  }
}
