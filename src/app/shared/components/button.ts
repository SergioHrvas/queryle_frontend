import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideDynamicIcon, LucideIcon } from '@lucide/angular';

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

      <span [class.text-left]="icon()" class="min-w-0 text-base tracking-wide">
        {{ labelKey() | translate }}
      </span>
    </button>
  `,
})
export class Button {
  readonly labelKey = input<string>('');
  readonly icon = input<LucideIcon>();

  protected readonly buttonClasses = computed(() => {
    return `
      group box-border ${this.icon() ? 'grid grid-cols-[2.5rem_minmax(0,1fr)]' : 'flex justify-center text-center'}
      w-full min-w-0 items-center gap-3 rounded-xl border border-[var(--button-border)]
      bg-[var(--button-background)] px-4 py-3 font-semibold text-white
      shadow-md shadow-[var(--button-shadow)] cursor-pointer transition-all duration-200 ease-out
      hover:-translate-y-0.5 hover:border-[var(--button-hover-border)]
      hover:bg-[var(--button-hover-background)] hover:shadow-lg
      active:translate-y-0 active:scale-[0.98]
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      focus-visible:ring-[var(--button-ring)] focus-visible:ring-offset-slate-900
    `;
  });
}