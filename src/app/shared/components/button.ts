import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideDynamicIcon, LucideIcon } from '@lucide/angular';
import { ButtonVariant } from '../../modules/challenges/models/challenge-difficulty';

@Component({
  selector: 'app-button',
  imports: [TranslatePipe, LucideDynamicIcon],
  template: `
    <button
      [class]="buttonClasses()"
    >
      @if (icon(); as buttonIcon) {
        <span class="button-icon flex h-10 w-10 items-center justify-center rounded-lg p-1.5 transition-colors duration-200">
          <svg [lucideIcon]="buttonIcon" size="20" class="shrink-0"></svg>
        </span>
      }

      <span [class.text-left]="icon()" class="min-w-0 wrap-break-word text-base tracking-wide">
        {{ labelKey() | translate }}
      </span>
    </button>
  `,
})
export class Button {
  readonly labelKey = input<string>('');
  readonly icon = input<LucideIcon>();
  readonly variant = input<ButtonVariant>('primary');

  protected readonly buttonClasses = computed(() => {
    const colorClasses: Record<ButtonVariant, string> = {
      primary: `
        border-emerald-600/50 bg-emerald-700 shadow-emerald-950/20
        hover:border-emerald-500 hover:bg-emerald-600 hover:shadow-emerald-900/20
        focus-visible:ring-emerald-400
        [&_.button-icon]:bg-emerald-600/50 [&_.button-icon]:group-hover:bg-emerald-500/50
      `,
      easy: `
        border-green-600/50 bg-green-700 shadow-green-950/20
        hover:border-green-500 hover:bg-green-600 hover:shadow-green-900/20
        focus-visible:ring-green-400
        [&_.button-icon]:bg-green-600/50 [&_.button-icon]:group-hover:bg-green-500/50
      `,
      medium: `
        border-amber-600/50 bg-amber-700 shadow-amber-950/20
        hover:border-amber-500 hover:bg-amber-600 hover:shadow-amber-900/20
        focus-visible:ring-amber-400
        [&_.button-icon]:bg-amber-600/50 [&_.button-icon]:group-hover:bg-amber-500/50
      `,
      hard: `
        border-red-600/50 bg-red-700 shadow-red-950/20
        hover:border-red-500 hover:bg-red-600 hover:shadow-red-900/20
        focus-visible:ring-red-400
        [&_.button-icon]:bg-red-600/50 [&_.button-icon]:group-hover:bg-red-500/50
      `,
    };

    return `
      group box-border ${this.icon() ? 'grid grid-cols-[2.5rem_minmax(0,1fr)]' : 'flex justify-center text-center'}
      w-full min-w-0 items-center gap-3 rounded-xl border px-4 py-3 font-semibold text-white
      shadow-md cursor-pointer transition-all duration-200 ease-out
      hover:-translate-y-0.5 hover:shadow-lg
      active:translate-y-0 active:scale-[0.98]
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      focus-visible:ring-offset-slate-900
      ${colorClasses[this.variant()]}
    `;
  });
}