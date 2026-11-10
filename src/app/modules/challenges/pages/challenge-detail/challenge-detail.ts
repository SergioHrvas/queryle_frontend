import { Component, inject, signal } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { DailyChallenge } from "@modules/challenges/models/challenge";
import { DailyChallengeService } from "@modules/challenges/services/daily-challenge.service";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { AttemptsList } from "@modules/challenges/pages/challenge-detail/components/attempts-list";
import { ChallengeHeader } from "@modules/challenges/pages/challenge-detail/components/challenge-header";
import { ChallengeQueryForm } from "@modules/challenges/pages/challenge-detail/components/challenge-query-form";
import { DataContext } from "@modules/challenges/pages/challenge-detail/components/data-context";
import { TranslatePipe } from "@ngx-translate/core";
@Component({
    selector: 'challenge-detail',
    imports: [ReactiveFormsModule, AttemptsList, ChallengeHeader, ChallengeQueryForm, DataContext, TranslatePipe],
    templateUrl: './challenge-detail.html',
    styleUrls: ['./challenge-detail.css']
})
export class ChallengeDetail {
    private readonly dailyChallengeService = inject(DailyChallengeService);

    protected readonly state = signal<FetchState>('loading');

    private readonly challengeId = inject(ActivatedRoute).snapshot.paramMap.get('id');
    private readonly challenge = signal<DailyChallenge | null>(null);
    protected readonly form = new FormGroup({
        query: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required],
        })
    });
    protected readonly isSubmitting = signal(false);

    protected readonly hasWon = () => {
        const currentChallenge = this.challenge();
        if (!currentChallenge) return false;
    
        const currentGame = currentChallenge.game;
        if (!currentGame) return false;

        if (currentGame.status !== 'COMPLETED_WON') return false;
        
        if(!currentGame.attempts || currentGame.attempts.length === 0) return false;
        
        const lastAttempt = currentGame.attempts[currentGame.attempts.length - 1];
        return (currentGame.status === 'COMPLETED_WON') 
                    && lastAttempt.validationPassed;
    };
    
    protected readonly hasFailed = () => this.challenge()?.game?.status === 'COMPLETED_FAILED';
    protected readonly onSubmit = () => {
        if (this.form.invalid) {
            return;
        }
        this.isSubmitting.set(true);
        this.submitAttempt();
    };

    ngOnInit() {
        if (!this.challengeId) {
            console.error('No challenge ID provided in route parameters.');
            this.state.set('error');
            return;
        }

        this.loadChallenge();
    }

    private loadChallenge() {
        if(!this.challengeId) {
            console.error('No challenge ID available.');
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

    submitAttempt() {
        const query = this.form.value.query;
        if(!query || query.trim() === '') {
            console.error('Query is empty. Cannot submit an empty query.');
            return;
        }
        this.dailyChallengeService.submitAttempt(this.challengeId!, query).subscribe({
            next: () => {
                console.log('Attempt submitted successfully.');
                this.loadChallenge();
                this.form.reset();
                this.isSubmitting.set(false);
            },
            error: (error) => {
                console.error('Error submitting attempt:', error);
                this.isSubmitting.set(false);
            }
        });
    }
}