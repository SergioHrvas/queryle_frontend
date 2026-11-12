import { LOCALE_ID, Component, computed, inject, signal } from "@angular/core";
import { DatePipe, NgClass } from "@angular/common";
import { DailyChallengeService } from "@modules/challenges/services/daily-challenge.service";
import {
    ChallengeDifficulty,
    ChallengeStatus,
    DailyChallengeSummary,
} from "@modules/challenges/models/challenge";
import { difficultyOptionFor } from "@modules/challenges/components/difficulty-config";
import { DifficultyTabs } from "@modules/challenges/components/difficulty-tabs";
import { TranslatePipe } from "@ngx-translate/core";

type CalendarDay = {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  challenge?: CalendarChallenge;
};

type CalendarChallenge = {
  id: string;
  formulation: string;
  difficulty: ChallengeDifficulty;
  status: ChallengeStatus;
};

type LocaleWithWeekInfo = Intl.Locale & {
    weekInfo?: {
        firstDay: number;
    };
    getWeekInfo?: () => {
        firstDay: number;
    };
};

@Component({
    selector: 'app-calendar',
    imports: [DatePipe, TranslatePipe, NgClass, DifficultyTabs, ],
    templateUrl: './calendar.html',
})
export class Calendar {
    private readonly dailyChallengeService = inject(DailyChallengeService);
    private readonly locale = inject(LOCALE_ID);

    protected readonly currentDate = signal(new Date());
    protected readonly weekdays = computed(() => this.getWeekdays());
    protected readonly difficulty = signal<ChallengeDifficulty>(ChallengeDifficulty.EASY);
    protected readonly selectedDifficulty = computed(() => difficultyOptionFor(this.difficulty()));
    protected readonly challenges = signal<DailyChallengeSummary[]>([]);

    protected readonly days = computed(() => this.generateCalendarDays(this.currentDate()));
    protected readonly monthLabel = computed(() =>
        new Intl.DateTimeFormat(this.locale, {
            month: 'long',
            year: 'numeric',
        }).format(this.currentDate()),
    );

    ngOnInit(): void {
        this.loadChallengesForMonth(this.currentDate());
    }

    protected previousMonth() {
        const current = this.currentDate();
        const previousMonthDate = new Date(current.getFullYear(), current.getMonth() - 1, 1);
        this.currentDate.set(previousMonthDate);
        this.loadChallengesForMonth(previousMonthDate);
    }

    protected nextMonth() {
        const current = this.currentDate();
        const nextMonthDate = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        this.currentDate.set(nextMonthDate);
        this.loadChallengesForMonth(nextMonthDate);
    }

    protected goToToday() {
        const today = new Date();
        this.currentDate.set(today);
        this.loadChallengesForMonth(today);
    }

    protected changeDifficulty(newDifficulty: ChallengeDifficulty): void {
        this.difficulty.set(newDifficulty);
        this.loadChallengesForMonth(this.currentDate());
    }
    
    private generateCalendarDays(date: Date): CalendarDay[] {
        const days: CalendarDay[] = [];
        const year = date.getFullYear();
        const month = date.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        const daysInMonth = lastDayOfMonth.getDate();

        const startDayOfWeek = this.getCalendarDayIndex(firstDayOfMonth);

        // Fill in the days from the previous month
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const prevDate = new Date(year, month, -i);
            days.push({
                date: prevDate,
                dateKey: this.dateKey(prevDate),
                dayNumber: prevDate.getDate(),
                isCurrentMonth: false,
                isToday: this.isToday(prevDate),
                challenge: this.challengeFor(prevDate),
            });
        }

        // Fill in the days of the current month
        for (let i = 1; i <= daysInMonth; i++) {
            const currentDate = new Date(year, month, i);
            days.push({
                date: currentDate,
                dateKey: this.dateKey(currentDate),
                dayNumber: i,
                isCurrentMonth: true,
                isToday: this.isToday(currentDate),
                challenge: this.challengeFor(currentDate),
            });
        }

