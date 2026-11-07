import { Component } from "@angular/core";
import { TranslatePipe } from "@ngx-translate/core";
import { Button } from "./button";
import { ButtonVariant } from "../../modules/challenges/models/challenge-difficulty";

type DifficultyOption = {
    labelKey: string;
    variant: ButtonVariant;
};

@Component({
    selector: 'app-difficulty-selector',
    imports: [Button, TranslatePipe],
    template: `
        <div class="flex flex-col items-center justify-center gap-2 sm:gap-4">
            <h2 class="text-xs sm:text-lg font-semibold text-white">{{ 'difficulties.select' | translate }}</h2>
            <div class="grid grid-cols-1 sm:grid-cols-3 w-full gap-2 sm:gap-4">
                @for (option of difficultyOptions; track option.variant) {
                    <app-button
                        [labelKey]="option.labelKey"
                        [variant]="option.variant"
                    />
                }
            </div>
        </div>
    `,
    styles: `
    `
})
export class DifficultySelector {
    protected readonly difficultyOptions: DifficultyOption[] = [
        { labelKey: 'difficulties.easy', variant: 'easy' },
        { labelKey: 'difficulties.medium', variant: 'medium' },
        { labelKey: 'difficulties.hard', variant: 'hard' },
    ];
}