import { HttpClient } from '@angular/common/http';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Mock, vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { httpErrorInterceptor } from './http-error.interceptor';

describe('httpErrorInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;
  const toast = { error: vi.fn() } as unknown as ToastService;
  const router = {
    navigateByUrl: vi.fn().mockResolvedValue(true),
  } as unknown as Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: API_BASE_URL, useValue: 'http://localhost:3000' },
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toast },
        { provide: Router, useValue: router },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'logout');
    (toast.error as Mock).mockReset();
    (router.navigateByUrl as Mock).mockReset();
    (auth.logout as Mock).mockReset();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('forces logout and redirects on 401', () => {
    httpClient.get('/api/protected').subscribe({
      next: () => undefined,
      error: () => undefined,
    });

    const req = httpMock.expectOne('/api/protected');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth');
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('expirada'));
  });
});
