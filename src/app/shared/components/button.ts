import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideDynamicIcon, LucideIcon } from '@lucide/angular';

@Component({
  selector: 'app-button',
  imports: [RouterLink, TranslatePipe, LucideDynamicIcon],
  template: `
    <a
      [routerLink]="route()"
      class="
        group box-border grid w-full min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3
        rounded-xl border border-emerald-600/50
        bg-emerald-700 px-4 py-3
        font-semibold text-white
        shadow-md shadow-emerald-950/20

        transition-all duration-200 ease-out

        hover:-translate-y-0.5
        hover:border-emerald-500
        hover:bg-emerald-600
        hover:shadow-lg hover:shadow-emerald-900/20

        active:translate-y-0
        active:scale-[0.98]

        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-emerald-400
        focus-visible:ring-offset-2
        focus-visible:ring-offset-slate-900
      "
    >
      <span
        class="
          flex h-10 w-10 items-center justify-center justify-self-center
          rounded-lg bg-emerald-600/50 p-1.5
          transition-colors duration-200
          group-hover:bg-emerald-500/50
        "
      >
        <svg
          [lucideIcon]="icon()"
          size="20"
          class="shrink-0"
        ></svg>
      </span>

      <span class="min-w-0 wrap-break-word text-left text-base tracking-wide">
        {{ labelKey() | translate }}
      </span>
    </a>
  `,
})
export class Button {
  readonly labelKey = input<string>('');
  readonly route = input.required<string>();
  readonly icon = input.required<LucideIcon>();
}