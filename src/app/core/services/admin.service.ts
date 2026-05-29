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
}
