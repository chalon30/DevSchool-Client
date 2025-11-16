// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // si está logueado, dejamos pasar
  if (authService.isLoggedIn()) {
    return true;
  }

  // si NO está logueado, lo mandamos a login
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url }, // opcional, por si luego quieres volver
  });

  return false;
};
