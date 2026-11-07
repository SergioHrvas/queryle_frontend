import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { Button } from '@shared/components/button';
import { ChallengeDifficulty, DailyChallenge } from '@modules/challenges/models/challenge-difficulty';
import { DailyChallengeService } from '@modules/challenges/services/daily-challenge.service';

type DifficultyOption = {
  labelKey: string;
  difficulty: ChallengeDifficulty;
  className: string;
};

type SelectorState = 'loading' | 'loaded' | 'empty' | 'error';

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
                  <app-button
                    [labelKey]="option.labelKey"
                    [class]="option.className"
                    (click)="select(challenge)"
                  />
                }
              }
            </div>
          }
        }
      </div>
    </section>
  `,
  styles: `
    :host {
      --button-border: rgba(5, 150, 105, 0.5);
      --button-background: #047857;
      --button-hover-border: #10b981;
      --button-hover-background: #059669;
      --button-shadow: rgba(2, 44, 34, 0.2);
      --button-ring: #34d399;
    }

    .difficulty-button--easy {
      --button-border: rgba(22, 163, 74, 0.5);
      --button-background: #15803d;
      --button-hover-border: #22c55e;
      --button-hover-background: #16a34a;
      --button-ring: #4ade80;
    }

    .difficulty-button--medium {
      --button-border: rgba(217, 119, 6, 0.5);
      --button-background: #b45309;
      --button-hover-border: #f59e0b;
      --button-hover-background: #d97706;
      --button-ring: #fbbf24;
    }

    .difficulty-button--hard {
      --button-border: rgba(220, 38, 38, 0.5);
      --button-background: #b91c1c;
      --button-hover-border: #ef4444;
      --button-hover-background: #dc2626;
      --button-ring: #f87171;
    }
  `,
})
export class DifficultySelector {
  private readonly dailyChallengeService = inject(DailyChallengeService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly state = signal<SelectorState>('loading');
  protected readonly challenges = signal<DailyChallenge[]>([]);
  readonly selected = output<DailyChallenge>();

  protected readonly difficultyOptions: DifficultyOption[] = [
    { labelKey: 'difficulties.easy',
      difficulty: 'EASY',
      className: 'difficulty-button--easy'
    },
    {
      labelKey: 'difficulties.medium',
      difficulty: 'MEDIUM',
      className: 'difficulty-button--medium',
    },
    {
      labelKey: 'difficulties.hard',
      difficulty: 'HARD',
      className: 'difficulty-button--hard',
    },
  ];

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

  protected challengeFor(difficulty: ChallengeDifficulty): DailyChallenge | undefined {
    return this.challenges().find((challenge) => challenge.difficulty === difficulty);
  }

  protected select(challenge: DailyChallenge | undefined): void {
    if (challenge) {
      this.selected.emit(challenge);
    }
  }
}