import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideDynamicIcon } from '@lucide/angular';
import {
  difficultyOptionFor,
} from '@modules/challenges/components/difficulty-config';
import { ChallengeDifficulty } from '@modules/challenges/models/challenge';

@Component({
  selector: 'app-difficulty-badge',
  imports: [LucideDynamicIcon, TranslatePipe],
  template: `
    <span
      class="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 font-semibold text-white"
      [class]="option().className"
    >
      <svg [lucideIcon]="option().icon" size="20"></svg>
      <span>{{ option().labelKey | translate }}</span>
    </span>
  `,
})
export class DifficultyBadge {
  readonly difficulty = input.required<ChallengeDifficulty>();
  protected readonly option = computed(() => difficultyOptionFor(this.difficulty()));
}
