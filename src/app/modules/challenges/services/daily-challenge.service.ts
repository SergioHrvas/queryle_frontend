import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  DailyChallenge,
  DailyChallengeSummary,
} from '@modules/challenges/models/challenge';
import { environment } from '@core/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DailyChallengeService {
  private readonly http = inject(HttpClient);

  getToday(): Observable<DailyChallengeSummary[]> {
    return this.http.get<Array<Omit<DailyChallengeSummary, 'status'> & {
      status: Exclude<DailyChallengeSummary['status'], 'PENDING'> | null;
    }>>(
      `${environment.apiUrl}/dailychallenges/today`,
      {
        headers: {
          'X-Player-Id': 'f6c8a9bc-f8b1-460a-aaec-e7440f99c1d3',
        },
      },
    ).pipe(
      map((challenges) =>
        challenges.map((challenge) => ({
          ...challenge,
          status: challenge.status ?? 'PENDING',
        })),
      ),
    );
  }
  
  getChallengeById(id: string): Observable<DailyChallenge> {
    return this.http.get<DailyChallenge>(
      `${environment.apiUrl}/dailychallenges/${id}`,
      {
        headers: {
          'X-Player-Id': 'f6c8a9bc-f8b1-460a-aaec-e7440f99c1d3',
        },
      }
    );
  }

  submitAttempt(challengeId: string, query: string): Observable<void> {
    return this.http.post<void>(
      `${environment.apiUrl}/dailychallenges/${challengeId}/attempts`,
      { query },
      {
        headers: {
          'X-Player-Id': 'f6c8a9bc-f8b1-460a-aaec-e7440f99c1d3',
        },
      }
    );
  }
}