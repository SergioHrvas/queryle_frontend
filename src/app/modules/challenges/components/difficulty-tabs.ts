import { Component, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideDynamicIcon } from '@lucide/angular';
import {
  DIFFICULTY_OPTIONS,
  DifficultyOption,
} from '@modules/challenges/components/difficulty-config';
import { ChallengeDifficulty } from '@modules/challenges/models/challenge';

@Component({
  selector: 'app-difficulty-tabs',
  imports: [NgClass, LucideDynamicIcon, TranslatePipe],
  template: `
    <div class="grid grid-cols-3 gap-2" role="group" [attr.aria-label]="ariaLabel()">
      @for (option of options; track option.difficulty) {
        <button
          type="button"
          class="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg border-2 border-(--button-border) bg-(--button-background) px-2.5 py-2 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-(--button-hover-background) focus-visible:outline-3 focus-visible:outline-emerald-300 focus-visible:outline-offset-2 sm:px-4 sm:text-sm"
          [ngClass]="option.className"
          [class.ring-2]="selected() === option.difficulty"
          [class.ring-offset-2]="selected() === option.difficulty"
          [class.ring-slate-400]="selected() === option.difficulty"
          [attr.aria-pressed]="selected() === option.difficulty"
          (click)="select(option.difficulty)"
        >
          <svg [lucideIcon]="option.icon" class="size-4 sm:size-5"></svg>
          <span class="truncate">{{ option.labelKey | translate }}</span>
        </button>
      }
    </div>
  `,
})
export class DifficultyTabs {
  readonly options: DifficultyOption[] = DIFFICULTY_OPTIONS;
  readonly selected = input<ChallengeDifficulty>(ChallengeDifficulty.EASY);
  readonly ariaLabel = input('Selector de dificultad');
  readonly changed = output<ChallengeDifficulty>();

  protected select(difficulty: ChallengeDifficulty): void {
    this.changed.emit(difficulty);
  }
}
