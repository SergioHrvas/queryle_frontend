import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { PlayerSessionService } from '@core/auth/session.service';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly playerSession = inject(PlayerSessionService);

  protected readonly title = signal('queryle-frontend');

  constructor() {
    if (this.auth.isAuthenticated) {
      void this.playerSession.ensureRegistered();
    }
  }
}