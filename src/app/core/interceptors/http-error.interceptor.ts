import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

const ERROR_MESSAGES: Record<number, string> = {
  0: 'Sin conexión al servidor',
  400: 'Solicitud inválida',
  401: 'Sesión expirada',
  403: 'No tenés permiso para esta acción',
  404: 'Recurso no encontrado',
  500: 'Error del servidor, intentá más tarde',
  502: 'Servidor temporalmente indisponible',
  503: 'Servidor temporalmente indisponible',
};

function getErrorMessage(status: number): string {
  return ERROR_MESSAGES[status] ?? 'Ocurrió un error';
}

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        auth.logout();
        void router.navigateByUrl('/auth');
        toast.error('Sesión expirada');
        return throwError(() => error);
      }

      const message = getErrorMessage(error.status);
      toast.error(message);

      return throwError(() => error);
    }),
  );
};
