import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { Match, UpdateMatchDto } from '../models/match.model';
import type { MatchPhase } from '../models/match-phase';
import type {
  CreatePredictionDto,
  Prediction,
  UpdatePredictionDto,
} from '../models/prediction.model';
import { API_BASE_URL } from '../tokens/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class PredictionsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getMatches(phase?: MatchPhase): Observable<Match[]> {
    let params = new HttpParams();
    if (phase) {
      params = params.set('phase', phase);
    }
    return this.http.get<Match[]>(`${this.baseUrl}/matches`, { params });
  }

  getMatch(id: number): Observable<Match> {
    return this.http.get<Match>(`${this.baseUrl}/matches/${id}`);
  }

  updateMatch(id: number, dto: UpdateMatchDto): Observable<Match> {
    return this.http.patch<Match>(`${this.baseUrl}/matches/${id}`, dto);
  }

  getPredictions(filters?: { userId?: number; matchId?: number }): Observable<Prediction[]> {
    let params = new HttpParams();
    if (filters?.userId != null) {
      params = params.set('userId', String(filters.userId));
    }
    if (filters?.matchId != null) {
      params = params.set('matchId', String(filters.matchId));
    }
    return this.http.get<Prediction[]>(`${this.baseUrl}/predictions`, { params });
  }

  getPrediction(id: number): Observable<Prediction> {
    return this.http.get<Prediction>(`${this.baseUrl}/predictions/${id}`);
  }

  createPrediction(dto: CreatePredictionDto): Observable<Prediction> {
    return this.http.post<Prediction>(`${this.baseUrl}/predictions`, dto);
  }

  updatePrediction(id: number, dto: UpdatePredictionDto): Observable<Prediction> {
    return this.http.patch<Prediction>(`${this.baseUrl}/predictions/${id}`, dto);
  }

  deletePrediction(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/predictions/${id}`);
  }
}
