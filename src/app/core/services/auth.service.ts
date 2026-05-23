import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, of, switchMap, tap, throwError } from 'rxjs';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import type { CreateUserDto, UpdateUserDto, User } from '../models/user.model';

const STORAGE_USER_ID = 'prode_user_id';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  hydrateFromStorage(): Observable<User | null> {
    const raw = localStorage.getItem(STORAGE_USER_ID);
    if (!raw) {
      this.currentUser.set(null);
      return of(null);
    }
    const id = Number(raw);
    if (!Number.isFinite(id)) {
      localStorage.removeItem(STORAGE_USER_ID);
      this.currentUser.set(null);
      return of(null);
    }
    return this.http.get<User>(`${this.baseUrl}/users/${id}`).pipe(
      tap((u) => this.currentUser.set(u)),
      catchError(() => {
        localStorage.removeItem(STORAGE_USER_ID);
        this.currentUser.set(null);
        return of(null);
      }),
    );
  }

  register(dto: CreateUserDto): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/users`, dto).pipe(
      tap((user) => {
        localStorage.setItem(STORAGE_USER_ID, String(user.id));
        this.currentUser.set(user);
      }),
    );
  }

  /** Login básico: busca por email en la lista de usuarios (sin endpoint dedicado en el backend). */
  loginByEmail(email: string): Observable<User> {
    const normalized = email.trim().toLowerCase();
    return this.http.get<User[]>(`${this.baseUrl}/users`).pipe(
      switchMap((users) => {
        const found = users.find((u) => u.email.toLowerCase() === normalized);
        return found
          ? of(found)
          : throwError(() => new Error('No encontramos una cuenta con ese email.'));
      }),
      tap((user) => {
        localStorage.setItem(STORAGE_USER_ID, String(user.id));
        this.currentUser.set(user);
      }),
    );
  }

  updateProfile(id: number, dto: UpdateUserDto): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/users/${id}`, dto).pipe(
      tap((user) => {
        if (this.currentUser()?.id === user.id) {
          this.currentUser.set(user);
        }
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_USER_ID);
    this.currentUser.set(null);
  }

  getStoredUserId(): number | null {
    const raw = localStorage.getItem(STORAGE_USER_ID);
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) ? id : null;
  }

  /** Indica si falta completar campeón / goleador antes del torneo. */
  needsInitialSetup(
    user: Pick<User, 'championPick' | 'topScorerPick'> | null | undefined,
  ): boolean {
    if (!user) return false;
    const missingChampion = !user.championPick?.trim();
    const missingScorer = !user.topScorerPick?.trim();
    return missingChampion || missingScorer;
  }
}
