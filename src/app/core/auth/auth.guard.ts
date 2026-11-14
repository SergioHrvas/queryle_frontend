import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { Router } from '@angular/router';
import { PlayerSessionService } from './session.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const authService = inject(AuthService);
  const playerSession = inject(PlayerSessionService);
  const router = inject(Router);

  if (!authService.isAuthenticated) {
    return router.createUrlTree(['/login'], {
      queryParams: {
        returnUrl: state.url,
      },
    });
  }

  const sessionState = await playerSession.ensureRegistered();

  if (sessionState.status === 'ready') {
    return true;
  }

  if (sessionState.status === 'failed' && sessionState.kind === 'unauthorized') {
    return router.createUrlTree(['/login'], {
      queryParams: {
        returnUrl: state.url,
      },
    });
  }

  return router.createUrlTree(['/session-problem'], {
    queryParams: {
      returnUrl: state.url,
    },
  });
};
