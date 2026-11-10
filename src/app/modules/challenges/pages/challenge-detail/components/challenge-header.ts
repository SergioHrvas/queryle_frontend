import { DatePipe } from "@angular/common";
import { Component, input } from "@angular/core";
import { LucideCalendar } from "@lucide/angular";
import { DifficultyBadge } from "@modules/challenges/components/difficulty-badge";
import { DailyChallenge } from "@modules/challenges/models/challenge";

@Component({
    selector: "app-challenge-header",
    imports: [DatePipe, LucideCalendar, DifficultyBadge],
    template: `
        <header class="rounded-2xl bg-emerald-700 p-6 text-white shadow-lg">
            <span class="text-sm font-semibold uppercase tracking-wide text-emerald-200">
                Reto del día
            </span>
            <h1 class="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
                {{ challenge().formulation }}
            </h1>
            <div class="mt-4 flex flex-wrap items-center gap-5 text-sm text-emerald-100">
                <app-difficulty-badge [difficulty]="challenge().difficulty" />
                <div class="flex items-center gap-2">
                    <svg lucideCalendar></svg>
                    <span class="date-capitalize">{{ challenge().publicationDate | date: 'fullDate' }}</span>
                </div>
            </div>
        </header>
    `,
})
export class ChallengeHeader {
    readonly challenge = input.required<DailyChallenge>();
}
