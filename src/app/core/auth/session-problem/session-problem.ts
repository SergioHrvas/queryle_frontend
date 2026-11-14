import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PlayerSessionService } from '@core/auth/session.service';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-session-problem',
  templateUrl: './session-problem.html'
})
export class SessionProblem {
  private readonly session = inject(PlayerSessionService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  async retry(): Promise<void> {
    const state = await this.session.retry();

    if (state.status === 'ready') {
      const returnUrl =
        this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';

      await this.router.navigateByUrl(returnUrl);
    }
  }

  logout(): void {
    this.session.reset();
    this.auth.logout();
  }
}