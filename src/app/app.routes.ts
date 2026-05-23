import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/auth').then((m) => m.Auth),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'fixtures' },
      {
        path: 'fixtures',
        loadComponent: () => import('./features/fixture/fixture').then((m) => m.Fixture),
      },
      {
        path: 'leaderboard',
        loadComponent: () =>
          import('./features/leaderboard/leaderboard').then((m) => m.Leaderboard),
      },
      {
        path: 'setup',
        loadComponent: () =>
          import('./features/initial-setup/initial-setup').then((m) => m.InitialSetup),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
