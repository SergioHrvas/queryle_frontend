import { Component, inject, signal } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { DailyChallenge } from "@modules/challenges/models/challenge";
import { DailyChallengeService } from "@modules/challenges/services/daily-challenge.service";
import { LucideCalendar, LucideChevronDown, LucideKey } from "@lucide/angular";
import { DifficultyBadge } from "@modules/challenges/components/difficulty-badge";
@Component({
    selector: 'challenge-detail',
    imports: [LucideCalendar, LucideChevronDown, LucideKey, DifficultyBadge],
    templateUrl: './challenge-detail.html',
    styleUrls: ['./challenge-detail.css']
})
export class ChallengeDetail {
    private readonly dailyChallengeService = inject(DailyChallengeService);

  protected readonly state = signal<FetchState>('loading');

    private readonly challengeId = inject(ActivatedRoute).snapshot.paramMap.get('id');
    private readonly challenge = signal<DailyChallenge | null>(null);
    ngOnInit() {
        if (!this.challengeId) {
            console.error('No challenge ID provided in route parameters.');
            this.state.set('error');
            return;
        }

        this.dailyChallengeService.getChallengeById(this.challengeId).subscribe({
            next: (challenge) => {
                this.challenge.set(challenge);
                this.state.set('loaded');
            },
            error: (error) => {
                console.error('Error fetching challenge:', error);
                this.state.set('error');
            }
        });
    }

}