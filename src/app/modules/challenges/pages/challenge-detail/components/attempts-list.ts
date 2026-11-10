import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { Attempt } from '@modules/challenges/models/game';
import { ColumnHelp } from './column-help';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideShieldX } from '@lucide/angular';

@Component({
  selector: 'app-attempts-list',
  imports: [DatePipe, ColumnHelp, TranslatePipe, LucideShieldX],
  template: `
    <section class="border-t border-gray-200 bg-gray-50 p-3" aria-labelledby="attempts-title">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="attempts-title" class="font-bold text-gray-800">
          {{ 'attempts.title' | translate }}
        </h2>
        <div
          class="flex gap-3 text-xs text-gray-600"
          [attr.aria-label]="'attempts.legend.label' | translate"
        >
          <span class="flex items-center gap-1">
            <svg lucideShieldX class="h-4 w-4 text-red-700"></svg> {{ 'attempts.legend.trap' | translate }}
          </span>
          <span>🟩 {{ 'attempts.legend.exact' | translate }}</span>
          <span>🟨 {{ 'attempts.legend.partial' | translate }}</span>
          <span>🟥 {{ 'attempts.legend.none' | translate }}</span>
        </div>
      </div>

      @if (attempts().length) {
        <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table class="w-full min-w-190 table-fixed border-collapse text-left text-sm">
            <caption class="sr-only">
              {{
                'attempts.tableCaption' | translate
              }}
            </caption>
            <colgroup>
              <col class="w-2/5" />
              <col class="w-[12%]" />
              <col class="w-[12%]" />
              <col class="w-[12%]" />
              <col class="w-[12%]" />
              <col class="w-[12%]" />
            </colgroup>
            <thead class="bg-emerald-100 text-xs uppercase text-gray-700">
              <tr>
                <th scope="col" class="px-3 py-2">{{ 'attempts.headers.query' | translate }}</th>
                <th scope="col" class="relative w-24 whitespace-nowrap px-3 py-2 text-center">
                  <div class="flex items-center justify-center gap-1">
                    <span>{{ 'attempts.headers.columnsCount' | translate }}</span>
                    <app-column-help
                      titleKey="attempts.help.columns.title"
                      descriptionKey="attempts.help.columns.description"
                    />
                  </div>
                </th>
                <th scope="col" class="relative w-24 whitespace-nowrap px-3 py-2 text-center">
                  <div class="flex items-center justify-center gap-1">
                    <span>{{ 'attempts.headers.columnsNames' | translate }}</span>
                    <app-column-help
                      titleKey="attempts.help.names.title"
                      descriptionKey="attempts.help.names.description"
                    />
                  </div>
                </th>
                <th scope="col" class="relative w-24 whitespace-nowrap px-3 py-2 text-center">
                  <div class="flex items-center justify-center gap-1">
                    <span>{{ 'attempts.headers.rowsCount' | translate }}</span>
                    <app-column-help
                      titleKey="attempts.help.rows.title"
                      descriptionKey="attempts.help.rows.description"
                    />
                  </div>
                </th>
                <th scope="col" class="relative w-24 whitespace-nowrap px-3 py-2 text-center">
                  <div class="flex items-center justify-center gap-1">
                    <span>{{ 'attempts.headers.rowsData' | translate }}</span>
                    <app-column-help
                      titleKey="attempts.help.data.title"
                      descriptionKey="attempts.help.data.description"
                    />
                  </div>
                </th>
                <th scope="col" class="relative w-24 whitespace-nowrap px-3 py-2 text-center">
                  <div class="flex items-center justify-center gap-1">
                    <span>{{ 'attempts.headers.rowsOrder' | translate }}</span>
                    <app-column-help
                      titleKey="attempts.help.order.title"
                      descriptionKey="attempts.help.order.description"
                      align="right"
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              @for (attempt of attempts(); track attempt.id) {
                <tr class="border-t border-gray-200 align-top hover:bg-emerald-50">
                  <td class="max-w-70 px-3 py-3 font-mono text-xs text-gray-700">
                    <div class="flex flex-row items-center justify-between gap-2">
                      <div class="flex min-w-0 flex-1 flex-col">
                        <span class="block whitespace-normal break-words" [title]="attempt.query">
                          {{ attempt.query }}
                        </span>
                        <span class="block text-xs text-gray-500">
                          {{ attempt.submittedAt | date: 'short' }}
                        </span>
                      </div>
                      @if (!attempt.validationPassed && allMatchLevelsExact(attempt)) {
                        <span class="flex shrink-0 items-center gap-1">
                          <svg lucideShieldX class="h-6 w-6 text-red-700"></svg>
                        </span>
                      }
                    </div>
                  </td>
                  <td
                    class="px-3 py-3 text-center text-lg"
                    [attr.aria-label]="attempt.columnsCountMatchLevel"
                  >
                    {{ resultIcon(attempt.columnsCountMatchLevel) }}
                  </td>
                  <td
                    class="px-3 py-3 text-center text-lg"
                    [attr.aria-label]="attempt.columnsNamesMatchLevel"
                  >
                    {{ resultIcon(attempt.columnsNamesMatchLevel) }}
                  </td>
                  <td
                    class="px-3 py-3 text-center text-lg"
                    [attr.aria-label]="attempt.rowsCountMatchLevel"
                  >
                    {{ resultIcon(attempt.rowsCountMatchLevel) }}
                  </td>
                  <td
                    class="px-3 py-3 text-center text-lg"
                    [attr.aria-label]="attempt.rowsDataMatchLevel"
                  >
                    {{ resultIcon(attempt.rowsDataMatchLevel) }}
                  </td>
                  <td
                    class="px-3 py-3 text-center text-lg"
                    [attr.aria-label]="attempt.rowsOrderMatchLevel"
                  >
                    {{ resultIcon(attempt.rowsOrderMatchLevel) }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <p
          class="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-500"
        >
          {{ 'attempts.empty' | translate }}
        </p>
      }
    </section>
  `,
})
export class AttemptsList {
  attempts = input<Attempt[]>([]);

  protected allMatchLevelsExact(attempt: Attempt): boolean {
    return (
      attempt.columnsCountMatchLevel === 'EXACT' &&
      attempt.columnsNamesMatchLevel === 'EXACT' &&
      attempt.rowsCountMatchLevel === 'EXACT' &&
      attempt.rowsDataMatchLevel === 'EXACT' &&
      attempt.rowsOrderMatchLevel === 'EXACT'
    );
  }

  protected resultIcon(result: Attempt['columnsCountMatchLevel']): string {
    return result === 'EXACT' ? '🟩' : result === 'PARTIAL' ? '🟨' : '🟥';
  }
}
