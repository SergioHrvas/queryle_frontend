import { Component, input } from "@angular/core";
import { LucideChevronDown, LucideKey } from "@lucide/angular";
import { DataContext as ChallengeDataContext, SchemaTable } from "@modules/challenges/models/datacontext";
import { TranslatePipe } from "@ngx-translate/core";

@Component({
    selector: "app-data-context",
    imports: [LucideChevronDown, LucideKey, TranslatePipe],
    template: `
        <details class="group border-t border-emerald-200">
            <summary class="list-none flex cursor-pointer items-center justify-between bg-emerald-100 p-3 font-bold text-emerald-900 hover:bg-emerald-200 [&::-webkit-details-marker]:hidden">
                <span>{{ 'challenge.data.title' | translate }}</span>
                <svg lucideChevronDown class="size-5 transition-transform duration-150 group-open:rotate-180"></svg>
            </summary>
            <section class="flex flex-col gap-3 p-3">
                @for (item of dataContext().dataset.tables; track item.name) {
                    @let schemaTable = findSchemaTable(item.name);
                    <div class="overflow-x-auto rounded-xl border border-emerald-600">
                        <table class="w-full min-w-max border-collapse text-left">
                            <caption class="bg-emerald-600 p-2 text-left font-bold text-white">
                                {{ item.name }}
                            </caption>
                            <thead class="bg-emerald-100">
                                <tr>
                                    @for (column of item.columns; track $index) {
                                        @let schemaColumn = schemaTable?.columns?.[$index];
                                        <th class="border border-gray-300 px-3 py-2">
                                            <span class="flex items-center gap-1">
                                                @if (schemaColumn?.primaryKey) {
                                                    <svg lucideKey class="size-3" [attr.aria-label]="'challenge.data.primaryKey' | translate"></svg>
                                                }
                                                {{ column }}
                                            </span>
                                            <span class="block text-xs font-normal">
                                                {{ schemaColumn?.type ?? ('challenge.data.unknownType' | translate) }}
                                            </span>
                                            <span class="block text-xs font-normal">
                                                {{ schemaColumn?.nullable ? ('challenge.data.nullable' | translate) : ('challenge.data.notNullable' | translate) }}
                                            </span>
                                        </th>
                                    }
                                </tr>
                            </thead>
                            <tbody>
                                @for (row of item.rows; track $index) {
                                    <tr class="even:bg-gray-50">
                                        @for (value of row; track $index) {
                                            <td class="border border-gray-300 px-3 py-2">{{ value }}</td>
                                        }
                                    </tr>
                                } @empty {
                                    <tr>
                                        <td class="px-3 py-2 text-gray-500" [attr.colspan]="item.columns.length">
                                            {{ 'challenge.data.emptyRows' | translate }}
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                } @empty {
                    <p class="text-gray-500">{{ 'challenge.data.empty' | translate }}</p>
                }
            </section>
        </details>
    `,
})
export class DataContext {
    readonly dataContext = input.required<ChallengeDataContext>();

    protected findSchemaTable(name: string): SchemaTable | undefined {
        return this.dataContext().schema.tables.find((table) => table.name === name);
    }
}
