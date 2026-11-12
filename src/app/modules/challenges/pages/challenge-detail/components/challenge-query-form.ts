import { Component, input, output } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { TranslatePipe } from "@ngx-translate/core";

type QueryForm = FormGroup<{
    query: FormControl<string>;
}>;

@Component({
    selector: "app-challenge-query-form",
    imports: [ReactiveFormsModule, TranslatePipe],
    template: `
        <form class="flex flex-col gap-3 p-4" [formGroup]="form()" (ngSubmit)="submitted.emit()">
            <label for="query" class="font-bold text-gray-800">{{ 'challenge.query.label' | translate }}</label>
            <textarea
                id="query"
                formControlName="query"
                rows="5"
                class="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 font-mono text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
                [placeholder]="'challenge.query.placeholder' | translate"
            ></textarea>
            <button
                type="submit"
                class="cursor-pointer rounded bg-emerald-500 px-4 py-2 font-bold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-400"
                [disabled]="form().invalid || isSubmitting()"
            >
                {{ (isSubmitting() ? 'challenge.query.submitting' : 'challenge.query.submit') | translate }}
            </button>
        </form>
    `,
})
export class ChallengeQueryForm {
    readonly form = input.required<QueryForm>();
    readonly isSubmitting = input(false);
    readonly submitted = output<void>();
}
