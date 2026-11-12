import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import {
  ChallengeDifficulty,
  DailyChallengeSummary,
} from '@modules/challenges/models/challenge';
import { DailyChallengeService } from '@modules/challenges/services/daily-challenge.service';
import { DIFFICULTY_OPTIONS, DifficultyOption } from '@modules/challenges/components/difficulty-config';
import { DifficultyTabs } from '@modules/challenges/components/difficulty-tabs';

@Component({
  selector: 'app-difficulty-selector',
  imports: [DifficultyTabs, TranslatePipe],
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
            <div class="flex w-full flex-col gap-2">
              <app-difficulty-tabs (changed)="selectDifficulty($event)" />
              <div class="grid grid-cols-3 gap-2">
                @for (option of difficultyOptions; track option.difficulty) {
                  @if (challengeFor(option.difficulty); as challenge) {
                    <span
                      class="text-center text-xs font-medium"
                      [class]="statusTextClass(challenge)"
                    >
                      {{ statusLabelKey(challenge) | translate }}
                    </span>
                  }
                }
              </div>
            </div>
          }
        }
      </div>
    </section>
  `,
})
export class DifficultySelector {
  private readonly dailyChallengeService = inject(DailyChallengeService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly state = signal<FetchState>('loading');
  protected readonly challenges = signal<DailyChallengeSummary[]>([]);
  readonly selected = output<DailyChallengeSummary>();

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

  protected challengeFor(difficulty: ChallengeDifficulty): DailyChallengeSummary | undefined {
    return this.challenges().find((challenge) => challenge.difficulty === difficulty);
  }

  protected statusLabelKey(challenge: DailyChallengeSummary): string {
    switch (challenge.status) {
      case 'PENDING':
        return 'difficulties.status.notStarted';
      case 'IN_PROGRESS':
        return 'difficulties.status.inProgress';
      case 'COMPLETED_FAILED':
        return 'difficulties.status.failed';
      case 'COMPLETED_WON':
        return 'difficulties.status.won';
      default:
        return 'difficulties.status.notStarted';
    }
  }

  protected statusClass(challenge: DailyChallengeSummary): string {
    if (challenge.status === 'PENDING') {
      return 'challenge-status--pending';
    }

    if (challenge.status === 'IN_PROGRESS') {
      return 'challenge-status--in-progress';
    }

    return challenge.status === 'COMPLETED_FAILED'
      ? 'challenge-status--failed'
      : 'challenge-status--won';
  }

  protected statusTextClass(challenge: DailyChallengeSummary): string {
    if (challenge.status === 'PENDING') {
      return 'challenge-status-text--pending';
    }

    if (challenge.status === 'IN_PROGRESS') {
      return 'challenge-status-text--in-progress';
    }

    return challenge.status === 'COMPLETED_FAILED'
      ? 'challenge-status-text--failed'
      : 'challenge-status-text--won';
  }

  protected select(challenge: DailyChallengeSummary | undefined): void {
    if (challenge) {
      this.selected.emit(challenge);
    }
  }

  protected selectDifficulty(difficulty: ChallengeDifficulty): void {
    this.select(this.challengeFor(difficulty));
  }
}