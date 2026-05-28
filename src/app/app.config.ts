import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { AuthService } from './core/services/auth.service';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';
import { API_BASE_URL } from './core/tokens/api-base-url.token';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authTokenInterceptor, httpErrorInterceptor])),
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [AuthService],
      useFactory: (auth: AuthService) => () => firstValueFrom(auth.hydrateFromStorage()),
    },
  ],
};
