import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../tokens/api-base-url.token';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:3000' },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('persists token and user after login', () => {
    let emittedUserId: number | null = null;

    service.login({ email: 'ana@example.com', password: 'secret123' }).subscribe((user) => {
      emittedUserId = user.id;
    });

    const req = httpMock.expectOne('http://localhost:3000/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush({
      user: { id: 10, name: 'Ana', email: 'ana@example.com' },
      accessToken: 'header.payload.signature',
    });

    expect(emittedUserId).toBe(10);
    expect(service.currentUser()?.email).toBe('ana@example.com');
    expect(service.getStoredToken()).toBe('header.payload.signature');
  });

  it('hydrates user from storage when token is still valid', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const payload = btoa(
      JSON.stringify({ sub: 10, email: 'ana@example.com', role: 'USER', exp: futureExp }),
    );

    localStorage.setItem('prode_access_token', `header.${payload}.signature`);
    localStorage.setItem(
      'prode_user',
      JSON.stringify({ id: 10, name: 'Ana', email: 'ana@example.com' }),
    );

    let userId: number | null = null;
    service.hydrateFromStorage().subscribe((user) => {
      userId = user?.id ?? null;
    });

    expect(userId).toBe(10);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('cleans up session on logout', () => {
    localStorage.setItem('prode_access_token', 'token');
    localStorage.setItem(
      'prode_user',
      JSON.stringify({ id: 7, name: 'Beto', email: 'beto@example.com' }),
    );

    service.hydrateFromStorage().subscribe();
    service.logout();

    expect(localStorage.getItem('prode_access_token')).toBeNull();
    expect(localStorage.getItem('prode_user')).toBeNull();
    expect(service.currentUser()).toBeNull();
  });
});
