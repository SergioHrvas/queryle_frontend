import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideDynamicIcon, LucideIcon } from '@lucide/angular';

export type ButtonColor = 'emerald' | 'sky' | 'rose';

// Clases completas, nunca `bg-${color}-700`: Tailwind no detectaría las interpoladas
const COLOR_CLASSES = {
  emerald:
    'bg-emerald-700 border-emerald-600/50 shadow-emerald-950/20 hover:bg-emerald-600 hover:border-emerald-500 focus-visible:ring-emerald-400',
  sky:
    'bg-sky-700 border-sky-600/50 shadow-sky-950/20 hover:bg-sky-600 hover:border-sky-500 focus-visible:ring-sky-400',
  rose:
    'bg-rose-700 border-rose-600/50 shadow-rose-950/20 hover:bg-rose-600 hover:border-rose-500 focus-visible:ring-rose-400',
} as const satisfies Record<ButtonColor, string>;

const BASE_CLASSES = `
  group box-border flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3
  font-semibold text-white shadow-md transition-all duration-200 ease-out
  hover:-translate-y-0.5 hover:shadow-lg
  active:translate-y-0 active:scale-[0.98]
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
  disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0
`;

@Component({
  selector: 'app-button',
  imports: [TranslatePipe, LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      [class]="classes()"
      [class.justify-center]="centerContent()"
    >
      @if (icon(); as buttonIcon) {
        <svg [lucideIcon]="buttonIcon" size="20" class="shrink-0" aria-hidden="true"></svg>
      }
      <span class="text-base tracking-wide">{{ labelKey() | translate }}</span>
    </button>
  `,
})
export class Button {
  readonly labelKey = input<string>('');
  readonly icon = input<LucideIcon>();
  readonly centerContent = input(false);
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly color = input<ButtonColor>('emerald');
  readonly disabled = input(false);

  protected readonly classes = computed(() => `${BASE_CLASSES} ${COLOR_CLASSES[this.color()]}`);
}