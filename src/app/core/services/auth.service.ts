import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, of, tap } from 'rxjs';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import type { AuthResponse, LoginDto, RegisterDto } from '../models/auth.model';
import type { UpdateUserDto, User } from '../models/user.model';

const STORAGE_ACCESS_TOKEN = 'prode_access_token';
const STORAGE_USER = 'prode_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  hydrateFromStorage(): Observable<User | null> {
    const token = this.getStoredToken();
    const storedUser = this.getStoredUser();
    if (!token || !storedUser) {
      this.clearSession();
      return of(null);
    }

    this.currentUser.set(storedUser);
    return of(storedUser).pipe(
      map((user) => {
        if (this.isTokenExpired(token)) {
          this.clearSession();
          return null;
        }
        return user;
      }),
    );
  }

  register(dto: RegisterDto): Observable<User> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, dto).pipe(
      tap((response) => this.setSession(response)),
      map((response) => response.user),
    );
  }

  login(dto: LoginDto): Observable<User> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, dto).pipe(
      tap((response) => this.setSession(response)),
      map((response) => response.user),
    );
  }

  updateProfile(id: number, dto: UpdateUserDto): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/users/${id}`, dto).pipe(
      tap((user) => {
        if (this.currentUser()?.id === user.id) {
          localStorage.setItem(STORAGE_USER, JSON.stringify(user));
          this.currentUser.set(user);
        }
      }),
    );
  }

  logout(): void {
    this.clearSession();
  }

  getStoredToken(): string | null {
    return localStorage.getItem(STORAGE_ACCESS_TOKEN);
  }

  getStoredUserId(): number | null {
    return this.currentUser()?.id ?? this.getStoredUser()?.id ?? null;
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

  private setSession(response: AuthResponse): void {
    localStorage.setItem(STORAGE_ACCESS_TOKEN, response.accessToken);
    localStorage.setItem(STORAGE_USER, JSON.stringify(response.user));
    this.currentUser.set(response.user);
  }

  private clearSession(): void {
    localStorage.removeItem(STORAGE_ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    this.currentUser.set(null);
  }

  private getStoredUser(): User | null {
    const raw = localStorage.getItem(STORAGE_USER);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as User;
    } catch {
      localStorage.removeItem(STORAGE_USER);
      this.currentUser.set(null);
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
      if (!payload.exp) {
        return false;
      }
      return payload.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }
}
