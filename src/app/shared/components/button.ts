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
      <span
        class="inline-flex items-center gap-4"
        [class.justify-center]="centerContent()"
        [class.justify-start]="!centerContent()"
      >
        @if (icon(); as buttonIcon) {
          <span class="button-icon flex items-center justify-center rounded-lg transition-colors duration-200">
            <svg [lucideIcon]="buttonIcon" size="20" class="shrink-0"></svg>
          </span>
        }

        <span class="text-base tracking-wide">
          {{ labelKey() | translate }}
        </span>
      </span>
    </button>
  `,
})
export class Button {
  readonly labelKey = input<string>('');
  readonly icon = input<LucideIcon>();
  readonly centerContent = input(false);

  protected readonly buttonClasses = computed(() => {
    return `
      group box-border flex ${this.centerContent() ? 'justify-center' : 'justify-start'}
      ${this.centerContent() ? 'text-center' : 'text-left'}
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