import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, retry, throwError, timer } from 'rxjs';
import { PlayersApiService } from './players-api.service';
import { AuthService } from './auth.service';

export type PlayerSessionState =
  | { status: 'unknown' }
  | { status: 'loading'; attempt: number }
  | { status: 'ready' }
  | { status: 'error'; kind: 'temporary' | 'unauthorized' | 'permanent' };

@Injectable({
  providedIn: 'root'
})
export class PlayerSessionService {
  private readonly auth = inject(AuthService);
  private readonly playersApi = inject(PlayersApiService);

  private readonly stateSignal = signal<PlayerSessionState>({
    status: 'unknown'
  });

  private inFlight: Promise<PlayerSessionState> | null = null;

  readonly state = this.stateSignal.asReadonly();

  ensureRegistered(): Promise<PlayerSessionState> {
    if (!this.auth.isAuthenticated) {
      this.stateSignal.set({ status: 'unknown' });
      return Promise.resolve(this.stateSignal());
    }

    const currentState = this.stateSignal();
    if (currentState.status === 'ready' || currentState.status === 'error') {
      return Promise.resolve(this.stateSignal());
    }

    return this.startRegistration();
  }

  retry(): Promise<PlayerSessionState> {
    if (!this.auth.isAuthenticated) {
      this.stateSignal.set({ status: 'unknown' });
      return Promise.resolve(this.stateSignal());
    }

    return this.startRegistration();
  }

  reset(): void {
    this.stateSignal.set({ status: 'unknown' });
  }

  invalidate(): void {
    this.reset();
  }

  private startRegistration(): Promise<PlayerSessionState> {
    this.inFlight ??= this.register().finally(() => {
      this.inFlight = null;
    });

    return this.inFlight;
  }

  private async register(): Promise<PlayerSessionState> {
    this.stateSignal.set({
      status: 'loading',
      attempt: 1
    });

    try {
      await firstValueFrom(
        this.playersApi.registerMe().pipe(
          retry({
            count: 3,
            delay: (error, retryCount) => {
              if (!this.isTemporaryError(error)) {
                return throwError(() => error);
              }

              this.stateSignal.set({
                status: 'loading',
                attempt: retryCount + 1
              });

              const retryAfter = this.getRetryAfter(error);
              const delay = retryAfter ?? Math.min(4000, 1000 * 2 ** (retryCount - 1));

              return timer(delay);
            }
          })
        )
      );

      this.stateSignal.set({
        status: 'ready'
      });
    } catch (error) {
      this.stateSignal.set({
        status: 'error',
        kind: this.getErrorKind(error)
      });
    }

    return this.stateSignal();
  }

  private isTemporaryError(error: unknown): boolean {
    return error instanceof HttpErrorResponse &&
      [0, 408, 429, 500, 502, 503, 504].includes(error.status);
  }

  private getRetryAfter(error: unknown): number | undefined {
    if (!(error instanceof HttpErrorResponse)) {
      return undefined;
    }

    const value = error.headers.get('Retry-After');
    if (!value) {
      return undefined;
    }

    const seconds = Number(value);
    if (Number.isFinite(seconds)) {
      return Math.max(0, seconds * 1000);
    }

    const date = Date.parse(value);
    return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
  }

  private getErrorKind(
    error: unknown
  ): 'temporary' | 'unauthorized' | 'permanent' {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      return 'unauthorized';
    }

    if (this.isTemporaryError(error)) {
      return 'temporary';
    }

    return 'permanent';
  }
}