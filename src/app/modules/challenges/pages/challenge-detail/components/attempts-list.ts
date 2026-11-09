import { DatePipe } from "@angular/common";
import { Component, input } from "@angular/core";
import { Attempt } from "@modules/challenges/models/game";

@Component({
    selector: 'app-attempts-list',
    imports: [DatePipe],
    template: `
        <section class="border-t border-gray-200 bg-gray-50 p-3" aria-labelledby="attempts-title">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 id="attempts-title" class="font-bold text-gray-800">Intentos anteriores</h2>
                <div class="flex gap-3 text-xs text-gray-600" aria-label="Leyenda de resultados">
                    <span>🟩 Exacto</span>
                    <span>🟨 Parcial</span>
                    <span>🟥 Sin coincidencia</span>
                </div>
            </div>

            @if (attempts().length) {
                <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                    <table class="w-full min-w-190 table-fixed border-collapse text-left text-sm">
                        <caption class="sr-only">Resultados de los intentos enviados</caption>
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
                                <th scope="col" class="px-3 py-2">Consulta SQL</th>
                                <th scope="col" class="w-24 whitespace-nowrap px-3 py-2 text-center">Columnas</th>
                                <th scope="col" class="w-24 whitespace-nowrap px-3 py-2 text-center">Nombres</th>
                                <th scope="col" class="w-24 whitespace-nowrap px-3 py-2 text-center">Filas</th>
                                <th scope="col" class="w-24 whitespace-nowrap px-3 py-2 text-center">Datos</th>
                                <th scope="col" class="w-24 whitespace-nowrap px-3 py-2 text-center">Orden</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (attempt of attempts(); track attempt.id) {
                                <tr class="border-t border-gray-200 align-top hover:bg-emerald-50">
                                    <td class="max-w-70 px-3 py-3 font-mono text-xs text-gray-700">
                                        <div class="flex flex-col">
                                            <span class="block truncate" [title]="attempt.query">
                                                {{ attempt.query }}
                                            </span>
                                            <span class="block text-xs text-gray-500">
                                                {{ attempt.submittedAt | date: 'short' }}
                                            </span>
                                        </div>
                                    </td>
                                    <td class="px-3 py-3 text-center text-lg" [attr.aria-label]="attempt.columnsCountMatchLevel">
                                        {{ resultIcon(attempt.columnsCountMatchLevel) }}
                                    </td>
                                    <td class="px-3 py-3 text-center text-lg" [attr.aria-label]="attempt.columnsNamesMatchLevel">
                                        {{ resultIcon(attempt.columnsNamesMatchLevel) }}
                                    </td>
                                    <td class="px-3 py-3 text-center text-lg" [attr.aria-label]="attempt.rowsCountMatchLevel">
                                        {{ resultIcon(attempt.rowsCountMatchLevel) }}
                                    </td>
                                    <td class="px-3 py-3 text-center text-lg" [attr.aria-label]="attempt.rowsDataMatchLevel">
                                        {{ resultIcon(attempt.rowsDataMatchLevel) }}
                                    </td>
                                    <td class="px-3 py-3 text-center text-lg" [attr.aria-label]="attempt.rowsOrderMatchLevel">
                                        {{ resultIcon(attempt.rowsOrderMatchLevel) }}
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            } @else {
                <p class="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-500">
                    Todavía no has enviado ningún intento.
                </p>
            }
        </section>
    `,
})
export class AttemptsList {
    attempts = input<Attempt[]>([]);

    protected resultIcon(result: Attempt['columnsCountMatchLevel']): string {
        return result === 'EXACT' ? '🟩' : result === 'PARTIAL' ? '🟨' : '🟥';
    }
}