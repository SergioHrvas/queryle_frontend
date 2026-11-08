import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { Button } from '@shared/components/button';
import { ChallengeDifficulty, DailyChallengeBase } from '@modules/challenges/models/challenge';
import { DailyChallengeService } from '@modules/challenges/services/daily-challenge.service';
import {
  DIFFICULTY_OPTIONS,
  DifficultyOption,
} from '@modules/challenges/components/difficulty-config';

@Component({
  selector: 'app-difficulty-selector',
  imports: [Button, TranslatePipe],
  template: `
    <section
      class="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-slate-900 p-4 shadow-xl sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="difficulty-selector-title"
      (click)="$event.stopPropagation()"
    >
      <div class="flex flex-col items-center justify-center gap-2 sm:gap-4">
        <h2 id="difficulty-selector-title" class="text-xs font-semibold text-white sm:text-lg">
          {{ 'difficulties.select' | translate }}
        </h2>

        @switch (state()) {
          @case ('loading') {
            <p class="text-sm text-slate-300">{{ 'common.loading' | translate }}</p>
          }
          @case ('error') {
            <p class="text-sm text-red-300">{{ 'common.error' | translate }}</p>
          }
          @case ('empty') {
            <p class="text-sm text-slate-300">{{ 'difficulties.empty' | translate }}</p>
          }
          @case ('loaded') {
            <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
              @for (option of difficultyOptions; track option.difficulty) {
                @if (challengeFor(option.difficulty); as challenge) {
                  <div class="flex w-full flex-col gap-1">
                    <app-button
                      [labelKey]="option.labelKey"
                      [icon]="option.icon"
                      [centerContent]="true"
                      [class]="option.className + ' ' + statusClass(challenge)"
                      (click)="select(challenge)"
                    />
                    <span
                      class="text-center text-xs font-medium"
                      [class]="statusTextClass(challenge)"
                    >
                      {{ statusLabelKey(challenge) | translate }}
                    </span>
                  </div>
                }
              }
            </div>
          }
        }
      </div>
    </section>
  `,
  styles: `
    .challenge-status--not-started {
      --button-border: rgba(100, 116, 139, 0.7);
    }

    .challenge-status--in-progress {
      --button-border: rgba(245, 158, 11, 0.9);
      --button-ring: #fbbf24;
    }

    .challenge-status--completed {
      --button-border: rgba(52, 211, 153, 0.9);
      --button-ring: #6ee7b7;
    }
  `,
})
export class DifficultySelector {
  private readonly dailyChallengeService = inject(DailyChallengeService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly state = signal<FetchState>('loading');
  protected readonly challenges = signal<DailyChallengeBase[]>([]);
  readonly selected = output<DailyChallengeBase>();

  protected readonly difficultyOptions: DifficultyOption[] = DIFFICULTY_OPTIONS;

  ngOnInit(): void {
    this.dailyChallengeService
      .getToday()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (challenges) => {
          this.challenges.set(challenges);
          this.state.set(challenges.length > 0 ? 'loaded' : 'empty');
        },
        error: () => this.state.set('error'),
      });
  }

  protected challengeFor(difficulty: ChallengeDifficulty): DailyChallengeBase | undefined {
    return this.challenges().find((challenge) => challenge.difficulty === difficulty);
  }

  protected statusLabelKey(challenge: DailyChallengeBase): string {
    if (!challenge.game) {
      return 'difficulties.status.notStarted';
    }

    return challenge.game.status === 'IN_PROGRESS'
      ? 'difficulties.status.inProgress'
      : 'difficulties.status.completed';
  }

  protected statusClass(challenge: DailyChallengeBase): string {
    if (!challenge.game) {
      return 'challenge-status--not-started';
    }

    return challenge.game.status === 'IN_PROGRESS'
      ? 'challenge-status--in-progress'
      : 'challenge-status--completed';
  }

  protected statusTextClass(challenge: DailyChallengeBase): string {
    if (!challenge.game) {
      return 'text-slate-400';
    }

    return challenge.game.status === 'IN_PROGRESS'
      ? 'text-amber-300'
      : 'text-emerald-300';
  }

  protected select(challenge: DailyChallengeBase | undefined): void {
    if (challenge) {
      this.selected.emit(challenge);
    }
  }
}