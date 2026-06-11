import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { Prediction } from '../models/prediction.model';
import { API_BASE_URL } from '../tokens/api-base-url.token';

export interface ParticipantProfile {
  user: {
    id: number;
    name: string;
    email: string;
  };
  tournamentPicksVisible: boolean;
  championPick: string | null;
  topScorerPick: string | null;
  total: number;
  matchPoints: number;
  championPoints: number;
  topScorerPoints: number;
  groupsPoints: number;
  knockoutPoints: number;
  predictions: Prediction[];
}

@Injectable({ providedIn: 'root' })
export class ParticipantsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getProfile(userId: number): Observable<ParticipantProfile> {
    return this.http.get<ParticipantProfile>(`${this.baseUrl}/participants/${userId}/profile`);
  }
}