        // Fill in the days from the next month to complete the week
        const endDayOfWeek = this.getCalendarDayIndex(lastDayOfMonth);
        for (let i = 1; i < 7 - endDayOfWeek; i++) {
            const nextDate = new Date(year, month + 1, i);
            days.push({
                date: nextDate,
                dateKey: this.dateKey(nextDate),
                dayNumber: nextDate.getDate(),
                isCurrentMonth: false,
                isToday: this.isToday(nextDate),
                challenge: this.challengeFor(nextDate),
            });
        }

        return days;
    }

    private getCalendarDayIndex(date: Date): number {
        const firstDay = this.getFirstDayOfWeek();
        return (date.getDay() - firstDay + 7) % 7;
    }

    private getWeekdays(): string[] {
        const firstDay = this.getFirstDayOfWeek();
        const formatter = new Intl.DateTimeFormat(this.locale, { weekday: 'short' });

        return Array.from({ length: 7 }, (_, index) => {
            const day = new Date(Date.UTC(2024, 0, 7 + ((firstDay + index) % 7)));
            return formatter.format(day);
        });
    }

    private getFirstDayOfWeek(): number {
        const locale = new Intl.Locale(this.locale) as LocaleWithWeekInfo;
        if (typeof locale.getWeekInfo === 'function') {
            return locale.getWeekInfo().firstDay % 7;
        }

        if (locale.weekInfo) {
            return locale.weekInfo.firstDay % 7;
        }

        const sundayFirstRegions = new Set([
            'AU', 'CA', 'JP', 'KR', 'NZ', 'PH', 'TH', 'TW', 'US',
        ]);

        return sundayFirstRegions.has(locale.region ?? '') ? 0 : 1;
    }

    private isToday (date: Date): boolean {
        const today = new Date();
        return date.getFullYear() === today.getFullYear() &&
               date.getMonth() === today.getMonth() &&
               date.getDate() === today.getDate();
    }

    protected statusClass(status: ChallengeStatus): string {
        switch (status) {
            case 'IN_PROGRESS':
                return 'bg-amber-100 text-amber-800';
            case 'COMPLETED_WON':
                return 'bg-emerald-100 text-emerald-800';
            case 'COMPLETED_FAILED':
                return 'bg-red-100 text-red-800';
            case 'PENDING':
                return 'bg-slate-100 text-slate-700';
        }
    }

    protected statusBackground(status: ChallengeStatus): string {
        switch (status) {
            case 'IN_PROGRESS':
                return '#fef3c7';
            case 'COMPLETED_WON':
                return '#d1fae5';
            case 'COMPLETED_FAILED':
                return '#fee2e2';
            case 'PENDING':
                return '#f1f5f9';
        }
    }

    protected statusTextColor(status: ChallengeStatus): string {
        switch (status) {
            case 'IN_PROGRESS':
                return '#92400e';
            case 'COMPLETED_WON':
                return '#065f46';
            case 'COMPLETED_FAILED':
                return '#991b1b';
            case 'PENDING':
                return '#334155';
        }
    }

    protected statusLabelKey(status: ChallengeStatus): string {
        switch (status) {
            case 'IN_PROGRESS':
                return 'difficulties.status.inProgress';
            case 'COMPLETED_WON':
                return 'difficulties.status.won';
            case 'COMPLETED_FAILED':
                return 'difficulties.status.failed';
            case 'PENDING':
                return 'difficulties.status.notStarted';
        }
    }

    private challengeFor(date: Date): CalendarChallenge | undefined {
        const challenge = this.challenges().find(
            (item) => this.dateKeyFromPublication(item.publicationDate) === this.dateKey(date),
        );

        return challenge;
    }

    private dateKey(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private dateKeyFromPublication(publicationDate: string): string {
        return publicationDate.slice(0, 10);
    }

    private loadChallengesForMonth(date: Date): void {
        const year = date.getFullYear();
        const month = date.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        this.dailyChallengeService.getChallengesFromTo(this.difficulty(), firstDayOfMonth, lastDayOfMonth)
            .subscribe({
                next: (challenges) => {
                    this.challenges.set(challenges);
                },
                error: (error) => {
                    this.challenges.set([]);
                    console.error('Error loading calendar challenges:', error);
                },
            });
    }
}