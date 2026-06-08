import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../tokens/api-base-url.token';

export interface TournamentStatus {
  picksLocked: boolean;
  firstMatchDate: string | null;
  firstMatchId: number | null;
}

@Injectable({ providedIn: 'root' })
export class TournamentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getStatus(): Observable<TournamentStatus> {
    return this.http.get<TournamentStatus>(`${this.baseUrl}/tournament/status`);
  }
}
