import { Component } from "@angular/core";
import { TranslatePipe } from "@ngx-translate/core";

@Component({
    selector: 'app-difficulty-selector',
    imports: [TranslatePipe],
    template: `
        <div class="flex flex-col items-center justify-center gap-2 sm:gap-4">
            <h2 class="text-xs sm:text-lg font-semibold text-white">{{ 'difficulties.select' | translate }}</h2>
            <div class="grid grid-cols-1 sm:grid-cols-3 w-full gap-2 sm:gap-4">
                <button class="rounded bg-green-500 px-2 sm:px-4 py-1 text-white hover:bg-green-600 cursor-pointer">{{ 'difficulties.easy' | translate }}</button>
                <button class="rounded bg-yellow-500 px-2 sm:px-4 py-1 text-white hover:bg-yellow-600 cursor-pointer">{{ 'difficulties.medium' | translate }}</button>
                <button class="rounded bg-red-500 px-2 sm:px-4 py-1 text-white hover:bg-red-600 cursor-pointer">{{ 'difficulties.hard' | translate }}</button>
            </div>
        </div>
    `,
    styles: `
    `
})
export class DifficultySelector {
    constructor() {}
}