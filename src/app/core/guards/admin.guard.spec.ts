import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';

describe('adminGuard', () => {
  const runGuard = () => TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => false,
            isAdmin: () => false,
          },
        },
        {
          provide: Router,
          useValue: {
            createUrlTree: (commands: string[]) =>
              ({ toString: () => commands.join('/') }) as UrlTree,
          },
        },
      ],
    });
  });

  it('redirects unauthenticated users to auth', () => {
    expect(String(runGuard())).toBe('/auth');
  });

  it('redirects non-admin users to fixtures', () => {
    TestBed.overrideProvider(AuthService, {
      useValue: {
        isAuthenticated: () => true,
        isAdmin: () => false,
      },
    });
    expect(String(runGuard())).toBe('/fixtures');
  });

  it('allows admin users', () => {
    TestBed.overrideProvider(AuthService, {
      useValue: {
        isAuthenticated: () => true,
        isAdmin: () => true,
      },
    });
    expect(runGuard()).toBe(true);
  });
});
