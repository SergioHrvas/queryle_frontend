import { DatePipe } from "@angular/common";
import { Component, input } from "@angular/core";
import { LucideCalendar } from "@lucide/angular";
import { TranslatePipe } from "@ngx-translate/core";
import { DifficultyBadge } from "@modules/challenges/components/difficulty-badge";
import { DailyChallenge } from "@modules/challenges/models/challenge";

@Component({
    selector: "app-challenge-header",
    imports: [DatePipe, LucideCalendar, DifficultyBadge, TranslatePipe],
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
                    <span class="font-semibold">{{ 'difficulties.status.label' | translate }}:</span>
                    <span
                        class="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide shadow-sm"
                        [class]="statusBadgeClass()"
                    >
                        {{ statusLabelKey() | translate }}
                    </span>
                </div>
                <div class="flex items-center gap-2">
                    <svg lucideCalendar></svg>
                    <span class="capitalize">{{ challenge().publicationDate | date: 'fullDate' }}</span>
                </div>
            </div>
        </header>
    `,
})
export class ChallengeHeader {
    readonly challenge = input.required<DailyChallenge>();

    protected statusLabelKey(): string {
        switch (this.challenge().game?.status) {
            case 'IN_PROGRESS':
                return 'difficulties.status.inProgress';
            case 'COMPLETED_FAILED':
                return 'difficulties.status.failed';
            case 'COMPLETED_WON':
                return 'difficulties.status.won';
            default:
                return 'difficulties.status.notStarted';
        }
    }

    protected statusBadgeClass(): string {
        switch (this.challenge().game?.status) {
            case 'IN_PROGRESS':
                return 'challenge-status-badge--in-progress';
            case 'COMPLETED_FAILED':
                return 'challenge-status-badge--failed';
            case 'COMPLETED_WON':
                return 'challenge-status-badge--won';
            default:
                return 'challenge-status-badge--pending';
        }
    }
}
